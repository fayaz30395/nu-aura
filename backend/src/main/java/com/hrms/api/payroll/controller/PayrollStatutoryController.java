package com.hrms.api.payroll.controller;

import com.hrms.application.payroll.dto.StatutoryDeductions;
import com.hrms.application.payroll.service.StatutoryDeductionService;
import com.hrms.common.security.Permission;
import com.hrms.common.security.RequiresPermission;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.payroll.Payslip;
import com.hrms.infrastructure.payroll.repository.PayslipRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * REST API for India statutory deduction preview and application.
 *
 * <p>Endpoints:
 * <ul>
 *   <li>GET  /api/v1/payroll/statutory/preview  — dry-run calculation (no persistence)</li>
 *   <li>POST /api/v1/payroll/statutory/{payslipId}/apply — persist deductions on a payslip</li>
 * </ul>
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/payroll/statutory")
@RequiredArgsConstructor
public class PayrollStatutoryController {

    private final StatutoryDeductionService statutoryDeductionService;
    private final PayslipRepository payslipRepository;

    /**
     * Calculates and returns statutory deductions without saving anything.
     *
     * <p>Query parameters:
     * <ul>
     *   <li>{@code employeeId}   — UUID of the employee</li>
     *   <li>{@code basicSalary}  — monthly basic salary (INR)</li>
     *   <li>{@code grossSalary}  — monthly gross salary (INR)</li>
     *   <li>{@code state}        — Indian state (Karnataka, Maharashtra, Tamil Nadu, Others)</li>
     * </ul>
     *
     * @return {@link StatutoryDeductions} DTO with all component values
     */
    @GetMapping("/preview")
    @RequiresPermission(Permission.PAYROLL_VIEW)
    public ResponseEntity<StatutoryDeductions> preview(
            @RequestParam UUID employeeId,
            @RequestParam BigDecimal basicSalary,
            @RequestParam BigDecimal grossSalary,
            @RequestParam(defaultValue = "") String state) {

        log.info("Statutory preview requested: employeeId={}, basic={}, gross={}, state={}",
                employeeId, basicSalary, grossSalary, state);

        StatutoryDeductions result = statutoryDeductionService.calculate(
                employeeId, basicSalary, grossSalary, state);

        return ResponseEntity.ok(result);
    }

    /**
     * Applies calculated statutory deductions to an existing payslip and saves the result.
     *
     * <p>The deductions are computed fresh from the payslip's own {@code basicSalary} and
     * {@code grossSalary} columns.  The {@code state} parameter must be supplied by the
     * caller because the payslip entity does not store the employee's work location.
     *
     * @param payslipId UUID of the payslip to update
     * @param state     Indian state for professional tax lookup
     * @return the updated {@link StatutoryDeductions} DTO reflecting what was saved
     */
    @PostMapping("/{payslipId}/apply")
    @RequiresPermission(Permission.PAYROLL_PROCESS)
    public ResponseEntity<StatutoryDeductions> apply(
            @PathVariable UUID payslipId,
            @RequestParam(defaultValue = "") String state) {

        UUID tenantId = TenantContext.getCurrentTenant();
        log.info("Applying statutory deductions: payslipId={}, tenantId={}, state={}",
                payslipId, tenantId, state);

        Payslip payslip = payslipRepository.findById(payslipId)
                .filter(p -> p.getTenantId().equals(tenantId))
                .orElseThrow(() -> new IllegalArgumentException(
                        "Payslip not found: " + payslipId));

        StatutoryDeductions deductions = statutoryDeductionService.calculate(
                payslip.getEmployeeId(),
                payslip.getBasicSalary(),
                payslip.getGrossSalary(),
                state);

        // Persist statutory columns on the payslip
        payslip.setEmployeePf(deductions.getEmployeePf());
        payslip.setEmployerPf(deductions.getEmployerPf());
        payslip.setEmployeeEsi(deductions.getEmployeeEsi());
        payslip.setEmployerEsi(deductions.getEmployerEsi());
        payslip.setStatutoryProfessionalTax(deductions.getProfessionalTax());
        payslip.setTdsMonthly(deductions.getTdsMonthly());
        payslip.setStatutoryCalculatedAt(LocalDateTime.now());

        // Recalculate totals so that net salary reflects the updated deductions
        payslip.setProvidentFund(deductions.getEmployeePf());
        payslip.setProfessionalTax(deductions.getProfessionalTax());
        payslip.setIncomeTax(deductions.getTdsMonthly());
        payslip.calculateTotals();

        payslipRepository.save(payslip);

        log.info("Statutory deductions applied and saved for payslipId={}", payslipId);
        return ResponseEntity.ok(deductions);
    }
}
