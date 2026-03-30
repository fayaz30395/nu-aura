package com.hrms.application.payroll.service;

import com.hrms.application.audit.service.AuditLogService;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.audit.AuditLog.AuditAction;
import com.hrms.domain.payroll.SalaryStructure;
import com.hrms.infrastructure.payroll.repository.SalaryStructureRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Transactional
@Slf4j
public class SalaryStructureService {

    private final SalaryStructureRepository salaryStructureRepository;
    private final AuditLogService auditLogService;

    @Transactional
    public SalaryStructure createSalaryStructure(SalaryStructure salaryStructure) {
        UUID tenantId = TenantContext.getCurrentTenant();
        salaryStructure.setTenantId(tenantId);

        if (salaryStructureRepository.existsByTenantIdAndEmployeeIdAndEffectiveDate(
                tenantId,
                salaryStructure.getEmployeeId(),
                salaryStructure.getEffectiveDate())) {
            throw new IllegalArgumentException("Salary structure already exists for this employee and date");
        }

        SalaryStructure saved = salaryStructureRepository.save(salaryStructure);

        auditLogService.logAction(
                "SALARY_STRUCTURE",
                saved.getId(),
                AuditAction.CREATE,
                null,
                Map.of(
                        "employeeId", saved.getEmployeeId(),
                        "basicSalary", saved.getBasicSalary(),
                        "effectiveDate", saved.getEffectiveDate()
                ),
                "Salary structure created for employee " + saved.getEmployeeId() +
                " - Basic: " + saved.getBasicSalary() + ", Effective: " + saved.getEffectiveDate()
        );

        return saved;
    }

    @Transactional
    public SalaryStructure updateSalaryStructure(UUID id, SalaryStructure salaryStructureData) {
        UUID tenantId = TenantContext.getCurrentTenant();

        SalaryStructure salaryStructure = salaryStructureRepository.findById(id)
                .filter(s -> s.getTenantId().equals(tenantId))
                .orElseThrow(() -> new IllegalArgumentException("Salary structure not found"));

        // Capture previous values for audit trail
        BigDecimal previousBasicSalary = salaryStructure.getBasicSalary();
        BigDecimal previousHra = salaryStructure.getHra();

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

        SalaryStructure saved = salaryStructureRepository.save(salaryStructure);

        auditLogService.logAction(
                "SALARY_STRUCTURE",
                id,
                AuditAction.UPDATE,
                Map.of(
                        "basicSalary", previousBasicSalary != null ? previousBasicSalary : BigDecimal.ZERO,
                        "hra", previousHra != null ? previousHra : BigDecimal.ZERO
                ),
                Map.of(
                        "basicSalary", saved.getBasicSalary() != null ? saved.getBasicSalary() : BigDecimal.ZERO,
                        "hra", saved.getHra() != null ? saved.getHra() : BigDecimal.ZERO
                ),
                "Salary structure updated for employee " + saved.getEmployeeId() +
                " - Basic: " + previousBasicSalary + " → " + saved.getBasicSalary()
        );

        return saved;
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

    @Transactional
    public void deleteSalaryStructure(UUID id) {
        SalaryStructure salaryStructure = getSalaryStructureById(id);

        salaryStructure.softDelete();
        salaryStructureRepository.save(salaryStructure);

        auditLogService.logAction(
                "SALARY_STRUCTURE",
                id,
                AuditAction.DELETE,
                Map.of("employeeId", salaryStructure.getEmployeeId(), "basicSalary", salaryStructure.getBasicSalary()),
                null,
                "Salary structure soft-deleted for employee " + salaryStructure.getEmployeeId()
        );
    }

    public SalaryStructure deactivateSalaryStructure(UUID id) {
        SalaryStructure salaryStructure = getSalaryStructureById(id);
        salaryStructure.setIsActive(false);
        SalaryStructure saved = salaryStructureRepository.save(salaryStructure);

        auditLogService.logAction(
                "SALARY_STRUCTURE",
                id,
                AuditAction.STATUS_CHANGE,
                "ACTIVE",
                "INACTIVE",
                "Salary structure deactivated for employee " + salaryStructure.getEmployeeId()
        );

        return saved;
    }

    /**
     * Assigns default salary structure to an employee if available.
     * This is optional and depends on organization policy.
     * If no default structure exists, HR will assign manually.
     *
     * @param employee the employee to assign default structure to
     */
    @Transactional
    public void assignDefaultStructureIfAvailable(com.hrms.domain.employee.Employee employee) {
        // Optional: Implement default structure assignment based on:
        // - Employee designation
        // - Employee department
        // - Employment type
        // For now, this is a no-op - organizations will define their own defaults
        log.debug("Default salary structure assignment not configured for employee {}", employee.getId());
    }

    /**
     * Gets monthly gross salary for an employee for statutory eligibility checks.
     * Returns the gross salary from the most recent active salary structure.
     *
     * @param employeeId the employee ID
     * @return Optional containing monthly salary, or empty if no salary structure exists
     */
    @Transactional(readOnly = true)
    public Optional<BigDecimal> getMonthlySalaryForEmployee(UUID employeeId) {
        UUID tenantId = TenantContext.getCurrentTenant();

        // Get the most recent active salary structure
        return salaryStructureRepository
                .findLatestActiveByTenantIdAndEmployeeId(tenantId, employeeId)
                .map(structure -> {
                    // Calculate gross salary as sum of all components
                    BigDecimal gross = structure.getBasicSalary();
                    if (structure.getHra() != null) {
                        gross = gross.add(structure.getHra());
                    }
                    if (structure.getConveyanceAllowance() != null) {
                        gross = gross.add(structure.getConveyanceAllowance());
                    }
                    if (structure.getMedicalAllowance() != null) {
                        gross = gross.add(structure.getMedicalAllowance());
                    }
                    if (structure.getSpecialAllowance() != null) {
                        gross = gross.add(structure.getSpecialAllowance());
                    }
                    if (structure.getOtherAllowances() != null) {
                        gross = gross.add(structure.getOtherAllowances());
                    }
                    return gross;
                });
    }
}
