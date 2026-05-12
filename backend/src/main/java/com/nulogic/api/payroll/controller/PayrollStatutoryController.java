package com.nulogic.api.payroll.controller;

import com.nulogic.application.payroll.dto.StatutoryDeductions;
import com.nulogic.application.payroll.service.PayslipService;
import com.nulogic.application.payroll.strategy.StatutoryCalculator;
import com.nulogic.application.payroll.strategy.StatutoryCalculator.StatutoryCalculationInput;
import com.nulogic.application.payroll.strategy.StatutoryCalculatorFactory;
import com.nulogic.application.payroll.strategy.StatutoryResult;
import com.nulogic.common.security.Permission;
import com.nulogic.common.security.RequiresPermission;
import com.nulogic.common.security.TenantContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

/**
 * REST API for statutory deduction preview and application.
 *
 * <p>Endpoints:
 * <ul>
 *   <li>GET  /api/v1/payroll/statutory/preview  — dry-run calculation (no persistence)</li>
 *   <li>POST /api/v1/payroll/statutory/{payslipId}/apply — persist deductions on a payslip</li>
 * </ul>
 *
 * <p><strong>S10-B (Wave-3 i18n, audit recommendation #14):</strong> The previous direct
 * dependency on the India-specific {@code StatutoryDeductionService} has been replaced with
 * a {@link StatutoryCalculatorFactory} lookup so that non-IN tenants can plug in their own
 * calculators. For IN tenants the {@code IndianStatutoryCalculator} delegates back to the
 * legacy service so behaviour is bit-identical. Tenants in jurisdictions without a wired
 * calculator surface as {@code 501 NOT_IMPLEMENTED}.
 *
 * <p><strong>BUG-002 FIX:</strong> The {@code apply} endpoint previously held a direct
 * {@link com.nulogic.infrastructure.payroll.repository.PayslipRepository} reference and wrote
 * to the database from the controller layer with no transaction boundary.  All write logic
 * has been moved to {@link PayslipService#applyStatutoryDeductions} which is annotated
 * {@code @Transactional}, ensuring atomicity and proper layering.
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/payroll/statutory")
@RequiredArgsConstructor
public class PayrollStatutoryController {

    /**
     * S10-B: routes per-tenant to the correct country-specific calculator. For IN tenants
     * this resolves to {@code IndianStatutoryCalculator} which delegates to the legacy
     * {@code StatutoryDeductionService}, so behaviour for existing tenants is unchanged.
     */
    private final StatutoryCalculatorFactory statutoryCalculatorFactory;
    /**
     * BUG-002 FIX: use service, not raw repository.
     */
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

        UUID tenantId = TenantContext.getCurrentTenant();
        LocalDate now = LocalDate.now();
        StatutoryCalculationInput input = new StatutoryCalculationInput(
                employeeId,
                grossSalary,
                basicSalary,
                /* gender = */ null,
                state,
                now.getMonthValue(),
                now.getYear());

        StatutoryDeductions result;
        try {
            StatutoryCalculator calculator = statutoryCalculatorFactory.forTenant(tenantId);
            StatutoryResult strategyResult = calculator.calculate(input);
            result = strategyResult.legacyIndiaView();
        } catch (UnsupportedOperationException e) {
            // Non-IN jurisdictions whose calculator is wired but skeleton-only.
            log.warn("Statutory preview not implemented for tenantId={}: {}", tenantId, e.getMessage());
            throw new ResponseStatusException(HttpStatus.NOT_IMPLEMENTED, e.getMessage(), e);
        }

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
