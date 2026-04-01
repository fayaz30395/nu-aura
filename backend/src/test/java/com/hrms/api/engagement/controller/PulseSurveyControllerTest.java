package com.hrms.api.engagement.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.api.engagement.dto.PulseSurveyRequest;
import com.hrms.api.engagement.dto.PulseSurveyResponse;
import com.hrms.api.engagement.dto.SurveySubmissionRequest;
import com.hrms.application.engagement.service.PulseSurveyService;
import com.hrms.common.exception.GlobalExceptionHandler;
import com.hrms.common.config.TestMeterRegistryConfig;
import org.springframework.context.annotation.Import;
import com.hrms.common.security.*;
import com.hrms.domain.engagement.PulseSurvey;
import com.hrms.domain.engagement.PulseSurvey.SurveyStatus;
import com.hrms.domain.engagement.PulseSurvey.SurveyType;
import com.hrms.domain.engagement.PulseSurveyQuestion;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.mapping.JpaMetamodelMappingContext;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(PulseSurveyController.class)
@ContextConfiguration(classes = {PulseSurveyController.class, GlobalExceptionHandler.class})
@Import(TestMeterRegistryConfig.class)
@AutoConfigureMockMvc(addFilters = false)
@ExtendWith(MockitoExtension.class)
@ActiveProfiles("test")
@DisplayName("PulseSurveyController Unit Tests")
class PulseSurveyControllerTest {

    @MockitoBean
    private JpaMetamodelMappingContext jpaMetamodelMappingContext;


    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private PulseSurveyService surveyService;

    @MockitoBean
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @MockitoBean
    private TenantFilter tenantFilter;

    private UUID surveyId;
    private UUID questionId;
    private UUID employeeId;
    private PulseSurvey survey;
    private PulseSurveyRequest surveyRequest;

    @BeforeEach
    void setUp() {
        surveyId = UUID.randomUUID();
        questionId = UUID.randomUUID();
        employeeId = UUID.randomUUID();

        SecurityContext.setCurrentUser(UUID.randomUUID(), employeeId, Set.of("HR_MANAGER"), Map.of());

        survey = new PulseSurvey();
        survey.setId(surveyId);
        survey.setTitle("Q4 Employee Engagement Survey");
        survey.setStatus(SurveyStatus.DRAFT);

        surveyRequest = PulseSurveyRequest.builder()
                .title("Q4 Employee Engagement Survey")
                .description("Quarterly engagement check")
                .surveyType(SurveyType.ENGAGEMENT)
                .startDate(LocalDate.of(2026, 10, 1))
                .endDate(LocalDate.of(2026, 10, 31))
                .isAnonymous(true)
                .isMandatory(false)
                .build();
    }

    @AfterEach
    void tearDown() {
        SecurityContext.clear();
    }

    @Nested
    @DisplayName("Survey CRUD Tests")
    class SurveyCrudTests {

        @Test
        @DisplayName("Should create survey successfully")
        void shouldCreateSurveySuccessfully() throws Exception {
            when(surveyService.createSurvey(any(PulseSurveyRequest.class))).thenReturn(survey);

            mockMvc.perform(post("/api/v1/surveys")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(surveyRequest)))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.id").value(surveyId.toString()))
                    .andExpect(jsonPath("$.title").value("Q4 Employee Engagement Survey"))
                    .andExpect(jsonPath("$.status").value("DRAFT"));

            verify(surveyService).createSurvey(any(PulseSurveyRequest.class));
        }

        @Test
        @DisplayName("Should return 400 when survey title is missing")
        void shouldReturn400WhenTitleMissing() throws Exception {
            PulseSurveyRequest invalidRequest = PulseSurveyRequest.builder()
                    .startDate(LocalDate.now())
                    .endDate(LocalDate.now().plusDays(7))
                    .surveyType(SurveyType.ENGAGEMENT)
                    .build();
            // Missing required title

            mockMvc.perform(post("/api/v1/surveys")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(invalidRequest)))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("Should update survey")
        void shouldUpdateSurvey() throws Exception {
            PulseSurvey updatedSurvey = new PulseSurvey();
            updatedSurvey.setId(surveyId);
            updatedSurvey.setTitle("Updated Survey Title");
            updatedSurvey.setStatus(SurveyStatus.DRAFT);

            when(surveyService.updateSurvey(eq(surveyId), any(PulseSurveyRequest.class)))
                    .thenReturn(updatedSurvey);

            mockMvc.perform(put("/api/v1/surveys/{surveyId}", surveyId)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(surveyRequest)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.title").value("Updated Survey Title"));

            verify(surveyService).updateSurvey(eq(surveyId), any(PulseSurveyRequest.class));
        }

        @Test
        @DisplayName("Should get survey by ID with questions")
        void shouldGetSurveyByIdWithQuestions() throws Exception {
            PulseSurveyQuestion question = new PulseSurveyQuestion();
            question.setId(questionId);
            question.setQuestionText("How satisfied are you with your work-life balance?");
            question.setQuestionOrder(1);
            question.setIsRequired(true);
            question.setMinValue(1);
            question.setMaxValue(5);

            when(surveyService.getSurveyById(surveyId)).thenReturn(Optional.of(survey));
            when(surveyService.getSurveyQuestions(surveyId))
                    .thenReturn(Collections.singletonList(question));

            mockMvc.perform(get("/api/v1/surveys/{surveyId}", surveyId))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.id").value(surveyId.toString()))
                    .andExpect(jsonPath("$.questions.length()").value(1))
                    .andExpect(jsonPath("$.questions[0].questionText")
                            .value("How satisfied are you with your work-life balance?"));

            verify(surveyService).getSurveyById(surveyId);
            verify(surveyService).getSurveyQuestions(surveyId);
        }

        @Test
        @DisplayName("Should return 404 when survey not found")
        void shouldReturn404WhenSurveyNotFound() throws Exception {
            when(surveyService.getSurveyById(surveyId)).thenReturn(Optional.empty());

            mockMvc.perform(get("/api/v1/surveys/{surveyId}", surveyId))
                    .andExpect(status().isNotFound());
        }

        @Test
        @DisplayName("Should get all surveys without status filter")
        void shouldGetAllSurveys() throws Exception {
            Page<PulseSurvey> page = new PageImpl<>(
                    Collections.singletonList(survey),
                    PageRequest.of(0, 20),
                    1);

            when(surveyService.getAllSurveys(any(Pageable.class))).thenReturn(page);

            mockMvc.perform(get("/api/v1/surveys")
                            .param("page", "0")
                            .param("size", "20"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content.length()").value(1));

            verify(surveyService).getAllSurveys(any(Pageable.class));
        }

        @Test
        @DisplayName("Should filter surveys by status")
        void shouldFilterSurveysByStatus() throws Exception {
            PulseSurvey activeSurvey = new PulseSurvey();
            activeSurvey.setId(UUID.randomUUID());
            activeSurvey.setTitle("Active Survey");
            activeSurvey.setStatus(SurveyStatus.ACTIVE);

            Page<PulseSurvey> page = new PageImpl<>(
                    Collections.singletonList(activeSurvey),
                    PageRequest.of(0, 20),
                    1);

            when(surveyService.getSurveysByStatus(eq(SurveyStatus.ACTIVE), any(Pageable.class)))
                    .thenReturn(page);

            mockMvc.perform(get("/api/v1/surveys")
                            .param("status", "ACTIVE"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content.length()").value(1));

            verify(surveyService).getSurveysByStatus(eq(SurveyStatus.ACTIVE), any(Pageable.class));
        }

        @Test
        @DisplayName("Should get active surveys list")
        void shouldGetActiveSurveys() throws Exception {
            PulseSurvey activeSurvey = new PulseSurvey();
            activeSurvey.setId(UUID.randomUUID());
            activeSurvey.setTitle("Active Survey");
            activeSurvey.setStatus(SurveyStatus.ACTIVE);

            when(surveyService.getActiveSurveys())
                    .thenReturn(Collections.singletonList(activeSurvey));

            mockMvc.perform(get("/api/v1/surveys/active"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.length()").value(1));

            verify(surveyService).getActiveSurveys();
        }

        @Test
        @DisplayName("Should delete survey")
        void shouldDeleteSurvey() throws Exception {
            doNothing().when(surveyService).deleteSurvey(surveyId);

            mockMvc.perform(delete("/api/v1/surveys/{surveyId}", surveyId))
                    .andExpect(status().isNoContent());

            verify(surveyService).deleteSurvey(surveyId);
        }
    }

    @Nested
    @DisplayName("Survey Lifecycle Tests")
    class SurveyLifecycleTests {

        @Test
        @DisplayName("Should publish survey")
        void shouldPublishSurvey() throws Exception {
            PulseSurvey publishedSurvey = new PulseSurvey();
            publishedSurvey.setId(surveyId);
            publishedSurvey.setTitle("Q4 Employee Engagement Survey");
            publishedSurvey.setStatus(SurveyStatus.ACTIVE);

            when(surveyService.publishSurvey(eq(surveyId), any(UUID.class)))
                    .thenReturn(publishedSurvey);

            mockMvc.perform(post("/api/v1/surveys/{surveyId}/publish", surveyId))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.status").value("ACTIVE"));

            verify(surveyService).publishSurvey(eq(surveyId), any(UUID.class));
        }

        @Test
        @DisplayName("Should close survey")
        void shouldCloseSurvey() throws Exception {
            PulseSurvey closedSurvey = new PulseSurvey();
            closedSurvey.setId(surveyId);
            closedSurvey.setTitle("Q4 Employee Engagement Survey");
            closedSurvey.setStatus(SurveyStatus.COMPLETED);

            when(surveyService.closeSurvey(eq(surveyId), any(UUID.class)))
                    .thenReturn(closedSurvey);

            mockMvc.perform(post("/api/v1/surveys/{surveyId}/close", surveyId))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.status").value("COMPLETED"));

            verify(surveyService).closeSurvey(eq(surveyId), any(UUID.class));
        }
    }

    @Nested
    @DisplayName("Question Management Tests")
    class QuestionManagementTests {

        @Test
        @DisplayName("Should add question to survey")
        void shouldAddQuestionToSurvey() throws Exception {
            PulseSurveyRequest.QuestionRequest questionRequest =
                    PulseSurveyRequest.QuestionRequest.builder()
                            .questionText("How satisfied are you with your role?")
                            .questionType("RATING")
                            .questionOrder(1)
                            .isRequired(true)
                            .minValue(1)
                            .maxValue(5)
                            .minLabel("Very Dissatisfied")
                            .maxLabel("Very Satisfied")
                            .build();

            PulseSurveyQuestion savedQuestion = new PulseSurveyQuestion();
            savedQuestion.setId(questionId);
            savedQuestion.setQuestionText("How satisfied are you with your role?");
            savedQuestion.setIsRequired(true);
            savedQuestion.setMinValue(1);
            savedQuestion.setMaxValue(5);

            when(surveyService.addQuestion(eq(surveyId), any(PulseSurveyRequest.QuestionRequest.class)))
                    .thenReturn(savedQuestion);

            mockMvc.perform(post("/api/v1/surveys/{surveyId}/questions", surveyId)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(questionRequest)))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.id").value(questionId.toString()))
                    .andExpect(jsonPath("$.questionText").value("How satisfied are you with your role?"));

            verify(surveyService).addQuestion(eq(surveyId), any(PulseSurveyRequest.QuestionRequest.class));
        }

        @Test
        @DisplayName("Should get survey questions")
        void shouldGetSurveyQuestions() throws Exception {
            PulseSurveyQuestion question = new PulseSurveyQuestion();
            question.setId(questionId);
            question.setQuestionText("Rate your manager effectiveness");
            question.setIsRequired(true);

            when(surveyService.getSurveyQuestions(surveyId))
                    .thenReturn(Collections.singletonList(question));

            mockMvc.perform(get("/api/v1/surveys/{surveyId}/questions", surveyId))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.length()").value(1))
                    .andExpect(jsonPath("$[0].questionText").value("Rate your manager effectiveness"));

            verify(surveyService).getSurveyQuestions(surveyId);
        }

        @Test
        @DisplayName("Should delete question from survey")
        void shouldDeleteQuestion() throws Exception {
            doNothing().when(surveyService).deleteQuestion(surveyId, questionId);

            mockMvc.perform(delete("/api/v1/surveys/{surveyId}/questions/{questionId}",
                            surveyId, questionId))
                    .andExpect(status().isNoContent());

            verify(surveyService).deleteQuestion(surveyId, questionId);
        }
    }

    @Nested
    @DisplayName("Survey Response Tests")
    class SurveyResponseTests {

        @Test
        @DisplayName("Should start a survey for current employee")
        void shouldStartSurveyForEmployee() throws Exception {
            UUID responseId = UUID.randomUUID();
            com.hrms.domain.engagement.PulseSurveyResponse surveyResponse =
                    new com.hrms.domain.engagement.PulseSurveyResponse();
            surveyResponse.setId(responseId);

            PulseSurveyQuestion question = new PulseSurveyQuestion();
            question.setId(questionId);
            question.setQuestionText("Rate team collaboration");
            question.setIsRequired(true);

            when(surveyService.startSurveyResponse(eq(surveyId), any(UUID.class)))
                    .thenReturn(surveyResponse);
            when(surveyService.getSurveyQuestions(surveyId))
                    .thenReturn(Collections.singletonList(question));

            mockMvc.perform(post("/api/v1/surveys/{surveyId}/start", surveyId))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.responseId").value(responseId.toString()))
                    .andExpect(jsonPath("$.surveyId").value(surveyId.toString()))
                    .andExpect(jsonPath("$.questions.length()").value(1));

            verify(surveyService).startSurveyResponse(eq(surveyId), any(UUID.class));
        }

        @Test
        @DisplayName("Should submit completed survey response")
        void shouldSubmitSurveyResponse() throws Exception {
            UUID responseId = UUID.randomUUID();
            SurveySubmissionRequest submissionRequest = SurveySubmissionRequest.builder()
                    .surveyId(surveyId)
                    .build();

            com.hrms.domain.engagement.PulseSurveyResponse submittedResponse =
                    new com.hrms.domain.engagement.PulseSurveyResponse();
            submittedResponse.setId(responseId);
            submittedResponse.setSubmittedAt(LocalDateTime.now());
            submittedResponse.setStatus(com.hrms.domain.engagement.PulseSurveyResponse.ResponseStatus.SUBMITTED);

            when(surveyService.submitSurveyResponse(
                    any(SurveySubmissionRequest.class), any(UUID.class), anyString()))
                    .thenReturn(submittedResponse);

            mockMvc.perform(post("/api/v1/surveys/submit")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(submissionRequest)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.responseId").value(responseId.toString()));

            verify(surveyService).submitSurveyResponse(
                    any(SurveySubmissionRequest.class), any(UUID.class), anyString());
        }
    }

    @Nested
    @DisplayName("Survey Analytics Tests")
    class SurveyAnalyticsTests {

        @Test
        @DisplayName("Should get survey analytics")
        void shouldGetSurveyAnalytics() throws Exception {
            Map<String, Object> analytics = new HashMap<>();
            analytics.put("totalResponses", 45);
            analytics.put("completionRate", 90.0);
            analytics.put("averageScore", 3.8);

            when(surveyService.getSurveyAnalytics(surveyId)).thenReturn(analytics);

            mockMvc.perform(get("/api/v1/surveys/{surveyId}/analytics", surveyId))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.totalResponses").value(45))
                    .andExpect(jsonPath("$.completionRate").value(90.0));

            verify(surveyService).getSurveyAnalytics(surveyId);
        }

        @Test
        @DisplayName("Should get engagement dashboard")
        void shouldGetEngagementDashboard() throws Exception {
            Map<String, Object> dashboard = new HashMap<>();
            dashboard.put("overallEngagementScore", 72.5);
            dashboard.put("totalActiveSurveys", 3);
            dashboard.put("pendingResponses", 12);

            when(surveyService.getEngagementDashboard()).thenReturn(dashboard);

            mockMvc.perform(get("/api/v1/surveys/dashboard"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.overallEngagementScore").value(72.5))
                    .andExpect(jsonPath("$.totalActiveSurveys").value(3));

            verify(surveyService).getEngagementDashboard();
        }
    }

    @Nested
    @DisplayName("Permission Annotation Tests")
    class PermissionAnnotationTests {

        @Test
        @DisplayName("createSurvey should have SURVEY_MANAGE permission")
        void createSurveyShouldRequireSurveyManage() throws Exception {
            var method = PulseSurveyController.class.getMethod(
                    "createSurvey", PulseSurveyRequest.class);
            RequiresPermission annotation = method.getAnnotation(RequiresPermission.class);
            Assertions.assertNotNull(annotation, "createSurvey must have @RequiresPermission");
            Assertions.assertEquals(Permission.SURVEY_MANAGE, annotation.value()[0]);
        }

        @Test
        @DisplayName("getSurvey should have SURVEY_VIEW permission")
        void getSurveyShouldRequireSurveyView() throws Exception {
            var method = PulseSurveyController.class.getMethod("getSurvey", UUID.class);
            RequiresPermission annotation = method.getAnnotation(RequiresPermission.class);
            Assertions.assertNotNull(annotation, "getSurvey must have @RequiresPermission");
            Assertions.assertEquals(Permission.SURVEY_VIEW, annotation.value()[0]);
        }

        @Test
        @DisplayName("publishSurvey should have SURVEY_MANAGE permission")
        void publishSurveyShouldRequireSurveyManage() throws Exception {
            var method = PulseSurveyController.class.getMethod("publishSurvey", UUID.class);
            RequiresPermission annotation = method.getAnnotation(RequiresPermission.class);
            Assertions.assertNotNull(annotation, "publishSurvey must have @RequiresPermission");
            Assertions.assertEquals(Permission.SURVEY_MANAGE, annotation.value()[0]);
        }
    }
}
