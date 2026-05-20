package com.nulogic.application.payroll.service;

import com.nulogic.application.audit.service.AuditLogService;
import com.nulogic.common.exception.ResourceNotFoundException;
import com.nulogic.common.exception.ValidationException;
import com.nulogic.common.security.TenantContext;
import com.nulogic.domain.audit.AuditLog.AuditAction;
import com.nulogic.domain.employee.Employee;
import com.nulogic.domain.payroll.PayrollRun;
import com.nulogic.domain.payroll.PayrollRun.PayrollStatus;
import com.nulogic.domain.payroll.Payslip;
import com.nulogic.infrastructure.employee.repository.EmployeeRepository;
import com.nulogic.infrastructure.payroll.repository.PayrollRunRepository;
import com.nulogic.infrastructure.payroll.repository.PayslipRepository;
import com.nulogic.infrastructure.payroll.repository.SalaryStructureRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class PayrollRunService {

    private final PayrollRunRepository payrollRunRepository;
    private final AuditLogService auditLogService;
    private final EmployeeRepository employeeRepository;
    private final SalaryStructureRepository salaryStructureRepository;
    private final PayslipRepository payslipRepository;
    private final PayrollPeriodLock payrollPeriodLock;
    private final com.nulogic.common.util.TenantTimeService tenantTimeService;

    /**
     * Create a new payroll run for a given period.
     * Uses pessimistic locking to prevent race conditions where two concurrent
     * requests both check existence and both create a run for the same period.
     */
    @Transactional(isolation = Isolation.REPEATABLE_READ)
    public PayrollRun createPayrollRun(PayrollRun payrollRun) {
        UUID tenantId = TenantContext.getCurrentTenant();
        payrollRun.setTenantId(tenantId);

        // T1-04: serialize all concurrent work for this (tenant, period) tuple,
        // regardless of run id. The row-level FOR UPDATE below can't lock a
        // not-yet-existent row, so two parallel creates would otherwise both
        // pass the existence check and race the unique-index insert.
        payrollPeriodLock.lockPeriod(tenantId,
                payrollRun.getPayPeriodYear(),
                payrollRun.getPayPeriodMonth());

        // Pessimistic lock: if a concurrent run exists, lock it to prevent duplicates.
        // This replaces the non-atomic exists-then-create pattern.
        if (payrollRunRepository.findByTenantIdAndPeriodForUpdate(
                tenantId,
                payrollRun.getPayPeriodYear(),
                payrollRun.getPayPeriodMonth()).isPresent()) {
            throw new IllegalArgumentException("Payroll run already exists for this period");
        }

        return payrollRunRepository.save(payrollRun);
    }

    @Transactional(isolation = Isolation.REPEATABLE_READ)
    public PayrollRun updatePayrollRun(UUID id, PayrollRun payrollRunData) {
        UUID tenantId = TenantContext.getCurrentTenant();

        PayrollRun payrollRun = payrollRunRepository.findById(id)
                .filter(pr -> pr.getTenantId().equals(tenantId))
                .orElseThrow(() -> new ResourceNotFoundException("Payroll run not found"));

        if (payrollRun.getStatus() == PayrollStatus.LOCKED) {
            throw new IllegalStateException("Cannot update locked payroll run");
        }

        payrollRun.setPayPeriodMonth(payrollRunData.getPayPeriodMonth());
        payrollRun.setPayPeriodYear(payrollRunData.getPayPeriodYear());
        payrollRun.setPayrollDate(payrollRunData.getPayrollDate());
        payrollRun.setRemarks(payrollRunData.getRemarks());

        return payrollRunRepository.save(payrollRun);
    }

    @Transactional(readOnly = true)
    public PayrollRun getPayrollRunById(UUID id) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return payrollRunRepository.findById(id)
                .filter(pr -> pr.getTenantId().equals(tenantId))
                .orElseThrow(() -> new ResourceNotFoundException("Payroll run not found"));
    }

    @Transactional(readOnly = true)
    public Page<PayrollRun> getAllPayrollRuns(Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return payrollRunRepository.findAllByTenantIdOrderByPeriodDesc(tenantId, pageable);
    }

    @Transactional(readOnly = true)
    public PayrollRun getPayrollRunByPeriod(Integer year, Integer month) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return payrollRunRepository.findByTenantIdAndPayPeriodYearAndPayPeriodMonth(tenantId, year, month)
                .orElseThrow(() -> new ResourceNotFoundException("Payroll run not found for this period"));
    }

    @Transactional(readOnly = true)
    public List<PayrollRun> getPayrollRunsByYear(Integer year) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return payrollRunRepository.findByTenantIdAndYear(tenantId, year);
    }

    @Transactional(readOnly = true)
    public Page<PayrollRun> getPayrollRunsByStatus(PayrollStatus status, Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return payrollRunRepository.findAllByTenantIdAndStatus(tenantId, status, pageable);
    }

    /**
     * Transition DRAFT → PROCESSING (async path).
     *
     * <p>Called synchronously in the HTTP request thread. Marks the run as
     * PROCESSING and saves it before the controller publishes the Kafka event.
     * If the Kafka publish subsequently fails the caller is expected to call
     * {@link #failProcessing} to roll the run back to DRAFT.</p>
     *
     * <p>Pessimistic locking prevents a second concurrent POST from also
     * transitioning the same run.</p>
     */
    @Transactional(isolation = Isolation.REPEATABLE_READ)
    public PayrollRun initiateProcessing(UUID id, UUID triggeredBy) {
        PayrollRun payrollRun = getPayrollRunForUpdate(id);
        validateSalaryStructuresCoverage(payrollRun);
        payrollRun.markProcessing(triggeredBy);
        return payrollRunRepository.save(payrollRun);
    }

    /**
     * Pre-flight check: ensure every active employee has an active salary structure.
     * Throws {@link ValidationException} if any active employees are missing a structure,
     * blocking the payroll run from transitioning to PROCESSING.
     * Logs a warning if the validation query itself cannot be completed.
     */
    private void validateSalaryStructuresCoverage(PayrollRun payrollRun) {
        try {
            UUID tenantId = payrollRun.getTenantId();
            Long activeEmployeeCount = employeeRepository.countByTenantIdAndStatus(
                    tenantId, Employee.EmployeeStatus.ACTIVE);
            long employeesWithStructure = salaryStructureRepository
                    .countDistinctEmployeesWithActiveSalaryStructure(tenantId);

            if (activeEmployeeCount != null && activeEmployeeCount > 0
                    && employeesWithStructure < activeEmployeeCount) {
                long missing = activeEmployeeCount - employeesWithStructure;
                throw new ValidationException(
                        "Payroll pre-flight failed: " + missing + " active employee(s) are missing an active " +
                                "salary structure. Assign salary structures before processing payroll for period " +
                                payrollRun.getPayPeriodYear() + "/" + payrollRun.getPayPeriodMonth() + ".");
            }
        } catch (ValidationException e) {
            throw e;
        } catch (Exception e) {
            log.warn("Payroll pre-flight salary structure check could not be completed for run {}: {}. " +
                    "Proceeding with processing.", payrollRun.getId(), e.getMessage());
        }
    }

    /**
     * Transition PROCESSING → PROCESSED (called by the Kafka consumer).
     * Uses pessimistic locking to be safe against concurrent state transitions.
     */
    @Transactional(isolation = Isolation.REPEATABLE_READ)
    public PayrollRun completeProcessing(UUID id, UUID processedBy) {
        PayrollRun payrollRun = getPayrollRunForUpdate(id);
        // T1-04: period-wide advisory lock so any other code path that might
        // be computing payslips for (tenant, year, month) — legacy sync call,
        // ad-hoc replay, retried delivery on a different consumer instance —
        // serializes here. Released at transaction commit/rollback.
        payrollPeriodLock.lockPeriod(payrollRun.getTenantId(),
                payrollRun.getPayPeriodYear(),
                payrollRun.getPayPeriodMonth());
        int generatedPayslips = generatePayslipsForRun(payrollRun);
        payrollRun.setTotalEmployees(generatedPayslips);
        payrollRun.process(processedBy, tenantTimeService.now(payrollRun.getTenantId()));
        auditLogService.logAction(
                "PAYROLL_RUN",
                payrollRun.getId(),
                AuditAction.UPDATE,
                Map.of(
                        "status", PayrollStatus.PROCESSED.name(),
                        "period", payrollRun.getPayPeriodYear() + "-" + payrollRun.getPayPeriodMonth()),
                null,
                "Payroll run asynchronously processed for period "
                        + payrollRun.getPayPeriodYear() + "/" + payrollRun.getPayPeriodMonth());
        return payrollRunRepository.save(payrollRun);
    }

    /**
     * Roll back PROCESSING → DRAFT on consumer failure.
     * Allows the payroll admin to resubmit after fixing the root cause.
     */
    @Transactional(isolation = Isolation.REPEATABLE_READ)
    public PayrollRun failProcessing(UUID id) {
        PayrollRun payrollRun = getPayrollRunForUpdate(id);
        payrollRun.markFailed();
        auditLogService.logAction(
                "PAYROLL_RUN",
                payrollRun.getId(),
                AuditAction.UPDATE,
                Map.of(
                        "status", PayrollStatus.DRAFT.name(),
                        "reason", "Async processing failed; rolled back to DRAFT"),
                null,
                "Payroll run processing failed — rolled back to DRAFT");
        return payrollRunRepository.save(payrollRun);
    }

    /**
     * Transition a payroll run from DRAFT → PROCESSED (legacy synchronous path).
     * Kept for backward compatibility with tests and direct service calls.
     * New code should use {@link #initiateProcessing} + Kafka consumer instead.
     */
    @Transactional(isolation = Isolation.REPEATABLE_READ)
    public PayrollRun processPayrollRun(UUID id, UUID processedBy) {
        PayrollRun payrollRun = getPayrollRunForUpdate(id);
        // T1-04: same period-wide lock as completeProcessing — the legacy sync
        // path must serialize with the async consumer path on the same period.
        payrollPeriodLock.lockPeriod(payrollRun.getTenantId(),
                payrollRun.getPayPeriodYear(),
                payrollRun.getPayPeriodMonth());
        int generatedPayslips = generatePayslipsForRun(payrollRun);
        payrollRun.setTotalEmployees(generatedPayslips);
        payrollRun.process(processedBy, tenantTimeService.now(payrollRun.getTenantId()));
        return payrollRunRepository.save(payrollRun);
    }

    /**
     * Transition a payroll run from PROCESSED → APPROVED.
     * Uses pessimistic locking to prevent concurrent approval of the same run.
     * R2-011: State guard is enforced in {@link PayrollRun#approve}
     * (throws IllegalStateException if not in PROCESSED).
     */
    @Transactional(isolation = Isolation.REPEATABLE_READ)
    public PayrollRun approvePayrollRun(UUID id, UUID approvedBy) {
        PayrollRun payrollRun = getPayrollRunForUpdate(id);
        payrollRun.approve(approvedBy, tenantTimeService.now(payrollRun.getTenantId()));
        return payrollRunRepository.save(payrollRun);
    }

    /**
     * Transition a payroll run from APPROVED → LOCKED.
     * Uses pessimistic locking to prevent concurrent lock operations.
     * R2-011 FIX: Added missing {@code @Transactional} annotation — without it the
     * {@code save()} call ran outside a transaction and was silently ignored on
     * read-only connections, leaving the payroll run in APPROVED status.
     * State guard is enforced in {@link PayrollRun#lock}
     * (throws IllegalStateException if not in APPROVED).
     */
    @Transactional(isolation = Isolation.REPEATABLE_READ)
    public PayrollRun lockPayrollRun(UUID id) {
        PayrollRun payrollRun = getPayrollRunForUpdate(id);
        payrollRun.lock();
        return payrollRunRepository.save(payrollRun);
    }

    /**
     * Acquire a pessimistic write lock on a payroll run for state transitions.
     * Blocks concurrent reads/writes on the same row until the transaction commits.
     * This prevents race conditions where two concurrent requests both see
     * the run in DRAFT status and both try to process it.
     */
    private PayrollRun getPayrollRunForUpdate(UUID id) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return payrollRunRepository.findByIdAndTenantIdForUpdate(id, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Payroll run not found"));
    }

    private int generatePayslipsForRun(PayrollRun payrollRun) {
        UUID tenantId = payrollRun.getTenantId();
        List<Employee> activeEmployees = employeeRepository.findByTenantId(tenantId).stream()
                .filter(employee -> employee.getStatus() == Employee.EmployeeStatus.ACTIVE)
                .toList();

        int generated = 0;
        for (Employee employee : activeEmployees) {
            if (payslipRepository.existsByTenantIdAndEmployeeIdAndPayPeriodYearAndPayPeriodMonth(
                    tenantId,
                    employee.getId(),
                    payrollRun.getPayPeriodYear(),
                    payrollRun.getPayPeriodMonth())) {
                generated++;
                continue;
            }

            salaryStructureRepository.findActiveByEmployeeIdAndDate(
                    tenantId, employee.getId(), payrollRun.getPayrollDate()
            ).ifPresent(structure -> {
                Payslip payslip = Payslip.builder()
                        .payrollRunId(payrollRun.getId())
                        .employeeId(employee.getId())
                        .payPeriodMonth(payrollRun.getPayPeriodMonth())
                        .payPeriodYear(payrollRun.getPayPeriodYear())
                        .payDate(payrollRun.getPayrollDate())
                        .basicSalary(defaultAmount(structure.getBasicSalary()))
                        .hra(defaultAmount(structure.getHra()))
                        .conveyanceAllowance(defaultAmount(structure.getConveyanceAllowance()))
                        .medicalAllowance(defaultAmount(structure.getMedicalAllowance()))
                        .specialAllowance(defaultAmount(structure.getSpecialAllowance()))
                        .otherAllowances(defaultAmount(structure.getOtherAllowances()))
                        .providentFund(defaultAmount(structure.getProvidentFund()))
                        .professionalTax(defaultAmount(structure.getProfessionalTax()))
                        .incomeTax(defaultAmount(structure.getIncomeTax()))
                        .otherDeductions(defaultAmount(structure.getOtherDeductions()))
                        .workingDays(30)
                        .presentDays(30)
                        .leaveDays(0)
                        .build();
                payslip.setTenantId(tenantId);
                payslip.calculateTotals();
                payslipRepository.save(payslip);
            });
            if (payslipRepository.existsByTenantIdAndEmployeeIdAndPayPeriodYearAndPayPeriodMonth(
                    tenantId,
                    employee.getId(),
                    payrollRun.getPayPeriodYear(),
                    payrollRun.getPayPeriodMonth())) {
                generated++;
            }
        }
        return generated;
    }

    private BigDecimal defaultAmount(BigDecimal amount) {
        return amount != null ? amount : BigDecimal.ZERO;
    }

    @Transactional(isolation = Isolation.REPEATABLE_READ)
    public void deletePayrollRun(UUID id) {
        PayrollRun payrollRun = getPayrollRunById(id);

        if (payrollRun.getStatus() == PayrollStatus.LOCKED) {
            throw new IllegalStateException("Cannot delete locked payroll run");
        }

        payrollRun.softDelete();
        payrollRunRepository.save(payrollRun);

        auditLogService.logAction(
                "PAYROLL_RUN",
                payrollRun.getId(),
                AuditAction.DELETE,
                Map.of("period", payrollRun.getPayPeriodYear() + "-" + payrollRun.getPayPeriodMonth(),
                        "status", payrollRun.getStatus().name()),
                null,
                "Payroll run soft-deleted for period " + payrollRun.getPayPeriodYear() + "/" + payrollRun.getPayPeriodMonth()
        );
    }
}
