package com.hrms.application.ai.service;

import com.hrms.api.recruitment.dto.ai.FeedbackSynthesisResponse;
import com.hrms.api.recruitment.dto.ai.InterviewQuestionsResponse;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.recruitment.Candidate;
import com.hrms.domain.recruitment.Interview;
import com.hrms.domain.recruitment.JobOpening;
import com.hrms.infrastructure.recruitment.repository.CandidateRepository;
import com.hrms.infrastructure.recruitment.repository.InterviewRepository;
import com.hrms.infrastructure.recruitment.repository.JobOpeningRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("InterviewGenerationService Tests")
class InterviewGenerationServiceTest {

    @Mock
    private CandidateRepository candidateRepository;

    @Mock
    private JobOpeningRepository jobOpeningRepository;

    @Mock
    private InterviewRepository interviewRepository;

    @Mock
    private AIRecruitmentHelper aiHelper;

    @Spy
    private ObjectMapper objectMapper = new ObjectMapper();

    @InjectMocks
    private InterviewGenerationService interviewGenerationService;

    private static MockedStatic<TenantContext> tenantContextMock;

    private UUID tenantId;
    private UUID jobOpeningId;
    private UUID candidateId;
    private JobOpening jobOpening;
    private Candidate candidate;

    @BeforeAll
    static void setUpClass() {
        tenantContextMock = mockStatic(TenantContext.class);
    }

    @AfterAll
    static void tearDownClass() {
        tenantContextMock.close();
    }

    @BeforeEach
    void setUp() {
        tenantId = UUID.randomUUID();
        jobOpeningId = UUID.randomUUID();
        candidateId = UUID.randomUUID();

        tenantContextMock.when(TenantContext::getCurrentTenant).thenReturn(tenantId);
        tenantContextMock.when(TenantContext::requireCurrentTenant).thenReturn(tenantId);

        jobOpening = new JobOpening();
        jobOpening.setId(jobOpeningId);
        jobOpening.setTenantId(tenantId);
        jobOpening.setJobTitle("Senior Java Developer");
        jobOpening.setJobDescription("Build scalable backend services");
        jobOpening.setRequirements("5+ years Java, Spring Boot");
        jobOpening.setSkillsRequired("Java, Spring Boot, PostgreSQL, Kafka");

        candidate = new Candidate();
        candidate.setId(candidateId);
        candidate.setTenantId(tenantId);
        candidate.setFirstName("Alice");
        candidate.setLastName("Johnson");
        candidate.setCurrentDesignation("Software Engineer");
        candidate.setCurrentCompany("TechCorp");
        candidate.setTotalExperience(new BigDecimal("6.5"));
    }

    @Nested
    @DisplayName("Generate Interview Questions")
    class GenerateInterviewQuestionsTests {

        private static final String VALID_AI_RESPONSE = """
                {
                  "technicalQuestions": [
                    {"question": "Explain Spring Boot auto-configuration", "purpose": "Tests Spring knowledge", "difficulty": "medium"}
                  ],
                  "behavioralQuestions": [
                    {"question": "Tell me about a time you handled a production outage", "competency": "Problem solving"}
                  ],
                  "situationalQuestions": [
                    {"question": "How would you handle a database migration with zero downtime?", "scenario": "Production database migration"}
                  ],
                  "culturalFitQuestions": [
                    {"question": "How do you approach code reviews?", "value": "Collaboration"}
                  ],
                  "roleSpecificQuestions": [
                    {"question": "How would you design a multi-tenant SaaS backend?", "focus": "Architecture design"}
                  ]
                }
                """;

        @Test
        @DisplayName("Should generate questions for job and candidate")
        void shouldGenerateQuestionsForJobAndCandidate() {
            when(jobOpeningRepository.findByIdAndTenantId(jobOpeningId, tenantId))
                    .thenReturn(Optional.of(jobOpening));
            when(candidateRepository.findByIdAndTenantId(candidateId, tenantId))
                    .thenReturn(Optional.of(candidate));
            when(aiHelper.callOpenAI(anyString())).thenReturn(VALID_AI_RESPONSE);
            when(aiHelper.extractJson(anyString())).thenReturn(VALID_AI_RESPONSE);

            InterviewQuestionsResponse result = interviewGenerationService.generateInterviewQuestions(jobOpeningId, candidateId);

            assertThat(result).isNotNull();
            assertThat(result.isSuccess()).isTrue();
            assertThat(result.getTechnicalQuestions()).hasSize(1);
            assertThat(result.getBehavioralQuestions()).hasSize(1);
            assertThat(result.getSituationalQuestions()).hasSize(1);
            assertThat(result.getCulturalFitQuestions()).hasSize(1);
            assertThat(result.getRoleSpecificQuestions()).hasSize(1);
        }

        @Test
        @DisplayName("Should generate questions for job without candidate")
        void shouldGenerateQuestionsForJobWithoutCandidate() {
            when(jobOpeningRepository.findByIdAndTenantId(jobOpeningId, tenantId))
                    .thenReturn(Optional.of(jobOpening));
            when(aiHelper.callOpenAI(anyString())).thenReturn(VALID_AI_RESPONSE);
            when(aiHelper.extractJson(anyString())).thenReturn(VALID_AI_RESPONSE);

            InterviewQuestionsResponse result = interviewGenerationService.generateInterviewQuestions(jobOpeningId);

            assertThat(result).isNotNull();
            assertThat(result.isSuccess()).isTrue();
            assertThat(result.getTechnicalQuestions()).isNotEmpty();
        }

        @Test
        @DisplayName("Should throw exception when job opening not found")
        void shouldThrowExceptionWhenJobOpeningNotFound() {
            when(jobOpeningRepository.findByIdAndTenantId(jobOpeningId, tenantId))
                    .thenReturn(Optional.empty());

            assertThatThrownBy(() -> interviewGenerationService.generateInterviewQuestions(jobOpeningId, candidateId))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("Job opening not found");
        }

        @Test
        @DisplayName("Should handle candidate not found gracefully")
        void shouldHandleCandidateNotFoundGracefully() {
            when(jobOpeningRepository.findByIdAndTenantId(jobOpeningId, tenantId))
                    .thenReturn(Optional.of(jobOpening));
            when(candidateRepository.findByIdAndTenantId(candidateId, tenantId))
                    .thenReturn(Optional.empty());
            when(aiHelper.callOpenAI(anyString())).thenReturn(VALID_AI_RESPONSE);
            when(aiHelper.extractJson(anyString())).thenReturn(VALID_AI_RESPONSE);

            InterviewQuestionsResponse result = interviewGenerationService.generateInterviewQuestions(jobOpeningId, candidateId);

            assertThat(result).isNotNull();
            assertThat(result.isSuccess()).isTrue();
        }

        @Test
        @DisplayName("Should return failure response when AI returns invalid JSON")
        void shouldReturnFailureWhenAIReturnsInvalidJson() {
            when(jobOpeningRepository.findByIdAndTenantId(jobOpeningId, tenantId))
                    .thenReturn(Optional.of(jobOpening));
            when(aiHelper.callOpenAI(anyString())).thenReturn("not valid json");
            when(aiHelper.extractJson(anyString())).thenReturn("not valid json");

            InterviewQuestionsResponse result = interviewGenerationService.generateInterviewQuestions(jobOpeningId, candidateId);

            assertThat(result).isNotNull();
            assertThat(result.isSuccess()).isFalse();
            assertThat(result.getMessage()).contains("Error generating questions");
        }
    }

    @Nested
    @DisplayName("Synthesize Interview Feedback")
    class SynthesizeFeedbackTests {

        @Test
        @DisplayName("Should return empty synthesis when no completed interviews")
        void shouldReturnEmptySynthesisWhenNoCompletedInterviews() {
            when(candidateRepository.findByIdAndTenantId(candidateId, tenantId))
                    .thenReturn(Optional.of(candidate));
            when(jobOpeningRepository.findByIdAndTenantId(jobOpeningId, tenantId))
                    .thenReturn(Optional.of(jobOpening));
            when(interviewRepository.findByTenantIdAndCandidateId(tenantId, candidateId))
                    .thenReturn(List.of());

            FeedbackSynthesisResponse result = interviewGenerationService.synthesizeInterviewFeedback(candidateId, jobOpeningId);

            assertThat(result).isNotNull();
            assertThat(result.getCandidateNarrative()).contains("No completed interview feedback");
            assertThat(result.getRecommendedNextStep()).isEqualTo("Schedule initial interviews");
            assertThat(result.getCandidateId()).isEqualTo(candidateId);
            assertThat(result.getJobOpeningId()).isEqualTo(jobOpeningId);
            verify(aiHelper, never()).callOpenAI(anyString());
        }

        @Test
        @DisplayName("Should filter out interviews for different job openings")
        void shouldFilterOutInterviewsForDifferentJobOpenings() {
            Interview otherJobInterview = new Interview();
            otherJobInterview.setId(UUID.randomUUID());
            otherJobInterview.setTenantId(tenantId);
            otherJobInterview.setCandidateId(candidateId);
            otherJobInterview.setJobOpeningId(UUID.randomUUID()); // Different job
            otherJobInterview.setStatus(Interview.InterviewStatus.COMPLETED);
            otherJobInterview.setFeedback("Some feedback");

            when(candidateRepository.findByIdAndTenantId(candidateId, tenantId))
                    .thenReturn(Optional.of(candidate));
            when(jobOpeningRepository.findByIdAndTenantId(jobOpeningId, tenantId))
                    .thenReturn(Optional.of(jobOpening));
            when(interviewRepository.findByTenantIdAndCandidateId(tenantId, candidateId))
                    .thenReturn(List.of(otherJobInterview));

            FeedbackSynthesisResponse result = interviewGenerationService.synthesizeInterviewFeedback(candidateId, jobOpeningId);

            assertThat(result.getCandidateNarrative()).contains("No completed interview feedback");
            verify(aiHelper, never()).callOpenAI(anyString());
        }

        @Test
        @DisplayName("Should filter out non-completed interviews")
        void shouldFilterOutNonCompletedInterviews() {
            Interview scheduledInterview = new Interview();
            scheduledInterview.setId(UUID.randomUUID());
            scheduledInterview.setTenantId(tenantId);
            scheduledInterview.setCandidateId(candidateId);
            scheduledInterview.setJobOpeningId(jobOpeningId);
            scheduledInterview.setStatus(Interview.InterviewStatus.SCHEDULED);
            scheduledInterview.setFeedback("Some feedback");

            when(candidateRepository.findByIdAndTenantId(candidateId, tenantId))
                    .thenReturn(Optional.of(candidate));
            when(jobOpeningRepository.findByIdAndTenantId(jobOpeningId, tenantId))
                    .thenReturn(Optional.of(jobOpening));
            when(interviewRepository.findByTenantIdAndCandidateId(tenantId, candidateId))
                    .thenReturn(List.of(scheduledInterview));

            FeedbackSynthesisResponse result = interviewGenerationService.synthesizeInterviewFeedback(candidateId, jobOpeningId);

            assertThat(result.getCandidateNarrative()).contains("No completed interview feedback");
        }

        @Test
        @DisplayName("Should filter out interviews without feedback")
        void shouldFilterOutInterviewsWithoutFeedback() {
            Interview noFeedbackInterview = new Interview();
            noFeedbackInterview.setId(UUID.randomUUID());
            noFeedbackInterview.setTenantId(tenantId);
            noFeedbackInterview.setCandidateId(candidateId);
            noFeedbackInterview.setJobOpeningId(jobOpeningId);
            noFeedbackInterview.setStatus(Interview.InterviewStatus.COMPLETED);
            noFeedbackInterview.setFeedback(null);

            when(candidateRepository.findByIdAndTenantId(candidateId, tenantId))
                    .thenReturn(Optional.of(candidate));
            when(jobOpeningRepository.findByIdAndTenantId(jobOpeningId, tenantId))
                    .thenReturn(Optional.of(jobOpening));
            when(interviewRepository.findByTenantIdAndCandidateId(tenantId, candidateId))
                    .thenReturn(List.of(noFeedbackInterview));

            FeedbackSynthesisResponse result = interviewGenerationService.synthesizeInterviewFeedback(candidateId, jobOpeningId);

            assertThat(result.getCandidateNarrative()).contains("No completed interview feedback");
        }

        @Test
        @DisplayName("Should synthesize feedback from completed interviews")
        void shouldSynthesizeFeedbackFromCompletedInterviews() {
            Interview completedInterview = new Interview();
            completedInterview.setId(UUID.randomUUID());
            completedInterview.setTenantId(tenantId);
            completedInterview.setCandidateId(candidateId);
            completedInterview.setJobOpeningId(jobOpeningId);
            completedInterview.setStatus(Interview.InterviewStatus.COMPLETED);
            completedInterview.setFeedback("Strong technical skills in Java and Spring Boot");
            completedInterview.setRating(4);
            completedInterview.setResult(Interview.InterviewResult.SELECTED);
            completedInterview.setInterviewRound(Interview.InterviewRound.TECHNICAL_1);
            completedInterview.setInterviewType(Interview.InterviewType.VIDEO);
            completedInterview.setNotes("Recommend for next round");

            String aiResponse = """
                    {
                      "candidateNarrative": "The candidate showed strong technical skills",
                      "themes": ["Java expertise", "System design"],
                      "agreements": ["Strong coding skills"],
                      "disagreements": [],
                      "missingData": ["Leadership assessment"],
                      "openQuestions": ["Team fit"],
                      "recommendedNextStep": "Proceed to managerial round"
                    }
                    """;

            when(candidateRepository.findByIdAndTenantId(candidateId, tenantId))
                    .thenReturn(Optional.of(candidate));
            when(jobOpeningRepository.findByIdAndTenantId(jobOpeningId, tenantId))
                    .thenReturn(Optional.of(jobOpening));
            when(interviewRepository.findByTenantIdAndCandidateId(tenantId, candidateId))
                    .thenReturn(List.of(completedInterview));
            when(aiHelper.callOpenAI(anyString())).thenReturn(aiResponse);
            when(aiHelper.extractJson(anyString())).thenReturn(aiResponse);

            FeedbackSynthesisResponse result = interviewGenerationService.synthesizeInterviewFeedback(candidateId, jobOpeningId);

            assertThat(result).isNotNull();
            assertThat(result.getCandidateNarrative()).contains("strong technical skills");
            assertThat(result.getThemes()).contains("Java expertise", "System design");
            assertThat(result.getAgreements()).contains("Strong coding skills");
            assertThat(result.getMissingData()).contains("Leadership assessment");
            assertThat(result.getRecommendedNextStep()).isEqualTo("Proceed to managerial round");
            assertThat(result.getCandidateId()).isEqualTo(candidateId);
            assertThat(result.getJobTitle()).isEqualTo("Senior Java Developer");
        }

        @Test
        @DisplayName("Should throw exception when candidate not found for feedback synthesis")
        void shouldThrowExceptionWhenCandidateNotFound() {
            when(candidateRepository.findByIdAndTenantId(candidateId, tenantId))
                    .thenReturn(Optional.empty());

            assertThatThrownBy(() -> interviewGenerationService.synthesizeInterviewFeedback(candidateId, jobOpeningId))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("Candidate not found");
        }

        @Test
        @DisplayName("Should throw exception when job opening not found for feedback synthesis")
        void shouldThrowExceptionWhenJobOpeningNotFound() {
            when(candidateRepository.findByIdAndTenantId(candidateId, tenantId))
                    .thenReturn(Optional.of(candidate));
            when(jobOpeningRepository.findByIdAndTenantId(jobOpeningId, tenantId))
                    .thenReturn(Optional.empty());

            assertThatThrownBy(() -> interviewGenerationService.synthesizeInterviewFeedback(candidateId, jobOpeningId))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("Job opening not found");
        }

        @Test
        @DisplayName("Should handle AI returning invalid JSON for feedback synthesis")
        void shouldHandleInvalidJsonForFeedbackSynthesis() {
            Interview completedInterview = new Interview();
            completedInterview.setId(UUID.randomUUID());
            completedInterview.setTenantId(tenantId);
            completedInterview.setCandidateId(candidateId);
            completedInterview.setJobOpeningId(jobOpeningId);
            completedInterview.setStatus(Interview.InterviewStatus.COMPLETED);
            completedInterview.setFeedback("Good candidate");
            completedInterview.setInterviewRound(Interview.InterviewRound.SCREENING);
            completedInterview.setInterviewType(Interview.InterviewType.PHONE);

            when(candidateRepository.findByIdAndTenantId(candidateId, tenantId))
                    .thenReturn(Optional.of(candidate));
            when(jobOpeningRepository.findByIdAndTenantId(jobOpeningId, tenantId))
                    .thenReturn(Optional.of(jobOpening));
            when(interviewRepository.findByTenantIdAndCandidateId(tenantId, candidateId))
                    .thenReturn(List.of(completedInterview));
            when(aiHelper.callOpenAI(anyString())).thenReturn("invalid json");
            when(aiHelper.extractJson(anyString())).thenReturn("invalid json");

            FeedbackSynthesisResponse result = interviewGenerationService.synthesizeInterviewFeedback(candidateId, jobOpeningId);

            assertThat(result).isNotNull();
            assertThat(result.getCandidateNarrative()).contains("Unable to synthesize feedback");
            assertThat(result.getRecommendedNextStep()).isEqualTo("Review feedback manually");
            assertThat(result.getCandidateId()).isEqualTo(candidateId);
            assertThat(result.getJobTitle()).isEqualTo("Senior Java Developer");
        }
    }
}
