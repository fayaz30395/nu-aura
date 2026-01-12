package com.hrms.application.payroll.service;

import com.hrms.common.security.TenantContext;
import com.hrms.domain.payroll.SalaryStructure;
import com.hrms.infrastructure.payroll.repository.SalaryStructureRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class SalaryStructureService {

    private final SalaryStructureRepository salaryStructureRepository;

    public SalaryStructure createSalaryStructure(SalaryStructure salaryStructure) {
        UUID tenantId = TenantContext.getCurrentTenant();
        salaryStructure.setTenantId(tenantId);

        if (salaryStructureRepository.existsByTenantIdAndEmployeeIdAndEffectiveDate(
                tenantId,
                salaryStructure.getEmployeeId(),
                salaryStructure.getEffectiveDate())) {
            throw new IllegalArgumentException("Salary structure already exists for this employee and date");
        }

        return salaryStructureRepository.save(salaryStructure);
    }

    public SalaryStructure updateSalaryStructure(UUID id, SalaryStructure salaryStructureData) {
        UUID tenantId = TenantContext.getCurrentTenant();

        SalaryStructure salaryStructure = salaryStructureRepository.findById(id)
                .filter(s -> s.getTenantId().equals(tenantId))
                .orElseThrow(() -> new IllegalArgumentException("Salary structure not found"));

        salaryStructure.setEmployeeId(salaryStructureData.getEmployeeId());
        salaryStructure.setEffectiveDate(salaryStructureData.getEffectiveDate());
        salaryStructure.setBasicSalary(salaryStructureData.getBasicSalary());
        salaryStructure.setHra(salaryStructureData.getHra());
        salaryStructure.setConveyanceAllowance(salaryStructureData.getConveyanceAllowance());
        salaryStructure.setMedicalAllowance(salaryStructureData.getMedicalAllowance());
        salaryStructure.setSpecialAllowance(salaryStructureData.getSpecialAllowance());
        salaryStructure.setOtherAllowances(salaryStructureData.getOtherAllowances());
        salaryStructure.setProvidentFund(salaryStructureData.getProvidentFund());
        salaryStructure.setProfessionalTax(salaryStructureData.getProfessionalTax());
        salaryStructure.setIncomeTax(salaryStructureData.getIncomeTax());
        salaryStructure.setOtherDeductions(salaryStructureData.getOtherDeductions());
        salaryStructure.setIsActive(salaryStructureData.getIsActive());

        return salaryStructureRepository.save(salaryStructure);
    }

    @Transactional(readOnly = true)
    public SalaryStructure getSalaryStructureById(UUID id) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return salaryStructureRepository.findById(id)
                .filter(s -> s.getTenantId().equals(tenantId))
                .orElseThrow(() -> new IllegalArgumentException("Salary structure not found"));
    }

    @Transactional(readOnly = true)
    public Page<SalaryStructure> getAllSalaryStructures(Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return salaryStructureRepository.findAllByTenantId(tenantId, pageable);
    }

    @Transactional(readOnly = true)
    public List<SalaryStructure> getSalaryStructuresByEmployeeId(UUID employeeId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return salaryStructureRepository.findAllByTenantIdAndEmployeeId(tenantId, employeeId);
    }

    @Transactional(readOnly = true)
    public SalaryStructure getActiveSalaryStructure(UUID employeeId, LocalDate date) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return salaryStructureRepository.findActiveByEmployeeIdAndDate(tenantId, employeeId, date)
                .orElseThrow(() -> new IllegalArgumentException("No active salary structure found for employee"));
    }

    @Transactional(readOnly = true)
    public Page<SalaryStructure> getActiveSalaryStructures(Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return salaryStructureRepository.findAllByTenantIdAndIsActive(tenantId, true, pageable);
    }

    public void deleteSalaryStructure(UUID id) {
        SalaryStructure salaryStructure = getSalaryStructureById(id);
        salaryStructureRepository.delete(salaryStructure);
    }

    public SalaryStructure deactivateSalaryStructure(UUID id) {
        SalaryStructure salaryStructure = getSalaryStructureById(id);
        salaryStructure.setIsActive(false);
        return salaryStructureRepository.save(salaryStructure);
    }
}
