package com.nulogic.application.payroll.service;

import com.nulogic.application.payroll.dto.BonusCalculationRequest;
import com.nulogic.application.payroll.dto.BonusCalculationResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * F1.12 — Computes statutory bonus under India's
 * <a href="https://labour.gov.in/sites/default/files/ThePaymentofBonusAct1965.pdf">
 * Payment of Bonus Act, 1965</a>.
 *
 * <p><b>Statutory references (Act of 1965, as amended through 2015):</b>
 * <ul>
 *   <li><b>§1(3)(ii)</b> — Applicability ceiling: employees drawing salary/wage up
 *       to <b>₹21,000/month</b> are covered.</li>
 *   <li><b>§10</b> — <b>Minimum bonus = 8.33%</b> of the annual salary/wage,
 *       payable irrespective of whether the establishment makes a profit.</li>
 *   <li><b>§11</b> — <b>Maximum bonus = 20%</b> of the annual salary/wage, payable
 *       out of the "available surplus" allocable surplus.</li>
 *   <li><b>§12</b> — Where an employee's basic + DA exceeds <b>₹7,000/month</b> or
 *       the minimum wage fixed for the scheduled employment (whichever is higher),
 *       the bonus shall be calculated <em>as if</em> the salary were ₹7,000/month
 *       (the higher of the two ceilings is applied; this implementation uses ₹7,000
 *       per the Act's nominal cap).</li>
 *   <li><b>§13</b> — Pro-rated bonus for employees who have not worked for all days
 *       of the bonus accounting year (April–March, the Indian fiscal year).</li>
 * </ul>
 *
 * <p><b>Out of scope for this slice (deferred to later waves):</b>
 * <ul>
 *   <li>§2(13) "available surplus" computation from company-level P&amp;L.</li>
 *   <li>§16 "set-on / set-off" rolling reserve across accounting years.</li>
 *   <li>The higher-of-₹7,000-or-minimum-wage clause from §12 (requires the
 *       <em>Minimum Wages Act, 1948</em> scheduled-employment tables — not yet wired).</li>
 *   <li>§9 disqualification (fraud, riotous behaviour) — handled at HR-policy layer.</li>
 * </ul>
 *
 * <p>All monetary arithmetic uses {@link RoundingMode#HALF_UP} and is in INR.
 * The service is stateless and safe to share across threads.
 *
 * @see com.nulogic.application.payroll.service.StatutoryDeductionService
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class BonusCalculationService {

    // ─── Statutory constants (Payment of Bonus Act 1965, §§10–13) ────────────

    /**
     * §10 minimum bonus rate — 8.33% of annual wage. Equals 1/12 of annual salary,
     * which is the conventional "one month's wage" minimum.
     */
    static final BigDecimal BONUS_MIN_RATE = new BigDecimal("0.0833");

    /**
     * §11 maximum bonus rate — 20% of annual wage, capped by the available surplus.
     */
    static final BigDecimal BONUS_MAX_RATE = new BigDecimal("0.20");

    /**
     * §1(3)(ii) wage-ceiling for applicability — ₹21,000/month basic (post-2015 amendment).
     * Employees drawing above this are not covered by the Act.
     */
    static final BigDecimal BONUS_WAGE_CEILING = new BigDecimal("21000");

    /**
     * §12 statutory basic ceiling — bonus is computed <em>as if</em> the basic were
     * ₹7,000/month when actual basic exceeds this. See the Act's §12 explanation
     * and Reserve Bank of India v. Workmen interpretation.
     */
    static final BigDecimal BONUS_BASIC_CEILING = new BigDecimal("7000");

    /**
     * Number of months in the bonus accounting year (Indian FY: April–March).
     */
    private static final BigDecimal MONTHS_IN_YEAR = new BigDecimal("12");

    /**
     * Reference total-days denominator for pro-rating. Calendar leap years are
     * effectively absorbed by the {@code HALF_UP} rounding of the final figure;
     * §13 itself does not prescribe a precise calendar — payroll convention is 365.
     */
    private static final long TOTAL_FY_DAYS = 365L;

    /**
     * Computes the statutory bonus for a single employee for one bonus accounting year.
     *
     * <p>Algorithm (per §§10–13):
     * <ol>
     *   <li>Reject when monthly basic &gt; ₹21,000 (§1(3)(ii) eligibility cap).</li>
     *   <li>Cap monthly basic at ₹7,000 for the computation (§12).</li>
     *   <li>Annualise: {@code annualWage = cappedBasic × 12}.</li>
     *   <li>Apply rate: caller's {@code bonusRate} clamped to [8.33%, 20%], or §10 default.</li>
     *   <li>Pro-rate by {@code daysWorkedInFy / 365} (§13).</li>
     *   <li>Round to 2 decimal places ({@code HALF_UP}).</li>
     * </ol>
     *
     * @param request bonus calculation inputs; must be non-null
     * @return populated {@link BonusCalculationResponse} with the eligibility decision and amount
     * @throws IllegalArgumentException if {@code request} or {@code request.monthlyBasic} is null
     */
    @Transactional(readOnly = true)
    public BonusCalculationResponse calculateBonus(BonusCalculationRequest request) {
        if (request == null) {
            throw new IllegalArgumentException("BonusCalculationRequest must not be null");
        }
        if (request.getMonthlyBasic() == null) {
            throw new IllegalArgumentException("monthlyBasic must not be null");
        }

        BigDecimal monthlyBasic = request.getMonthlyBasic();
        long daysWorked = request.getDaysWorkedInFy();

        log.debug("Calculating statutory bonus: employeeId={}, monthlyBasic={}, bonusRate={}, daysWorked={}",
                request.getEmployeeId(), monthlyBasic, request.getBonusRate(), daysWorked);

        // §1(3)(ii) — Eligibility gate.
        if (monthlyBasic.compareTo(BONUS_WAGE_CEILING) > 0) {
            log.info("Employee {} above bonus wage ceiling: monthlyBasic={} > {}",
                    request.getEmployeeId(), monthlyBasic, BONUS_WAGE_CEILING);
            return BonusCalculationResponse.builder()
                    .bonusAmount(BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP))
                    .eligible(false)
                    .reason("Employee earns above ₹21k ceiling — not eligible under §1(3)(ii)")
                    .build();
        }

        // §12 — Cap basic at ₹7,000 for the computation.
        BigDecimal cappedBasic = monthlyBasic.min(BONUS_BASIC_CEILING);
        BigDecimal annualWage = cappedBasic.multiply(MONTHS_IN_YEAR);

        // §§10–11 — Apply rate, clamped to the statutory band.
        BigDecimal rate = clampRate(request.getBonusRate());
        BigDecimal annualBonus = annualWage.multiply(rate);

        // §13 — Pro-rate by days worked in the bonus accounting year.
        BigDecimal proRatedBonus = annualBonus
                .multiply(BigDecimal.valueOf(daysWorked))
                .divide(BigDecimal.valueOf(TOTAL_FY_DAYS), 2, RoundingMode.HALF_UP);

        String reason = buildEligibleReason(rate, daysWorked);
        log.debug("Bonus computed: employeeId={}, cappedBasic={}, rate={}, annualBonus={}, proRated={}",
                request.getEmployeeId(), cappedBasic, rate, annualBonus, proRatedBonus);

        return BonusCalculationResponse.builder()
                .bonusAmount(proRatedBonus)
                .eligible(true)
                .reason(reason)
                .build();
    }

    /**
     * Clamps the caller-supplied rate into the §10–§11 statutory band.
     * A {@code null} rate defaults to the §10 minimum (8.33%).
     */
    private BigDecimal clampRate(BigDecimal requested) {
        if (requested == null) {
            return BONUS_MIN_RATE;
        }
        if (requested.compareTo(BONUS_MIN_RATE) < 0) {
            log.warn("Requested bonus rate {} below §10 minimum — clamping to {}", requested, BONUS_MIN_RATE);
            return BONUS_MIN_RATE;
        }
        if (requested.compareTo(BONUS_MAX_RATE) > 0) {
            log.warn("Requested bonus rate {} above §11 maximum — clamping to {}", requested, BONUS_MAX_RATE);
            return BONUS_MAX_RATE;
        }
        return requested;
    }

    /**
     * Builds the human-readable {@code reason} string for an eligible employee.
     */
    private String buildEligibleReason(BigDecimal rate, long daysWorked) {
        boolean fullYear = daysWorked >= TOTAL_FY_DAYS;
        String rateLabel;
        if (rate.compareTo(BONUS_MIN_RATE) == 0) {
            rateLabel = "8.33% (§10 minimum)";
        } else if (rate.compareTo(BONUS_MAX_RATE) == 0) {
            rateLabel = "20% (§11 maximum)";
        } else {
            rateLabel = rate.movePointRight(2).stripTrailingZeros().toPlainString() + "%";
        }
        return fullYear
                ? "Eligible — full-year bonus at " + rateLabel
                : "Eligible — pro-rated at " + rateLabel;
    }
}
