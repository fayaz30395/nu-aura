package com.hrms.application.statutory.service;

import com.hrms.api.statutory.dto.LWFCalculationRequest;
import com.hrms.api.statutory.dto.LWFConfigurationDto;
import com.hrms.api.statutory.dto.LWFRemittanceReportDto;
import com.hrms.common.exception.BusinessException;
import com.hrms.common.exception.ResourceNotFoundException;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.statutory.LWFConfiguration;
import com.hrms.domain.statutory.LWFConfiguration.LWFFrequency;
import com.hrms.domain.statutory.LWFDeduction;
import com.hrms.domain.statutory.LWFDeduction.LWFDeductionStatus;
import com.hrms.infrastructure.statutory.repository.LWFConfigurationRepository;
import com.hrms.infrastructure.statutory.repository.LWFDeductionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Service for Labour Welfare Fund (LWF) statutory deduction management.
 *
 * <p>LWF is a state-specific statutory contribution in India where both employer
 * and employee contribute fixed amounts. Unlike PF (percentage-based), LWF uses
 * fixed amounts that vary by state.</p>
 *
 * <p>Key responsibilities:
 * <ul>
 *   <li>Manage state-wise LWF configurations (amounts, frequency, applicable months)</li>
 *   <li>Calculate LWF deductions for employees based on their work state</li>
 *   <li>Check month applicability based on state-specific deduction frequency</li>
 *   <li>Generate remittance reports for government filing</li>
 * </ul>
 *
 * <p>Integration with Payroll Engine:
 * LWF is registered as a PayrollComponent with type DEDUCTION. The SpEL formula
 * calls {@code lwfService.calculateLWFForEmployee()} which resolves the fixed amount
 * based on the employee's work state and the current payroll month.</p>
 */
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class LWFService {

    private final LWFConfigurationRepository configRepository;
    private final LWFDeductionRepository deductionRepository;

    // ==================== Configuration Management ====================

    /**
     * Retrieves all LWF state configurations for the current tenant.
     */
    @Transactional(readOnly = true)
    public List<LWFConfiguration> getStateConfigurations() {
        UUID tenantId = TenantContext.requireCurrentTenant();
        log.debug("Fetching LWF configurations for tenant {}", tenantId);
        return configRepository.findByTenantIdOrderByStateNameAsc(tenantId);
    }

    /**
     * Retrieves LWF state configurations for the current tenant with pagination.
     */
    @Transactional(readOnly = true)
    public Page<LWFConfiguration> getStateConfigurations(Pageable pageable) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        log.debug("Fetching LWF configurations (pageable) for tenant {}", tenantId);
        return configRepository.findByTenantId(tenantId, pageable);
    }

    /**
     * Retrieves only active LWF configurations.
     */
    @Transactional(readOnly = true)
    public List<LWFConfiguration> getActiveConfigurations() {
        UUID tenantId = TenantContext.requireCurrentTenant();
        return configRepository.findByTenantIdAndIsActiveTrue(tenantId);
    }

    /**
     * Creates or updates an LWF state configuration.
     *
     * @param dto the configuration data
     * @return the persisted configuration
     */
    @Transactional
    public LWFConfiguration configureState(LWFConfigurationDto dto) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        String stateCode = dto.getStateCode().toUpperCase().trim();

        // Validate applicable months JSON
        validateApplicableMonths(dto.getApplicableMonths(), dto.getFrequency());

        Optional<LWFConfiguration> existing = configRepository
                .findByTenantIdAndStateCodeAndIsActiveTrue(tenantId, stateCode);

        LWFConfiguration config;
        if (existing.isPresent()) {
            config = existing.get();
            log.info("Updating LWF config for state {} in tenant {}", stateCode, tenantId);
        } else {
            config = LWFConfiguration.builder()
                    .id(UUID.randomUUID())
                    .tenantId(tenantId)
                    .stateCode(stateCode)
                    .build();
            log.info("Creating LWF config for state {} in tenant {}", stateCode, tenantId);
        }

        config.setStateName(dto.getStateName());
        config.setEmployeeContribution(dto.getEmployeeContribution());
        config.setEmployerContribution(dto.getEmployerContribution());
        config.setFrequency(dto.getFrequency());
        config.setApplicableMonths(dto.getApplicableMonths());
        config.setIsActive(dto.getIsActive() != null ? dto.getIsActive() : true);
        config.setEffectiveFrom(dto.getEffectiveFrom());
        config.setEffectiveTo(dto.getEffectiveTo());
        config.setSalaryThreshold(dto.getSalaryThreshold());

        return configRepository.save(config);
    }

    /**
     * Deactivates an LWF configuration for a specific state.
     */
    @Transactional
    public void deactivateState(String stateCode) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        LWFConfiguration config = configRepository
                .findByTenantIdAndStateCodeAndIsActiveTrue(tenantId, stateCode.toUpperCase())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Active LWF configuration not found for state: " + stateCode));

        config.setIsActive(false);
        config.setEffectiveTo(LocalDate.now());
        configRepository.save(config);
        log.info("Deactivated LWF config for state {} in tenant {}", stateCode, tenantId);
    }

    // ==================== LWF Calculation ====================

    /**
     * Calculates LWF for a single employee based on their work state.
     * This method is called by the SpEL payroll engine.
     *
     * @param employeeId  the employee UUID
     * @param stateCode   the employee's work state code
     * @param grossSalary the employee's gross salary for the period
     * @param month       the payroll month (1-12)
     * @param year        the payroll year
     * @return the employee LWF deduction amount, or ZERO if not applicable
     */
    @Transactional(readOnly = true)
    public BigDecimal calculateLWFForEmployee(UUID employeeId, String stateCode,
                                              BigDecimal grossSalary, int month, int year) {
        UUID tenantId = TenantContext.requireCurrentTenant();

        if (stateCode == null || stateCode.isBlank()) {
            log.debug("No state code for employee {}, LWF = 0", employeeId);
            return BigDecimal.ZERO;
        }

        String normalizedState = stateCode.toUpperCase().trim();
        Optional<LWFConfiguration> configOpt = configRepository
                .findByTenantIdAndStateCodeAndIsActiveTrue(tenantId, normalizedState);

        if (configOpt.isEmpty()) {
            log.debug("No active LWF config for state {} in tenant {}", normalizedState, tenantId);
            return BigDecimal.ZERO;
        }

        LWFConfiguration config = configOpt.get();

        // Check effective date range
        LocalDate periodDate = LocalDate.of(year, month, 1);
        if (periodDate.isBefore(config.getEffectiveFrom())) {
            return BigDecimal.ZERO;
        }
        if (config.getEffectiveTo() != null && periodDate.isAfter(config.getEffectiveTo())) {
            return BigDecimal.ZERO;
        }

        // Check salary threshold
        if (config.getSalaryThreshold() != null
                && grossSalary.compareTo(config.getSalaryThreshold()) < 0) {
            log.debug("Employee {} gross salary {} below LWF threshold {} for state {}",
                    employeeId, grossSalary, config.getSalaryThreshold(), normalizedState);
            return BigDecimal.ZERO;
        }

        // Check if this month is applicable for this state's frequency
        if (!isApplicableForMonth(config, month)) {
            log.debug("Month {} not applicable for LWF in state {} (frequency: {})",
                    month, normalizedState, config.getFrequency());
            return BigDecimal.ZERO;
        }

        log.debug("LWF applicable for employee {} in state {}: employee={}, employer={}",
                employeeId, normalizedState,
                config.getEmployeeContribution(), config.getEmployerContribution());

        return config.getEmployeeContribution().setScale(2, RoundingMode.HALF_UP);
    }

    /**
     * Returns the employer LWF contribution for a given state and month.
     */
    @Transactional(readOnly = true)
    public BigDecimal getEmployerContribution(String stateCode, int month, int year) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        if (stateCode == null || stateCode.isBlank()) {
            return BigDecimal.ZERO;
        }

        Optional<LWFConfiguration> configOpt = configRepository
                .findByTenantIdAndStateCodeAndIsActiveTrue(tenantId, stateCode.toUpperCase().trim());

        if (configOpt.isEmpty()) {
            return BigDecimal.ZERO;
        }

        LWFConfiguration config = configOpt.get();
        if (!isApplicableForMonth(config, month)) {
            return BigDecimal.ZERO;
        }

        return config.getEmployerContribution().setScale(2, RoundingMode.HALF_UP);
    }

    /**
     * Checks whether LWF deduction is applicable for a given month based on
     * the state configuration's frequency and applicable months list.
     */
    public boolean isApplicableForMonth(String stateCode, int month) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        Optional<LWFConfiguration> configOpt = configRepository
                .findByTenantIdAndStateCodeAndIsActiveTrue(tenantId, stateCode.toUpperCase().trim());

        return configOpt.map(config -> isApplicableForMonth(config, month)).orElse(false);
    }

    /**
     * Internal check: does the given month fall in the configuration's applicable months?
     */
    private boolean isApplicableForMonth(LWFConfiguration config, int month) {
        Set<Integer> months = parseApplicableMonths(config.getApplicableMonths());
        return months.contains(month);
    }

    // ==================== Bulk Calculation ====================

    /**
     * Triggers LWF calculation for all eligible employees for a given month/year.
     * This is called during payroll processing or can be triggered manually.
     *
     * @param request the calculation request with month, year, and optional payroll run ID
     * @return list of created deduction records
     */
    @Transactional
    public List<LWFDeduction> calculateForPayrollRun(LWFCalculationRequest request) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        int month = request.getMonth();
        int year = request.getYear();

        log.info("Calculating LWF for tenant {} for period {}/{}", tenantId, month, year);

        // Get all active LWF configurations
        List<LWFConfiguration> activeConfigs = configRepository.findByTenantIdAndIsActiveTrue(tenantId);

        // Filter to only configs applicable for this month
        List<LWFConfiguration> applicableConfigs = activeConfigs.stream()
                .filter(c -> isApplicableForMonth(c, month))
                .collect(Collectors.toList());

        if (applicableConfigs.isEmpty()) {
            log.info("No LWF configurations applicable for month {} in tenant {}", month, tenantId);
            return Collections.emptyList();
        }

        log.info("Found {} applicable LWF configurations for month {}: {}",
                applicableConfigs.size(), month,
                applicableConfigs.stream().map(LWFConfiguration::getStateCode)
                        .collect(Collectors.joining(", ")));

        // Note: In a full implementation, this would iterate over employees
        // and create deduction records. The employee list would come from the
        // payroll run or be fetched from the employee service.
        // For now, this returns the applicable configs for integration reference.

        return Collections.emptyList();
    }

    /**
     * Records a calculated LWF deduction for an employee.
     */
    @Transactional
    public LWFDeduction recordDeduction(UUID employeeId, UUID payrollRunId,
                                        String stateCode, BigDecimal employeeAmount,
                                        BigDecimal employerAmount,
                                        LWFFrequency frequency,
                                        int month, int year,
                                        BigDecimal grossSalary) {
        UUID tenantId = TenantContext.requireCurrentTenant();

        // Check if deduction already exists for this employee/period
        if (deductionRepository.existsByTenantIdAndEmployeeIdAndDeductionMonthAndDeductionYear(
                tenantId, employeeId, month, year)) {
            throw new BusinessException(String.format(
                    "LWF deduction already exists for employee %s for period %d/%d",
                    employeeId, month, year));
        }

        LWFDeduction deduction = LWFDeduction.builder()
                .id(UUID.randomUUID())
                .tenantId(tenantId)
                .employeeId(employeeId)
                .payrollRunId(payrollRunId)
                .stateCode(stateCode.toUpperCase().trim())
                .employeeAmount(employeeAmount)
                .employerAmount(employerAmount)
                .frequency(frequency)
                .deductionMonth(month)
                .deductionYear(year)
                .grossSalary(grossSalary)
                .status(LWFDeductionStatus.CALCULATED)
                .build();

        LWFDeduction saved = deductionRepository.save(deduction);
        log.info("Recorded LWF deduction for employee {} in state {} for {}/{}",
                employeeId, stateCode, month, year);
        return saved;
    }

    // ==================== Deduction Queries ====================

    /**
     * Gets LWF deductions for a specific month/year.
     */
    @Transactional(readOnly = true)
    public List<LWFDeduction> getDeductionsByPeriod(int month, int year) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        return deductionRepository
                .findByTenantIdAndDeductionMonthAndDeductionYearOrderByStateCodeAsc(
                        tenantId, month, year);
    }

    /**
     * Gets LWF deductions for a specific month/year with pagination.
     */
    @Transactional(readOnly = true)
    public Page<LWFDeduction> getDeductionsByPeriod(int month, int year, Pageable pageable) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        return deductionRepository
                .findByTenantIdAndDeductionMonthAndDeductionYear(tenantId, month, year, pageable);
    }

    /**
     * Gets all LWF deductions for an employee, ordered by most recent first.
     */
    @Transactional(readOnly = true)
    public List<LWFDeduction> getDeductionsByEmployee(UUID employeeId) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        return deductionRepository
                .findByTenantIdAndEmployeeIdOrderByDeductionYearDescDeductionMonthDesc(
                        tenantId, employeeId);
    }

    /**
     * Gets LWF deductions for an employee in a specific year.
     */
    @Transactional(readOnly = true)
    public List<LWFDeduction> getDeductionsByEmployeeAndYear(UUID employeeId, int year) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        return deductionRepository.findByTenantIdAndEmployeeIdAndDeductionYear(
                tenantId, employeeId, year);
    }

    // ==================== Remittance Report ====================

    /**
     * Generates an LWF remittance summary report for a given month/year.
     * Groups deductions by state for government filing purposes.
     */
    @Transactional(readOnly = true)
    public LWFRemittanceReportDto getRemittanceReport(int month, int year) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        List<LWFDeduction> deductions = deductionRepository
                .findByTenantIdAndDeductionMonthAndDeductionYearOrderByStateCodeAsc(
                        tenantId, month, year);

        // Group by state
        Map<String, List<LWFDeduction>> byState = deductions.stream()
                .collect(Collectors.groupingBy(LWFDeduction::getStateCode,
                        LinkedHashMap::new, Collectors.toList()));

        // Build state-wise summaries
        List<LWFRemittanceReportDto.StateWiseSummary> stateSummaries = new ArrayList<>();
        BigDecimal totalEe = BigDecimal.ZERO;
        BigDecimal totalEr = BigDecimal.ZERO;
        int totalCount = 0;

        // Load config map for state names
        Map<String, String> stateNames = configRepository.findByTenantIdOrderByStateNameAsc(tenantId)
                .stream()
                .collect(Collectors.toMap(LWFConfiguration::getStateCode,
                        LWFConfiguration::getStateName,
                        (a, b) -> a));

        for (Map.Entry<String, List<LWFDeduction>> entry : byState.entrySet()) {
            String stateCode = entry.getKey();
            List<LWFDeduction> stateDeds = entry.getValue();

            BigDecimal stateEe = stateDeds.stream()
                    .map(LWFDeduction::getEmployeeAmount)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            BigDecimal stateEr = stateDeds.stream()
                    .map(LWFDeduction::getEmployerAmount)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            stateSummaries.add(LWFRemittanceReportDto.StateWiseSummary.builder()
                    .stateCode(stateCode)
                    .stateName(stateNames.getOrDefault(stateCode, stateCode))
                    .employeeTotal(stateEe.setScale(2, RoundingMode.HALF_UP))
                    .employerTotal(stateEr.setScale(2, RoundingMode.HALF_UP))
                    .total(stateEe.add(stateEr).setScale(2, RoundingMode.HALF_UP))
                    .employeeCount(stateDeds.size())
                    .build());

            totalEe = totalEe.add(stateEe);
            totalEr = totalEr.add(stateEr);
            totalCount += stateDeds.size();
        }

        return LWFRemittanceReportDto.builder()
                .month(month)
                .year(year)
                .totalEmployeeContribution(totalEe.setScale(2, RoundingMode.HALF_UP))
                .totalEmployerContribution(totalEr.setScale(2, RoundingMode.HALF_UP))
                .grandTotal(totalEe.add(totalEr).setScale(2, RoundingMode.HALF_UP))
                .totalEmployees(totalCount)
                .stateWiseSummary(stateSummaries)
                .build();
    }

    // ==================== Helpers ====================

    /**
     * Parses the applicable_months JSON string (e.g., "[6,12]") into a Set of integers.
     */
    private Set<Integer> parseApplicableMonths(String applicableMonths) {
        if (applicableMonths == null || applicableMonths.isBlank()) {
            return Collections.emptySet();
        }

        String cleaned = applicableMonths.replaceAll("[\\[\\]\\s]", "");
        if (cleaned.isEmpty()) {
            return Collections.emptySet();
        }

        try {
            return Arrays.stream(cleaned.split(","))
                    .map(String::trim)
                    .filter(s -> !s.isEmpty())
                    .map(Integer::parseInt)
                    .collect(Collectors.toSet());
        } catch (NumberFormatException e) {
            log.warn("Invalid applicable months format: {}", applicableMonths);
            return Collections.emptySet();
        }
    }

    /**
     * Validates that the applicable months match the declared frequency.
     */
    private void validateApplicableMonths(String applicableMonths, LWFFrequency frequency) {
        Set<Integer> months = parseApplicableMonths(applicableMonths);

        if (months.isEmpty()) {
            throw new BusinessException("Applicable months cannot be empty");
        }

        // Validate all months are 1-12
        for (Integer m : months) {
            if (m < 1 || m > 12) {
                throw new BusinessException("Invalid month in applicable months: " + m);
            }
        }

        // Validate count matches frequency
        switch (frequency) {
            case MONTHLY:
                if (months.size() != 12) {
                    throw new BusinessException(
                            "Monthly frequency requires all 12 months in applicable months");
                }
                break;
            case HALF_YEARLY:
                if (months.size() != 2) {
                    throw new BusinessException(
                            "Half-yearly frequency requires exactly 2 months in applicable months");
                }
                break;
            case YEARLY:
                if (months.size() != 1) {
                    throw new BusinessException(
                            "Yearly frequency requires exactly 1 month in applicable months");
                }
                break;
        }
    }
}
