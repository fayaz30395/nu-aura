package com.nulogic.application.payroll.service;

import com.nulogic.application.audit.service.AuditLogService;
import com.nulogic.application.payroll.dto.StatutoryDeductions;
import com.nulogic.application.payroll.strategy.StatutoryCalculator;
import com.nulogic.application.payroll.strategy.StatutoryCalculator.StatutoryCalculationInput;
import com.nulogic.application.payroll.strategy.StatutoryCalculatorFactory;
import com.nulogic.application.payroll.strategy.StatutoryResult;
import com.nulogic.common.security.TenantContext;
import com.nulogic.domain.audit.AuditLog.AuditAction;
import com.nulogic.domain.payroll.Payslip;
import com.nulogic.infrastructure.payroll.repository.PayslipRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class PayslipService {

    private final PayslipRepository payslipRepository;
    private final AuditLogService auditLogService;
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

        payslip.calculateTotals();
        return payslipRepository.save(payslip);
    }

    @Transactional(isolation = Isolation.REPEATABLE_READ)
    public Payslip updatePayslip(UUID id, Payslip payslipData) {
        UUID tenantId = TenantContext.getCurrentTenant();

        Payslip payslip = payslipRepository.findById(id)
                .filter(p -> p.getTenantId().equals(tenantId))
                .orElseThrow(() -> new IllegalArgumentException("Payslip not found"));

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
        return payslipRepository.findById(id)
                .filter(p -> p.getTenantId().equals(tenantId))
                .orElseThrow(() -> new IllegalArgumentException("Payslip not found"));
    }

    @Transactional(readOnly = true)
    public Page<Payslip> getAllPayslips(Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return payslipRepository.findAllByTenantId(tenantId, pageable);
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

    @Transactional(isolation = Isolation.REPEATABLE_READ)
    public void deletePayslip(UUID id) {
        Payslip payslip = getPayslipById(id);
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
        UUID tenantId = TenantContext.getCurrentTenant();

        Payslip payslip = payslipRepository.findById(payslipId)
                .filter(p -> p.getTenantId().equals(tenantId))
                .orElseThrow(() -> new IllegalArgumentException("Payslip not found: " + payslipId));

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
        payslip.setStatutoryCalculatedAt(LocalDateTime.now());
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
