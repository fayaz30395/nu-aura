package com.hrms.api.recruitment.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.api.recruitment.dto.ai.*;
import com.hrms.application.ai.service.AIRecruitmentService;
import com.hrms.application.recruitment.service.RecruitmentManagementService;
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
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.web.servlet.MockMvc;

import java.util.*;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(AIRecruitmentController.class)
@ContextConfiguration(classes = {AIRecruitmentController.class, AIRecruitmentControllerTest.TestConfig.class})
@AutoConfigureMockMvc(addFilters = false)
@ExtendWith(MockitoExtension.class)
@ActiveProfiles("test")
@DisplayName("AIRecruitmentController Tests")
class AIRecruitmentControllerTest {

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private ObjectMapper objectMapper;
    @MockitoBean
    private AIRecruitmentService aiRecruitmentService;
    @MockitoBean
    private RecruitmentManagementService recruitmentManagementService;
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

    private UUID candidateId;
    private UUID jobOpeningId;

    @BeforeEach
    void setUp() {
        candidateId = UUID.randomUUID();
        jobOpeningId = UUID.randomUUID();
    }

    @Configuration
    static class TestConfig {
        @Bean
        public org.springframework.data.domain.AuditorAware<UUID> auditorProvider() {
            return () -> Optional.of(UUID.randomUUID());
        }
    }

    @Test
    @DisplayName("Should parse resume from text successfully")
    void shouldParseResumeFromText() throws Exception {
        ResumeParseRequest request = ResumeParseRequest.builder()
                .resumeText("John Doe, Software Engineer, 5 years experience")
                .build();

        ResumeParseResponse response = ResumeParseResponse.builder()
                .success(true)
                .fullName("John Doe")
                .email("john@example.com")
                .skills(List.of("Java", "Spring Boot"))
                .build();

        when(aiRecruitmentService.parseResume(any(String.class))).thenReturn(response);

        mockMvc.perform(post("/api/v1/recruitment/ai/parse-resume")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.fullName").value("John Doe"));

        verify(aiRecruitmentService).parseResume(any(String.class));
    }

    @Test
    @DisplayName("Should parse resume from base64 file")
    void shouldParseResumeFromBase64() throws Exception {
        ResumeParseRequest request = ResumeParseRequest.builder()
                .fileBase64("dGVzdCBiYXNlNjQ=")
                .fileName("resume.pdf")
                .build();

        ResumeParseResponse response = ResumeParseResponse.builder()
                .success(true)
                .fullName("Jane Doe")
                .build();

        when(aiRecruitmentService.parseResumeFromBase64(any(), any())).thenReturn(response);

        mockMvc.perform(post("/api/v1/recruitment/ai/parse-resume")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.fullName").value("Jane Doe"));

        verify(aiRecruitmentService).parseResumeFromBase64(any(), any());
    }

    @Test
    @DisplayName("Should return failure when no resume input provided")
    void shouldReturnFailureWhenNoResumeInput() throws Exception {
        ResumeParseRequest request = ResumeParseRequest.builder().build();

        mockMvc.perform(post("/api/v1/recruitment/ai/parse-resume")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("Please provide either resumeText, resumeUrl, or fileBase64"));

        verifyNoInteractions(aiRecruitmentService);
    }

    @Test
    @DisplayName("Should parse resume from multipart upload")
    void shouldParseResumeFromUpload() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
                "file", "resume.pdf", "application/pdf", "mock pdf content".getBytes());

        ResumeParseResponse response = ResumeParseResponse.builder()
                .success(true)
                .fullName("Upload User")
                .build();

        when(aiRecruitmentService.parseResumeFromFile(any(byte[].class), any(String.class)))
                .thenReturn(response);

        mockMvc.perform(multipart("/api/v1/recruitment/ai/parse-resume/upload").file(file))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.fullName").value("Upload User"));

        verify(aiRecruitmentService).parseResumeFromFile(any(byte[].class), any(String.class));
    }

    @Test
    @DisplayName("Should calculate match score between candidate and job")
    void shouldCalculateMatchScore() throws Exception {
        CandidateMatchResponse response = CandidateMatchResponse.builder()
                .candidateId(candidateId)
                .jobOpeningId(jobOpeningId)
                .overallScore(85.0)
                .recommendation("HIGHLY_RECOMMENDED")
                .build();

        when(aiRecruitmentService.calculateMatchScore(candidateId, jobOpeningId))
                .thenReturn(response);

        mockMvc.perform(post("/api/v1/recruitment/ai/match-score")
                        .param("candidateId", candidateId.toString())
                        .param("jobOpeningId", jobOpeningId.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.overallScore").value(85.0))
                .andExpect(jsonPath("$.recommendation").value("HIGHLY_RECOMMENDED"));

        verify(aiRecruitmentService).calculateMatchScore(candidateId, jobOpeningId);
    }

    @Test
    @DisplayName("Should generate job description")
    void shouldGenerateJobDescription() throws Exception {
        JobDescriptionRequest request = JobDescriptionRequest.builder()
                .jobTitle("Software Engineer")
                .department("Engineering")
                .keySkills(List.of("Java", "Spring Boot"))
                .build();

        JobDescriptionResponse response = JobDescriptionResponse.builder()
                .success(true)
                .title("Software Engineer")
                .fullDescription("We are looking for a Software Engineer...")
                .build();

        when(aiRecruitmentService.generateJobDescription(any(JobDescriptionRequest.class)))
                .thenReturn(response);

        mockMvc.perform(post("/api/v1/recruitment/ai/generate-job-description")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.title").value("Software Engineer"));

        verify(aiRecruitmentService).generateJobDescription(any(JobDescriptionRequest.class));
    }

    @Test
    @DisplayName("Should generate interview questions for job opening")
    void shouldGenerateInterviewQuestions() throws Exception {
        InterviewQuestionsResponse response = InterviewQuestionsResponse.builder()
                .success(true)
                .technicalQuestions(List.of())
                .build();

        when(aiRecruitmentService.generateInterviewQuestions(jobOpeningId))
                .thenReturn(response);

        mockMvc.perform(get("/api/v1/recruitment/ai/interview-questions/{jobOpeningId}", jobOpeningId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        verify(aiRecruitmentService).generateInterviewQuestions(jobOpeningId);
    }

    @Test
    @DisplayName("Should get ranked candidates for job opening")
    void shouldGetRankedCandidates() throws Exception {
        CandidateMatchResponse match1 = CandidateMatchResponse.builder()
                .candidateId(UUID.randomUUID())
                .overallScore(90.0)
                .build();
        CandidateMatchResponse match2 = CandidateMatchResponse.builder()
                .candidateId(UUID.randomUUID())
                .overallScore(75.0)
                .build();

        when(aiRecruitmentService.rankCandidatesForJob(jobOpeningId))
                .thenReturn(List.of(match1, match2));

        mockMvc.perform(get("/api/v1/recruitment/ai/ranked-candidates/{jobOpeningId}", jobOpeningId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].overallScore").value(90.0));

        verify(aiRecruitmentService).rankCandidatesForJob(jobOpeningId);
    }

    @Test
    @DisplayName("Should generate screening summary for candidate")
    void shouldGenerateScreeningSummary() throws Exception {
        CandidateScreeningSummaryRequest request = CandidateScreeningSummaryRequest.builder()
                .candidateId(candidateId)
                .jobOpeningId(jobOpeningId)
                .context("Initial screening")
                .build();

        CandidateScreeningSummaryResponse response = CandidateScreeningSummaryResponse.builder()
                .candidateId(candidateId)
                .jobOpeningId(jobOpeningId)
                .build();

        when(aiRecruitmentService.generateScreeningSummary(eq(candidateId), eq(jobOpeningId), any()))
                .thenReturn(response);

        mockMvc.perform(post("/api/v1/recruitment/ai/screening-summary")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.candidateId").value(candidateId.toString()));

        verify(aiRecruitmentService).generateScreeningSummary(eq(candidateId), eq(jobOpeningId), any());
    }

    @Test
    @DisplayName("Should synthesize interview feedback")
    void shouldSynthesizeInterviewFeedback() throws Exception {
        FeedbackSynthesisRequest request = FeedbackSynthesisRequest.builder()
                .candidateId(candidateId)
                .jobOpeningId(jobOpeningId)
                .build();

        FeedbackSynthesisResponse response = FeedbackSynthesisResponse.builder()
                .candidateId(candidateId)
                .jobOpeningId(jobOpeningId)
                .build();

        when(aiRecruitmentService.synthesizeInterviewFeedback(candidateId, jobOpeningId))
                .thenReturn(response);

        mockMvc.perform(post("/api/v1/recruitment/ai/synthesize-feedback")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.candidateId").value(candidateId.toString()));

        verify(aiRecruitmentService).synthesizeInterviewFeedback(candidateId, jobOpeningId);
    }
}
