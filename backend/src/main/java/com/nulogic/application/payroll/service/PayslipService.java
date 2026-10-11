package com.nulogic.application.payroll.service;

import com.nulogic.api.payroll.dto.PayslipReleaseStatusResponse;
import com.nulogic.application.audit.service.AuditLogService;
import com.nulogic.application.payroll.dto.StatutoryDeductions;
import com.nulogic.application.payroll.strategy.StatutoryCalculator;
import com.nulogic.application.payroll.strategy.StatutoryCalculator.StatutoryCalculationInput;
import com.nulogic.application.payroll.strategy.StatutoryCalculatorFactory;
import com.nulogic.application.payroll.strategy.StatutoryResult;
import com.nulogic.common.security.DataScopeService;
import com.nulogic.common.exception.ResourceNotFoundException;
import com.nulogic.common.security.Permission;
import com.nulogic.common.security.SecurityContext;
import com.nulogic.common.security.TenantContext;
import com.nulogic.common.util.TenantTimeService;
import com.nulogic.domain.audit.AuditLog.AuditAction;
import com.nulogic.domain.payroll.PayrollRun;
import com.nulogic.domain.payroll.PayrollRun.PayrollStatus;
import com.nulogic.domain.payroll.Payslip;
import com.nulogic.infrastructure.payroll.repository.PayrollRunRepository;
import com.nulogic.infrastructure.payroll.repository.PayslipRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.IntStream;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class PayslipService {

    /** Payroll run statuses whose payslips employees may see (single policy for all self-service reads). */
    public static final List<PayrollStatus> RELEASED_STATUSES =List.of(PayrollStatus.APPROVED, PayrollStatus.LOCKED);

    private final PayslipRepository payslipRepository;
    private final PayrollRunRepository payrollRunRepository;
    private final AuditLogService auditLogService;
    private final TenantTimeService tenantTimeService;
    private final DataScopeService dataScopeService;
    /**
     * S10-B: routes per-tenant to the correct country-specific calculator. For IN tenants
     * this resolves to {@code IndianStatutoryCalculator} which delegates to the legacy
     * {@code StatutoryDeductionService}, so behaviour for existing tenants is unchanged.
     * Injected lazily via setter to avoid eager-init coupling to the strategy package.
     */
    private StatutoryCalculatorFactory statutoryCalculatorFactory;

    @Transactional(isolation = Isolation.REPEATABLE_READ)
    public Payslip createPayslip(Payslip payslip) {
        UUID tenantId = TenantContext.getCurrentTenant();
        payslip.setTenantId(tenantId);

        if (payslipRepository.existsByTenantIdAndEmployeeIdAndPayPeriodYearAndPayPeriodMonth(
                tenantId,
                payslip.getEmployeeId(),
                payslip.getPayPeriodYear(),
                payslip.getPayPeriodMonth())) {
            throw new IllegalArgumentException("Payslip already exists for this employee and period");
        }

        Optional<PayrollRun> run = findRun(payslip.getPayrollRunId(), tenantId);
        run.ifPresent(r -> {
            assertNotReleased(r, "create a payslip in");
            if (!Objects.equals(r.getPayPeriodYear(), payslip.getPayPeriodYear())
                    || !Objects.equals(r.getPayPeriodMonth(), payslip.getPayPeriodMonth())) {
                throw new IllegalArgumentException("Payslip period " + payslip.getPayPeriodYear() + "/"
                        + payslip.getPayPeriodMonth() + " does not match payroll run period "
                        + r.getPayPeriodYear() + "/" + r.getPayPeriodMonth());
            }
        });

        payslip.calculateTotals();
        return payslipRepository.save(payslip);
    }

    @Transactional(isolation = Isolation.REPEATABLE_READ)
    public Payslip updatePayslip(UUID id, Payslip payslipData) {
        UUID tenantId = TenantContext.getCurrentTenant();

        Payslip payslip = payslipRepository.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Payslip not found"));

        findRun(payslip.getPayrollRunId(), tenantId).ifPresent(r -> assertNotReleased(r, "update a payslip of"));
        if (payslipData.getPayrollRunId() != null
                && !payslipData.getPayrollRunId().equals(payslip.getPayrollRunId())) {
            findRun(payslipData.getPayrollRunId(), tenantId)
                    .ifPresent(r -> assertNotReleased(r, "move a payslip into"));
        }

        payslip.setPayrollRunId(payslipData.getPayrollRunId());
        payslip.setEmployeeId(payslipData.getEmployeeId());
        payslip.setPayPeriodMonth(payslipData.getPayPeriodMonth());
        payslip.setPayPeriodYear(payslipData.getPayPeriodYear());
        payslip.setPayDate(payslipData.getPayDate());
        payslip.setBasicSalary(payslipData.getBasicSalary());
        payslip.setHra(payslipData.getHra());
        payslip.setConveyanceAllowance(payslipData.getConveyanceAllowance());
        payslip.setMedicalAllowance(payslipData.getMedicalAllowance());
        payslip.setSpecialAllowance(payslipData.getSpecialAllowance());
        payslip.setOtherAllowances(payslipData.getOtherAllowances());
        payslip.setProvidentFund(payslipData.getProvidentFund());
        payslip.setProfessionalTax(payslipData.getProfessionalTax());
        payslip.setIncomeTax(payslipData.getIncomeTax());
        payslip.setOtherDeductions(payslipData.getOtherDeductions());
        payslip.setWorkingDays(payslipData.getWorkingDays());
        payslip.setPresentDays(payslipData.getPresentDays());
        payslip.setLeaveDays(payslipData.getLeaveDays());

        payslip.calculateTotals();
        return payslipRepository.save(payslip);
    }

    @Transactional(readOnly = true)
    public Payslip getPayslipById(UUID id) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return payslipRepository.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Payslip not found"));
    }

    // SEC: row-level scope enforcement (audit gap — was tenant-only, no LOCATION/DEPARTMENT/
    // TEAM filtering). A TEAM-scoped manager now sees only their team's payslips instead of
    // every payslip in the tenant. This is the fix, not a regression.
    @Transactional(readOnly = true)
    public Page<Payslip> getAllPayslips(Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenant();
        Specification<Payslip> tenantSpec = (root, query, cb) -> cb.equal(root.get("tenantId"), tenantId);
        Specification<Payslip> scopeSpec = dataScopeService.getScopeSpecification(Permission.PAYROLL_VIEW_ALL);
        return payslipRepository.findAll(tenantSpec.and(scopeSpec), pageable);
    }

    @Transactional(readOnly = true)
    public Page<Payslip> getPayslipsByEmployeeId(UUID employeeId, Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return payslipRepository.findAllByEmployeeIdOrderByPeriodDesc(tenantId, employeeId, pageable);
    }

    @Transactional(readOnly = true)
    public Payslip getPayslipByEmployeeAndPeriod(UUID employeeId, Integer year, Integer month) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return payslipRepository.findByTenantIdAndEmployeeIdAndPayPeriodYearAndPayPeriodMonth(
                        tenantId, employeeId, year, month)
                .orElseThrow(() -> new IllegalArgumentException("Payslip not found for this period"));
    }

    @Transactional(readOnly = true)
    public List<Payslip> getPayslipsByPayrollRun(UUID payrollRunId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return payslipRepository.findAllByTenantIdAndPayrollRunId(tenantId, payrollRunId);
    }

    @Transactional(readOnly = true)
    public Page<Payslip> getPayslipsByPayrollRunPaged(UUID payrollRunId, Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return payslipRepository.findAllByTenantIdAndPayrollRunId(tenantId, payrollRunId, pageable);
    }

    @Transactional(readOnly = true)
    public List<Payslip> getPayslipsByEmployeeAndYear(UUID employeeId, Integer year) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return payslipRepository.findByEmployeeIdAndYear(tenantId, employeeId, year);
    }

    /**
     * Who may see payslips of runs that are not yet released: super admins (same bypass as
     * the payroll access check) and holders of PAYROLL_VIEW_ALL. Everyone else is self-view
     * and limited to released (APPROVED/LOCKED) runs.
     */
    public static boolean canViewUnreleased() {
        return SecurityContext.isSuperAdmin()
                || SecurityContext.getPermissionScope(Permission.PAYROLL_VIEW_ALL) != null;
    }

    /**
     * Self-service single read: a payslip is visible only once its payroll run is APPROVED or LOCKED.
     * Missing and unreleased payslips are indistinguishable: both are not-found (HTTP 404).
     */
    @Transactional(readOnly = true)
    public Payslip getReleasedPayslipById(UUID id) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return payslipRepository.findByIdAndTenantId(id, tenantId)
                .filter(this::isReleased)
                .orElseThrow(() -> new ResourceNotFoundException("Payslip", "id", id));
    }

    @Transactional(readOnly = true)
    public Payslip getReleasedPayslipByEmployeeAndPeriod(UUID employeeId, Integer year, Integer month) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return payslipRepository.findByTenantIdAndEmployeeIdAndPayPeriodYearAndPayPeriodMonth(
                        tenantId, employeeId, year, month)
                .filter(this::isReleased)
                .orElseThrow(() -> new ResourceNotFoundException("Payslip", "period", year + "-" + month));
    }

    @Transactional(readOnly = true)
    public Page<Payslip> getReleasedPayslipsByEmployeeId(UUID employeeId, Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return payslipRepository.findReleasedByEmployeeIdOrderByPeriodDesc(
                tenantId, employeeId, RELEASED_STATUSES, pageable);
    }

    @Transactional(readOnly = true)
    public List<Payslip> getReleasedPayslipsByEmployeeAndYear(UUID employeeId, Integer year) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return payslipRepository.findReleasedByEmployeeAndYear(tenantId, employeeId, year, RELEASED_STATUSES);
    }

    /**
     * Per-month release state of an employee's payslips for a year, always 12 entries. A month without this
     * employee's payslip (including a month with no payroll run) is reported unreleased as NO_PAYSLIP.
     * Reads only month and run status, never amounts.
     */
    @Transactional(readOnly = true)
    public List<PayslipReleaseStatusResponse> getReleaseStatus(UUID employeeId, Integer year) {
        UUID tenantId = TenantContext.getCurrentTenant();
        Map<Integer, PayslipReleaseStatusResponse.Reason> byMonth = new HashMap<>();
        for (Object[] row : payslipRepository.findMonthAndRunStatusByEmployeeAndYear(tenantId, employeeId, year)) {
            int month = ((Number) row[0]).intValue();
            PayrollStatus runStatus = (PayrollStatus) row[1];
            PayslipReleaseStatusResponse.Reason reason = runStatus != null && RELEASED_STATUSES.contains(runStatus)
                    ? PayslipReleaseStatusResponse.Reason.RELEASED
                    : PayslipReleaseStatusResponse.Reason.NOT_RELEASED;
            // Defensive: if two payslips ever share a month, a released one wins.
            byMonth.merge(month, reason, (a, b) -> a == PayslipReleaseStatusResponse.Reason.RELEASED
                    || b == PayslipReleaseStatusResponse.Reason.RELEASED
                    ? PayslipReleaseStatusResponse.Reason.RELEASED
                    : PayslipReleaseStatusResponse.Reason.NOT_RELEASED);
        }
        return IntStream.rangeClosed(1, 12)
                .mapToObj(month -> {
                    PayslipReleaseStatusResponse.Reason reason =
                            byMonth.getOrDefault(month, PayslipReleaseStatusResponse.Reason.NO_PAYSLIP);
                    return new PayslipReleaseStatusResponse(
                            month, reason == PayslipReleaseStatusResponse.Reason.RELEASED, reason);
                })
                .toList();
    }

    /** Status of the tenant's payroll run for a period, if a run exists. Tenant scoped. */
    @Transactional(readOnly = true)
    public Optional<PayrollStatus> getRunStatusForPeriod(Integer year, Integer month) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return payrollRunRepository.findByTenantIdAndPayPeriodYearAndPayPeriodMonth(tenantId, year, month)
                .map(PayrollRun::getStatus);
    }

    private boolean isReleased(Payslip payslip) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return payslip.getPayrollRunId() != null
                && payrollRunRepository.findByIdAndTenantId(payslip.getPayrollRunId(), tenantId)
                        .map(run -> RELEASED_STATUSES.contains(run.getStatus()))
                        .orElse(false);
    }

    private Optional<PayrollRun> findRun(UUID payrollRunId, UUID tenantId) {
        return payrollRunId == null
                ? Optional.empty()
                : payrollRunRepository.findByIdAndTenantId(payrollRunId, tenantId);
    }

    /** Payslips of released (APPROVED/LOCKED) runs are immutable. */
    private static void assertNotReleased(PayrollRun run, String action) {
        if (RELEASED_STATUSES.contains(run.getStatus())) {
            throw new IllegalStateException("Cannot " + action + " a "
                    + run.getStatus().name().toLowerCase(Locale.ROOT) + " payroll run");
        }
    }

    @Transactional(isolation = Isolation.REPEATABLE_READ)
    public void deletePayslip(UUID id) {
        Payslip payslip = getPayslipById(id);
        findRun(payslip.getPayrollRunId(), payslip.getTenantId())
                .ifPresent(r -> assertNotReleased(r, "delete a payslip of"));
        payslip.softDelete();
        payslipRepository.save(payslip);

        auditLogService.logAction(
                "PAYSLIP",
                payslip.getId(),
                AuditAction.DELETE,
                Map.of("employeeId", payslip.getEmployeeId(),
                        "period", payslip.getPayPeriodYear() + "-" + payslip.getPayPeriodMonth()),
                null,
                "Payslip soft-deleted for employee " + payslip.getEmployeeId() +
                        " period " + payslip.getPayPeriodYear() + "/" + payslip.getPayPeriodMonth()
        );
    }

    /**
     * BUG-002 FIX: Apply India statutory deductions to a payslip inside a single
     *
     * @param payslipId UUID of the payslip to update
     * @param state     Indian state for professional-tax lookup (e.g. "Karnataka")
     * @return the calculated {@link StatutoryDeductions} DTO
     * @Transactional boundary.  Previously this logic lived directly in the
     * controller (PayrollStatutoryController) which meant:
     * 1. No transaction: partial writes were possible if calculateTotals() threw.
     * 2. Repository bypass: the controller held a direct PayslipRepository reference.
     */
    @Transactional(isolation = Isolation.REPEATABLE_READ)
    public StatutoryDeductions applyStatutoryDeductions(UUID payslipId, String state) {
        UUID tenantId = TenantContext.requireCurrentTenant();

        Payslip payslip = payslipRepository.findByIdAndTenantId(payslipId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Payslip not found: " + payslipId));
        findRun(payslip.getPayrollRunId(), tenantId)
                .ifPresent(r -> assertNotReleased(r, "apply statutory deductions to a payslip of"));

        // S10-B: route via the strategy factory so non-IN tenants can plug in their own
        // calculators. For IN the IndianStatutoryCalculator delegates to the legacy
        // StatutoryDeductionService — behaviour is bit-identical for existing tenants.
        // Non-IN calculators that are skeleton-only will throw UnsupportedOperationException,
        // which the controller layer translates to HTTP 501 NOT_IMPLEMENTED.
        StatutoryCalculator calculator = statutoryCalculatorFactory.forTenant(tenantId);
        StatutoryCalculationInput input = new StatutoryCalculationInput(
                payslip.getEmployeeId(),
                payslip.getGrossSalary(),
                payslip.getBasicSalary(),
                /* gender = */ null,
                state,
                payslip.getPayPeriodMonth(),
                payslip.getPayPeriodYear());
        StatutoryResult strategyResult = calculator.calculate(input);
        StatutoryDeductions deductions = strategyResult.legacyIndiaView();

        // Apply all deduction fields atomically — if any setter or calculateTotals()
        // throws, the whole transaction rolls back and no partial data is saved.
        payslip.setEmployeePf(deductions.getEmployeePf());
        payslip.setEmployerPf(deductions.getEmployerPf());
        payslip.setEmployeeEsi(deductions.getEmployeeEsi());
        payslip.setEmployerEsi(deductions.getEmployerEsi());
        payslip.setStatutoryProfessionalTax(deductions.getProfessionalTax());
        payslip.setTdsMonthly(deductions.getTdsMonthly());
        payslip.setStatutoryCalculatedAt(tenantTimeService.now(tenantId));
        payslip.setProvidentFund(deductions.getEmployeePf());
        payslip.setProfessionalTax(deductions.getProfessionalTax());
        payslip.setIncomeTax(deductions.getTdsMonthly());
        payslip.calculateTotals();

        payslipRepository.save(payslip);
        return deductions;
    }

    @org.springframework.beans.factory.annotation.Autowired
    public void setStatutoryCalculatorFactory(StatutoryCalculatorFactory statutoryCalculatorFactory) {
        this.statutoryCalculatorFactory = statutoryCalculatorFactory;
    }
}
