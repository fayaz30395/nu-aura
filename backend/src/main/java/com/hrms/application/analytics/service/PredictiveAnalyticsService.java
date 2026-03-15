package com.hrms.application.analytics.service;

import com.hrms.api.analytics.dto.*;
import com.hrms.common.security.TenantContext;
import com.hrms.common.exception.ResourceNotFoundException;
import com.hrms.domain.analytics.*;
import com.hrms.domain.employee.Employee;
import com.hrms.domain.payroll.SalaryStructure;
import com.hrms.infrastructure.analytics.repository.*;
import com.hrms.infrastructure.employee.repository.EmployeeRepository;
import com.hrms.infrastructure.payroll.repository.SalaryStructureRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.Year;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class PredictiveAnalyticsService {

    private final AttritionPredictionRepository attritionRepository;
    private final WorkforceTrendRepository trendRepository;
    private final AnalyticsInsightRepository insightRepository;
    private final SkillGapRepository skillGapRepository;
    private final EmployeeRepository employeeRepository;
    private final SalaryStructureRepository salaryStructureRepository;

    // ==================== DASHBOARD ====================

    @Transactional(readOnly = true)
    public PredictiveAnalyticsDashboard getDashboard() {
        UUID tenantId = TenantContext.getCurrentTenant();
        int currentYear = Year.now().getValue();
        LocalDate thirtyDaysAgo = LocalDate.now().minusDays(30);

        // Attrition Summary
        PredictiveAnalyticsDashboard.AttritionSummary attritionSummary = buildAttritionSummary(tenantId, thirtyDaysAgo);

        // Workforce Summary
        PredictiveAnalyticsDashboard.WorkforceSummary workforceSummary = buildWorkforceSummary(tenantId, currentYear);

        // Skill Gap Summary
        PredictiveAnalyticsDashboard.SkillGapSummary skillGapSummary = buildSkillGapSummary(tenantId, thirtyDaysAgo);

        // Critical Insights
        List<AnalyticsInsight> criticalInsights = insightRepository.findCriticalUnacknowledged(tenantId);
        List<AnalyticsInsightDto> criticalInsightDtos = criticalInsights.stream()
                .limit(5)
                .map(AnalyticsInsightDto::fromEntity)
                .collect(Collectors.toList());

        // Count active insights
        List<Object[]> insightCounts = insightRepository.countActiveByCategory(tenantId);
        int totalActiveInsights = insightCounts.stream()
                .mapToInt(arr -> ((Long) arr[1]).intValue())
                .sum();

        // Monthly trends
        List<WorkforceTrend> trends = trendRepository.findByYearAndType(tenantId,
                WorkforceTrend.TrendType.ORGANIZATION, currentYear);
        List<WorkforceTrendDto> trendDtos = trends.stream()
                .map(WorkforceTrendDto::fromEntity)
                .collect(Collectors.toList());

        // Key Metrics
        List<PredictiveAnalyticsDashboard.KeyMetric> keyMetrics = buildKeyMetrics(tenantId, currentYear);

        return PredictiveAnalyticsDashboard.builder()
                .attritionSummary(attritionSummary)
                .workforceSummary(workforceSummary)
                .skillGapSummary(skillGapSummary)
                .criticalInsights(criticalInsightDtos)
                .totalActiveInsights(totalActiveInsights)
                .pendingActionItems(criticalInsights.size())
                .keyMetrics(keyMetrics)
                .monthlyTrends(trendDtos)
                .build();
    }

    // ==================== ATTRITION PREDICTIONS ====================

    @Transactional(readOnly = true)
    public List<AttritionPredictionDto> getHighRiskEmployees(BigDecimal minScore) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return attritionRepository.findHighRiskEmployees(tenantId, minScore).stream()
                .map(AttritionPredictionDto::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<AttritionPredictionDto> getAttritionByRiskLevel(String riskLevel) {
        UUID tenantId = TenantContext.getCurrentTenant();
        AttritionPrediction.RiskLevel level = AttritionPrediction.RiskLevel.valueOf(riskLevel);
        return attritionRepository.findLatestByRiskLevel(tenantId, level).stream()
                .map(AttritionPredictionDto::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<AttritionPredictionDto> getEmployeePredictionHistory(UUID employeeId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return attritionRepository.findByEmployee(tenantId, employeeId).stream()
                .map(AttritionPredictionDto::fromEntity)
                .collect(Collectors.toList());
    }

    public AttritionPredictionDto runPredictionForEmployee(UUID employeeId) {
        UUID tenantId = TenantContext.getCurrentTenant();

        // In a real implementation, this would fetch employee data and run ML model
        // For now, we simulate the prediction
        AttritionPrediction prediction = simulatePrediction(tenantId, employeeId);
        prediction = attritionRepository.save(prediction);

        log.info("Generated attrition prediction for employee: {}, risk: {}",
                employeeId, prediction.getRiskLevel());

        return AttritionPredictionDto.fromEntity(prediction);
    }

    @Transactional
    public void markActionTaken(UUID predictionId, String notes) {
        UUID tenantId = TenantContext.getCurrentTenant();

        AttritionPrediction prediction = attritionRepository.findByIdAndTenantId(predictionId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Prediction not found: " + predictionId));

        prediction.setActionTaken(true);
        attritionRepository.save(prediction);

        log.info("Marked action taken for prediction: {}", predictionId);
    }

    public void recordActualOutcome(UUID predictionId, String outcome, LocalDate leaveDate) {
        UUID tenantId = TenantContext.getCurrentTenant();

        AttritionPrediction prediction = attritionRepository.findByIdAndTenantId(predictionId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Prediction not found: " + predictionId));

        prediction.setActualOutcome(AttritionPrediction.ActualOutcome.valueOf(outcome));
        prediction.setActualLeaveDate(leaveDate);
        attritionRepository.save(prediction);

        log.info("Recorded actual outcome for prediction: {}, outcome: {}", predictionId, outcome);
    }

    // ==================== WORKFORCE TRENDS ====================

    @Transactional(readOnly = true)
    public List<WorkforceTrendDto> getOrganizationTrends(Integer year) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return trendRepository.findByYearAndType(tenantId, WorkforceTrend.TrendType.ORGANIZATION, year)
                .stream()
                .map(WorkforceTrendDto::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<WorkforceTrendDto> getDepartmentTrends(UUID departmentId, Integer year) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return trendRepository.findByDepartmentAndYear(tenantId, departmentId, year)
                .stream()
                .map(WorkforceTrendDto::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<WorkforceTrendDto> compareDepartments(Integer year, Integer month) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return trendRepository.findDepartmentTrendsByMonth(tenantId, year, month)
                .stream()
                .map(WorkforceTrendDto::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public WorkforceTrendDto generateTrend(Integer year, Integer month, UUID departmentId) {
        UUID tenantId = TenantContext.getCurrentTenant();

        // In a real implementation, this would aggregate data from various sources
        WorkforceTrend trend = simulateTrend(tenantId, year, month, departmentId);
        trend = trendRepository.save(trend);

        log.info("Generated workforce trend for {}/{}", month, year);

        return WorkforceTrendDto.fromEntity(trend);
    }

    // ==================== ANALYTICS INSIGHTS ====================

    @Transactional(readOnly = true)
    public Page<AnalyticsInsightDto> getAllInsights(Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return insightRepository.findByTenantId(tenantId, pageable)
                .map(AnalyticsInsightDto::fromEntity);
    }

    @Transactional(readOnly = true)
    public List<AnalyticsInsightDto> getInsightsByCategory(String category) {
        UUID tenantId = TenantContext.getCurrentTenant();
        AnalyticsInsight.InsightCategory cat = AnalyticsInsight.InsightCategory.valueOf(category);
        return insightRepository.findByCategory(tenantId, cat, LocalDate.now())
                .stream()
                .map(AnalyticsInsightDto::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<AnalyticsInsightDto> getInsightsBySeverity(String severity) {
        UUID tenantId = TenantContext.getCurrentTenant();
        AnalyticsInsight.InsightSeverity sev = AnalyticsInsight.InsightSeverity.valueOf(severity);
        return insightRepository.findBySeverity(tenantId, sev)
                .stream()
                .map(AnalyticsInsightDto::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional
    public AnalyticsInsightDto updateInsightStatus(UUID insightId, String status, String notes) {
        UUID tenantId = TenantContext.getCurrentTenant();

        AnalyticsInsight insight = insightRepository.findByIdAndTenantId(insightId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Insight not found: " + insightId));

        AnalyticsInsight.InsightStatus newStatus = AnalyticsInsight.InsightStatus.valueOf(status);
        insight.setStatus(newStatus);

        if (newStatus == AnalyticsInsight.InsightStatus.RESOLVED) {
            insight.setResolvedAt(LocalDateTime.now());
            insight.setResolutionNotes(notes);
        }

        insight = insightRepository.save(insight);
        return AnalyticsInsightDto.fromEntity(insight);
    }

    @Transactional
    public AnalyticsInsightDto assignInsight(UUID insightId, UUID assigneeId, LocalDate dueDate) {
        UUID tenantId = TenantContext.getCurrentTenant();

        AnalyticsInsight insight = insightRepository.findByIdAndTenantId(insightId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Insight not found: " + insightId));

        insight.setAssignedTo(assigneeId);
        insight.setDueDate(dueDate);
        if (insight.getStatus() == AnalyticsInsight.InsightStatus.NEW) {
            insight.setStatus(AnalyticsInsight.InsightStatus.ACKNOWLEDGED);
        }

        insight = insightRepository.save(insight);
        return AnalyticsInsightDto.fromEntity(insight);
    }

    @Transactional
    public AnalyticsInsightDto createInsight(String title, String description, String category,
                                              String severity, String recommendation) {
        UUID tenantId = TenantContext.getCurrentTenant();

        AnalyticsInsight insight = AnalyticsInsight.builder()
                .title(title)
                .description(description)
                .insightType(AnalyticsInsight.InsightType.RECOMMENDATION)
                .category(AnalyticsInsight.InsightCategory.valueOf(category))
                .severity(AnalyticsInsight.InsightSeverity.valueOf(severity))
                .recommendation(recommendation)
                .status(AnalyticsInsight.InsightStatus.NEW)
                .generatedAt(LocalDateTime.now())
                .validUntil(LocalDate.now().plusMonths(3))
                .dataSource("MANUAL")
                .build();

        insight.setTenantId(tenantId);
        insight = insightRepository.save(insight);

        return AnalyticsInsightDto.fromEntity(insight);
    }

    // ==================== SKILL GAPS ====================

    @Transactional(readOnly = true)
    public List<SkillGapDto> getLatestSkillGaps() {
        UUID tenantId = TenantContext.getCurrentTenant();
        return skillGapRepository.findLatestGaps(tenantId)
                .stream()
                .map(SkillGapDto::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<SkillGapDto> getSkillGapsByPriority(String priority) {
        UUID tenantId = TenantContext.getCurrentTenant();
        SkillGap.Priority p = SkillGap.Priority.valueOf(priority);
        return skillGapRepository.findByPriority(tenantId, p, LocalDate.now().minusDays(90))
                .stream()
                .map(SkillGapDto::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<SkillGapDto> getSkillGapsByDepartment(UUID departmentId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return skillGapRepository.findByDepartment(tenantId, departmentId, LocalDate.now().minusDays(90))
                .stream()
                .map(SkillGapDto::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<SkillGapDto> getTrainableHighPriorityGaps() {
        UUID tenantId = TenantContext.getCurrentTenant();
        return skillGapRepository.findTrainableHighPriorityGaps(tenantId)
                .stream()
                .map(SkillGapDto::fromEntity)
                .collect(Collectors.toList());
    }

    // ==================== HELPER METHODS ====================

    private PredictiveAnalyticsDashboard.AttritionSummary buildAttritionSummary(UUID tenantId, LocalDate fromDate) {
        List<Object[]> distribution = attritionRepository.countByRiskLevelDistribution(tenantId);

        int lowRisk = 0, mediumRisk = 0, highRisk = 0, criticalRisk = 0;
        for (Object[] row : distribution) {
            AttritionPrediction.RiskLevel level = (AttritionPrediction.RiskLevel) row[0];
            int count = ((Long) row[1]).intValue();
            switch (level) {
                case LOW -> lowRisk = count;
                case MEDIUM -> mediumRisk = count;
                case HIGH -> highRisk = count;
                case CRITICAL -> criticalRisk = count;
            }
        }

        BigDecimal avgRiskScore = attritionRepository.getAverageRiskScore(tenantId, fromDate);
        if (avgRiskScore == null) avgRiskScore = BigDecimal.ZERO;

        List<AttritionPrediction> topAtRisk = attritionRepository.findHighRiskEmployees(tenantId,
                BigDecimal.valueOf(70));
        List<AttritionPredictionDto> topAtRiskDtos = topAtRisk.stream()
                .limit(10)
                .map(AttritionPredictionDto::fromEntity)
                .collect(Collectors.toList());

        int totalEmployees = lowRisk + mediumRisk + highRisk + criticalRisk;
        BigDecimal predictedRate = BigDecimal.ZERO;
        if (totalEmployees > 0) {
            predictedRate = BigDecimal.valueOf((highRisk + criticalRisk) * 100.0 / totalEmployees)
                    .setScale(2, RoundingMode.HALF_UP);
        }

        return PredictiveAnalyticsDashboard.AttritionSummary.builder()
                .totalEmployees(totalEmployees)
                .lowRiskCount(lowRisk)
                .mediumRiskCount(mediumRisk)
                .highRiskCount(highRisk)
                .criticalRiskCount(criticalRisk)
                .avgRiskScore(avgRiskScore)
                .predictedAttritionRate(predictedRate)
                .topAtRiskEmployees(topAtRiskDtos)
                .build();
    }

    private PredictiveAnalyticsDashboard.WorkforceSummary buildWorkforceSummary(UUID tenantId, int year) {
        List<WorkforceTrend> trends = trendRepository.findLatestOrganizationTrend(tenantId);
        WorkforceTrend latest = trends.isEmpty() ? null : trends.get(0);

        Integer ytdHires = trendRepository.getTotalHiresForYear(tenantId, year);
        Integer ytdTerminations = trendRepository.getTotalTerminationsForYear(tenantId, year);
        BigDecimal avgAttrition = trendRepository.getAvgAttritionRateForYear(tenantId, year);

        PredictiveAnalyticsDashboard.WorkforceSummary.WorkforceSummaryBuilder builder =
                PredictiveAnalyticsDashboard.WorkforceSummary.builder()
                        .yearToDateHires(ytdHires != null ? ytdHires : 0)
                        .yearToDateTerminations(ytdTerminations != null ? ytdTerminations : 0)
                        .yearToDateAttritionRate(avgAttrition != null ? avgAttrition : BigDecimal.ZERO);

        if (latest != null) {
            builder.currentHeadcount(latest.getTotalHeadcount())
                    .avgTenureMonths(latest.getAvgTenureMonths())
                    .avgEngagementScore(latest.getAvgEngagementScore())
                    .avgPerformanceRating(latest.getAvgPerformanceRating())
                    .openPositions(latest.getOpenPositions())
                    .avgTimeToFill(latest.getAvgTimeToFillDays());
        }

        return builder.build();
    }

    private PredictiveAnalyticsDashboard.SkillGapSummary buildSkillGapSummary(UUID tenantId, LocalDate fromDate) {
        List<SkillGap> latestGaps = skillGapRepository.findLatestGaps(tenantId);

        int totalGaps = latestGaps.stream()
                .mapToInt(g -> g.getGapCount() != null ? g.getGapCount() : 0)
                .sum();

        int criticalGaps = (int) latestGaps.stream()
                .filter(g -> g.getPriority() == SkillGap.Priority.CRITICAL)
                .count();

        int highPriorityGaps = (int) latestGaps.stream()
                .filter(g -> g.getPriority() == SkillGap.Priority.HIGH)
                .count();

        BigDecimal trainingCost = skillGapRepository.getTotalTrainingCostNeeded(tenantId, fromDate);
        BigDecimal hiringCost = skillGapRepository.getTotalHiringCostNeeded(tenantId, fromDate);

        List<SkillGapDto> topGaps = latestGaps.stream()
                .limit(5)
                .map(SkillGapDto::fromEntity)
                .collect(Collectors.toList());

        List<Object[]> byCategoryRaw = skillGapRepository.getGapSummaryByCategory(tenantId, fromDate);
        List<PredictiveAnalyticsDashboard.CategoryGap> byCategory = byCategoryRaw.stream()
                .map(row -> PredictiveAnalyticsDashboard.CategoryGap.builder()
                        .category((String) row[0])
                        .skillsAffected(((Long) row[1]).intValue())
                        .gapCount(((Long) row[2]).intValue())
                        .build())
                .collect(Collectors.toList());

        return PredictiveAnalyticsDashboard.SkillGapSummary.builder()
                .totalGaps(totalGaps)
                .criticalGaps(criticalGaps)
                .highPriorityGaps(highPriorityGaps)
                .totalTrainingCostNeeded(trainingCost != null ? trainingCost : BigDecimal.ZERO)
                .totalHiringCostNeeded(hiringCost != null ? hiringCost : BigDecimal.ZERO)
                .topGaps(topGaps)
                .gapsByCategory(byCategory)
                .build();
    }

    private List<PredictiveAnalyticsDashboard.KeyMetric> buildKeyMetrics(UUID tenantId, int year) {
        List<PredictiveAnalyticsDashboard.KeyMetric> metrics = new ArrayList<>();

        BigDecimal avgAttrition = trendRepository.getAvgAttritionRateForYear(tenantId, year);
        metrics.add(PredictiveAnalyticsDashboard.KeyMetric.builder()
                .name("Attrition Rate")
                .value(avgAttrition != null ? avgAttrition.setScale(1, RoundingMode.HALF_UP) + "%" : "N/A")
                .trend("STABLE")
                .status(avgAttrition != null && avgAttrition.compareTo(BigDecimal.valueOf(15)) > 0 ? "WARNING" : "GOOD")
                .description("Year-to-date voluntary attrition rate")
                .build());

        Integer ytdHires = trendRepository.getTotalHiresForYear(tenantId, year);
        metrics.add(PredictiveAnalyticsDashboard.KeyMetric.builder()
                .name("YTD Hires")
                .value(ytdHires != null ? String.valueOf(ytdHires) : "0")
                .trend("UP")
                .status("GOOD")
                .description("Total new hires this year")
                .build());

        BigDecimal avgRisk = attritionRepository.getAverageRiskScore(tenantId, LocalDate.now().minusDays(30));
        metrics.add(PredictiveAnalyticsDashboard.KeyMetric.builder()
                .name("Avg Risk Score")
                .value(avgRisk != null ? avgRisk.setScale(0, RoundingMode.HALF_UP).toString() : "N/A")
                .trend("STABLE")
                .status(avgRisk != null && avgRisk.compareTo(BigDecimal.valueOf(50)) > 0 ? "WARNING" : "GOOD")
                .description("Average attrition risk score across workforce")
                .build());

        return metrics;
    }

    /**
     * Generate a data-driven attrition prediction based on actual employee data.
     * Uses heuristic scoring across multiple risk dimensions:
     * - Tenure risk: employees with < 1 year or > 5 years tenure are higher risk
     * - Compensation risk: estimated from salary percentile within tenant
     * - Promotion gap risk: entry-level employees with long tenure and no level change
     * - Engagement/performance: derived from available data, defaults to moderate if absent
     */
    private AttritionPrediction simulatePrediction(UUID tenantId, UUID employeeId) {
        Optional<Employee> employeeOpt = employeeRepository.findByIdAndTenantId(employeeId, tenantId);

        // Compute tenure
        int tenureMonths = 24; // default
        LocalDate joiningDate = null;
        Employee.EmployeeLevel level = null;

        if (employeeOpt.isPresent()) {
            Employee emp = employeeOpt.get();
            joiningDate = emp.getJoiningDate();
            level = emp.getLevel();

            if (joiningDate != null) {
                tenureMonths = (int) ChronoUnit.MONTHS.between(joiningDate, LocalDate.now());
            }
        }

        // Tenure risk: < 12 months (new hire flight risk) or > 60 months (stagnation)
        BigDecimal tenureRisk;
        if (tenureMonths < 6) {
            tenureRisk = BigDecimal.valueOf(70); // Very new, high flight risk
        } else if (tenureMonths < 12) {
            tenureRisk = BigDecimal.valueOf(55);
        } else if (tenureMonths < 24) {
            tenureRisk = BigDecimal.valueOf(30); // Sweet spot
        } else if (tenureMonths < 48) {
            tenureRisk = BigDecimal.valueOf(35);
        } else if (tenureMonths < 72) {
            tenureRisk = BigDecimal.valueOf(50); // Stagnation risk
        } else {
            tenureRisk = BigDecimal.valueOf(60); // Long tenure, potential burnout
        }

        // Compensation risk: check salary relative to peers
        BigDecimal compensationRisk = BigDecimal.valueOf(40); // default moderate
        BigDecimal salaryPercentile = BigDecimal.valueOf(50);

        List<SalaryStructure> empSalary = salaryStructureRepository
                .findAllByTenantIdAndEmployeeId(tenantId, employeeId);
        if (!empSalary.isEmpty()) {
            SalaryStructure latest = empSalary.stream()
                    .filter(s -> Boolean.TRUE.equals(s.getIsActive()))
                    .findFirst()
                    .orElse(empSalary.get(empSalary.size() - 1));

            BigDecimal basicSalary = latest.getBasicSalary();
            if (basicSalary != null && basicSalary.compareTo(BigDecimal.ZERO) > 0) {
                // Get all active salary structures for the tenant to compute percentile
                List<SalaryStructure> allSalaries = salaryStructureRepository
                        .findAllByTenantId(tenantId, PageRequest.of(0, 50_000))
                        .getContent();

                long belowCount = allSalaries.stream()
                        .filter(s -> s.getBasicSalary() != null && s.getBasicSalary().compareTo(basicSalary) < 0)
                        .count();
                long totalCount = allSalaries.size();

                if (totalCount > 0) {
                    salaryPercentile = BigDecimal.valueOf(belowCount * 100.0 / totalCount)
                            .setScale(0, RoundingMode.HALF_UP);
                }

                // Below 30th percentile = high comp risk
                if (salaryPercentile.compareTo(BigDecimal.valueOf(25)) < 0) {
                    compensationRisk = BigDecimal.valueOf(75);
                } else if (salaryPercentile.compareTo(BigDecimal.valueOf(40)) < 0) {
                    compensationRisk = BigDecimal.valueOf(55);
                } else if (salaryPercentile.compareTo(BigDecimal.valueOf(60)) < 0) {
                    compensationRisk = BigDecimal.valueOf(30);
                } else {
                    compensationRisk = BigDecimal.valueOf(20);
                }
            }
        }

        // Promotion gap risk: based on level and tenure
        BigDecimal promotionGapRisk = BigDecimal.valueOf(30);
        int estimatedLastPromotionMonths = tenureMonths; // assume no promotion since join
        if (level != null) {
            switch (level) {
                case ENTRY -> {
                    if (tenureMonths > 18) promotionGapRisk = BigDecimal.valueOf(70);
                    else promotionGapRisk = BigDecimal.valueOf(40);
                }
                case MID -> {
                    if (tenureMonths > 36) promotionGapRisk = BigDecimal.valueOf(60);
                    else promotionGapRisk = BigDecimal.valueOf(30);
                }
                case SENIOR -> {
                    if (tenureMonths > 48) promotionGapRisk = BigDecimal.valueOf(50);
                    else promotionGapRisk = BigDecimal.valueOf(25);
                }
                case LEAD, MANAGER, SENIOR_MANAGER -> promotionGapRisk = BigDecimal.valueOf(20);
                case DIRECTOR, VP, SVP, CXO -> promotionGapRisk = BigDecimal.valueOf(15);
                default -> promotionGapRisk = BigDecimal.valueOf(35);
            }
        }

        // Engagement and performance risk: use moderate defaults
        // (Real ML would pull from performance_reviews and survey tables)
        BigDecimal engagementRisk = BigDecimal.valueOf(35);
        BigDecimal performanceRisk = BigDecimal.valueOf(30);
        BigDecimal workloadRisk = BigDecimal.valueOf(30);
        BigDecimal engagementScore = BigDecimal.valueOf(3.5);
        BigDecimal performanceRating = BigDecimal.valueOf(3.5);

        // Compute weighted overall risk score
        BigDecimal riskScore = tenureRisk.multiply(BigDecimal.valueOf(0.20))
                .add(compensationRisk.multiply(BigDecimal.valueOf(0.25)))
                .add(promotionGapRisk.multiply(BigDecimal.valueOf(0.20)))
                .add(engagementRisk.multiply(BigDecimal.valueOf(0.15)))
                .add(performanceRisk.multiply(BigDecimal.valueOf(0.10)))
                .add(workloadRisk.multiply(BigDecimal.valueOf(0.10)))
                .setScale(0, RoundingMode.HALF_UP);

        AttritionPrediction.RiskLevel riskLevel;
        if (riskScore.compareTo(BigDecimal.valueOf(70)) >= 0) {
            riskLevel = AttritionPrediction.RiskLevel.CRITICAL;
        } else if (riskScore.compareTo(BigDecimal.valueOf(55)) >= 0) {
            riskLevel = AttritionPrediction.RiskLevel.HIGH;
        } else if (riskScore.compareTo(BigDecimal.valueOf(35)) >= 0) {
            riskLevel = AttritionPrediction.RiskLevel.MEDIUM;
        } else {
            riskLevel = AttritionPrediction.RiskLevel.LOW;
        }

        // Confidence: higher when we have more real data
        int confidenceBase = 50;
        if (employeeOpt.isPresent()) confidenceBase += 15;
        if (!empSalary.isEmpty()) confidenceBase += 15;
        if (joiningDate != null) confidenceBase += 10;

        AttritionPrediction prediction = AttritionPrediction.builder()
                .employeeId(employeeId)
                .predictionDate(LocalDate.now())
                .riskScore(riskScore)
                .riskLevel(riskLevel)
                .confidenceScore(BigDecimal.valueOf(Math.min(confidenceBase, 95)))
                .tenureRisk(tenureRisk)
                .compensationRisk(compensationRisk)
                .engagementRisk(engagementRisk)
                .performanceRisk(performanceRisk)
                .promotionGapRisk(promotionGapRisk)
                .workloadRisk(workloadRisk)
                .tenureMonths(tenureMonths)
                .salaryPercentile(salaryPercentile)
                .lastPromotionMonths(estimatedLastPromotionMonths)
                .engagementScore(engagementScore)
                .performanceRating(performanceRating)
                .actionTaken(false)
                .build();

        prediction.setTenantId(tenantId);

        if (riskLevel == AttritionPrediction.RiskLevel.HIGH || riskLevel == AttritionPrediction.RiskLevel.CRITICAL) {
            // Predict departure in 3-9 months, inversely proportional to risk
            int monthsToLeave = riskScore.compareTo(BigDecimal.valueOf(70)) >= 0 ? 3 : 6;
            prediction.setPredictedLeaveDate(LocalDate.now().plusMonths(monthsToLeave));
        }

        return prediction;
    }

    /**
     * Generate a workforce trend data point based on actual employee data.
     * Computes headcount and hire/termination counts from employee records.
     */
    private WorkforceTrend simulateTrend(UUID tenantId, Integer year, Integer month, UUID departmentId) {
        LocalDate periodStart = LocalDate.of(year, month, 1);
        LocalDate periodEnd = periodStart.withDayOfMonth(periodStart.lengthOfMonth());

        // Get employees for this tenant
        List<Employee> allEmployees = employeeRepository.findByTenantId(tenantId);

        // Filter by department if specified
        List<Employee> scopedEmployees = departmentId != null
                ? allEmployees.stream().filter(e -> departmentId.equals(e.getDepartmentId())).collect(Collectors.toList())
                : allEmployees;

        // Headcount: employees who joined on or before period end and are still active
        long headcount = scopedEmployees.stream()
                .filter(e -> e.getJoiningDate() != null && !e.getJoiningDate().isAfter(periodEnd))
                .filter(e -> e.getStatus() == Employee.EmployeeStatus.ACTIVE
                        || e.getStatus() == Employee.EmployeeStatus.ON_LEAVE)
                .count();

        // New hires in this period
        long newHires = scopedEmployees.stream()
                .filter(e -> e.getJoiningDate() != null
                        && !e.getJoiningDate().isBefore(periodStart)
                        && !e.getJoiningDate().isAfter(periodEnd))
                .count();

        // Terminated employees (rough estimate from status)
        long terminated = scopedEmployees.stream()
                .filter(e -> e.getStatus() == Employee.EmployeeStatus.TERMINATED
                        || e.getStatus() == Employee.EmployeeStatus.RESIGNED)
                .count();
        // Scale terminations proportionally to the month (rough heuristic)
        int monthlyTerminations = headcount > 0 ? (int) Math.max(0, terminated / 12) : 0;

        // Compute rates
        BigDecimal attritionRate = headcount > 0
                ? BigDecimal.valueOf(monthlyTerminations * 100.0 / headcount).setScale(2, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;
        BigDecimal hiringRate = headcount > 0
                ? BigDecimal.valueOf(newHires * 100.0 / headcount).setScale(2, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;

        // Average salary from salary structures
        BigDecimal avgSalary = BigDecimal.ZERO;
        List<SalaryStructure> salaryStructures = salaryStructureRepository
                .findAllByTenantId(tenantId, PageRequest.of(0, 50_000)).getContent();
        if (!salaryStructures.isEmpty()) {
            BigDecimal totalSalary = salaryStructures.stream()
                    .filter(s -> Boolean.TRUE.equals(s.getIsActive()) && s.getBasicSalary() != null)
                    .map(SalaryStructure::getBasicSalary)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            long activeSalaryCount = salaryStructures.stream()
                    .filter(s -> Boolean.TRUE.equals(s.getIsActive()) && s.getBasicSalary() != null)
                    .count();
            if (activeSalaryCount > 0) {
                avgSalary = totalSalary.divide(BigDecimal.valueOf(activeSalaryCount), 2, RoundingMode.HALF_UP);
            }
        }

        // Average tenure in months
        BigDecimal avgTenure = BigDecimal.ZERO;
        List<Long> tenures = scopedEmployees.stream()
                .filter(e -> e.getJoiningDate() != null && e.getStatus() == Employee.EmployeeStatus.ACTIVE)
                .map(e -> ChronoUnit.MONTHS.between(e.getJoiningDate(), periodEnd))
                .collect(Collectors.toList());
        if (!tenures.isEmpty()) {
            long totalTenure = tenures.stream().mapToLong(Long::longValue).sum();
            avgTenure = BigDecimal.valueOf(totalTenure).divide(BigDecimal.valueOf(tenures.size()), 1, RoundingMode.HALF_UP);
        }

        WorkforceTrend trend = WorkforceTrend.builder()
                .periodYear(year)
                .periodMonth(month)
                .trendType(departmentId != null ? WorkforceTrend.TrendType.DEPARTMENT : WorkforceTrend.TrendType.ORGANIZATION)
                .departmentId(departmentId)
                .totalHeadcount((int) headcount)
                .newHires((int) newHires)
                .terminations(monthlyTerminations)
                .voluntaryAttrition((int) (monthlyTerminations * 0.7)) // ~70% voluntary
                .involuntaryAttrition((int) (monthlyTerminations * 0.3))
                .internalTransfersIn(0) // Would need transfer tracking to compute
                .internalTransfersOut(0)
                .attritionRate(attritionRate)
                .hiringRate(hiringRate)
                .avgSalary(avgSalary)
                .avgTenureMonths(avgTenure)
                .avgEngagementScore(BigDecimal.valueOf(3.5)) // Default until survey data is integrated
                .avgPerformanceRating(BigDecimal.valueOf(3.5)) // Default until reviews are integrated
                .openPositions(0) // Would need job opening data
                .avgTimeToFillDays(BigDecimal.valueOf(30)) // Default
                .build();

        trend.setTenantId(tenantId);
        return trend;
    }
}
