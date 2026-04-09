package com.hrms.api.analytics.controller;

import com.hrms.api.analytics.dto.*;
import com.hrms.application.analytics.service.PredictiveAnalyticsService;
import com.hrms.common.security.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.domain.*;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;

import static org.hamcrest.Matchers.hasSize;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(PredictiveAnalyticsController.class)
@ContextConfiguration(classes = {PredictiveAnalyticsController.class, PredictiveAnalyticsControllerTest.TestConfig.class})
@AutoConfigureMockMvc(addFilters = false)
@ExtendWith(MockitoExtension.class)
@ActiveProfiles("test")
@DisplayName("PredictiveAnalyticsController Unit Tests")
class PredictiveAnalyticsControllerTest {

    @Autowired
    private MockMvc mockMvc;
    @MockitoBean
    private PredictiveAnalyticsService analyticsService;
    @MockitoBean
    private ApiKeyService apiKeyService;
    @MockitoBean
    private JwtTokenProvider jwtTokenProvider;
    @MockitoBean
    private UserDetailsService userDetailsService;
    @MockitoBean
    private ApiKeyAuthenticationFilter apiKeyAuthenticationFilter;
    @MockitoBean
    private JwtAuthenticationFilter jwtAuthenticationFilter;
    @MockitoBean
    private RateLimitFilter rateLimitFilter;
    @MockitoBean
    private RateLimitingFilter rateLimitingFilter;
    @MockitoBean
    private TenantFilter tenantFilter;

    @Configuration
    static class TestConfig {
        @Bean
        public org.springframework.data.domain.AuditorAware<UUID> auditorProvider() {
            return () -> Optional.of(UUID.randomUUID());
        }
    }

    // ==================== Dashboard ====================

    @Test
    @DisplayName("Should return predictive analytics dashboard")
    void shouldReturnDashboard() throws Exception {
        PredictiveAnalyticsDashboard dashboard = new PredictiveAnalyticsDashboard();
        when(analyticsService.getDashboard()).thenReturn(dashboard);

        mockMvc.perform(get("/api/v1/predictive-analytics/dashboard"))
                .andExpect(status().isOk());

        verify(analyticsService).getDashboard();
    }

    // ==================== Attrition Predictions ====================

    @Test
    @DisplayName("Should return high-risk employees with default threshold")
    void shouldReturnHighRiskEmployeesWithDefaultThreshold() throws Exception {
        List<AttritionPredictionDto> predictions = List.of(new AttritionPredictionDto());
        when(analyticsService.getHighRiskEmployees(new BigDecimal("70"))).thenReturn(predictions);

        mockMvc.perform(get("/api/v1/predictive-analytics/attrition/high-risk"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)));

        verify(analyticsService).getHighRiskEmployees(new BigDecimal("70"));
    }

    @Test
    @DisplayName("Should return high-risk employees with custom threshold")
    void shouldReturnHighRiskEmployeesWithCustomThreshold() throws Exception {
        when(analyticsService.getHighRiskEmployees(new BigDecimal("50")))
                .thenReturn(Collections.emptyList());

        mockMvc.perform(get("/api/v1/predictive-analytics/attrition/high-risk")
                        .param("minScore", "50"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(0)));

        verify(analyticsService).getHighRiskEmployees(new BigDecimal("50"));
    }

    @Test
    @DisplayName("Should return employees by risk level")
    void shouldReturnEmployeesByRiskLevel() throws Exception {
        List<AttritionPredictionDto> predictions = List.of(new AttritionPredictionDto());
        when(analyticsService.getAttritionByRiskLevel("HIGH")).thenReturn(predictions);

        mockMvc.perform(get("/api/v1/predictive-analytics/attrition/risk-level/HIGH"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)));

        verify(analyticsService).getAttritionByRiskLevel("HIGH");
    }

    @Test
    @DisplayName("Should return employee prediction history")
    void shouldReturnEmployeePredictionHistory() throws Exception {
        UUID employeeId = UUID.randomUUID();
        when(analyticsService.getEmployeePredictionHistory(employeeId))
                .thenReturn(List.of(new AttritionPredictionDto()));

        mockMvc.perform(get("/api/v1/predictive-analytics/attrition/employee/{employeeId}", employeeId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)));

        verify(analyticsService).getEmployeePredictionHistory(employeeId);
    }

    @Test
    @DisplayName("Should run prediction for employee and return 201")
    void shouldRunPredictionForEmployee() throws Exception {
        UUID employeeId = UUID.randomUUID();
        AttritionPredictionDto prediction = new AttritionPredictionDto();
        when(analyticsService.runPredictionForEmployee(employeeId)).thenReturn(prediction);

        mockMvc.perform(post("/api/v1/predictive-analytics/attrition/predict/{employeeId}", employeeId))
                .andExpect(status().isCreated());

        verify(analyticsService).runPredictionForEmployee(employeeId);
    }

    @Test
    @DisplayName("Should mark action taken on prediction")
    void shouldMarkActionTaken() throws Exception {
        UUID predictionId = UUID.randomUUID();
        doNothing().when(analyticsService).markActionTaken(eq(predictionId), anyString());

        mockMvc.perform(post("/api/v1/predictive-analytics/attrition/{predictionId}/action-taken", predictionId)
                        .param("notes", "Scheduled 1:1 meeting"))
                .andExpect(status().isOk());

        verify(analyticsService).markActionTaken(eq(predictionId), eq("Scheduled 1:1 meeting"));
    }

    @Test
    @DisplayName("Should record actual outcome for prediction")
    void shouldRecordOutcome() throws Exception {
        UUID predictionId = UUID.randomUUID();
        LocalDate leaveDate = LocalDate.of(2026, 5, 15);
        doNothing().when(analyticsService).recordActualOutcome(eq(predictionId), eq("LEFT"), eq(leaveDate));

        mockMvc.perform(post("/api/v1/predictive-analytics/attrition/{predictionId}/outcome", predictionId)
                        .param("outcome", "LEFT")
                        .param("leaveDate", leaveDate.toString()))
                .andExpect(status().isOk());

        verify(analyticsService).recordActualOutcome(eq(predictionId), eq("LEFT"), eq(leaveDate));
    }

    // ==================== Workforce Trends ====================

    @Test
    @DisplayName("Should return organization trends by year")
    void shouldReturnOrganizationTrends() throws Exception {
        List<WorkforceTrendDto> trends = List.of(new WorkforceTrendDto());
        when(analyticsService.getOrganizationTrends(2026)).thenReturn(trends);

        mockMvc.perform(get("/api/v1/predictive-analytics/trends/organization")
                        .param("year", "2026"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)));

        verify(analyticsService).getOrganizationTrends(2026);
    }

    @Test
    @DisplayName("Should return department trends")
    void shouldReturnDepartmentTrends() throws Exception {
        UUID departmentId = UUID.randomUUID();
        when(analyticsService.getDepartmentTrends(departmentId, 2026))
                .thenReturn(List.of(new WorkforceTrendDto()));

        mockMvc.perform(get("/api/v1/predictive-analytics/trends/department/{departmentId}", departmentId)
                        .param("year", "2026"))
                .andExpect(status().isOk());

        verify(analyticsService).getDepartmentTrends(departmentId, 2026);
    }

    @Test
    @DisplayName("Should compare departments for a specific month")
    void shouldCompareDepartments() throws Exception {
        when(analyticsService.compareDepartments(2026, 3))
                .thenReturn(List.of(new WorkforceTrendDto(), new WorkforceTrendDto()));

        mockMvc.perform(get("/api/v1/predictive-analytics/trends/compare-departments")
                        .param("year", "2026")
                        .param("month", "3"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)));

        verify(analyticsService).compareDepartments(2026, 3);
    }

    @Test
    @DisplayName("Should generate trend data and return 201")
    void shouldGenerateTrend() throws Exception {
        WorkforceTrendDto trend = new WorkforceTrendDto();
        when(analyticsService.generateTrend(eq(2026), eq(4), isNull())).thenReturn(trend);

        mockMvc.perform(post("/api/v1/predictive-analytics/trends/generate")
                        .param("year", "2026")
                        .param("month", "4"))
                .andExpect(status().isCreated());

        verify(analyticsService).generateTrend(eq(2026), eq(4), isNull());
    }

    // ==================== Analytics Insights ====================

    @Test
    @DisplayName("Should return paginated insights")
    void shouldReturnPaginatedInsights() throws Exception {
        Page<AnalyticsInsightDto> page = new PageImpl<>(
                List.of(new AnalyticsInsightDto()),
                PageRequest.of(0, 20),
                1
        );
        when(analyticsService.getAllInsights(any(Pageable.class))).thenReturn(page);

        mockMvc.perform(get("/api/v1/predictive-analytics/insights"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(1)))
                .andExpect(jsonPath("$.totalElements").value(1));

        verify(analyticsService).getAllInsights(any(Pageable.class));
    }

    @Test
    @DisplayName("Should return insights by category")
    void shouldReturnInsightsByCategory() throws Exception {
        when(analyticsService.getInsightsByCategory("ATTRITION"))
                .thenReturn(List.of(new AnalyticsInsightDto()));

        mockMvc.perform(get("/api/v1/predictive-analytics/insights/category/ATTRITION"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)));

        verify(analyticsService).getInsightsByCategory("ATTRITION");
    }

    @Test
    @DisplayName("Should return insights by severity")
    void shouldReturnInsightsBySeverity() throws Exception {
        when(analyticsService.getInsightsBySeverity("CRITICAL"))
                .thenReturn(List.of(new AnalyticsInsightDto()));

        mockMvc.perform(get("/api/v1/predictive-analytics/insights/severity/CRITICAL"))
                .andExpect(status().isOk());

        verify(analyticsService).getInsightsBySeverity("CRITICAL");
    }

    @Test
    @DisplayName("Should update insight status")
    void shouldUpdateInsightStatus() throws Exception {
        UUID insightId = UUID.randomUUID();
        AnalyticsInsightDto dto = new AnalyticsInsightDto();
        when(analyticsService.updateInsightStatus(eq(insightId), eq("RESOLVED"), anyString()))
                .thenReturn(dto);

        mockMvc.perform(patch("/api/v1/predictive-analytics/insights/{insightId}/status", insightId)
                        .param("status", "RESOLVED")
                        .param("notes", "Issue resolved"))
                .andExpect(status().isOk());

        verify(analyticsService).updateInsightStatus(eq(insightId), eq("RESOLVED"), eq("Issue resolved"));
    }

    @Test
    @DisplayName("Should assign insight to user")
    void shouldAssignInsight() throws Exception {
        UUID insightId = UUID.randomUUID();
        UUID assigneeId = UUID.randomUUID();
        AnalyticsInsightDto dto = new AnalyticsInsightDto();
        when(analyticsService.assignInsight(eq(insightId), eq(assigneeId), isNull()))
                .thenReturn(dto);

        mockMvc.perform(post("/api/v1/predictive-analytics/insights/{insightId}/assign", insightId)
                        .param("assigneeId", assigneeId.toString()))
                .andExpect(status().isOk());

        verify(analyticsService).assignInsight(eq(insightId), eq(assigneeId), isNull());
    }

    @Test
    @DisplayName("Should create insight and return 201")
    void shouldCreateInsight() throws Exception {
        AnalyticsInsightDto dto = new AnalyticsInsightDto();
        when(analyticsService.createInsight(anyString(), anyString(), anyString(), anyString(), isNull()))
                .thenReturn(dto);

        mockMvc.perform(post("/api/v1/predictive-analytics/insights")
                        .param("title", "High Attrition Risk")
                        .param("description", "Engineering department shows elevated attrition risk")
                        .param("category", "ATTRITION")
                        .param("severity", "WARNING"))
                .andExpect(status().isCreated());

        verify(analyticsService).createInsight(
                eq("High Attrition Risk"),
                eq("Engineering department shows elevated attrition risk"),
                eq("ATTRITION"),
                eq("WARNING"),
                isNull()
        );
    }

    // ==================== Skill Gaps ====================

    @Test
    @DisplayName("Should return latest skill gaps")
    void shouldReturnLatestSkillGaps() throws Exception {
        when(analyticsService.getLatestSkillGaps()).thenReturn(List.of(new SkillGapDto()));

        mockMvc.perform(get("/api/v1/predictive-analytics/skill-gaps"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)));

        verify(analyticsService).getLatestSkillGaps();
    }

    @Test
    @DisplayName("Should return skill gaps by priority")
    void shouldReturnSkillGapsByPriority() throws Exception {
        when(analyticsService.getSkillGapsByPriority("HIGH"))
                .thenReturn(List.of(new SkillGapDto()));

        mockMvc.perform(get("/api/v1/predictive-analytics/skill-gaps/priority/HIGH"))
                .andExpect(status().isOk());

        verify(analyticsService).getSkillGapsByPriority("HIGH");
    }

    @Test
    @DisplayName("Should return skill gaps by department")
    void shouldReturnSkillGapsByDepartment() throws Exception {
        UUID departmentId = UUID.randomUUID();
        when(analyticsService.getSkillGapsByDepartment(departmentId))
                .thenReturn(List.of(new SkillGapDto()));

        mockMvc.perform(get("/api/v1/predictive-analytics/skill-gaps/department/{departmentId}", departmentId))
                .andExpect(status().isOk());

        verify(analyticsService).getSkillGapsByDepartment(departmentId);
    }

    @Test
    @DisplayName("Should return trainable high-priority gaps")
    void shouldReturnTrainableGaps() throws Exception {
        when(analyticsService.getTrainableHighPriorityGaps())
                .thenReturn(List.of(new SkillGapDto()));

        mockMvc.perform(get("/api/v1/predictive-analytics/skill-gaps/trainable"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)));

        verify(analyticsService).getTrainableHighPriorityGaps();
    }
}
