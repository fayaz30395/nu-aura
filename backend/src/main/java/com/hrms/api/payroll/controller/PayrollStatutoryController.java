package com.hrms.api.payroll.controller;

import com.hrms.application.payroll.dto.StatutoryDeductions;
import com.hrms.application.payroll.service.PayslipService;
import com.hrms.application.payroll.service.StatutoryDeductionService;
import com.hrms.common.security.Permission;
import com.hrms.common.security.RequiresPermission;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * REST API for India statutory deduction preview and application.
 *
 * <p>Endpoints:
 * <ul>
 *   <li>GET  /api/v1/payroll/statutory/preview  — dry-run calculation (no persistence)</li>
 *   <li>POST /api/v1/payroll/statutory/{payslipId}/apply — persist deductions on a payslip</li>
 * </ul>
 *
 * <p><strong>BUG-002 FIX:</strong> The {@code apply} endpoint previously held a direct
 * {@link com.hrms.infrastructure.payroll.repository.PayslipRepository} reference and wrote
 * to the database from the controller layer with no transaction boundary.  All write logic
 * has been moved to {@link PayslipService#applyStatutoryDeductions} which is annotated
 * {@code @Transactional}, ensuring atomicity and proper layering.
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/payroll/statutory")
@RequiredArgsConstructor
public class PayrollStatutoryController {

    private final StatutoryDeductionService statutoryDeductionService;
    /** BUG-002 FIX: use service, not raw repository. */
    private final PayslipService payslipService;

    /**
     * Calculates and returns statutory deductions without saving anything.
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
     * Delegates to {@link PayslipService#applyStatutoryDeductions} for full transactional
     * safety — all payslip field updates are committed or rolled back together.
     */
    @PostMapping("/{payslipId}/apply")
    @RequiresPermission(Permission.PAYROLL_PROCESS)
    public ResponseEntity<StatutoryDeductions> apply(
            @PathVariable UUID payslipId,
            @RequestParam(defaultValue = "") String state) {

        log.info("Applying statutory deductions: payslipId={}, state={}", payslipId, state);
        StatutoryDeductions deductions = payslipService.applyStatutoryDeductions(payslipId, state);
        log.info("Statutory deductions applied for payslipId={}", payslipId);
        return ResponseEntity.ok(deductions);
    }
}
