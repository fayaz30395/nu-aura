package com.hrms.application.statutory.service;

import com.hrms.api.statutory.dto.LWFConfigurationDto;
import com.hrms.api.statutory.dto.LWFRemittanceReportDto;
import com.hrms.common.exception.BusinessException;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.statutory.LWFConfiguration;
import com.hrms.domain.statutory.LWFConfiguration.LWFFrequency;
import com.hrms.domain.statutory.LWFDeduction;
import com.hrms.infrastructure.statutory.repository.LWFConfigurationRepository;
import com.hrms.infrastructure.statutory.repository.LWFDeductionRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class LWFServiceTest {

    @Mock
    private LWFConfigurationRepository configRepository;

    @Mock
    private LWFDeductionRepository deductionRepository;

    @InjectMocks
    private LWFService lwfService;

    private static final UUID TENANT_ID = UUID.randomUUID();
    private static final UUID EMPLOYEE_ID = UUID.randomUUID();
    private MockedStatic<TenantContext> tenantContextMock;

    @BeforeEach
    void setUp() {
        tenantContextMock = mockStatic(TenantContext.class);
        tenantContextMock.when(TenantContext::requireCurrentTenant).thenReturn(TENANT_ID);
        tenantContextMock.when(TenantContext::getCurrentTenant).thenReturn(TENANT_ID);
    }

    @AfterEach
    void tearDown() {
        tenantContextMock.close();
    }

    private LWFConfiguration buildMHConfig() {
        return LWFConfiguration.builder()
                .id(UUID.randomUUID())
                .tenantId(TENANT_ID)
                .stateCode("MH")
                .stateName("Maharashtra")
                .employeeContribution(new BigDecimal("25.00"))
                .employerContribution(new BigDecimal("75.00"))
                .frequency(LWFFrequency.HALF_YEARLY)
                .applicableMonths("[6,12]")
                .isActive(true)
                .effectiveFrom(LocalDate.of(2024, 4, 1))
                .build();
    }

    private LWFConfiguration buildTNConfig() {
        return LWFConfiguration.builder()
                .id(UUID.randomUUID())
                .tenantId(TENANT_ID)
                .stateCode("TN")
                .stateName("Tamil Nadu")
                .employeeContribution(new BigDecimal("10.00"))
                .employerContribution(new BigDecimal("20.00"))
                .frequency(LWFFrequency.MONTHLY)
                .applicableMonths("[1,2,3,4,5,6,7,8,9,10,11,12]")
                .isActive(true)
                .effectiveFrom(LocalDate.of(2024, 4, 1))
                .build();
    }

    @Nested
    @DisplayName("calculateLWFForEmployee")
    class CalculateLWFForEmployee {

        @Test
        @DisplayName("returns employee contribution for applicable month in MH (half-yearly)")
        void returnsContributionForApplicableMonth() {
            when(configRepository.findByTenantIdAndStateCodeAndIsActiveTrue(TENANT_ID, "MH"))
                    .thenReturn(Optional.of(buildMHConfig()));

            BigDecimal result = lwfService.calculateLWFForEmployee(
                    EMPLOYEE_ID, "MH", new BigDecimal("50000"), 6, 2025);

            assertThat(result).isEqualByComparingTo("25.00");
        }

        @Test
        @DisplayName("returns zero for non-applicable month in MH")
        void returnsZeroForNonApplicableMonth() {
            when(configRepository.findByTenantIdAndStateCodeAndIsActiveTrue(TENANT_ID, "MH"))
                    .thenReturn(Optional.of(buildMHConfig()));

            BigDecimal result = lwfService.calculateLWFForEmployee(
                    EMPLOYEE_ID, "MH", new BigDecimal("50000"), 3, 2025);

            assertThat(result).isEqualByComparingTo("0");
        }

        @Test
        @DisplayName("returns contribution for any month in TN (monthly)")
        void returnsContributionForMonthlyState() {
            when(configRepository.findByTenantIdAndStateCodeAndIsActiveTrue(TENANT_ID, "TN"))
                    .thenReturn(Optional.of(buildTNConfig()));

            BigDecimal result = lwfService.calculateLWFForEmployee(
                    EMPLOYEE_ID, "TN", new BigDecimal("30000"), 7, 2025);

            assertThat(result).isEqualByComparingTo("10.00");
        }

        @Test
        @DisplayName("returns zero when no config exists for state")
        void returnsZeroForUnknownState() {
            when(configRepository.findByTenantIdAndStateCodeAndIsActiveTrue(TENANT_ID, "XX"))
                    .thenReturn(Optional.empty());

            BigDecimal result = lwfService.calculateLWFForEmployee(
                    EMPLOYEE_ID, "XX", new BigDecimal("50000"), 6, 2025);

            assertThat(result).isEqualByComparingTo("0");
        }

        @Test
        @DisplayName("returns zero for null state code")
        void returnsZeroForNullState() {
            BigDecimal result = lwfService.calculateLWFForEmployee(
                    EMPLOYEE_ID, null, new BigDecimal("50000"), 6, 2025);

            assertThat(result).isEqualByComparingTo("0");
        }

        @Test
        @DisplayName("returns zero when salary below threshold (WB)")
        void returnsZeroWhenBelowSalaryThreshold() {
            LWFConfiguration wbConfig = LWFConfiguration.builder()
                    .id(UUID.randomUUID())
                    .tenantId(TENANT_ID)
                    .stateCode("WB")
                    .stateName("West Bengal")
                    .employeeContribution(new BigDecimal("3.00"))
                    .employerContribution(new BigDecimal("5.00"))
                    .frequency(LWFFrequency.HALF_YEARLY)
                    .applicableMonths("[6,12]")
                    .isActive(true)
                    .effectiveFrom(LocalDate.of(2024, 4, 1))
                    .salaryThreshold(new BigDecimal("10000.00"))
                    .build();

            when(configRepository.findByTenantIdAndStateCodeAndIsActiveTrue(TENANT_ID, "WB"))
                    .thenReturn(Optional.of(wbConfig));

            BigDecimal result = lwfService.calculateLWFForEmployee(
                    EMPLOYEE_ID, "WB", new BigDecimal("8000"), 6, 2025);

            assertThat(result).isEqualByComparingTo("0");
        }

        @Test
        @DisplayName("returns zero when before effective date")
        void returnsZeroBeforeEffectiveDate() {
            when(configRepository.findByTenantIdAndStateCodeAndIsActiveTrue(TENANT_ID, "MH"))
                    .thenReturn(Optional.of(buildMHConfig()));

            BigDecimal result = lwfService.calculateLWFForEmployee(
                    EMPLOYEE_ID, "MH", new BigDecimal("50000"), 6, 2023);

            assertThat(result).isEqualByComparingTo("0");
        }

        @Test
        @DisplayName("normalizes state code to uppercase")
        void normalizesStateCodeToUppercase() {
            when(configRepository.findByTenantIdAndStateCodeAndIsActiveTrue(TENANT_ID, "MH"))
                    .thenReturn(Optional.of(buildMHConfig()));

            BigDecimal result = lwfService.calculateLWFForEmployee(
                    EMPLOYEE_ID, "mh", new BigDecimal("50000"), 12, 2025);

            assertThat(result).isEqualByComparingTo("25.00");
        }
    }

    @Nested
    @DisplayName("getEmployerContribution")
    class GetEmployerContribution {

        @Test
        @DisplayName("returns employer amount for applicable month")
        void returnsEmployerAmount() {
            when(configRepository.findByTenantIdAndStateCodeAndIsActiveTrue(TENANT_ID, "MH"))
                    .thenReturn(Optional.of(buildMHConfig()));

            BigDecimal result = lwfService.getEmployerContribution("MH", 6, 2025);

            assertThat(result).isEqualByComparingTo("75.00");
        }

        @Test
        @DisplayName("returns zero for non-applicable month")
        void returnsZeroForWrongMonth() {
            when(configRepository.findByTenantIdAndStateCodeAndIsActiveTrue(TENANT_ID, "MH"))
                    .thenReturn(Optional.of(buildMHConfig()));

            BigDecimal result = lwfService.getEmployerContribution("MH", 3, 2025);

            assertThat(result).isEqualByComparingTo("0");
        }
    }

    @Nested
    @DisplayName("isApplicableForMonth")
    class IsApplicableForMonth {

        @Test
        @DisplayName("returns true for applicable month")
        void returnsTrueForApplicableMonth() {
            when(configRepository.findByTenantIdAndStateCodeAndIsActiveTrue(TENANT_ID, "MH"))
                    .thenReturn(Optional.of(buildMHConfig()));

            assertThat(lwfService.isApplicableForMonth("MH", 6)).isTrue();
            assertThat(lwfService.isApplicableForMonth("MH", 12)).isTrue();
        }

        @Test
        @DisplayName("returns false for non-applicable month")
        void returnsFalseForNonApplicableMonth() {
            when(configRepository.findByTenantIdAndStateCodeAndIsActiveTrue(TENANT_ID, "MH"))
                    .thenReturn(Optional.of(buildMHConfig()));

            assertThat(lwfService.isApplicableForMonth("MH", 1)).isFalse();
            assertThat(lwfService.isApplicableForMonth("MH", 7)).isFalse();
        }
    }

    @Nested
    @DisplayName("configureState")
    class ConfigureState {

        @Test
        @DisplayName("creates new config when none exists")
        void createsNewConfig() {
            when(configRepository.findByTenantIdAndStateCodeAndIsActiveTrue(TENANT_ID, "MH"))
                    .thenReturn(Optional.empty());
            when(configRepository.save(any(LWFConfiguration.class)))
                    .thenAnswer(i -> i.getArgument(0));

            LWFConfigurationDto dto = LWFConfigurationDto.builder()
                    .stateCode("MH")
                    .stateName("Maharashtra")
                    .employeeContribution(new BigDecimal("25.00"))
                    .employerContribution(new BigDecimal("75.00"))
                    .frequency(LWFFrequency.HALF_YEARLY)
                    .applicableMonths("[6,12]")
                    .effectiveFrom(LocalDate.of(2024, 4, 1))
                    .build();

            LWFConfiguration result = lwfService.configureState(dto);

            assertThat(result.getStateCode()).isEqualTo("MH");
            assertThat(result.getEmployeeContribution()).isEqualByComparingTo("25.00");
            verify(configRepository).save(any(LWFConfiguration.class));
        }

        @Test
        @DisplayName("rejects invalid applicable months for half-yearly")
        void rejectsInvalidApplicableMonths() {
            LWFConfigurationDto dto = LWFConfigurationDto.builder()
                    .stateCode("MH")
                    .stateName("Maharashtra")
                    .employeeContribution(new BigDecimal("25.00"))
                    .employerContribution(new BigDecimal("75.00"))
                    .frequency(LWFFrequency.HALF_YEARLY)
                    .applicableMonths("[6,9,12]") // 3 months for half-yearly is invalid
                    .effectiveFrom(LocalDate.of(2024, 4, 1))
                    .build();

            assertThatThrownBy(() -> lwfService.configureState(dto))
                    .isInstanceOf(BusinessException.class)
                    .hasMessageContaining("Half-yearly frequency requires exactly 2 months");
        }
    }

    @Nested
    @DisplayName("getRemittanceReport")
    class GetRemittanceReport {

        @Test
        @DisplayName("generates empty report when no deductions exist")
        void generatesEmptyReport() {
            when(deductionRepository.findByTenantIdAndDeductionMonthAndDeductionYearOrderByStateCodeAsc(
                    TENANT_ID, 6, 2025))
                    .thenReturn(Collections.emptyList());
            when(configRepository.findByTenantIdOrderByStateNameAsc(TENANT_ID))
                    .thenReturn(Collections.emptyList());

            LWFRemittanceReportDto report = lwfService.getRemittanceReport(6, 2025);

            assertThat(report.getMonth()).isEqualTo(6);
            assertThat(report.getYear()).isEqualTo(2025);
            assertThat(report.getTotalEmployees()).isEqualTo(0);
            assertThat(report.getGrandTotal()).isEqualByComparingTo("0.00");
            assertThat(report.getStateWiseSummary()).isEmpty();
        }

        @Test
        @DisplayName("aggregates deductions by state")
        void aggregatesDeductionsByState() {
            UUID emp1 = UUID.randomUUID();
            UUID emp2 = UUID.randomUUID();

            List<LWFDeduction> deductions = List.of(
                    LWFDeduction.builder()
                            .id(UUID.randomUUID()).tenantId(TENANT_ID)
                            .employeeId(emp1).stateCode("MH")
                            .employeeAmount(new BigDecimal("25.00"))
                            .employerAmount(new BigDecimal("75.00"))
                            .frequency(LWFFrequency.HALF_YEARLY)
                            .deductionMonth(6).deductionYear(2025)
                            .build(),
                    LWFDeduction.builder()
                            .id(UUID.randomUUID()).tenantId(TENANT_ID)
                            .employeeId(emp2).stateCode("MH")
                            .employeeAmount(new BigDecimal("25.00"))
                            .employerAmount(new BigDecimal("75.00"))
                            .frequency(LWFFrequency.HALF_YEARLY)
                            .deductionMonth(6).deductionYear(2025)
                            .build()
            );

            when(deductionRepository.findByTenantIdAndDeductionMonthAndDeductionYearOrderByStateCodeAsc(
                    TENANT_ID, 6, 2025))
                    .thenReturn(deductions);
            when(configRepository.findByTenantIdOrderByStateNameAsc(TENANT_ID))
                    .thenReturn(List.of(buildMHConfig()));

            LWFRemittanceReportDto report = lwfService.getRemittanceReport(6, 2025);

            assertThat(report.getTotalEmployees()).isEqualTo(2);
            assertThat(report.getTotalEmployeeContribution()).isEqualByComparingTo("50.00");
            assertThat(report.getTotalEmployerContribution()).isEqualByComparingTo("150.00");
            assertThat(report.getGrandTotal()).isEqualByComparingTo("200.00");
            assertThat(report.getStateWiseSummary()).hasSize(1);
            assertThat(report.getStateWiseSummary().get(0).getStateCode()).isEqualTo("MH");
        }
    }

    @Nested
    @DisplayName("recordDeduction")
    class RecordDeduction {

        @Test
        @DisplayName("prevents duplicate deductions for same employee/period")
        void preventsDuplicateDeductions() {
            when(deductionRepository.existsByTenantIdAndEmployeeIdAndDeductionMonthAndDeductionYear(
                    TENANT_ID, EMPLOYEE_ID, 6, 2025))
                    .thenReturn(true);

            assertThatThrownBy(() -> lwfService.recordDeduction(
                    EMPLOYEE_ID, null, "MH",
                    new BigDecimal("25.00"), new BigDecimal("75.00"),
                    LWFFrequency.HALF_YEARLY, 6, 2025, new BigDecimal("50000")))
                    .isInstanceOf(BusinessException.class)
                    .hasMessageContaining("already exists");
        }

        @Test
        @DisplayName("creates deduction record successfully")
        void createsDeductionRecord() {
            when(deductionRepository.existsByTenantIdAndEmployeeIdAndDeductionMonthAndDeductionYear(
                    TENANT_ID, EMPLOYEE_ID, 6, 2025))
                    .thenReturn(false);
            when(deductionRepository.save(any(LWFDeduction.class)))
                    .thenAnswer(i -> i.getArgument(0));

            LWFDeduction result = lwfService.recordDeduction(
                    EMPLOYEE_ID, null, "MH",
                    new BigDecimal("25.00"), new BigDecimal("75.00"),
                    LWFFrequency.HALF_YEARLY, 6, 2025, new BigDecimal("50000"));

            assertThat(result.getEmployeeId()).isEqualTo(EMPLOYEE_ID);
            assertThat(result.getStateCode()).isEqualTo("MH");
            assertThat(result.getEmployeeAmount()).isEqualByComparingTo("25.00");
            assertThat(result.getStatus()).isEqualTo(LWFDeduction.LWFDeductionStatus.CALCULATED);
            verify(deductionRepository).save(any(LWFDeduction.class));
        }
    }
}
