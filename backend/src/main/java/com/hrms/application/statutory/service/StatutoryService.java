package com.hrms.application.statutory.service;

import com.hrms.common.security.TenantContext;
import com.hrms.domain.statutory.*;
import com.hrms.infrastructure.statutory.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Service layer for statutory compliance operations.
 * Handles TDS, Professional Tax, Provident Fund, ESI, and monthly contributions.
 * This service follows hexagonal architecture by acting as the application layer
 * between controllers (API layer) and repositories (infrastructure layer).
 */
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class StatutoryService {

    private final TDSSlabRepository tdsSlabRepository;
    private final EmployeeTDSDeclarationRepository tdsDeclarationRepository;
    private final ProfessionalTaxSlabRepository ptSlabRepository;
    private final ProvidentFundConfigRepository pfConfigRepository;
    private final EmployeePFRecordRepository employeePFRecordRepository;
    private final ESIConfigRepository esiConfigRepository;
    private final EmployeeESIRecordRepository employeeESIRecordRepository;
    private final MonthlyStatutoryContributionRepository contributionRepository;

    // ==================== TDS Operations ====================

    /**
     * Creates a new TDS slab for the current tenant.
     *
     * @param slab the TDS slab to create
     * @return the created TDS slab with generated ID
     */
    @Transactional
    public TDSSlab createTDSSlab(TDSSlab slab) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        slab.setId(UUID.randomUUID());
        slab.setTenantId(tenantId);
        log.info("Creating TDS slab for tenant {} with assessment year {} and regime {}",
                tenantId, slab.getAssessmentYear(), slab.getTaxRegime());
        return tdsSlabRepository.save(slab);
    }

    /**
     * Retrieves TDS slabs by assessment year and tax regime for the current tenant.
     *
     * @param assessmentYear the assessment year (e.g., "2024-25")
     * @param regime         the tax regime (OLD_REGIME or NEW_REGIME)
     * @return list of active TDS slabs matching the criteria
     */
    @Transactional(readOnly = true)
    public List<TDSSlab> getTDSSlabs(String assessmentYear, TDSSlab.TaxRegime regime) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        log.debug("Fetching TDS slabs for tenant {} with year {} and regime {}",
                tenantId, assessmentYear, regime);
        return tdsSlabRepository.findByTenantIdAndAssessmentYearAndTaxRegimeAndIsActiveTrue(
                tenantId, assessmentYear, regime);
    }

    /**
     * Submits a TDS declaration for an employee.
     *
     * @param declaration the TDS declaration to submit
     * @return the submitted declaration with generated ID and submission timestamp
     */
    @Transactional
    public EmployeeTDSDeclaration submitTDSDeclaration(EmployeeTDSDeclaration declaration) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        declaration.setId(UUID.randomUUID());
        declaration.setTenantId(tenantId);
        declaration.setSubmittedAt(LocalDateTime.now());
        log.info("Submitting TDS declaration for employee {} for financial year {}",
                declaration.getEmployeeId(), declaration.getFinancialYear());
        return tdsDeclarationRepository.save(declaration);
    }

    /**
     * Retrieves a TDS declaration for an employee and financial year.
     *
     * @param employeeId    the employee ID
     * @param financialYear the financial year (e.g., "2024-25")
     * @return the TDS declaration if found
     */
    @Transactional(readOnly = true)
    public Optional<EmployeeTDSDeclaration> getTDSDeclaration(UUID employeeId, String financialYear) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        log.debug("Fetching TDS declaration for employee {} for financial year {}",
                employeeId, financialYear);
        return tdsDeclarationRepository.findByTenantIdAndEmployeeIdAndFinancialYear(
                tenantId, employeeId, financialYear);
    }

    /**
     * Approves a TDS declaration.
     *
     * @param declarationId the declaration ID
     * @param approverId    the approver's user ID
     * @return the approved declaration if found
     */
    @Transactional
    public Optional<EmployeeTDSDeclaration> approveTDSDeclaration(UUID declarationId, UUID approverId) {
        log.info("Approving TDS declaration {} by approver {}", declarationId, approverId);
        return tdsDeclarationRepository.findById(declarationId)
                .map(decl -> {
                    decl.setStatus(EmployeeTDSDeclaration.DeclarationStatus.APPROVED);
                    decl.setApprovedAt(LocalDateTime.now());
                    decl.setApprovedBy(approverId);
                    return tdsDeclarationRepository.save(decl);
                });
    }

    // ==================== Professional Tax Operations ====================

    /**
     * Creates a Professional Tax slab for a state.
     *
     * @param slab the PT slab to create
     * @return the created PT slab with generated ID
     */
    @Transactional
    public ProfessionalTaxSlab createPTSlab(ProfessionalTaxSlab slab) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        slab.setId(UUID.randomUUID());
        slab.setTenantId(tenantId);
        log.info("Creating PT slab for tenant {} with state code {}",
                tenantId, slab.getStateCode());
        return ptSlabRepository.save(slab);
    }

    /**
     * Retrieves active Professional Tax slabs by state code.
     *
     * @param stateCode the state code
     * @return list of active PT slabs for the state
     */
    @Transactional(readOnly = true)
    public List<ProfessionalTaxSlab> getPTSlabsByState(String stateCode) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        log.debug("Fetching PT slabs for tenant {} with state code {}", tenantId, stateCode);
        return ptSlabRepository.findByTenantIdAndStateCodeAndIsActiveTrue(tenantId, stateCode);
    }

    // ==================== Provident Fund Operations ====================

    /**
     * Creates a Provident Fund configuration.
     *
     * @param config the PF configuration to create
     * @return the created PF configuration with generated ID
     */
    @Transactional
    public ProvidentFundConfig createPFConfig(ProvidentFundConfig config) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        config.setId(UUID.randomUUID());
        config.setTenantId(tenantId);
        log.info("Creating PF config for tenant {}", tenantId);
        return pfConfigRepository.save(config);
    }

    /**
     * Retrieves active Provident Fund configurations.
     *
     * @return list of active PF configurations for the current tenant
     */
    @Transactional(readOnly = true)
    public List<ProvidentFundConfig> getActivePFConfigs() {
        UUID tenantId = TenantContext.requireCurrentTenant();
        log.debug("Fetching active PF configs for tenant {}", tenantId);
        return pfConfigRepository.findByTenantIdAndIsActiveTrue(tenantId);
    }

    /**
     * Enrolls an employee in Provident Fund.
     *
     * @param record the employee PF record to create
     * @return the created PF record with generated ID
     */
    public EmployeePFRecord enrollEmployeePF(EmployeePFRecord record) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        record.setId(UUID.randomUUID());
        record.setTenantId(tenantId);
        log.info("Enrolling employee {} in PF for tenant {}", record.getEmployeeId(), tenantId);
        return employeePFRecordRepository.save(record);
    }

    /**
     * Retrieves an employee's PF record.
     *
     * @param employeeId the employee ID
     * @return the employee's PF record if found
     */
    @Transactional(readOnly = true)
    public Optional<EmployeePFRecord> getEmployeePFRecord(UUID employeeId) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        log.debug("Fetching PF record for employee {} in tenant {}", employeeId, tenantId);
        return employeePFRecordRepository.findByTenantIdAndEmployeeId(tenantId, employeeId);
    }

    // ==================== ESI Operations ====================

    /**
     * Creates an ESI configuration.
     *
     * @param config the ESI configuration to create
     * @return the created ESI configuration with generated ID
     */
    @Transactional
    public ESIConfig createESIConfig(ESIConfig config) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        config.setId(UUID.randomUUID());
        config.setTenantId(tenantId);
        log.info("Creating ESI config for tenant {}", tenantId);
        return esiConfigRepository.save(config);
    }

    /**
     * Retrieves active ESI configurations.
     *
     * @return list of active ESI configurations for the current tenant
     */
    @Transactional(readOnly = true)
    public List<ESIConfig> getActiveESIConfigs() {
        UUID tenantId = TenantContext.requireCurrentTenant();
        log.debug("Fetching active ESI configs for tenant {}", tenantId);
        return esiConfigRepository.findByTenantIdAndIsActiveTrue(tenantId);
    }

    /**
     * Enrolls an employee in ESI.
     *
     * @param record the employee ESI record to create
     * @return the created ESI record with generated ID
     */
    public EmployeeESIRecord enrollEmployeeESI(EmployeeESIRecord record) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        record.setId(UUID.randomUUID());
        record.setTenantId(tenantId);
        log.info("Enrolling employee {} in ESI for tenant {}", record.getEmployeeId(), tenantId);
        return employeeESIRecordRepository.save(record);
    }

    /**
     * Retrieves an employee's ESI record.
     *
     * @param employeeId the employee ID
     * @return the employee's ESI record if found
     */
    @Transactional(readOnly = true)
    public Optional<EmployeeESIRecord> getEmployeeESIRecord(UUID employeeId) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        log.debug("Fetching ESI record for employee {} in tenant {}", employeeId, tenantId);
        return employeeESIRecordRepository.findByTenantIdAndEmployeeId(tenantId, employeeId);
    }

    // ==================== Monthly Contribution Operations ====================

    /**
     * Retrieves monthly statutory contributions for an employee.
     *
     * @param employeeId the employee ID
     * @return list of contributions ordered by year and month descending
     */
    @Transactional(readOnly = true)
    public List<MonthlyStatutoryContribution> getEmployeeContributions(UUID employeeId) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        log.debug("Fetching contributions for employee {} in tenant {}", employeeId, tenantId);
        return contributionRepository.findByTenantIdAndEmployeeIdOrderByYearDescMonthDesc(
                tenantId, employeeId);
    }

    /**
     * Retrieves monthly statutory contributions for a specific month and year.
     *
     * @param month the month (1-12)
     * @param year  the year
     * @return list of contributions for the specified period
     */
    @Transactional(readOnly = true)
    public List<MonthlyStatutoryContribution> getMonthlyContributions(Integer month, Integer year) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        log.debug("Fetching contributions for month {}/{} in tenant {}", month, year, tenantId);
        return contributionRepository.findByTenantIdAndMonthAndYear(tenantId, month, year);
    }

    /**
     * Retrieves a contribution by payslip ID.
     *
     * @param payslipId the payslip ID
     * @return the contribution linked to the payslip if found
     */
    @Transactional(readOnly = true)
    public Optional<MonthlyStatutoryContribution> getContributionByPayslip(UUID payslipId) {
        log.debug("Fetching contribution for payslip {}", payslipId);
        return contributionRepository.findByPayslipId(payslipId);
    }
}
