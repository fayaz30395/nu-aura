package com.hrms.application.analytics.service;

import com.hrms.api.analytics.dto.ExecutiveDashboardResponse;
import com.hrms.api.analytics.dto.ExecutiveDashboardResponse.TrendCharts;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.employee.Employee;
import com.hrms.infrastructure.analytics.repository.AttritionPredictionRepository;
import com.hrms.infrastructure.analytics.repository.WorkforceTrendRepository;
import com.hrms.infrastructure.employee.repository.EmployeeRepository;
import com.hrms.infrastructure.payroll.repository.PayslipRepository;
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
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Unit tests for ExecutiveDashboardService.
 * Verifies batch query efficiency (3-4 repository calls instead of 48)
 * and correct data assembly for the executive dashboard.
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("ExecutiveDashboardService Tests")
class ExecutiveDashboardServiceTest {

    private static final UUID TENANT_ID = UUID.randomUUID();

    @Mock
    private EmployeeRepository employeeRepository;

    @Mock
    private PayslipRepository payslipRepository;

    @Mock
    private AttritionPredictionRepository attritionRepository;

    @Mock
    private WorkforceTrendRepository trendRepository;

    @InjectMocks
    private ExecutiveDashboardService executiveDashboardService;

    private MockedStatic<TenantContext> tenantContextMock;

    @BeforeEach
    void setUp() {
        tenantContextMock = mockStatic(TenantContext.class);
        tenantContextMock.when(TenantContext::getCurrentTenant).thenReturn(TENANT_ID);

        // Default stubs for all repository calls used across multiple tests
        when(employeeRepository.countByTenantIdAndStatus(eq(TENANT_ID), eq(Employee.EmployeeStatus.ACTIVE)))
                .thenReturn(100L);
        when(employeeRepository.countByTenantIdAndJoiningDateBetween(eq(TENANT_ID), any(), any()))
                .thenReturn(5L);
        when(employeeRepository.countByTenantIdAndStatusAndExitDateBetween(
                eq(TENANT_ID), eq(Employee.EmployeeStatus.TERMINATED), any(), any()))
                .thenReturn(2L);
        when(employeeRepository.findDepartmentDistribution(TENANT_ID))
                .thenReturn(List.of(new Object[]{"Engineering", 40L}, new Object[]{"HR", 10L}));

        when(payslipRepository.sumNetSalaryByTenantIdAndYearAndMonth(eq(TENANT_ID), anyInt(), anyInt()))
                .thenReturn(BigDecimal.valueOf(500_000));
        when(payslipRepository.sumNetSalaryByTenantIdAndYearMonthRange(
                eq(TENANT_ID), anyInt(), anyInt(), anyInt(), anyInt()))
                .thenReturn(List.of());

        when(employeeRepository.countHiresByTenantIdAndJoiningDateRange(
                eq(TENANT_ID), any(LocalDate.class), any(LocalDate.class)))
                .thenReturn(List.of());
        when(employeeRepository.countTerminationsByTenantIdAndExitDateRange(
                eq(TENANT_ID), eq(Employee.EmployeeStatus.TERMINATED),
                any(LocalDate.class), any(LocalDate.class)))
                .thenReturn(List.of());

        when(attritionRepository.countByRiskLevelDistribution(TENANT_ID))
                .thenReturn(List.of());
    }

    @AfterEach
    void tearDown() {
        tenantContextMock.close();
    }

    @Nested
    @DisplayName("buildTrendCharts — batch query efficiency")
    class BuildTrendChartsTests {

        @Test
        @DisplayName("Should make exactly 3 batch repository calls for trend data (not 48)")
        void shouldMakeExactly3BatchCallsForTrendData() {
            // When
            executiveDashboardService.getExecutiveDashboard();

            // Then: exactly 1 payroll batch query
            verify(payslipRepository, times(1)).sumNetSalaryByTenantIdAndYearMonthRange(
                    eq(TENANT_ID), anyInt(), anyInt(), anyInt(), anyInt());

            // Then: exactly 1 hire batch query
            verify(employeeRepository, times(1)).countHiresByTenantIdAndJoiningDateRange(
                    eq(TENANT_ID), any(LocalDate.class), any(LocalDate.class));

            // Then: exactly 1 termination batch query
            verify(employeeRepository, times(1)).countTerminationsByTenantIdAndExitDateRange(
                    eq(TENANT_ID), eq(Employee.EmployeeStatus.TERMINATED),
                    any(LocalDate.class), any(LocalDate.class));

            // Verify NO per-month payroll queries were made (would be 12 otherwise)
            verify(payslipRepository, never()).sumNetSalaryByTenantIdAndYearMonthRange(
                    any(), anyInt(), anyInt(), anyInt(), anyInt());
        }

        @Test
        @DisplayName("Should produce 12 months of trend points")
        void shouldProduce12MonthsOfTrendPoints() {
            // When
            ExecutiveDashboardResponse response = executiveDashboardService.getExecutiveDashboard();

            // Then
            TrendCharts charts = response.getTrendCharts();
            assertThat(charts.getHeadcountTrend()).hasSize(12);
            assertThat(charts.getPayrollCostTrend()).hasSize(12);
            assertThat(charts.getHiringVsAttrition()).hasSize(12);
        }

        @Test
        @DisplayName("Should populate payroll trend from batch query results")
        void shouldPopulatePayrollTrendFromBatchResults() {
            // Given — return payroll data for a specific year-month
            YearMonth targetMonth = YearMonth.now().minusMonths(3);
            Object[] row = new Object[]{targetMonth.getYear(), targetMonth.getMonthValue(), BigDecimal.valueOf(250_000)};
            List<Object[]> payrollRows = new java.util.ArrayList<>();
            payrollRows.add(row);
            when(payslipRepository.sumNetSalaryByTenantIdAndYearMonthRange(
                    eq(TENANT_ID), anyInt(), anyInt(), anyInt(), anyInt()))
                    .thenReturn(payrollRows);

            // When
            ExecutiveDashboardResponse response = executiveDashboardService.getExecutiveDashboard();

            // Then — at least one trend point should have the payroll value
            TrendCharts charts = response.getTrendCharts();
            boolean hasPayrollData = charts.getPayrollCostTrend().stream()
                    .anyMatch(tp -> tp.getValue().compareTo(BigDecimal.valueOf(250_000)) == 0);
            assertThat(hasPayrollData).isTrue();
        }

        @Test
        @DisplayName("Should use zero as default when no payroll data for a month")
        void shouldUseZeroAsDefaultWhenNoPayrollData() {
            // Given — batch query returns empty
            when(payslipRepository.sumNetSalaryByTenantIdAndYearMonthRange(
                    eq(TENANT_ID), anyInt(), anyInt(), anyInt(), anyInt()))
                    .thenReturn(List.of());

            // When
            ExecutiveDashboardResponse response = executiveDashboardService.getExecutiveDashboard();

            // Then — all payroll trend values should be zero
            TrendCharts charts = response.getTrendCharts();
            assertThat(charts.getPayrollCostTrend())
                    .allMatch(tp -> tp.getValue().compareTo(BigDecimal.ZERO) == 0);
        }

        @Test
        @DisplayName("Should populate hiring vs attrition from batch query results")
        void shouldPopulateHiringVsAttritionFromBatchResults() {
            // Given
            YearMonth targetMonth = YearMonth.now().minusMonths(1);
            Object[] hireRow = new Object[]{targetMonth.getYear(), targetMonth.getMonthValue(), 8L};
            Object[] termRow = new Object[]{targetMonth.getYear(), targetMonth.getMonthValue(), 3L};
            List<Object[]> hireRows = new java.util.ArrayList<>();
            hireRows.add(hireRow);
            List<Object[]> termRows = new java.util.ArrayList<>();
            termRows.add(termRow);
            when(employeeRepository.countHiresByTenantIdAndJoiningDateRange(any(), any(), any()))
                    .thenReturn(hireRows);
            when(employeeRepository.countTerminationsByTenantIdAndExitDateRange(any(), any(), any(), any()))
                    .thenReturn(termRows);

            // When
            ExecutiveDashboardResponse response = executiveDashboardService.getExecutiveDashboard();

            // Then — one month should have 8 hires, 3 terminations, net +5
            TrendCharts charts = response.getTrendCharts();
            boolean hasMatchingMonth = charts.getHiringVsAttrition().stream()
                    .anyMatch(hap -> hap.getHires() == 8 && hap.getTerminations() == 3 && hap.getNetChange() == 5);
            assertThat(hasMatchingMonth).isTrue();
        }
    }

    @Nested
    @DisplayName("Empty data handling")
    class EmptyDataHandlingTests {

        @Test
        @DisplayName("Should return zero headcount when no active employees")
        void shouldReturnZeroHeadcountWhenNoActiveEmployees() {
            // Given
            when(employeeRepository.countByTenantIdAndStatus(TENANT_ID, Employee.EmployeeStatus.ACTIVE))
                    .thenReturn(0L);

            // When
            ExecutiveDashboardResponse response = executiveDashboardService.getExecutiveDashboard();

            // Then
            assertThat(response.getWorkforceSummary().getActiveEmployees()).isEqualTo(0);
            assertThat(response.getWorkforceSummary().getAttritionRate()).isEqualByComparingTo(BigDecimal.ZERO);
        }

        @Test
        @DisplayName("Should return zero financial metrics when no payroll data")
        void shouldReturnZeroFinancialMetricsWhenNoPayrollData() {
            // Given
            when(payslipRepository.sumNetSalaryByTenantIdAndYearAndMonth(any(), anyInt(), anyInt()))
                    .thenReturn(null);

            // When
            ExecutiveDashboardResponse response = executiveDashboardService.getExecutiveDashboard();

            // Then
            assertThat(response.getFinancialSummary().getMonthlyPayrollCost())
                    .isEqualByComparingTo(BigDecimal.ZERO);
        }

        @Test
        @DisplayName("Should handle empty department distribution gracefully")
        void shouldHandleEmptyDepartmentDistributionGracefully() {
            // Given
            when(employeeRepository.findDepartmentDistribution(TENANT_ID))
                    .thenReturn(List.of());

            // When
            ExecutiveDashboardResponse response = executiveDashboardService.getExecutiveDashboard();

            // Then
            assertThat(response.getFinancialSummary().getDepartmentCosts()).isEmpty();
            assertThat(response.getWorkforceSummary().getByDepartment()).isEmpty();
        }

        @Test
        @DisplayName("Should not throw when attrition repository returns empty")
        void shouldNotThrowWhenAttritionRepositoryReturnsEmpty() {
            // Given
            when(attritionRepository.countByRiskLevelDistribution(TENANT_ID))
                    .thenReturn(List.of());

            // When
            ExecutiveDashboardResponse response = executiveDashboardService.getExecutiveDashboard();

            // Then
            assertThat(response.getRiskIndicators().getHighRiskEmployees()).isEqualTo(0);
            assertThat(response.getRiskIndicators().getCriticalRiskEmployees()).isEqualTo(0);
        }
    }

    @Nested
    @DisplayName("Key metrics calculations")
    class KeyMetricsTests {

        @Test
        @DisplayName("Should build 6 KPI cards")
        void shouldBuild6KpiCards() {
            // When
            ExecutiveDashboardResponse response = executiveDashboardService.getExecutiveDashboard();

            // Then
            assertThat(response.getKeyMetrics()).hasSize(6);
        }

        @Test
        @DisplayName("Should set headcount value correctly")
        void shouldSetHeadcountValueCorrectly() {
            // Given
            when(employeeRepository.countByTenantIdAndStatus(TENANT_ID, Employee.EmployeeStatus.ACTIVE))
                    .thenReturn(250L);

            // When
            ExecutiveDashboardResponse response = executiveDashboardService.getExecutiveDashboard();

            // Then — first KPI card is headcount
            assertThat(response.getKeyMetrics().get(0).getValue()).isEqualTo("250");
            assertThat(response.getKeyMetrics().get(0).getName()).isEqualTo("Total Headcount");
        }

        @Test
        @DisplayName("Should show CRITICAL attrition status when rate exceeds 15 percent")
        void shouldShowCriticalAttritionWhenRateExceeds15Percent() {
            // Given — 20 terminations out of 100 active = 20% attrition
            when(employeeRepository.countByTenantIdAndStatus(TENANT_ID, Employee.EmployeeStatus.ACTIVE))
                    .thenReturn(100L);
            when(employeeRepository.countByTenantIdAndStatusAndExitDateBetween(
                    eq(TENANT_ID), eq(Employee.EmployeeStatus.TERMINATED), any(), any()))
                    .thenReturn(20L);

            // When
            ExecutiveDashboardResponse response = executiveDashboardService.getExecutiveDashboard();

            // Then — attrition KPI card (index 2) should be CRITICAL
            assertThat(response.getKeyMetrics().get(2).getStatus()).isEqualTo("CRITICAL");
        }
    }

    @Nested
    @DisplayName("Strategic alerts")
    class StrategicAlertsTests {

        @Test
        @DisplayName("Should include critical attrition alert when more than 5 critical risk employees")
        void shouldIncludeCriticalAttritionAlertWhenHighRisk() {
            // Given
            Object[] criticalRow = new Object[]{
                com.hrms.domain.analytics.AttritionPrediction.RiskLevel.CRITICAL, 10L
            };
            List<Object[]> criticalRows = new java.util.ArrayList<>();
            criticalRows.add(criticalRow);
            when(attritionRepository.countByRiskLevelDistribution(TENANT_ID))
                    .thenReturn(criticalRows);

            // When
            ExecutiveDashboardResponse response = executiveDashboardService.getExecutiveDashboard();

            // Then
            boolean hasCriticalAlert = response.getStrategicAlerts().stream()
                    .anyMatch(a -> "CRITICAL".equals(a.getSeverity()) && "ATTRITION".equals(a.getCategory()));
            assertThat(hasCriticalAlert).isTrue();
        }

        @Test
        @DisplayName("Should always include at least one info alert for performance review cycle")
        void shouldAlwaysIncludeInfoAlertForPerformanceReviewCycle() {
            // When
            ExecutiveDashboardResponse response = executiveDashboardService.getExecutiveDashboard();

            // Then
            boolean hasInfoAlert = response.getStrategicAlerts().stream()
                    .anyMatch(a -> "INFO".equals(a.getSeverity()) && "PERFORMANCE".equals(a.getCategory()));
            assertThat(hasInfoAlert).isTrue();
        }
    }
}
