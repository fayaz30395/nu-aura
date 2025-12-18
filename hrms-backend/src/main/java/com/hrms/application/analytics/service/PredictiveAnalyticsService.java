package com.hrms.application.analytics.service;

import com.hrms.api.analytics.dto.*;
import com.hrms.common.security.TenantContext;
import com.hrms.common.exception.ResourceNotFoundException;
import com.hrms.domain.analytics.*;
import com.hrms.infrastructure.analytics.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.Year;
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

    private AttritionPrediction simulatePrediction(UUID tenantId, UUID employeeId) {
        // Simulate ML prediction - in real world, this would call an ML service
        Random random = new Random();
        BigDecimal riskScore = BigDecimal.valueOf(10 + random.nextInt(80));

        AttritionPrediction.RiskLevel riskLevel;
        if (riskScore.compareTo(BigDecimal.valueOf(80)) >= 0) {
            riskLevel = AttritionPrediction.RiskLevel.CRITICAL;
        } else if (riskScore.compareTo(BigDecimal.valueOf(60)) >= 0) {
            riskLevel = AttritionPrediction.RiskLevel.HIGH;
        } else if (riskScore.compareTo(BigDecimal.valueOf(40)) >= 0) {
            riskLevel = AttritionPrediction.RiskLevel.MEDIUM;
        } else {
            riskLevel = AttritionPrediction.RiskLevel.LOW;
        }

        AttritionPrediction prediction = AttritionPrediction.builder()
                .employeeId(employeeId)
                .predictionDate(LocalDate.now())
                .riskScore(riskScore)
                .riskLevel(riskLevel)
                .confidenceScore(BigDecimal.valueOf(70 + random.nextInt(25)))
                .tenureRisk(BigDecimal.valueOf(random.nextInt(100)))
                .compensationRisk(BigDecimal.valueOf(random.nextInt(100)))
                .engagementRisk(BigDecimal.valueOf(random.nextInt(100)))
                .performanceRisk(BigDecimal.valueOf(random.nextInt(100)))
                .promotionGapRisk(BigDecimal.valueOf(random.nextInt(100)))
                .workloadRisk(BigDecimal.valueOf(random.nextInt(100)))
                .tenureMonths(12 + random.nextInt(60))
                .salaryPercentile(BigDecimal.valueOf(20 + random.nextInt(60)))
                .lastPromotionMonths(random.nextInt(36))
                .engagementScore(BigDecimal.valueOf(2 + random.nextInt(3)))
                .performanceRating(BigDecimal.valueOf(2 + random.nextInt(3)))
                .actionTaken(false)
                .build();

        prediction.setTenantId(tenantId);

        if (riskLevel == AttritionPrediction.RiskLevel.HIGH || riskLevel == AttritionPrediction.RiskLevel.CRITICAL) {
            prediction.setPredictedLeaveDate(LocalDate.now().plusMonths(3 + random.nextInt(6)));
        }

        return prediction;
    }

    private WorkforceTrend simulateTrend(UUID tenantId, Integer year, Integer month, UUID departmentId) {
        Random random = new Random();

        WorkforceTrend trend = WorkforceTrend.builder()
                .periodYear(year)
                .periodMonth(month)
                .trendType(departmentId != null ? WorkforceTrend.TrendType.DEPARTMENT : WorkforceTrend.TrendType.ORGANIZATION)
                .departmentId(departmentId)
                .totalHeadcount(100 + random.nextInt(400))
                .newHires(random.nextInt(20))
                .terminations(random.nextInt(10))
                .voluntaryAttrition(random.nextInt(8))
                .involuntaryAttrition(random.nextInt(3))
                .internalTransfersIn(random.nextInt(5))
                .internalTransfersOut(random.nextInt(5))
                .attritionRate(BigDecimal.valueOf(2 + random.nextDouble() * 8))
                .hiringRate(BigDecimal.valueOf(1 + random.nextDouble() * 5))
                .avgSalary(BigDecimal.valueOf(50000 + random.nextInt(50000)))
                .avgEngagementScore(BigDecimal.valueOf(3 + random.nextDouble() * 1.5))
                .avgPerformanceRating(BigDecimal.valueOf(3 + random.nextDouble()))
                .openPositions(random.nextInt(30))
                .avgTimeToFillDays(BigDecimal.valueOf(20 + random.nextInt(40)))
                .build();

        trend.setTenantId(tenantId);
        return trend;
    }
}
