package com.hrms.api.payroll.controller;

import com.hrms.application.payroll.dto.BonusCalculationRequest;
import com.hrms.application.payroll.dto.BonusCalculationResponse;
import com.hrms.application.payroll.service.BonusCalculationService;
import com.hrms.common.security.Permission;
import com.hrms.common.security.RequiresPermission;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * F1.12 — REST API for the Payment of Bonus Act 1965 statutory bonus calculator.
 *
 * <p>Endpoints:
 * <ul>
 *   <li>POST {@code /api/v1/payroll/bonus/calculate} — dry-run preview; no persistence.</li>
 * </ul>
 *
 * <p>The preview is intended for HR analysts modelling annual bonus payouts before
 * a payroll run. Persistence (writing to {@code Payslip.bonusAmount}) is owned by
 * the payslip / payroll-run pipeline and is out of scope for this controller.
 *
 * <p>Security: gated by {@link Permission#PAYROLL_VIEW} so any user with general
 * payroll-read access can model bonuses; mutation will require a separate
 * {@code PAYROLL_PROCESS} endpoint added in a follow-up slice.
 *
 * @see com.hrms.application.payroll.service.BonusCalculationService
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/payroll/bonus")
@RequiredArgsConstructor
public class BonusController {

    private final BonusCalculationService bonusCalculationService;

    /**
     * Calculates and returns the statutory bonus for a single employee for one
     * bonus accounting year (Indian FY: April–March). No state is persisted.
     *
     * @param request validated bonus calculation inputs
     * @return 200 OK with the {@link BonusCalculationResponse}
     */
    @PostMapping("/calculate")
    @RequiresPermission(Permission.PAYROLL_VIEW)
    public ResponseEntity<BonusCalculationResponse> calculate(
            @Valid @RequestBody BonusCalculationRequest request) {

        log.info("Bonus calculation requested: employeeId={}, monthlyBasic={}, bonusRate={}, daysWorkedInFy={}",
                request.getEmployeeId(), request.getMonthlyBasic(),
                request.getBonusRate(), request.getDaysWorkedInFy());

        BonusCalculationResponse response = bonusCalculationService.calculateBonus(request);

        log.info("Bonus calculation result: employeeId={}, eligible={}, amount={}",
                request.getEmployeeId(), response.isEligible(), response.getBonusAmount());

        return ResponseEntity.ok(response);
    }
}
