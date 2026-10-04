package com.nulogic.application.payroll.service;

import com.nulogic.application.payroll.dto.BonusCalculationRequest;
import com.nulogic.application.payroll.dto.BonusCalculationResponse;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Unit tests for {@link BonusCalculationService} — the Payment of Bonus Act 1965
 * statutory bonus engine. Stateless and dependency-free, so no mocks required.
 */
@DisplayName("BonusCalculationService Tests")
class BonusCalculationServiceTest {

    private final BonusCalculationService service = new BonusCalculationService();

    private BonusCalculationRequest requestWith(BigDecimal monthlyBasic, BigDecimal rate, long daysWorked) {
        return BonusCalculationRequest.builder()
                .employeeId(UUID.randomUUID())
                .monthlyBasic(monthlyBasic)
                .bonusRate(rate)
                .daysWorkedInFy(daysWorked)
                .build();
    }

    @Nested
    @DisplayName("Eligibility gate (§1(3)(ii) wage ceiling)")
    class EligibilityTests {

        @Test
        @DisplayName("Should mark employee ineligible when monthly basic exceeds ₹21,000")
        void shouldRejectAboveWageCeiling() {
            BonusCalculationResponse result = service.calculateBonus(
                    requestWith(new BigDecimal("21000.01"), null, 365));

            assertThat(result.isEligible()).isFalse();
            assertThat(result.getBonusAmount()).isEqualByComparingTo(new BigDecimal("0.00"));
            assertThat(result.getReason()).contains("₹21k");
        }

        @Test
        @DisplayName("Should mark employee eligible at exactly ₹21,000 (inclusive ceiling)")
        void shouldAcceptAtWageCeilingBoundary() {
            BonusCalculationResponse result = service.calculateBonus(
                    requestWith(new BigDecimal("21000"), null, 365));

            assertThat(result.isEligible()).isTrue();
        }
    }

    @Nested
    @DisplayName("Statutory basic ceiling (§12)")
    class BasicCeilingTests {

        @Test
        @DisplayName("Should cap basic at ₹7,000 for the computation even when actual basic is higher")
        void shouldCapBasicAtSevenThousand() {
            // ₹20,000 basic is eligible (≤ ₹21,000) but must be computed as if ₹7,000.
            BonusCalculationResponse result = service.calculateBonus(
                    requestWith(new BigDecimal("20000"), null, 365));

            // annualWage = 7000 × 12 × 0.0833 = 6997.20 (NOT 20000 × 12 × 0.0833 = 19992)
            assertThat(result.getBonusAmount()).isEqualByComparingTo(new BigDecimal("6997.20"));
        }

        @Test
        @DisplayName("Should use full basic when it is at or below ₹7,000 (no capping)")
        void shouldNotCapBasicBelowCeiling() {
            // ₹6,000 basic → annualWage = 6000 × 12 × 0.0833 = 5997.60
            BonusCalculationResponse result = service.calculateBonus(
                    requestWith(new BigDecimal("6000"), null, 365));

            assertThat(result.getBonusAmount()).isEqualByComparingTo(new BigDecimal("5997.60"));
        }
    }

    @Nested
    @DisplayName("Rate band (§§10–11)")
    class RateBandTests {

        @Test
        @DisplayName("Should default to the §10 minimum rate when none supplied")
        void shouldDefaultToMinimumRate() {
            BonusCalculationResponse result = service.calculateBonus(
                    requestWith(new BigDecimal("7000"), null, 365));

            assertThat(result.getReason()).contains("8.33%");
        }

        @Test
        @DisplayName("Should clamp a below-minimum rate up to 8.33%")
        void shouldClampRateUpToMinimum() {
            BonusCalculationResponse result = service.calculateBonus(
                    requestWith(new BigDecimal("7000"), new BigDecimal("0.05"), 365));

            assertThat(result.getReason()).contains("8.33%");
            assertThat(result.getBonusAmount()).isEqualByComparingTo(new BigDecimal("6997.20"));
        }

        @Test
        @DisplayName("Should clamp an above-maximum rate down to 20%")
        void shouldClampRateDownToMaximum() {
            BonusCalculationResponse result = service.calculateBonus(
                    requestWith(new BigDecimal("7000"), new BigDecimal("0.30"), 365));

            assertThat(result.getReason()).contains("20%");
            // annualWage = 7000 × 12 = 84000; 84000 × 0.20 = 16800.00
            assertThat(result.getBonusAmount()).isEqualByComparingTo(new BigDecimal("16800.00"));
        }
    }

    @Nested
    @DisplayName("Pro-rating (§13)")
    class ProRationTests {

        @Test
        @DisplayName("Should pro-rate the bonus for partial-year service")
        void shouldProRatePartialYear() {
            // 182 of 365 days at the minimum rate: 6997.20 × 182 / 365 ≈ 3489.01
            BonusCalculationResponse result = service.calculateBonus(
                    requestWith(new BigDecimal("7000"), null, 182));

            assertThat(result.getBonusAmount()).isEqualByComparingTo(new BigDecimal("3489.01"));
            assertThat(result.getReason()).contains("pro-rated");
        }

        @Test
        @DisplayName("Should treat a full year as non-pro-rated")
        void shouldRecogniseFullYear() {
            BonusCalculationResponse result = service.calculateBonus(
                    requestWith(new BigDecimal("7000"), null, 365));

            assertThat(result.getReason()).contains("full-year");
        }
    }

    @Nested
    @DisplayName("Input validation")
    class ValidationTests {

        @Test
        @DisplayName("Should reject a null request")
        void shouldRejectNullRequest() {
            assertThatThrownBy(() -> service.calculateBonus(null))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("must not be null");
        }

        @Test
        @DisplayName("Should reject a request with null monthly basic")
        void shouldRejectNullMonthlyBasic() {
            BonusCalculationRequest request = BonusCalculationRequest.builder()
                    .employeeId(UUID.randomUUID())
                    .monthlyBasic(null)
                    .build();

            assertThatThrownBy(() -> service.calculateBonus(request))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("monthlyBasic");
        }
    }
}
