package com.hrms.api.recruitment.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.api.recruitment.dto.*;
import com.hrms.application.recruitment.service.ScorecardService;
import com.hrms.common.security.*;
import com.hrms.domain.recruitment.InterviewScorecard;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.MediaType;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.*;

import static org.hamcrest.Matchers.hasSize;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(ScorecardController.class)
@ContextConfiguration(classes = {ScorecardController.class, ScorecardControllerTest.TestConfig.class})
@AutoConfigureMockMvc(addFilters = false)
@ExtendWith(MockitoExtension.class)
@ActiveProfiles("test")
@DisplayName("ScorecardController Unit Tests")
class ScorecardControllerTest {

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private ObjectMapper objectMapper;
    @MockitoBean
    private ScorecardService scorecardService;
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

    private UUID templateId;
    private ScorecardTemplateResponse templateResponse;
    private ScorecardSubmissionResponse submissionResponse;

    @BeforeEach
    void setUp() {
        templateId = UUID.randomUUID();

        ScorecardTemplateResponse.CriterionResponse criterion = ScorecardTemplateResponse.CriterionResponse.builder()
                .id(UUID.randomUUID())
                .name("Technical Skills")
                .category("Technical")
                .weight(1.0)
                .orderIndex(0)
                .build();

        templateResponse = ScorecardTemplateResponse.builder()
                .id(templateId)
                .tenantId(UUID.randomUUID())
                .name("Engineering Interview Template")
                .description("Standard engineering scorecard")
                .isDefault(true)
                .criteria(List.of(criterion))
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        submissionResponse = ScorecardSubmissionResponse.builder()
                .id(UUID.randomUUID())
                .tenantId(UUID.randomUUID())
                .interviewId(UUID.randomUUID())
                .applicantId(UUID.randomUUID())
                .jobOpeningId(UUID.randomUUID())
                .interviewerId(UUID.randomUUID())
                .templateId(templateId)
                .overallRating(4)
                .recommendation(InterviewScorecard.Recommendation.YES)
                .overallNotes("Strong candidate")
                .status(InterviewScorecard.ScorecardStatus.SUBMITTED)
                .submittedAt(LocalDateTime.now())
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();
    }

    @Configuration
    static class TestConfig {
        @Bean
        public org.springframework.data.domain.AuditorAware<UUID> auditorProvider() {
            return () -> Optional.of(UUID.randomUUID());
        }
    }

    @Nested
    @DisplayName("Template CRUD Tests")
    class TemplateCrudTests {

        @Test
        @DisplayName("Should list all scorecard templates")
        void shouldListAllTemplates() throws Exception {
            when(scorecardService.getAllTemplates()).thenReturn(List.of(templateResponse));

            mockMvc.perform(get("/api/v1/recruitment/scorecards"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$", hasSize(1)))
                    .andExpect(jsonPath("$[0].name").value("Engineering Interview Template"))
                    .andExpect(jsonPath("$[0].isDefault").value(true));

            verify(scorecardService).getAllTemplates();
        }

        @Test
        @DisplayName("Should return empty list when no templates exist")
        void shouldReturnEmptyListWhenNoTemplates() throws Exception {
            when(scorecardService.getAllTemplates()).thenReturn(Collections.emptyList());

            mockMvc.perform(get("/api/v1/recruitment/scorecards"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$", hasSize(0)));

            verify(scorecardService).getAllTemplates();
        }

        @Test
        @DisplayName("Should create scorecard template successfully")
        void shouldCreateTemplateSuccessfully() throws Exception {
            ScorecardTemplateRequest request = new ScorecardTemplateRequest();
            request.setName("Engineering Interview Template");
            request.setDescription("Standard engineering scorecard");
            request.setIsDefault(true);

            ScorecardTemplateRequest.CriterionRequest criterion = new ScorecardTemplateRequest.CriterionRequest();
            criterion.setName("Technical Skills");
            criterion.setCategory("Technical");
            criterion.setWeight(1.0);
            criterion.setOrderIndex(0);
            request.setCriteria(List.of(criterion));

            when(scorecardService.createTemplate(any(ScorecardTemplateRequest.class)))
                    .thenReturn(templateResponse);

            mockMvc.perform(post("/api/v1/recruitment/scorecards")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.id").exists())
                    .andExpect(jsonPath("$.name").value("Engineering Interview Template"))
                    .andExpect(jsonPath("$.criteria", hasSize(1)));

            verify(scorecardService).createTemplate(any(ScorecardTemplateRequest.class));
        }

        @Test
        @DisplayName("Should return 400 when template name is blank")
        void shouldReturn400WhenTemplateNameBlank() throws Exception {
            ScorecardTemplateRequest request = new ScorecardTemplateRequest();
            // name is blank — validation should fail

            mockMvc.perform(post("/api/v1/recruitment/scorecards")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("Should get scorecard template by ID")
        void shouldGetTemplateById() throws Exception {
            when(scorecardService.getTemplateById(templateId)).thenReturn(templateResponse);

            mockMvc.perform(get("/api/v1/recruitment/scorecards/{id}", templateId))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.id").value(templateId.toString()))
                    .andExpect(jsonPath("$.name").value("Engineering Interview Template"))
                    .andExpect(jsonPath("$.description").value("Standard engineering scorecard"));

            verify(scorecardService).getTemplateById(templateId);
        }

        @Test
        @DisplayName("Should update scorecard template successfully")
        void shouldUpdateTemplateSuccessfully() throws Exception {
            ScorecardTemplateRequest request = new ScorecardTemplateRequest();
            request.setName("Updated Template Name");
            request.setDescription("Updated description");

            ScorecardTemplateResponse updatedResponse = ScorecardTemplateResponse.builder()
                    .id(templateId)
                    .name("Updated Template Name")
                    .description("Updated description")
                    .isDefault(false)
                    .criteria(Collections.emptyList())
                    .build();

            when(scorecardService.updateTemplate(eq(templateId), any(ScorecardTemplateRequest.class)))
                    .thenReturn(updatedResponse);

            mockMvc.perform(put("/api/v1/recruitment/scorecards/{id}", templateId)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.name").value("Updated Template Name"));

            verify(scorecardService).updateTemplate(eq(templateId), any(ScorecardTemplateRequest.class));
        }

        @Test
        @DisplayName("Should delete scorecard template successfully")
        void shouldDeleteTemplateSuccessfully() throws Exception {
            doNothing().when(scorecardService).deleteTemplate(templateId);

            mockMvc.perform(delete("/api/v1/recruitment/scorecards/{id}", templateId))
                    .andExpect(status().isNoContent());

            verify(scorecardService).deleteTemplate(templateId);
        }
    }

    @Nested
    @DisplayName("Scorecard Submission Tests")
    class SubmissionTests {

        @Test
        @DisplayName("Should submit scorecard successfully")
        void shouldSubmitScorecardSuccessfully() throws Exception {
            ScorecardSubmissionRequest request = new ScorecardSubmissionRequest();
            request.setInterviewId(UUID.randomUUID());
            request.setApplicantId(UUID.randomUUID());
            request.setJobOpeningId(UUID.randomUUID());
            request.setOverallRating(4);
            request.setRecommendation(InterviewScorecard.Recommendation.YES);
            request.setOverallNotes("Strong candidate");

            ScorecardSubmissionRequest.CriterionScore criterionScore = new ScorecardSubmissionRequest.CriterionScore();
            criterionScore.setName("Technical Skills");
            criterionScore.setCategory("Technical");
            criterionScore.setRating(4);
            criterionScore.setWeight(1.0);
            criterionScore.setNotes("Good problem solving");
            request.setCriteriaScores(List.of(criterionScore));

            when(scorecardService.submitScorecard(eq(templateId), any(ScorecardSubmissionRequest.class)))
                    .thenReturn(submissionResponse);

            mockMvc.perform(post("/api/v1/recruitment/scorecards/{id}/submit", templateId)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.id").exists())
                    .andExpect(jsonPath("$.overallRating").value(4))
                    .andExpect(jsonPath("$.recommendation").value("YES"));

            verify(scorecardService).submitScorecard(eq(templateId), any(ScorecardSubmissionRequest.class));
        }

        @Test
        @DisplayName("Should return 400 when submission missing required interview ID")
        void shouldReturn400WhenSubmissionMissingInterviewId() throws Exception {
            ScorecardSubmissionRequest request = new ScorecardSubmissionRequest();
            // interviewId, applicantId, jobOpeningId are all null

            mockMvc.perform(post("/api/v1/recruitment/scorecards/{id}/submit", templateId)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("Should return 400 when overall rating exceeds max")
        void shouldReturn400WhenRatingExceedsMax() throws Exception {
            ScorecardSubmissionRequest request = new ScorecardSubmissionRequest();
            request.setInterviewId(UUID.randomUUID());
            request.setApplicantId(UUID.randomUUID());
            request.setJobOpeningId(UUID.randomUUID());
            request.setOverallRating(10); // exceeds @Max(5)

            mockMvc.perform(post("/api/v1/recruitment/scorecards/{id}/submit", templateId)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isBadRequest());
        }
    }
}
