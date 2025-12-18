package com.hrms.application.analytics.service;

import com.hrms.api.analytics.dto.ExecutiveDashboardResponse;
import com.hrms.api.analytics.dto.ExecutiveDashboardResponse.*;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.analytics.AttritionPrediction;
import com.hrms.domain.employee.Employee;
import com.hrms.infrastructure.analytics.repository.AttritionPredictionRepository;
import com.hrms.infrastructure.analytics.repository.WorkforceTrendRepository;
import com.hrms.infrastructure.employee.repository.EmployeeRepository;
import com.hrms.infrastructure.payroll.repository.PayslipRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Executive Dashboard Service - Provides C-suite level analytics
 * Aggregates high-level KPIs, financial metrics, and strategic insights
 */
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class ExecutiveDashboardService {

    private final EmployeeRepository employeeRepository;
    private final PayslipRepository payslipRepository;
    private final AttritionPredictionRepository attritionRepository;
    private final WorkforceTrendRepository trendRepository;

    /**
     * Get comprehensive executive dashboard
     */
    public ExecutiveDashboardResponse getExecutiveDashboard() {
        UUID tenantId = TenantContext.getCurrentTenant();
        LocalDate today = LocalDate.now();
        int currentYear = today.getYear();
        int currentMonth = today.getMonthValue();

        log.info("Building executive dashboard for tenant: {}", tenantId);

        return ExecutiveDashboardResponse.builder()
                .keyMetrics(buildKeyMetrics(tenantId, currentYear))
                .financialSummary(buildFinancialSummary(tenantId, currentYear, currentMonth))
                .workforceSummary(buildWorkforceSummary(tenantId, today))
                .productivityMetrics(buildProductivityMetrics(tenantId))
                .riskIndicators(buildRiskIndicators(tenantId))
                .trendCharts(buildTrendCharts(tenantId, currentYear))
                .strategicAlerts(buildStrategicAlerts(tenantId))
                .build();
    }

    private List<KpiCard> buildKeyMetrics(UUID tenantId, int year) {
        List<KpiCard> metrics = new ArrayList<>();

        // 1. Total Headcount
        Long totalHeadcount = employeeRepository.countByTenantIdAndStatus(tenantId, Employee.EmployeeStatus.ACTIVE);
        Long lastMonthHeadcount = getLastMonthHeadcount(tenantId);
        BigDecimal headcountChange = calculateChangePercent(totalHeadcount, lastMonthHeadcount);

        metrics.add(KpiCard.builder()
                .name("Total Headcount")
                .value(String.valueOf(totalHeadcount))
                .unit("#")
                .trend(getTrendDirection(headcountChange))
                .changePercent(headcountChange)
                .changeDescription("vs last month")
                .status(getStatusForHeadcount(headcountChange))
                .icon("users")
                .color("#3B82F6")
                .build());

        // 2. Monthly Payroll Cost
        YearMonth currentMonth = YearMonth.now();
        BigDecimal monthlyPayroll = payslipRepository.sumNetSalaryByTenantIdAndYearAndMonth(
                tenantId, currentMonth.getYear(), currentMonth.getMonthValue());
        if (monthlyPayroll == null) monthlyPayroll = BigDecimal.ZERO;

        YearMonth lastMonth = currentMonth.minusMonths(1);
        BigDecimal lastMonthPayroll = payslipRepository.sumNetSalaryByTenantIdAndYearAndMonth(
                tenantId, lastMonth.getYear(), lastMonth.getMonthValue());
        if (lastMonthPayroll == null) lastMonthPayroll = BigDecimal.ZERO;

        BigDecimal payrollChange = calculateChangePercent(monthlyPayroll, lastMonthPayroll);

        metrics.add(KpiCard.builder()
                .name("Monthly Payroll")
                .value(formatCurrency(monthlyPayroll))
                .unit("$")
                .trend(getTrendDirection(payrollChange))
                .changePercent(payrollChange)
                .changeDescription("vs last month")
                .status(getStatusForCost(payrollChange))
                .icon("dollar-sign")
                .color("#10B981")
                .build());

        // 3. Attrition Rate
        BigDecimal attritionRate = calculateAttritionRate(tenantId, year);
        metrics.add(KpiCard.builder()
                .name("YTD Attrition Rate")
                .value(attritionRate.setScale(1, RoundingMode.HALF_UP) + "%")
                .unit("%")
                .trend(attritionRate.compareTo(BigDecimal.valueOf(10)) > 0 ? "UP" : "STABLE")
                .changePercent(attritionRate)
                .changeDescription("year to date")
                .status(getStatusForAttrition(attritionRate))
                .icon("user-minus")
                .color(getColorForAttrition(attritionRate))
                .build());

        // 4. Open Positions
        Long openPositions = getOpenPositions(tenantId);
        metrics.add(KpiCard.builder()
                .name("Open Positions")
                .value(String.valueOf(openPositions))
                .unit("#")
                .trend("STABLE")
                .changePercent(BigDecimal.ZERO)
                .changeDescription("active requisitions")
                .status(openPositions > 20 ? "WARNING" : "GOOD")
                .icon("briefcase")
                .color("#F59E0B")
                .build());

        // 5. Employee Engagement Score
        BigDecimal engagementScore = getEngagementScore(tenantId);
        metrics.add(KpiCard.builder()
                .name("Engagement Score")
                .value(engagementScore.setScale(1, RoundingMode.HALF_UP) + "/5")
                .unit("score")
                .trend(engagementScore.compareTo(BigDecimal.valueOf(3.5)) >= 0 ? "STABLE" : "DOWN")
                .changePercent(BigDecimal.ZERO)
                .changeDescription("from last survey")
                .status(getStatusForEngagement(engagementScore))
                .icon("heart")
                .color("#8B5CF6")
                .build());

        // 6. Training Completion Rate
        BigDecimal trainingRate = getTrainingCompletionRate(tenantId);
        metrics.add(KpiCard.builder()
                .name("Training Completion")
                .value(trainingRate.setScale(0, RoundingMode.HALF_UP) + "%")
                .unit("%")
                .trend(trainingRate.compareTo(BigDecimal.valueOf(80)) >= 0 ? "UP" : "DOWN")
                .changePercent(BigDecimal.ZERO)
                .changeDescription("mandatory trainings")
                .status(trainingRate.compareTo(BigDecimal.valueOf(80)) >= 0 ? "GOOD" : "WARNING")
                .icon("graduation-cap")
                .color("#EC4899")
                .build());

        return metrics;
    }

    private FinancialSummary buildFinancialSummary(UUID tenantId, int year, int month) {
        YearMonth currentMonth = YearMonth.of(year, month);

        // Monthly Payroll
        BigDecimal monthlyPayroll = payslipRepository.sumNetSalaryByTenantIdAndYearAndMonth(
                tenantId, year, month);
        if (monthlyPayroll == null) monthlyPayroll = BigDecimal.ZERO;

        // YTD Payroll
        BigDecimal ytdPayroll = BigDecimal.ZERO;
        for (int m = 1; m <= month; m++) {
            BigDecimal monthTotal = payslipRepository.sumNetSalaryByTenantIdAndYearAndMonth(tenantId, year, m);
            if (monthTotal != null) {
                ytdPayroll = ytdPayroll.add(monthTotal);
            }
        }

        // Projected Annual
        BigDecimal projectedAnnual = month > 0 ? ytdPayroll.divide(BigDecimal.valueOf(month), 2, RoundingMode.HALF_UP)
                .multiply(BigDecimal.valueOf(12)) : BigDecimal.ZERO;

        // Cost per Employee
        Long headcount = employeeRepository.countByTenantIdAndStatus(tenantId, Employee.EmployeeStatus.ACTIVE);
        BigDecimal avgCostPerEmployee = headcount > 0 ?
                monthlyPayroll.divide(BigDecimal.valueOf(headcount), 2, RoundingMode.HALF_UP) : BigDecimal.ZERO;

        // Department Costs
        List<DepartmentCost> departmentCosts = buildDepartmentCosts(tenantId, year, month, monthlyPayroll);

        // Cost Breakdown (simulated - would need actual data)
        CostBreakdown costBreakdown = CostBreakdown.builder()
                .baseSalary(monthlyPayroll.multiply(BigDecimal.valueOf(0.70)))
                .benefits(monthlyPayroll.multiply(BigDecimal.valueOf(0.15)))
                .bonuses(monthlyPayroll.multiply(BigDecimal.valueOf(0.05)))
                .taxes(monthlyPayroll.multiply(BigDecimal.valueOf(0.08)))
                .training(monthlyPayroll.multiply(BigDecimal.valueOf(0.01)))
                .recruitment(monthlyPayroll.multiply(BigDecimal.valueOf(0.005)))
                .other(monthlyPayroll.multiply(BigDecimal.valueOf(0.005)))
                .build();

        return FinancialSummary.builder()
                .monthlyPayrollCost(monthlyPayroll)
                .yearToDatePayrollCost(ytdPayroll)
                .projectedAnnualPayrollCost(projectedAnnual)
                .payrollCostChangePercent(BigDecimal.ZERO) // Would need historical comparison
                .avgCostPerEmployee(avgCostPerEmployee)
                .costPerEmployeeChange(BigDecimal.ZERO)
                .budgetAllocated(projectedAnnual.multiply(BigDecimal.valueOf(1.1))) // 10% buffer
                .budgetUtilized(ytdPayroll)
                .budgetUtilizationPercent(month > 0 ? BigDecimal.valueOf(month * 100 / 12) : BigDecimal.ZERO)
                .revenuePerEmployee(BigDecimal.ZERO) // Would need revenue data
                .departmentCosts(departmentCosts)
                .costBreakdown(costBreakdown)
                .build();
    }

    private List<DepartmentCost> buildDepartmentCosts(UUID tenantId, int year, int month, BigDecimal totalCost) {
        List<Object[]> deptCounts = employeeRepository.findDepartmentDistribution(tenantId);

        return deptCounts.stream()
                .map(row -> {
                    String deptName = (String) row[0];
                    Long count = ((Number) row[1]).longValue();
                    BigDecimal percentOfTotal = totalCost.compareTo(BigDecimal.ZERO) > 0 ?
                            BigDecimal.valueOf(count).divide(BigDecimal.valueOf(deptCounts.stream()
                                    .mapToLong(r -> ((Number) r[1]).longValue()).sum()), 4, RoundingMode.HALF_UP)
                                    .multiply(BigDecimal.valueOf(100)) : BigDecimal.ZERO;
                    BigDecimal deptCost = totalCost.multiply(percentOfTotal).divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);

                    return DepartmentCost.builder()
                            .departmentId(null) // Would need department ID
                            .departmentName(deptName != null ? deptName : "Unassigned")
                            .totalCost(deptCost)
                            .headcount(count.intValue())
                            .costPerHead(count > 0 ? deptCost.divide(BigDecimal.valueOf(count), 2, RoundingMode.HALF_UP) : BigDecimal.ZERO)
                            .percentOfTotal(percentOfTotal)
                            .build();
                })
                .sorted((a, b) -> b.getTotalCost().compareTo(a.getTotalCost()))
                .limit(10)
                .collect(Collectors.toList());
    }

    private WorkforceSummary buildWorkforceSummary(UUID tenantId, LocalDate today) {
        Long activeEmployees = employeeRepository.countByTenantIdAndStatus(tenantId, Employee.EmployeeStatus.ACTIVE);

        LocalDate monthStart = today.withDayOfMonth(1);
        LocalDate quarterStart = today.withDayOfMonth(1).withMonth(((today.getMonthValue() - 1) / 3) * 3 + 1);
        LocalDate yearStart = today.withDayOfYear(1);

        Long newHiresMonth = employeeRepository.countByTenantIdAndJoiningDateBetween(tenantId, monthStart, today);
        Long newHiresQuarter = employeeRepository.countByTenantIdAndJoiningDateBetween(tenantId, quarterStart, today);
        Long newHiresYear = employeeRepository.countByTenantIdAndJoiningDateBetween(tenantId, yearStart, today);

        Long terminationsMonth = employeeRepository.countByTenantIdAndStatusAndExitDateBetween(
                tenantId, Employee.EmployeeStatus.TERMINATED, monthStart, today);
        Long terminationsQuarter = employeeRepository.countByTenantIdAndStatusAndExitDateBetween(
                tenantId, Employee.EmployeeStatus.TERMINATED, quarterStart, today);
        Long terminationsYear = employeeRepository.countByTenantIdAndStatusAndExitDateBetween(
                tenantId, Employee.EmployeeStatus.TERMINATED, yearStart, today);

        BigDecimal attritionRate = activeEmployees > 0 ?
                BigDecimal.valueOf(terminationsYear * 100.0 / activeEmployees) : BigDecimal.ZERO;
        BigDecimal retentionRate = BigDecimal.valueOf(100).subtract(attritionRate);

        // Department distribution
        List<Object[]> deptCounts = employeeRepository.findDepartmentDistribution(tenantId);
        List<DemographicBreakdown> byDepartment = deptCounts.stream()
                .map(row -> DemographicBreakdown.builder()
                        .category((String) row[0] != null ? (String) row[0] : "Unassigned")
                        .count(((Number) row[1]).intValue())
                        .percentage(activeEmployees > 0 ?
                                BigDecimal.valueOf(((Number) row[1]).longValue() * 100.0 / activeEmployees) : BigDecimal.ZERO)
                        .build())
                .collect(Collectors.toList());

        // Tenure distribution (simplified)
        TenureDistribution tenureDistribution = buildTenureDistribution(tenantId);

        return WorkforceSummary.builder()
                .totalHeadcount(activeEmployees.intValue())
                .activeEmployees(activeEmployees.intValue())
                .contractorCount(0) // Would need contractor tracking
                .openPositions(getOpenPositions(tenantId).intValue())
                .newHiresThisMonth(newHiresMonth.intValue())
                .newHiresThisQuarter(newHiresQuarter.intValue())
                .newHiresThisYear(newHiresYear.intValue())
                .terminationsThisMonth(terminationsMonth.intValue())
                .terminationsThisQuarter(terminationsQuarter.intValue())
                .terminationsThisYear(terminationsYear.intValue())
                .attritionRate(attritionRate.setScale(2, RoundingMode.HALF_UP))
                .retentionRate(retentionRate.setScale(2, RoundingMode.HALF_UP))
                .hiringVelocity(BigDecimal.valueOf(newHiresYear).divide(
                        BigDecimal.valueOf(Math.max(1, today.getMonthValue())), 1, RoundingMode.HALF_UP))
                .byDepartment(byDepartment)
                .byLocation(new ArrayList<>()) // Would need location data
                .byEmploymentType(new ArrayList<>()) // Would need employment type data
                .tenureDistribution(tenureDistribution)
                .build();
    }

    private TenureDistribution buildTenureDistribution(UUID tenantId) {
        // This is a simplified implementation - would need custom queries
        return TenureDistribution.builder()
                .lessThan1Year(0)
                .oneToThreeYears(0)
                .threeToFiveYears(0)
                .fiveToTenYears(0)
                .moreThan10Years(0)
                .avgTenureYears(BigDecimal.valueOf(2.5)) // Placeholder
                .build();
    }

    private ProductivityMetrics buildProductivityMetrics(UUID tenantId) {
        return ProductivityMetrics.builder()
                .avgAttendanceRate(BigDecimal.valueOf(92.5)) // Would need actual calculation
                .absenteeismRate(BigDecimal.valueOf(7.5))
                .avgWorkingHours(BigDecimal.valueOf(8.2))
                .avgPerformanceRating(BigDecimal.valueOf(3.6))
                .highPerformersCount(0) // Would need performance data
                .lowPerformersCount(0)
                .performanceImprovementRate(BigDecimal.ZERO)
                .engagementScore(getEngagementScore(tenantId))
                .engagementChangePercent(BigDecimal.ZERO)
                .eNPS(BigDecimal.valueOf(35)) // Placeholder
                .trainingHoursPerEmployee(BigDecimal.valueOf(12))
                .trainingCompletionRate(getTrainingCompletionRate(tenantId))
                .certificationCount(0)
                .goalCompletionRate(BigDecimal.valueOf(75))
                .goalsOnTrack(0)
                .goalsAtRisk(0)
                .goalsDelayed(0)
                .build();
    }

    private RiskIndicators buildRiskIndicators(UUID tenantId) {
        // Get attrition risk counts
        List<Object[]> riskDistribution = attritionRepository.countByRiskLevelDistribution(tenantId);

        int highRisk = 0, criticalRisk = 0;
        for (Object[] row : riskDistribution) {
            AttritionPrediction.RiskLevel level = (AttritionPrediction.RiskLevel) row[0];
            int count = ((Long) row[1]).intValue();
            if (level == AttritionPrediction.RiskLevel.HIGH) highRisk = count;
            if (level == AttritionPrediction.RiskLevel.CRITICAL) criticalRisk = count;
        }

        return RiskIndicators.builder()
                .highRiskEmployees(highRisk)
                .criticalRiskEmployees(criticalRisk)
                .predictedAttritionRate(BigDecimal.valueOf((highRisk + criticalRisk) * 0.7)) // 70% prediction rate
                .departmentRisks(new ArrayList<>()) // Would aggregate by department
                .complianceIssuesCount(0)
                .overdueTrainings(0)
                .expiredCertifications(0)
                .criticalSkillGaps(0)
                .totalSkillGaps(0)
                .skillCoveragePercent(BigDecimal.valueOf(85))
                .keyPositionsWithoutSuccessor(0)
                .successionReadyPercentage(0)
                .employeesWithHighWorkload(0)
                .employeesWithExcessiveOvertime(0)
                .avgOvertimeHours(BigDecimal.ZERO)
                .build();
    }

    private TrendCharts buildTrendCharts(UUID tenantId, int year) {
        List<TrendPoint> headcountTrend = new ArrayList<>();
        List<TrendPoint> payrollTrend = new ArrayList<>();
        List<TrendPoint> attritionTrend = new ArrayList<>();
        List<HiringAttritionPoint> hiringVsAttrition = new ArrayList<>();

        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("MMM yyyy");

        for (int i = 11; i >= 0; i--) {
            YearMonth month = YearMonth.now().minusMonths(i);
            String period = month.format(formatter);

            // Headcount trend (simplified - would need point-in-time queries)
            Long headcount = employeeRepository.countByTenantIdAndStatus(tenantId, Employee.EmployeeStatus.ACTIVE);
            headcountTrend.add(TrendPoint.builder()
                    .period(period)
                    .value(BigDecimal.valueOf(headcount))
                    .previousValue(BigDecimal.valueOf(headcount - 5))
                    .changePercent(BigDecimal.valueOf(2))
                    .build());

            // Payroll trend
            BigDecimal payroll = payslipRepository.sumNetSalaryByTenantIdAndYearAndMonth(
                    tenantId, month.getYear(), month.getMonthValue());
            payrollTrend.add(TrendPoint.builder()
                    .period(period)
                    .value(payroll != null ? payroll : BigDecimal.ZERO)
                    .previousValue(BigDecimal.ZERO)
                    .changePercent(BigDecimal.ZERO)
                    .build());

            // Hiring vs Attrition
            LocalDate monthStart = month.atDay(1);
            LocalDate monthEnd = month.atEndOfMonth();
            Long hires = employeeRepository.countByTenantIdAndJoiningDateBetween(tenantId, monthStart, monthEnd);
            Long terminations = employeeRepository.countByTenantIdAndStatusAndExitDateBetween(
                    tenantId, Employee.EmployeeStatus.TERMINATED, monthStart, monthEnd);

            hiringVsAttrition.add(HiringAttritionPoint.builder()
                    .period(period)
                    .hires(hires.intValue())
                    .terminations(terminations.intValue())
                    .netChange((int) (hires - terminations))
                    .build());
        }

        return TrendCharts.builder()
                .headcountTrend(headcountTrend)
                .payrollCostTrend(payrollTrend)
                .attritionTrend(attritionTrend)
                .engagementTrend(new ArrayList<>())
                .hiringVsAttrition(hiringVsAttrition)
                .build();
    }

    private List<StrategicAlert> buildStrategicAlerts(UUID tenantId) {
        List<StrategicAlert> alerts = new ArrayList<>();

        // Check for high attrition risk
        List<Object[]> riskDistribution = attritionRepository.countByRiskLevelDistribution(tenantId);
        int criticalRisk = 0;
        for (Object[] row : riskDistribution) {
            if (row[0] == AttritionPrediction.RiskLevel.CRITICAL) {
                criticalRisk = ((Long) row[1]).intValue();
            }
        }

        if (criticalRisk > 5) {
            alerts.add(StrategicAlert.builder()
                    .id(UUID.randomUUID().toString())
                    .severity("CRITICAL")
                    .category("ATTRITION")
                    .title("High Attrition Risk Detected")
                    .description(criticalRisk + " employees identified as critical attrition risk")
                    .recommendation("Review compensation and engagement programs for at-risk employees")
                    .impact("HIGH")
                    .trend("WORSENING")
                    .createdAt(LocalDate.now().toString())
                    .build());
        }

        // Add more alerts based on business rules
        alerts.add(StrategicAlert.builder()
                .id(UUID.randomUUID().toString())
                .severity("INFO")
                .category("PERFORMANCE")
                .title("Performance Review Cycle Approaching")
                .description("Annual performance reviews due in 30 days")
                .recommendation("Ensure all managers have scheduled review meetings")
                .impact("MEDIUM")
                .trend("STABLE")
                .createdAt(LocalDate.now().toString())
                .build());

        return alerts;
    }

    // Helper methods
    private Long getLastMonthHeadcount(UUID tenantId) {
        // Simplified - would need historical tracking
        return employeeRepository.countByTenantIdAndStatus(tenantId, Employee.EmployeeStatus.ACTIVE);
    }

    private BigDecimal calculateChangePercent(Number current, Number previous) {
        if (previous == null || previous.doubleValue() == 0) return BigDecimal.ZERO;
        return BigDecimal.valueOf((current.doubleValue() - previous.doubleValue()) / previous.doubleValue() * 100)
                .setScale(2, RoundingMode.HALF_UP);
    }

    private BigDecimal calculateChangePercent(BigDecimal current, BigDecimal previous) {
        if (previous == null || previous.compareTo(BigDecimal.ZERO) == 0) return BigDecimal.ZERO;
        return current.subtract(previous).divide(previous, 4, RoundingMode.HALF_UP)
                .multiply(BigDecimal.valueOf(100))
                .setScale(2, RoundingMode.HALF_UP);
    }

    private String getTrendDirection(BigDecimal change) {
        if (change.compareTo(BigDecimal.valueOf(1)) > 0) return "UP";
        if (change.compareTo(BigDecimal.valueOf(-1)) < 0) return "DOWN";
        return "STABLE";
    }

    private String getStatusForHeadcount(BigDecimal change) {
        return "GOOD";
    }

    private String getStatusForCost(BigDecimal change) {
        if (change.compareTo(BigDecimal.valueOf(10)) > 0) return "WARNING";
        return "GOOD";
    }

    private String getStatusForAttrition(BigDecimal rate) {
        if (rate.compareTo(BigDecimal.valueOf(15)) > 0) return "CRITICAL";
        if (rate.compareTo(BigDecimal.valueOf(10)) > 0) return "WARNING";
        return "GOOD";
    }

    private String getColorForAttrition(BigDecimal rate) {
        if (rate.compareTo(BigDecimal.valueOf(15)) > 0) return "#EF4444";
        if (rate.compareTo(BigDecimal.valueOf(10)) > 0) return "#F59E0B";
        return "#10B981";
    }

    private String getStatusForEngagement(BigDecimal score) {
        if (score.compareTo(BigDecimal.valueOf(4)) >= 0) return "GOOD";
        if (score.compareTo(BigDecimal.valueOf(3)) >= 0) return "WARNING";
        return "CRITICAL";
    }

    private String formatCurrency(BigDecimal amount) {
        if (amount.compareTo(BigDecimal.valueOf(1000000)) >= 0) {
            return amount.divide(BigDecimal.valueOf(1000000), 2, RoundingMode.HALF_UP) + "M";
        } else if (amount.compareTo(BigDecimal.valueOf(1000)) >= 0) {
            return amount.divide(BigDecimal.valueOf(1000), 1, RoundingMode.HALF_UP) + "K";
        }
        return amount.setScale(0, RoundingMode.HALF_UP).toString();
    }

    private BigDecimal calculateAttritionRate(UUID tenantId, int year) {
        Long activeEmployees = employeeRepository.countByTenantIdAndStatus(tenantId, Employee.EmployeeStatus.ACTIVE);
        Long terminations = employeeRepository.countByTenantIdAndStatusAndExitDateBetween(
                tenantId, Employee.EmployeeStatus.TERMINATED,
                LocalDate.of(year, 1, 1), LocalDate.now());
        if (activeEmployees == 0) return BigDecimal.ZERO;
        return BigDecimal.valueOf(terminations * 100.0 / activeEmployees);
    }

    private Long getOpenPositions(UUID tenantId) {
        // Would need job requisition/recruitment module integration
        return 15L; // Placeholder
    }

    private BigDecimal getEngagementScore(UUID tenantId) {
        // Would need engagement survey integration
        return BigDecimal.valueOf(3.8); // Placeholder
    }

    private BigDecimal getTrainingCompletionRate(UUID tenantId) {
        // Would need LMS integration
        return BigDecimal.valueOf(82); // Placeholder
    }
}
