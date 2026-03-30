package com.hrms.api.statutory.controller;

import com.hrms.api.statutory.dto.LWFCalculationRequest;
import com.hrms.api.statutory.dto.LWFConfigurationDto;
import com.hrms.api.statutory.dto.LWFDeductionDto;
import com.hrms.api.statutory.dto.LWFRemittanceReportDto;
import com.hrms.application.statutory.service.LWFService;
import com.hrms.common.security.Permission;
import com.hrms.common.security.RequiresPermission;
import com.hrms.domain.statutory.LWFConfiguration;
import com.hrms.domain.statutory.LWFDeduction;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * REST controller for Labour Welfare Fund (LWF) management.
 *
 * <p>Provides endpoints for:
 * <ul>
 *   <li>State-wise LWF configuration (CRUD)</li>
 *   <li>LWF deduction records (read, filter)</li>
 *   <li>Employee LWF history</li>
 *   <li>Remittance summary report for government filing</li>
 *   <li>Manual LWF calculation trigger</li>
 * </ul>
 */
@RestController
@RequestMapping("/api/v1/payroll/lwf")
@RequiredArgsConstructor
public class LWFController {

    private final LWFService lwfService;

    // ==================== Configuration Endpoints ====================

    /**
     * GET /api/v1/payroll/lwf/configurations
     * Lists LWF state configurations for the current tenant (paginated).
     */
    @GetMapping("/configurations")
    @RequiresPermission(Permission.STATUTORY_VIEW)
    public ResponseEntity<Page<LWFConfigurationDto>> getConfigurations(
            @PageableDefault(size = 20, sort = "stateName", direction = Sort.Direction.ASC) Pageable pageable) {
        return ResponseEntity.ok(lwfService.getStateConfigurations(pageable).map(this::toConfigDto));
    }

    /**
     * POST /api/v1/payroll/lwf/configurations
     * Creates or updates an LWF state configuration.
     */
    @PostMapping("/configurations")
    @RequiresPermission(value = Permission.STATUTORY_MANAGE, revalidate = true)
    public ResponseEntity<LWFConfigurationDto> createOrUpdateConfiguration(
            @Valid @RequestBody LWFConfigurationDto dto) {
        LWFConfiguration saved = lwfService.configureState(dto);
        return ResponseEntity.ok(toConfigDto(saved));
    }

    /**
     * DELETE /api/v1/payroll/lwf/configurations/{stateCode}
     * Deactivates an LWF configuration for a state.
     */
    @DeleteMapping("/configurations/{stateCode}")
    @RequiresPermission(value = Permission.STATUTORY_MANAGE, revalidate = true)
    public ResponseEntity<Void> deactivateConfiguration(@PathVariable String stateCode) {
        lwfService.deactivateState(stateCode);
        return ResponseEntity.noContent().build();
    }

    // ==================== Deduction Endpoints ====================

    /**
     * GET /api/v1/payroll/lwf/deductions?month=&year=
     * Lists LWF deductions for a given period (paginated).
     */
    @GetMapping("/deductions")
    @RequiresPermission(Permission.STATUTORY_VIEW)
    public ResponseEntity<Page<LWFDeductionDto>> getDeductions(
            @RequestParam Integer month,
            @RequestParam Integer year,
            @PageableDefault(size = 20, sort = "stateCode", direction = Sort.Direction.ASC) Pageable pageable) {
        return ResponseEntity.ok(lwfService.getDeductionsByPeriod(month, year, pageable).map(this::toDeductionDto));
    }

    /**
     * GET /api/v1/payroll/lwf/deductions/employee/{id}
     * Gets LWF deduction history for a specific employee.
     */
    @GetMapping("/deductions/employee/{employeeId}")
    @RequiresPermission(Permission.STATUTORY_VIEW)
    public ResponseEntity<List<LWFDeductionDto>> getEmployeeDeductions(
            @PathVariable UUID employeeId,
            @RequestParam(required = false) Integer year) {
        List<LWFDeduction> deductions;
        if (year != null) {
            deductions = lwfService.getDeductionsByEmployeeAndYear(employeeId, year);
        } else {
            deductions = lwfService.getDeductionsByEmployee(employeeId);
        }
        return ResponseEntity.ok(deductions.stream()
                .map(this::toDeductionDto)
                .collect(Collectors.toList()));
    }

    // ==================== Report Endpoints ====================

    /**
     * GET /api/v1/payroll/lwf/report?month=&year=
     * Generates remittance summary report grouped by state.
     */
    @GetMapping("/report")
    @RequiresPermission(Permission.STATUTORY_VIEW)
    public ResponseEntity<LWFRemittanceReportDto> getRemittanceReport(
            @RequestParam Integer month,
            @RequestParam Integer year) {
        return ResponseEntity.ok(lwfService.getRemittanceReport(month, year));
    }

    // ==================== Calculation Endpoint ====================

    /**
     * POST /api/v1/payroll/lwf/calculate
     * Triggers LWF calculation for a payroll run or specific period.
     */
    @PostMapping("/calculate")
    @RequiresPermission(value = Permission.PAYROLL_PROCESS, revalidate = true)
    public ResponseEntity<List<LWFDeductionDto>> calculateLWF(
            @Valid @RequestBody LWFCalculationRequest request) {
        List<LWFDeduction> deductions = lwfService.calculateForPayrollRun(request);
        return ResponseEntity.ok(deductions.stream()
                .map(this::toDeductionDto)
                .collect(Collectors.toList()));
    }

    // ==================== DTO Mapping ====================

    private LWFConfigurationDto toConfigDto(LWFConfiguration config) {
        return LWFConfigurationDto.builder()
                .id(config.getId())
                .stateCode(config.getStateCode())
                .stateName(config.getStateName())
                .employeeContribution(config.getEmployeeContribution())
                .employerContribution(config.getEmployerContribution())
                .frequency(config.getFrequency())
                .applicableMonths(config.getApplicableMonths())
                .isActive(config.getIsActive())
                .effectiveFrom(config.getEffectiveFrom())
                .effectiveTo(config.getEffectiveTo())
                .salaryThreshold(config.getSalaryThreshold())
                .createdAt(config.getCreatedAt())
                .updatedAt(config.getUpdatedAt())
                .build();
    }

    private LWFDeductionDto toDeductionDto(LWFDeduction deduction) {
        return LWFDeductionDto.builder()
                .id(deduction.getId())
                .employeeId(deduction.getEmployeeId())
                .payrollRunId(deduction.getPayrollRunId())
                .stateCode(deduction.getStateCode())
                .employeeAmount(deduction.getEmployeeAmount())
                .employerAmount(deduction.getEmployerAmount())
                .frequency(deduction.getFrequency())
                .deductionMonth(deduction.getDeductionMonth())
                .deductionYear(deduction.getDeductionYear())
                .status(deduction.getStatus())
                .grossSalary(deduction.getGrossSalary())
                .createdAt(deduction.getCreatedAt())
                .build();
    }
}
