package com.hrms.application.payroll.service;

import com.hrms.common.security.TenantContext;
import com.hrms.domain.payroll.Payslip;
import com.hrms.infrastructure.payroll.repository.PayslipRepository;
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
public class PayslipService {

    private final PayslipRepository payslipRepository;

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

    public void deletePayslip(UUID id) {
        Payslip payslip = getPayslipById(id);
        payslipRepository.delete(payslip);
    }
}
