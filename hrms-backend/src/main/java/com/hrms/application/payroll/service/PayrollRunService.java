package com.hrms.application.payroll.service;

import com.hrms.common.security.TenantContext;
import com.hrms.domain.payroll.PayrollRun;
import com.hrms.domain.payroll.PayrollRun.PayrollStatus;
import com.hrms.infrastructure.payroll.repository.PayrollRunRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class PayrollRunService {

    private final PayrollRunRepository payrollRunRepository;

    public PayrollRun createPayrollRun(PayrollRun payrollRun) {
        UUID tenantId = TenantContext.getCurrentTenant();
        payrollRun.setTenantId(tenantId);

        if (payrollRunRepository.existsByTenantIdAndPayPeriodYearAndPayPeriodMonth(
                tenantId,
                payrollRun.getPayPeriodYear(),
                payrollRun.getPayPeriodMonth())) {
            throw new IllegalArgumentException("Payroll run already exists for this period");
        }

        return payrollRunRepository.save(payrollRun);
    }

    public PayrollRun updatePayrollRun(UUID id, PayrollRun payrollRunData) {
        UUID tenantId = TenantContext.getCurrentTenant();

        PayrollRun payrollRun = payrollRunRepository.findById(id)
                .filter(pr -> pr.getTenantId().equals(tenantId))
                .orElseThrow(() -> new IllegalArgumentException("Payroll run not found"));

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
                .orElseThrow(() -> new IllegalArgumentException("Payroll run not found"));
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
                .orElseThrow(() -> new IllegalArgumentException("Payroll run not found for this period"));
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

    public PayrollRun processPayrollRun(UUID id, UUID processedBy) {
        PayrollRun payrollRun = getPayrollRunById(id);
        payrollRun.process(processedBy);
        return payrollRunRepository.save(payrollRun);
    }

    public PayrollRun approvePayrollRun(UUID id, UUID approvedBy) {
        PayrollRun payrollRun = getPayrollRunById(id);
        payrollRun.approve(approvedBy);
        return payrollRunRepository.save(payrollRun);
    }

    public PayrollRun lockPayrollRun(UUID id) {
        PayrollRun payrollRun = getPayrollRunById(id);
        payrollRun.lock();
        return payrollRunRepository.save(payrollRun);
    }

    public void deletePayrollRun(UUID id) {
        PayrollRun payrollRun = getPayrollRunById(id);

        if (payrollRun.getStatus() == PayrollStatus.LOCKED) {
            throw new IllegalStateException("Cannot delete locked payroll run");
        }

        payrollRunRepository.delete(payrollRun);
    }
}
