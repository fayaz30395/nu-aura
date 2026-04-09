package com.hrms.api.survey.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.api.survey.dto.*;
import com.hrms.application.survey.service.SurveyAnalyticsService;
import com.hrms.common.exception.GlobalExceptionHandler;
import com.hrms.common.config.TestMeterRegistryConfig;
import com.hrms.common.security.*;
import com.hrms.domain.survey.SurveyInsight;
import com.hrms.domain.survey.SurveyQuestion;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.jpa.mapping.JpaMetamodelMappingContext;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(SurveyAnalyticsController.class)
@ContextConfiguration(classes = {SurveyAnalyticsController.class, GlobalExceptionHandler.class})
@Import(TestMeterRegistryConfig.class)
@AutoConfigureMockMvc(addFilters = false)
@ExtendWith(MockitoExtension.class)
@ActiveProfiles("test")
@DisplayName("SurveyAnalyticsController Unit Tests")
class SurveyAnalyticsControllerTest {

    @MockitoBean
    private JpaMetamodelMappingContext jpaMetamodelMappingContext;

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private SurveyAnalyticsService analyticsService;

    @MockitoBean
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @MockitoBean
    private TenantFilter tenantFilter;

    private UUID surveyId;
    private UUID insightId;
    private UUID userId;

    @BeforeEach
    void setUp() {
        surveyId = UUID.randomUUID();
        insightId = UUID.randomUUID();
        userId = UUID.randomUUID();
    }

    // ==================== Question Management ====================

    @Nested
    @DisplayName("Question Management Tests")
    class QuestionManagementTests {

        @Test
        @DisplayName("Should add question to survey")
        void shouldAddQuestion() throws Exception {
            QuestionRequest request = QuestionRequest.builder()
                    .questionText("How satisfied are you with your work-life balance?")
                    .questionType(SurveyQuestion.QuestionType.RATING)
                    .questionOrder(1)
                    .isRequired(true)
                    .minScale(1)
                    .maxScale(5)
                    .weight(1.0)
                    .build();

            QuestionResponse response = QuestionResponse.builder()
                    .id(UUID.randomUUID())
                    .surveyId(surveyId)
                    .questionText("How satisfied are you with your work-life balance?")
                    .questionType(SurveyQuestion.QuestionType.RATING)
                    .questionOrder(1)
                    .createdAt(LocalDateTime.now())
                    .build();

            when(analyticsService.addQuestion(eq(surveyId), any(QuestionRequest.class)))
                    .thenReturn(response);

            mockMvc.perform(post("/api/v1/survey-analytics/surveys/{surveyId}/questions", surveyId)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.surveyId").value(surveyId.toString()))
                    .andExpect(jsonPath("$.questionText").value("How satisfied are you with your work-life balance?"));

            verify(analyticsService).addQuestion(eq(surveyId), any(QuestionRequest.class));
        }

        @Test
        @DisplayName("Should get all questions for a survey")
        void shouldGetQuestions() throws Exception {
            QuestionResponse q1 = QuestionResponse.builder()
                    .id(UUID.randomUUID())
                    .surveyId(surveyId)
                    .questionText("Question 1")
                    .questionOrder(1)
                    .build();

            QuestionResponse q2 = QuestionResponse.builder()
                    .id(UUID.randomUUID())
                    .surveyId(surveyId)
                    .questionText("Question 2")
                    .questionOrder(2)
                    .build();

            when(analyticsService.getQuestions(surveyId)).thenReturn(List.of(q1, q2));

            mockMvc.perform(get("/api/v1/survey-analytics/surveys/{surveyId}/questions", surveyId))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.length()").value(2))
                    .andExpect(jsonPath("$[0].questionText").value("Question 1"));

            verify(analyticsService).getQuestions(surveyId);
        }
    }

    // ==================== Response Submission ====================

    @Nested
    @DisplayName("Response Submission Tests")
    class ResponseSubmissionTests {

        @Test
        @DisplayName("Should submit survey response")
        void shouldSubmitResponse() throws Exception {
            SubmitResponseRequest request = SubmitResponseRequest.builder()
                    .surveyId(surveyId)
                    .employeeId(UUID.randomUUID())
                    .department("Engineering")
                    .answers(List.of(
                            SubmitResponseRequest.AnswerRequest.builder()
                                    .questionId(UUID.randomUUID())
                                    .ratingAnswer(4)
                                    .build()))
                    .build();

            SurveyResponseDetailDto response = SurveyResponseDetailDto.builder()
                    .id(UUID.randomUUID())
                    .surveyId(surveyId)
                    .status(com.hrms.domain.survey.SurveyResponse.ResponseStatus.COMPLETED)
                    .submittedAt(LocalDateTime.now())
                    .build();

            when(analyticsService.submitResponse(any(SubmitResponseRequest.class)))
                    .thenReturn(response);

            mockMvc.perform(post("/api/v1/survey-analytics/responses/submit")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.surveyId").value(surveyId.toString()));

            verify(analyticsService).submitResponse(any(SubmitResponseRequest.class));
        }
    }

    // ==================== Engagement Scoring ====================

    @Nested
    @DisplayName("Engagement Scoring Tests")
    class EngagementScoringTests {

        @Test
        @DisplayName("Should calculate engagement score for survey")
        void shouldCalculateEngagementScore() throws Exception {
            EngagementScoreDto score = EngagementScoreDto.builder()
                    .id(UUID.randomUUID())
                    .surveyId(surveyId)
                    .overallScore(72.5)
                    .engagementLevel("GOOD")
                    .npsScore(35.0)
                    .totalResponses(150)
                    .build();

            when(analyticsService.calculateEngagementScore(surveyId)).thenReturn(score);

            mockMvc.perform(post("/api/v1/survey-analytics/surveys/{surveyId}/calculate-engagement", surveyId))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.overallScore").value(72.5))
                    .andExpect(jsonPath("$.engagementLevel").value("GOOD"))
                    .andExpect(jsonPath("$.totalResponses").value(150));

            verify(analyticsService).calculateEngagementScore(surveyId);
        }

        @Test
        @DisplayName("Should get latest engagement score")
        void shouldGetLatestEngagementScore() throws Exception {
            EngagementScoreDto score = EngagementScoreDto.builder()
                    .overallScore(68.0)
                    .engagementLevel("MODERATE")
                    .build();

            when(analyticsService.getLatestEngagementScore()).thenReturn(score);

            mockMvc.perform(get("/api/v1/survey-analytics/engagement/latest"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.overallScore").value(68.0));
        }

        @Test
        @DisplayName("Should return 204 when no engagement score exists")
        void shouldReturn204WhenNoScore() throws Exception {
            when(analyticsService.getLatestEngagementScore()).thenReturn(null);

            mockMvc.perform(get("/api/v1/survey-analytics/engagement/latest"))
                    .andExpect(status().isNoContent());
        }

        @Test
        @DisplayName("Should get engagement score trend over time")
        void shouldGetEngagementTrend() throws Exception {
            EngagementScoreDto s1 = EngagementScoreDto.builder()
                    .overallScore(65.0)
                    .scoreDate(LocalDate.of(2026, 1, 1))
                    .build();
            EngagementScoreDto s2 = EngagementScoreDto.builder()
                    .overallScore(72.0)
                    .scoreDate(LocalDate.of(2026, 3, 1))
                    .build();

            when(analyticsService.getEngagementTrend(
                    LocalDate.of(2026, 1, 1), LocalDate.of(2026, 3, 31)))
                    .thenReturn(List.of(s1, s2));

            mockMvc.perform(get("/api/v1/survey-analytics/engagement/trend")
                            .param("startDate", "2026-01-01")
                            .param("endDate", "2026-03-31"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.length()").value(2))
                    .andExpect(jsonPath("$[1].overallScore").value(72.0));
        }

        @Test
        @DisplayName("Should get department scores for survey")
        void shouldGetDepartmentScores() throws Exception {
            EngagementScoreDto deptScore = EngagementScoreDto.builder()
                    .departmentName("Engineering")
                    .overallScore(78.0)
                    .build();

            when(analyticsService.getDepartmentScores(surveyId)).thenReturn(List.of(deptScore));

            mockMvc.perform(get("/api/v1/survey-analytics/surveys/{surveyId}/department-scores", surveyId))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.length()").value(1))
                    .andExpect(jsonPath("$[0].departmentName").value("Engineering"));
        }
    }

    // ==================== Insight Generation ====================

    @Nested
    @DisplayName("Insight Tests")
    class InsightTests {

        @Test
        @DisplayName("Should generate insights for survey")
        void shouldGenerateInsights() throws Exception {
            SurveyInsightDto insight = SurveyInsightDto.builder()
                    .id(insightId)
                    .surveyId(surveyId)
                    .title("Low satisfaction in Engineering")
                    .priority(SurveyInsight.InsightPriority.HIGH)
                    .build();

            when(analyticsService.generateInsights(surveyId)).thenReturn(List.of(insight));

            mockMvc.perform(post("/api/v1/survey-analytics/surveys/{surveyId}/generate-insights", surveyId))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.length()").value(1))
                    .andExpect(jsonPath("$[0].title").value("Low satisfaction in Engineering"));

            verify(analyticsService).generateInsights(surveyId);
        }

        @Test
        @DisplayName("Should get insights for survey")
        void shouldGetInsights() throws Exception {
            SurveyInsightDto insight = SurveyInsightDto.builder()
                    .id(insightId)
                    .surveyId(surveyId)
                    .title("Team morale improvement needed")
                    .build();

            when(analyticsService.getInsights(surveyId)).thenReturn(List.of(insight));

            mockMvc.perform(get("/api/v1/survey-analytics/surveys/{surveyId}/insights", surveyId))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$[0].title").value("Team morale improvement needed"));
        }

        @Test
        @DisplayName("Should get high priority insights")
        void shouldGetHighPriorityInsights() throws Exception {
            SurveyInsightDto insight = SurveyInsightDto.builder()
                    .id(insightId)
                    .priority(SurveyInsight.InsightPriority.HIGH)
                    .title("Critical burnout risk")
                    .build();

            when(analyticsService.getHighPriorityInsights()).thenReturn(List.of(insight));

            mockMvc.perform(get("/api/v1/survey-analytics/insights/high-priority"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.length()").value(1))
                    .andExpect(jsonPath("$[0].priority").value("HIGH"));
        }

        @Test
        @DisplayName("Should acknowledge an insight")
        void shouldAcknowledgeInsight() throws Exception {
            SurveyInsightDto acknowledged = SurveyInsightDto.builder()
                    .id(insightId)
                    .isAcknowledged(true)
                    .acknowledgedBy(userId)
                    .acknowledgedAt(LocalDateTime.now())
                    .build();

            try (var secCtx = org.mockito.Mockito.mockStatic(SecurityContext.class)) {
                secCtx.when(SecurityContext::getCurrentUserId).thenReturn(userId);
                when(analyticsService.acknowledgeInsight(insightId, userId)).thenReturn(acknowledged);

                mockMvc.perform(post("/api/v1/survey-analytics/insights/{insightId}/acknowledge", insightId))
                        .andExpect(status().isOk())
                        .andExpect(jsonPath("$.acknowledged").value(true));
            }
        }

        @Test
        @DisplayName("Should update insight action status")
        void shouldUpdateInsightAction() throws Exception {
            UUID assigneeId = UUID.randomUUID();

            SurveyInsightDto updated = SurveyInsightDto.builder()
                    .id(insightId)
                    .actionStatus(SurveyInsight.ActionStatus.IN_PROGRESS)
                    .assignedTo(assigneeId)
                    .actionNotes("Working on resolution")
                    .build();

            when(analyticsService.updateInsightAction(
                    eq(insightId),
                    eq(SurveyInsight.ActionStatus.IN_PROGRESS),
                    eq(assigneeId),
                    eq("Working on resolution")))
                    .thenReturn(updated);

            mockMvc.perform(put("/api/v1/survey-analytics/insights/{insightId}/action", insightId)
                            .param("status", "IN_PROGRESS")
                            .param("assignedTo", assigneeId.toString())
                            .param("notes", "Working on resolution"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.actionStatus").value("IN_PROGRESS"));
        }
    }

    // ==================== Analytics Summary ====================

    @Nested
    @DisplayName("Analytics Summary Tests")
    class AnalyticsSummaryTests {

        @Test
        @DisplayName("Should get comprehensive analytics summary")
        void shouldGetSurveyAnalytics() throws Exception {
            SurveyAnalyticsSummary summary = SurveyAnalyticsSummary.builder()
                    .surveyId(surveyId)
                    .surveyTitle("Q1 2026 Engagement Survey")
                    .totalResponses(200)
                    .completedResponses(180)
                    .completionRate(90.0)
                    .overallEngagementScore(72.5)
                    .engagementLevel("GOOD")
                    .npsScore(35.0)
                    .build();

            when(analyticsService.getSurveyAnalytics(surveyId)).thenReturn(summary);

            mockMvc.perform(get("/api/v1/survey-analytics/surveys/{surveyId}/summary", surveyId))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.surveyTitle").value("Q1 2026 Engagement Survey"))
                    .andExpect(jsonPath("$.totalResponses").value(200))
                    .andExpect(jsonPath("$.overallEngagementScore").value(72.5));

            verify(analyticsService).getSurveyAnalytics(surveyId);
        }
    }

    // ==================== Dashboard ====================

    @Nested
    @DisplayName("Dashboard Tests")
    class DashboardTests {

        @Test
        @DisplayName("Should get engagement overview for dashboard")
        void shouldGetEngagementOverview() throws Exception {
            EngagementScoreDto latestScore = EngagementScoreDto.builder()
                    .overallScore(72.0)
                    .previousScore(68.0)
                    .scoreDelta(4.0)
                    .engagementLevel("GOOD")
                    .npsScore(30.0)
                    .responseRate(85.0)
                    .totalResponses(200)
                    .categoryScores(Map.of("Work-Life Balance", 75.0, "Leadership", 70.0))
                    .build();

            when(analyticsService.getLatestEngagementScore()).thenReturn(latestScore);
            when(analyticsService.getHighPriorityInsights()).thenReturn(Collections.emptyList());

            mockMvc.perform(get("/api/v1/survey-analytics/dashboard/engagement-overview"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.currentScore").value(72.0))
                    .andExpect(jsonPath("$.previousScore").value(68.0))
                    .andExpect(jsonPath("$.trend").value(4.0))
                    .andExpect(jsonPath("$.engagementLevel").value("GOOD"))
                    .andExpect(jsonPath("$.totalResponses").value(200));
        }

        @Test
        @DisplayName("Should handle dashboard when no engagement data exists")
        void shouldHandleDashboardWithNoData() throws Exception {
            when(analyticsService.getLatestEngagementScore()).thenReturn(null);
            when(analyticsService.getHighPriorityInsights()).thenReturn(Collections.emptyList());

            mockMvc.perform(get("/api/v1/survey-analytics/dashboard/engagement-overview"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.engagementLevel").value("No Data"))
                    .andExpect(jsonPath("$.totalResponses").value(0))
                    .andExpect(jsonPath("$.currentScore").doesNotExist());
        }
    }

    // ==================== Permission Annotation Tests ====================

    @Nested
    @DisplayName("Permission Annotation Tests")
    class PermissionAnnotationTests {

        @Test
        @DisplayName("addQuestion should have SURVEY_MANAGE permission")
        void addQuestionShouldRequireSurveyManage() throws Exception {
            var method = SurveyAnalyticsController.class.getMethod(
                    "addQuestion", UUID.class, QuestionRequest.class);
            RequiresPermission annotation = method.getAnnotation(RequiresPermission.class);
            Assertions.assertNotNull(annotation, "addQuestion must have @RequiresPermission");
            Assertions.assertEquals(Permission.SURVEY_MANAGE, annotation.value()[0]);
        }

        @Test
        @DisplayName("submitResponse should have EMPLOYEE_VIEW_SELF permission")
        void submitResponseShouldRequireEmployeeViewSelf() throws Exception {
            var method = SurveyAnalyticsController.class.getMethod(
                    "submitResponse", SubmitResponseRequest.class);
            RequiresPermission annotation = method.getAnnotation(RequiresPermission.class);
            Assertions.assertNotNull(annotation, "submitResponse must have @RequiresPermission");
            Assertions.assertEquals(Permission.EMPLOYEE_VIEW_SELF, annotation.value()[0]);
        }

        @Test
        @DisplayName("calculateEngagementScore should have SURVEY_MANAGE permission")
        void calculateEngagementShouldRequireSurveyManage() throws Exception {
            var method = SurveyAnalyticsController.class.getMethod(
                    "calculateEngagementScore", UUID.class);
            RequiresPermission annotation = method.getAnnotation(RequiresPermission.class);
            Assertions.assertNotNull(annotation, "calculateEngagementScore must have @RequiresPermission");
            Assertions.assertEquals(Permission.SURVEY_MANAGE, annotation.value()[0]);
        }

        @Test
        @DisplayName("getQuestions should have SURVEY_VIEW permission")
        void getQuestionsShouldRequireSurveyView() throws Exception {
            var method = SurveyAnalyticsController.class.getMethod("getQuestions", UUID.class);
            RequiresPermission annotation = method.getAnnotation(RequiresPermission.class);
            Assertions.assertNotNull(annotation, "getQuestions must have @RequiresPermission");
            Assertions.assertEquals(Permission.SURVEY_VIEW, annotation.value()[0]);
        }
    }
}
