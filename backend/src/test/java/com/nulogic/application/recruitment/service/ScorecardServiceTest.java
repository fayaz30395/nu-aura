package com.nulogic.application.recruitment.service;

import com.nulogic.api.recruitment.dto.ScorecardSubmissionRequest;
import com.nulogic.api.recruitment.dto.ScorecardSubmissionResponse;
import com.nulogic.api.recruitment.dto.ScorecardTemplateRequest;
import com.nulogic.api.recruitment.dto.ScorecardTemplateResponse;
import com.nulogic.common.security.SecurityContext;
import com.nulogic.common.security.TenantContext;
import com.nulogic.common.util.TenantTimeService;
import com.nulogic.domain.recruitment.Applicant;
import com.nulogic.domain.recruitment.Interview;
import com.nulogic.domain.recruitment.InterviewScorecard;
import com.nulogic.domain.recruitment.ScorecardTemplate;
import com.nulogic.infrastructure.recruitment.repository.ApplicantRepository;
import com.nulogic.infrastructure.recruitment.repository.InterviewRepository;
import com.nulogic.infrastructure.recruitment.repository.InterviewScorecardRepository;
import com.nulogic.infrastructure.recruitment.repository.ScorecardTemplateCriterionRepository;
import com.nulogic.infrastructure.recruitment.repository.ScorecardTemplateRepository;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@MockitoSettings(strictness = Strictness.LENIENT)
@ExtendWith(MockitoExtension.class)
@DisplayName("ScorecardService Tests")
class ScorecardServiceTest {

    private static MockedStatic<TenantContext> tenantContextMock;
    private static MockedStatic<SecurityContext> securityContextMock;

    @Mock
    private ScorecardTemplateRepository templateRepository;
    @Mock
    private ScorecardTemplateCriterionRepository criterionRepository;
    @Mock
    private InterviewScorecardRepository scorecardRepository;
    @Mock
    private TenantTimeService tenantTimeService;
    @Mock
    private InterviewRepository interviewRepository;
    @Mock
    private ApplicantRepository applicantRepository;
    @InjectMocks
    private ScorecardService scorecardService;

    private UUID tenantId;
    private UUID interviewerId;
    private LocalDateTime now;

    @BeforeAll
    static void setUpClass() {
        tenantContextMock = mockStatic(TenantContext.class);
        securityContextMock = mockStatic(SecurityContext.class);
    }

    @AfterAll
    static void tearDownClass() {
        tenantContextMock.close();
        securityContextMock.close();
    }

    @BeforeEach
    void setUp() {
        tenantId = UUID.randomUUID();
        interviewerId = UUID.randomUUID();
        now = LocalDateTime.of(2025, 6, 1, 9, 0);

        tenantContextMock.when(TenantContext::getCurrentTenant).thenReturn(tenantId);
        tenantContextMock.when(TenantContext::requireCurrentTenant).thenReturn(tenantId);
        securityContextMock.when(SecurityContext::getCurrentEmployeeId).thenReturn(interviewerId);
        lenient().when(tenantTimeService.now(any(UUID.class))).thenReturn(now);
    }

    @Nested
    @DisplayName("Create Template")
    class CreateTemplateTests {

        @Test
        @DisplayName("Should create a template and return it with its generated ID")
        void shouldCreateTemplate() {
            UUID templateId = UUID.randomUUID();
            ScorecardTemplate saved = ScorecardTemplate.builder()
                    .tenantId(tenantId)
                    .name("Engineering Loop")
                    .isDefault(false)
                    .build();
            saved.setId(templateId);

            when(templateRepository.save(any(ScorecardTemplate.class))).thenReturn(saved);
            when(templateRepository.findByIdAndTenantId(templateId, tenantId)).thenReturn(Optional.of(saved));
            when(criterionRepository.findByTemplateIdOrderByOrderIndexAsc(templateId)).thenReturn(List.of());

            ScorecardTemplateRequest request = new ScorecardTemplateRequest();
            request.setName("Engineering Loop");
            request.setIsDefault(false);

            ScorecardTemplateResponse result = scorecardService.createTemplate(request);

            assertThat(result.getId()).isEqualTo(templateId);
            assertThat(result.getName()).isEqualTo("Engineering Loop");
            assertThat(result.getIsDefault()).isFalse();
        }

        @Test
        @DisplayName("Should default isDefault to false when not supplied")
        void shouldDefaultIsDefaultToFalse() {
            UUID templateId = UUID.randomUUID();
            ScorecardTemplate saved = ScorecardTemplate.builder()
                    .tenantId(tenantId)
                    .name("Behavioral")
                    .isDefault(false)
                    .build();
            saved.setId(templateId);

            when(templateRepository.save(any(ScorecardTemplate.class))).thenReturn(saved);
            when(templateRepository.findByIdAndTenantId(templateId, tenantId)).thenReturn(Optional.of(saved));
            when(criterionRepository.findByTemplateIdOrderByOrderIndexAsc(templateId)).thenReturn(List.of());

            ScorecardTemplateRequest request = new ScorecardTemplateRequest();
            request.setName("Behavioral");

            ScorecardTemplateResponse result = scorecardService.createTemplate(request);

            assertThat(result.getIsDefault()).isFalse();
        }
    }

    @Nested
    @DisplayName("Submit Scorecard")
    class SubmitScorecardTests {

        private Interview interview(UUID interviewId, UUID assignedInterviewer, UUID candidateId, UUID jobId) {
            Interview i = new Interview();
            i.setId(interviewId);
            i.setTenantId(tenantId);
            i.setInterviewerId(assignedInterviewer);
            i.setCandidateId(candidateId);
            i.setJobOpeningId(jobId);
            return i;
        }

        private ScorecardSubmissionRequest request(UUID interviewId, UUID applicantId, UUID jobId) {
            ScorecardSubmissionRequest request = new ScorecardSubmissionRequest();
            request.setInterviewId(interviewId);
            request.setApplicantId(applicantId);
            request.setJobOpeningId(jobId);
            request.setOverallRating(4);
            request.setRecommendation(InterviewScorecard.Recommendation.YES);
            return request;
        }

        @Test
        @DisplayName("Should submit a scorecard with the current interviewer stamped as submitter")
        void shouldSubmitScorecard() {
            UUID interviewId = UUID.randomUUID();
            UUID candidateId = UUID.randomUUID();
            UUID jobId = UUID.randomUUID();
            UUID applicantId = UUID.randomUUID();
            Applicant applicant = new Applicant();
            applicant.setTenantId(tenantId);
            applicant.setCandidateId(candidateId);
            when(interviewRepository.findByIdAndTenantId(interviewId, tenantId))
                    .thenReturn(Optional.of(interview(interviewId, interviewerId, candidateId, jobId)));
            when(applicantRepository.findById(applicantId)).thenReturn(Optional.of(applicant));
            when(scorecardRepository.findByTenantIdAndInterviewId(tenantId, interviewId)).thenReturn(List.of());
            when(scorecardRepository.save(any(InterviewScorecard.class)))
                    .thenAnswer(inv -> {
                        InterviewScorecard sc = inv.getArgument(0);
                        sc.setId(UUID.randomUUID());
                        return sc;
                    });

            ScorecardSubmissionResponse result =
                    scorecardService.submitScorecard(null, request(interviewId, applicantId, jobId));

            assertThat(result.getInterviewId()).isEqualTo(interviewId);
            assertThat(result.getInterviewerId()).isEqualTo(interviewerId);
            assertThat(result.getStatus()).isEqualTo(InterviewScorecard.ScorecardStatus.SUBMITTED);
            assertThat(result.getSubmittedAt()).isEqualTo(now);
        }

        @Test
        @DisplayName("Should reject an interview that is not in the tenant, saving nothing")
        void shouldRejectForeignTenantInterview() {
            UUID interviewId = UUID.randomUUID();
            when(interviewRepository.findByIdAndTenantId(interviewId, tenantId)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> scorecardService.submitScorecard(null, request(interviewId, null, null)))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("Interview not found");
            verify(scorecardRepository, never()).save(any());
        }

        @Test
        @DisplayName("Should reject a caller who is not the assigned interviewer, saving nothing")
        void shouldRejectNonInterviewer() {
            UUID interviewId = UUID.randomUUID();
            when(interviewRepository.findByIdAndTenantId(interviewId, tenantId))
                    .thenReturn(Optional.of(interview(interviewId, UUID.randomUUID(), UUID.randomUUID(), null)));

            assertThatThrownBy(() -> scorecardService.submitScorecard(null, request(interviewId, null, null)))
                    .isInstanceOf(AccessDeniedException.class);
            verify(scorecardRepository, never()).save(any());
        }

        @Test
        @DisplayName("Should reject an applicant from another tenant or another candidate")
        void shouldRejectMismatchedApplicant() {
            UUID interviewId = UUID.randomUUID();
            UUID candidateId = UUID.randomUUID();
            UUID applicantId = UUID.randomUUID();
            when(interviewRepository.findByIdAndTenantId(interviewId, tenantId))
                    .thenReturn(Optional.of(interview(interviewId, interviewerId, candidateId, null)));
            Applicant foreign = new Applicant();
            foreign.setTenantId(UUID.randomUUID());
            foreign.setCandidateId(candidateId);
            when(applicantRepository.findById(applicantId)).thenReturn(Optional.of(foreign));

            assertThatThrownBy(() -> scorecardService.submitScorecard(null, request(interviewId, applicantId, null)))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("Applicant not found");

            Applicant other = new Applicant();
            other.setTenantId(tenantId);
            other.setCandidateId(UUID.randomUUID());
            when(applicantRepository.findById(applicantId)).thenReturn(Optional.of(other));
            assertThatThrownBy(() -> scorecardService.submitScorecard(null, request(interviewId, applicantId, null)))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("does not match");
            verify(scorecardRepository, never()).save(any());
        }

        @Test
        @DisplayName("Should reject a job opening that differs from the interview's")
        void shouldRejectMismatchedJob() {
            UUID interviewId = UUID.randomUUID();
            when(interviewRepository.findByIdAndTenantId(interviewId, tenantId))
                    .thenReturn(Optional.of(interview(interviewId, interviewerId, UUID.randomUUID(), UUID.randomUUID())));

            assertThatThrownBy(() -> scorecardService.submitScorecard(null,
                    request(interviewId, null, UUID.randomUUID())))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("Job opening");
            verify(scorecardRepository, never()).save(any());
        }

        @Test
        @DisplayName("Should block a duplicate submission by the same interviewer")
        void shouldBlockDuplicate() {
            UUID interviewId = UUID.randomUUID();
            when(interviewRepository.findByIdAndTenantId(interviewId, tenantId))
                    .thenReturn(Optional.of(interview(interviewId, interviewerId, UUID.randomUUID(), null)));
            InterviewScorecard existing = InterviewScorecard.builder()
                    .interviewerId(interviewerId)
                    .status(InterviewScorecard.ScorecardStatus.SUBMITTED)
                    .build();
            when(scorecardRepository.findByTenantIdAndInterviewId(tenantId, interviewId))
                    .thenReturn(List.of(existing));

            assertThatThrownBy(() -> scorecardService.submitScorecard(null, request(interviewId, null, null)))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("already submitted");
            verify(scorecardRepository, never()).save(any());
        }

        @Test
        @DisplayName("Should throw when the referenced template does not exist")
        void shouldThrowWhenTemplateMissing() {
            UUID missingTemplateId = UUID.randomUUID();
            when(templateRepository.findByIdAndTenantId(missingTemplateId, tenantId))
                    .thenReturn(Optional.empty());

            ScorecardSubmissionRequest request = new ScorecardSubmissionRequest();
            request.setInterviewId(UUID.randomUUID());

            assertThatThrownBy(() -> scorecardService.submitScorecard(missingTemplateId, request))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("Scorecard template not found");
        }
    }
}
