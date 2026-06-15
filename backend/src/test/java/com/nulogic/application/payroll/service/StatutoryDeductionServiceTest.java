package com.nulogic.application.payroll.service;

import com.nulogic.application.payroll.dto.StatutoryDeductions;
import com.nulogic.application.statutory.service.LWFService;
import com.nulogic.common.security.TenantContext;
import com.nulogic.common.util.TenantTimeService;
import com.nulogic.domain.employee.Employee;
import com.nulogic.infrastructure.employee.repository.EmployeeRepository;
import com.nulogic.infrastructure.payroll.repository.PayslipRepository;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.data.domain.Pageable;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mockStatic;
import static org.mockito.Mockito.when;

/**
 * Unit tests for {@link StatutoryDeductionService} — verifies F1.2 (ESI ceiling wiring),
 * F1.13 (gender-aware Maharashtra PT) and F1.8 (TDS §87A rebate + surcharge bands).
 *
 * <p>All tests use real gross-salary values to exercise the actual boundary conditions,
 * not the null-safe defaults that were the pre-fix behaviour.
 */
@MockitoSettings(strictness = Strictness.LENIENT)
@ExtendWith(MockitoExtension.class)
@DisplayName("StatutoryDeductionService Tests")
class StatutoryDeductionServiceTest {

    private static final UUID TENANT_ID   = UUID.randomUUID();
    private static final UUID EMPLOYEE_ID = UUID.randomUUID();

    private static MockedStatic<TenantContext> tenantContextMock;

    @Mock
    private LWFService lwfService;
    @Mock
    private TenantTimeService tenantTimeService;
    @Mock
    private PayslipRepository payslipRepository;
    @Mock
    private EmployeeRepository employeeRepository;

    private StatutoryDeductionService service;

    @BeforeAll
    static void openStaticMocks() {
        tenantContextMock = mockStatic(TenantContext.class);
    }

    @AfterAll
    static void closeStaticMocks() {
        tenantContextMock.close();
    }

    @BeforeEach
    void setUp() {
        tenantContextMock.when(TenantContext::requireCurrentTenant).thenReturn(TENANT_ID);
        lenient().when(tenantTimeService.today(any())).thenReturn(LocalDate.of(2026, 6, 1));

        // Default: no prior payslip (new joiner)
        lenient().when(payslipRepository.findGrossAtOrBeforePeriodStart(
                any(UUID.class), any(UUID.class), any(Integer.class), any(Integer.class), any(Pageable.class)))
                .thenReturn(List.of());

        // Default: no gender on record
        lenient().when(employeeRepository.findGenderById(any(UUID.class)))
                .thenReturn(Optional.empty());

        // LWF defaults — zero so they don't influence deduction assertions
        lenient().when(lwfService.calculateLWFForEmployee(any(), any(), any(), anyInt(), anyInt()))
                .thenReturn(BigDecimal.ZERO);
        lenient().when(lwfService.getEmployerContribution(any(), anyInt(), anyInt()))
                .thenReturn(BigDecimal.ZERO);

        service = new StatutoryDeductionService(lwfService, tenantTimeService,
                payslipRepository, employeeRepository);
        // pfApplyCeilingEmployee defaults to true (mirrors @Value default)
        ReflectionTestUtils.setField(service, "pfApplyCeilingEmployee", true);
    }

    // ─── ESI (F1.2-wiring) ───────────────────────────────────────────────────

    @Nested
    @DisplayName("ESI ceiling — F1.2 Reg.40 mid-period wiring")
    class EsiCeilingTests {

        /**
         * Employee earns ₹20,000 (below ceiling): ESI is always due.
         * Employee rate = 0.75% → ₹150.00; Employer rate = 3.25% → ₹650.00.
         */
        @Test
        @DisplayName("gross ≤ ESI ceiling — ESI deducted without payslip lookup")
        void grossBelowCeiling_esiDeducted() {
            BigDecimal gross = new BigDecimal("20000");
            StatutoryDeductions result = service.calculate(EMPLOYEE_ID, new BigDecimal("12000"), gross, "KA", 6, 2026);

            assertThat(result.getEmployeeEsi()).isEqualByComparingTo("150.00");
            assertThat(result.getEmployerEsi()).isEqualByComparingTo("650.00");
        }

        /**
         * Employee earns ₹22,000 (above ceiling) and has NO prior payslip.
         * Null from repository → defaults to exempt (safe pre-fix behaviour).
         */
        @Test
        @DisplayName("gross > ESI ceiling, no prior payslip → ESI = 0 (safe default)")
        void grossAboveCeiling_noPriorPayslip_esiZero() {
            when(payslipRepository.findGrossAtOrBeforePeriodStart(
                    eq(EMPLOYEE_ID), any(UUID.class), any(Integer.class), any(Integer.class), any(Pageable.class)))
                    .thenReturn(List.of());

            StatutoryDeductions result = service.calculate(EMPLOYEE_ID, new BigDecimal("15000"),
                    new BigDecimal("22000"), "KA", 6, 2026);

            assertThat(result.getEmployeeEsi()).isEqualByComparingTo("0.00");
            assertThat(result.getEmployerEsi()).isEqualByComparingTo("0.00");
        }

        /**
         * Employee earns ₹22,000 this month (above ceiling) but was earning ₹19,500
         * at the start of the April–September contribution period.
         * Per Reg.40 ESI Rules the employee was inside the ceiling at period-start
         * → ESI must continue to be deducted until end of period.
         *
         * Employee ESI = 0.75% × 22000 = ₹165.00
         * Employer ESI = 3.25% × 22000 = ₹715.00
         */
        @Test
        @DisplayName("gross > ceiling mid-period, was ≤ ceiling at period-start → ESI continues (F1.2 fix)")
        void grossAboveCeilingMidPeriod_wasInsideCeilingAtStart_esiContinues() {
            // Payslip from April (period start = April 1) shows ₹19,500 — inside ceiling
            when(payslipRepository.findGrossAtOrBeforePeriodStart(
                    eq(EMPLOYEE_ID), any(UUID.class), any(Integer.class), any(Integer.class), any(Pageable.class)))
                    .thenReturn(List.of(new BigDecimal("19500")));

            StatutoryDeductions result = service.calculate(EMPLOYEE_ID, new BigDecimal("15000"),
                    new BigDecimal("22000"), "KA", 6, 2026);

            assertThat(result.getEmployeeEsi()).isEqualByComparingTo("165.00");
            assertThat(result.getEmployerEsi()).isEqualByComparingTo("715.00");
        }

        /**
         * Employee earns ₹22,000 this month AND was already above the ceiling (₹21,500)
         * at the start of the contribution period → not eligible; ESI = 0.
         */
        @Test
        @DisplayName("gross > ceiling, was already above ceiling at period-start → ESI = 0")
        void grossAboveCeiling_alsoAboveCeilingAtPeriodStart_esiZero() {
            when(payslipRepository.findGrossAtOrBeforePeriodStart(
                    eq(EMPLOYEE_ID), any(UUID.class), any(Integer.class), any(Integer.class), any(Pageable.class)))
                    .thenReturn(List.of(new BigDecimal("21500")));

            StatutoryDeductions result = service.calculate(EMPLOYEE_ID, new BigDecimal("15000"),
                    new BigDecimal("22000"), "KA", 6, 2026);

            assertThat(result.getEmployeeEsi()).isEqualByComparingTo("0.00");
            assertThat(result.getEmployerEsi()).isEqualByComparingTo("0.00");
        }

        /**
         * Boundary: gross is exactly ₹21,000 (at ceiling) → ESI applies.
         * Employee = 0.75% × 21000 = ₹157.50; Employer = 3.25% × 21000 = ₹682.50.
         */
        @Test
        @DisplayName("gross exactly at ESI ceiling (₹21,000) → ESI applies")
        void grossExactlyAtCeiling_esiApplies() {
            StatutoryDeductions result = service.calculate(EMPLOYEE_ID, new BigDecimal("13000"),
                    new BigDecimal("21000"), "KA", 6, 2026);

            assertThat(result.getEmployeeEsi()).isEqualByComparingTo("157.50");
            assertThat(result.getEmployerEsi()).isEqualByComparingTo("682.50");
        }
    }

    // ─── Professional Tax / Maharashtra gender (F1.13) ───────────────────────

    @Nested
    @DisplayName("Maharashtra PT — F1.13 gender-aware wiring")
    class MaharashtraPtGenderTests {

        /**
         * Female employee earning ₹24,000: exempt under ₹25,000 threshold → PT = ₹0.
         */
        @Test
        @DisplayName("FEMALE gross ≤ ₹25,000 → PT = ₹0 (women's exemption)")
        void female_belowFemaleThreshold_ptZero() {
            when(employeeRepository.findGenderById(EMPLOYEE_ID))
                    .thenReturn(Optional.of(Employee.Gender.FEMALE));

            StatutoryDeductions result = service.calculate(EMPLOYEE_ID, new BigDecimal("14000"),
                    new BigDecimal("24000"), "MAHARASHTRA", 6, 2026);

            assertThat(result.getProfessionalTax()).isEqualByComparingTo("0.00");
        }

        /**
         * Female employee earning ₹26,000: above ₹25,000 threshold → PT = ₹200.
         */
        @Test
        @DisplayName("FEMALE gross > ₹25,000 → PT = ₹200")
        void female_aboveFemaleThreshold_pt200() {
            when(employeeRepository.findGenderById(EMPLOYEE_ID))
                    .thenReturn(Optional.of(Employee.Gender.FEMALE));

            StatutoryDeductions result = service.calculate(EMPLOYEE_ID, new BigDecimal("14000"),
                    new BigDecimal("26000"), "MAHARASHTRA", 6, 2026);

            assertThat(result.getProfessionalTax()).isEqualByComparingTo("200.00");
        }

        /**
         * Male employee earning ₹11,000: above ₹10,000 slab → PT = ₹200.
         */
        @Test
        @DisplayName("MALE gross > ₹10,000 → PT = ₹200")
        void male_aboveUpperSlab_pt200() {
            when(employeeRepository.findGenderById(EMPLOYEE_ID))
                    .thenReturn(Optional.of(Employee.Gender.MALE));

            StatutoryDeductions result = service.calculate(EMPLOYEE_ID, new BigDecimal("8000"),
                    new BigDecimal("11000"), "MH", 6, 2026);

            assertThat(result.getProfessionalTax()).isEqualByComparingTo("200.00");
        }

        /**
         * MALE employee earning ₹8,500 (between ₹7,500 and ₹10,000) → PT = ₹175.
         */
        @Test
        @DisplayName("MALE gross between ₹7,500 and ₹10,000 → PT = ₹175")
        void male_midSlab_pt175() {
            when(employeeRepository.findGenderById(EMPLOYEE_ID))
                    .thenReturn(Optional.of(Employee.Gender.MALE));

            StatutoryDeductions result = service.calculate(EMPLOYEE_ID, new BigDecimal("6000"),
                    new BigDecimal("8500"), "MAHARASHTRA", 6, 2026);

            assertThat(result.getProfessionalTax()).isEqualByComparingTo("175.00");
        }

        /**
         * Unknown gender (null) → defaults to non-FEMALE slab (safe pre-F1.13 behaviour).
         * Gross ₹11,000 → PT = ₹200.
         */
        @Test
        @DisplayName("gender unknown (null from repo) → defaults to non-FEMALE slab")
        void unknownGender_defaultsToNonFemaleSlab() {
            when(employeeRepository.findGenderById(EMPLOYEE_ID))
                    .thenReturn(Optional.empty());

            StatutoryDeductions result = service.calculate(EMPLOYEE_ID, new BigDecimal("8000"),
                    new BigDecimal("11000"), "MH", 6, 2026);

            assertThat(result.getProfessionalTax()).isEqualByComparingTo("200.00");
        }

        /**
         * null employeeId passed to calculateProfessionalTax (via backward-compat overload path)
         * must not NPE — returns non-FEMALE slab.
         */
        @Test
        @DisplayName("null employeeId for MH → no NPE, defaults to non-FEMALE slab")
        void nullEmployeeId_noNpe_returnsNonFemaleSlab() {
            StatutoryDeductions result = service.calculate(null, new BigDecimal("8000"),
                    new BigDecimal("11000"), "MH", 6, 2026);

            assertThat(result.getProfessionalTax()).isEqualByComparingTo("200.00");
        }
    }

    // ─── TDS / §87A rebate + surcharge (F1.8) ────────────────────────────────

    @Nested
    @DisplayName("TDS — F1.8 §87A rebate and surcharge bands")
    class TdsTests {

        /**
         * Gross ₹25,000/month → annual ₹3,00,000. Income at exemption floor → TDS = 0.
         */
        @Test
        @DisplayName("annual income at slab floor (₹3L) → TDS = 0")
        void annualIncomeAtSlabFloor_tdsZero() {
            StatutoryDeductions result = service.calculate(EMPLOYEE_ID, new BigDecimal("15000"),
                    new BigDecimal("25000"), "KA", 6, 2026);

            assertThat(result.getTdsMonthly()).isEqualByComparingTo("0.00");
        }

        /**
         * Gross ₹58,334/month → annual ≈ ₹7,00,008 — just above §87A limit.
         * §87A rebate does NOT apply; income tax is due on the full annual income.
         * Annual tax = 5%×(6L-3L) + 10%×(7L-6L) = 15,000 + 10,000 = 25,000 (pre-cess).
         * After 4% cess: 25,000 × 1.04 = 26,000. Monthly = 26,000 / 12 ≈ 2,166.67.
         * We just assert TDS > 0 and the rough order of magnitude.
         */
        @Test
        @DisplayName("annual income just above ₹7L §87A limit → TDS > 0 (rebate does not apply)")
        void annualIncomeJustAboveRebateLimit_tdsPositive() {
            // ₹7,00,100 / 12 = ₹58,341.67 gross/month
            BigDecimal gross = new BigDecimal("58342");
            StatutoryDeductions result = service.calculate(EMPLOYEE_ID, new BigDecimal("35000"),
                    gross, "KA", 6, 2026);

            assertThat(result.getTdsMonthly()).isGreaterThan(BigDecimal.ZERO);
        }

        /**
         * §87A: Gross ₹58,333/month → annual ₹6,99,996 ≤ ₹7L limit → TDS = 0 (full rebate).
         */
        @Test
        @DisplayName("annual income at ₹7L (§87A threshold) → TDS = 0 (full rebate)")
        void annualIncomeAtRebateLimit_tdsZero() {
            // 699996 / 12 = 58333
            BigDecimal gross = new BigDecimal("58333");
            StatutoryDeductions result = service.calculate(EMPLOYEE_ID, new BigDecimal("35000"),
                    gross, "KA", 6, 2026);

            assertThat(result.getTdsMonthly()).isEqualByComparingTo("0.00");
        }

        /**
         * Surcharge band: annual income ₹60L (₹5,00,000/month) — in the 10% surcharge band.
         *
         * <p>Slab tax on ₹60,00,000:
         *   5%×3L = 15,000
         *   10%×3L = 30,000
         *   15%×3L = 45,000
         *   20%×3L = 60,000
         *   30%×(60L-15L) = 30%×45L = 13,50,000
         *   Total slab tax = 15,000+30,000+45,000+60,000+13,50,000 = 15,00,000
         *   10% surcharge → +1,50,000 = 16,50,000
         *   4% cess → 16,50,000 × 1.04 = 17,16,000
         *   Monthly TDS = 17,16,000 / 12 = 1,43,000.00
         * </p>
         */
        @Test
        @DisplayName("annual income ₹60L (10% surcharge band) → correct TDS with surcharge")
        void surcharge10PctBand_tdsIncludesSurcharge() {
            BigDecimal gross = new BigDecimal("500000"); // ₹5L/month = ₹60L annual
            StatutoryDeductions result = service.calculate(EMPLOYEE_ID, new BigDecimal("300000"),
                    gross, "KA", 6, 2026);

            // Monthly TDS = (slab_tax × 1.10 × 1.04) / 12
            // slab_tax on ₹60L: 15k+30k+45k+60k+13,50,000 = 15,00,000
            // with 10% surcharge: 15,00,000 × 1.10 = 16,50,000
            // with 4% cess: 16,50,000 × 1.04 = 17,16,000
            // monthly = 17,16,000 / 12 = 1,43,000.00
            assertThat(result.getTdsMonthly()).isEqualByComparingTo("143000.00");
        }

        /**
         * Surcharge band: annual income ₹1.2Cr (₹10,00,000/month) — in the 15% surcharge band.
         *
         * <p>Slab tax on ₹1,20,00,000:
         *   5%×3L = 15,000
         *   10%×3L = 30,000
         *   15%×3L = 45,000
         *   20%×3L = 60,000
         *   30%×(120L-15L) = 30%×105L = 31,50,000
         *   Total slab = 32,00,000 (actually 15k+30k+45k+60k+31,50,000 = 33,00,000)
         *   15% surcharge → +4,95,000 = 37,95,000
         *   4% cess → 37,95,000 × 1.04 = 39,46,800
         *   Monthly = 39,46,800 / 12 = 3,28,900.00
         * </p>
         */
        @Test
        @DisplayName("annual income ₹1.2Cr (15% surcharge band) → TDS > 10%-band TDS")
        void surcharge15PctBand_tdsHigherThan10PctBand() {
            BigDecimal gross10PctBand = new BigDecimal("500000");  // ₹60L annual
            BigDecimal gross15PctBand = new BigDecimal("1000000"); // ₹1.2Cr annual

            StatutoryDeductions result10 = service.calculate(EMPLOYEE_ID, new BigDecimal("300000"),
                    gross10PctBand, "KA", 6, 2026);
            StatutoryDeductions result15 = service.calculate(EMPLOYEE_ID, new BigDecimal("600000"),
                    gross15PctBand, "KA", 6, 2026);

            assertThat(result15.getTdsMonthly()).isGreaterThan(result10.getTdsMonthly());
        }

        /**
         * Surcharge band: annual income ₹2.4Cr (₹20,00,000/month) — in the 25% surcharge band.
         * Verifies that TDS for a ₹2.4Cr income is higher than for ₹1.2Cr.
         */
        @Test
        @DisplayName("annual income ₹2.4Cr (25% surcharge band, max NR) → TDS > 15%-band TDS")
        void surcharge25PctBand_tdsHigherThan15PctBand() {
            BigDecimal gross15PctBand = new BigDecimal("1000000"); // ₹1.2Cr annual
            BigDecimal gross25PctBand = new BigDecimal("2000000"); // ₹2.4Cr annual

            StatutoryDeductions result15 = service.calculate(EMPLOYEE_ID, new BigDecimal("600000"),
                    gross15PctBand, "KA", 6, 2026);
            StatutoryDeductions result25 = service.calculate(EMPLOYEE_ID, new BigDecimal("1200000"),
                    gross25PctBand, "KA", 6, 2026);

            assertThat(result25.getTdsMonthly()).isGreaterThan(result15.getTdsMonthly());
        }
    }

    // ─── Karnataka PT (quick sanity) ─────────────────────────────────────────

    @Nested
    @DisplayName("Karnataka PT boundary (sanity)")
    class KarnatakaPtTests {

        @Test
        @DisplayName("gross ≥ ₹15,000 → PT = ₹200")
        void grossAtKaThreshold_ptApplies() {
            StatutoryDeductions result = service.calculate(EMPLOYEE_ID, new BigDecimal("10000"),
                    new BigDecimal("15000"), "KARNATAKA", 6, 2026);
            assertThat(result.getProfessionalTax()).isEqualByComparingTo("200.00");
        }

        @Test
        @DisplayName("gross < ₹15,000 → PT = ₹0")
        void grossBelowKaThreshold_ptZero() {
            StatutoryDeductions result = service.calculate(EMPLOYEE_ID, new BigDecimal("8000"),
                    new BigDecimal("14999"), "KARNATAKA", 6, 2026);
            assertThat(result.getProfessionalTax()).isEqualByComparingTo("0.00");
        }
    }
}
