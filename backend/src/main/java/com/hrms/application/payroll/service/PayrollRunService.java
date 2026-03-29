package com.hrms.application.payroll.service;

import com.hrms.application.audit.service.AuditLogService;
import com.hrms.common.exception.ResourceNotFoundException;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.audit.AuditLog.AuditAction;
import com.hrms.domain.payroll.PayrollRun;
import com.hrms.domain.payroll.PayrollRun.PayrollStatus;
import com.hrms.infrastructure.payroll.repository.PayrollRunRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class PayrollRunService {

    private final PayrollRunRepository payrollRunRepository;
    private final AuditLogService auditLogService;

    /**
     * Create a new payroll run for a given period.
     * Uses pessimistic locking to prevent race conditions where two concurrent
     * requests both check existence and both create a run for the same period.
     */
    @Transactional(isolation = Isolation.REPEATABLE_READ)
    public PayrollRun createPayrollRun(PayrollRun payrollRun) {
        UUID tenantId = TenantContext.getCurrentTenant();
        payrollRun.setTenantId(tenantId);

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
     * Transition a payroll run from DRAFT → PROCESSED.
     * Uses pessimistic locking to prevent concurrent processing of the same run.
     * R2-011: State guard is enforced in {@link PayrollRun#process}
     * (throws IllegalStateException if not in DRAFT).
     */
    @Transactional(isolation = Isolation.REPEATABLE_READ)
    public PayrollRun processPayrollRun(UUID id, UUID processedBy) {
        PayrollRun payrollRun = getPayrollRunForUpdate(id);
        payrollRun.process(processedBy);
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
        payrollRun.approve(approvedBy);
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
                java.util.Map.of("period", payrollRun.getPayPeriodYear() + "-" + payrollRun.getPayPeriodMonth(),
                        "status", payrollRun.getStatus().name()),
                null,
                "Payroll run soft-deleted for period " + payrollRun.getPayPeriodYear() + "/" + payrollRun.getPayPeriodMonth()
        );
    }
}
