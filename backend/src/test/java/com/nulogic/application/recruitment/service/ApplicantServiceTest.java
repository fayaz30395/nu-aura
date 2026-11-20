package com.nulogic.application.recruitment.service;

import com.nulogic.api.recruitment.dto.ApplicantPipelineResponse;
import com.nulogic.api.recruitment.dto.ApplicantRequest;
import com.nulogic.api.recruitment.dto.ApplicantResponse;
import com.nulogic.api.recruitment.dto.ApplicantStatusUpdateRequest;
import com.nulogic.common.security.DataScopeService;
import com.nulogic.common.security.TenantContext;
import com.nulogic.common.util.TenantTimeService;
import com.nulogic.domain.recruitment.*;
import com.nulogic.infrastructure.recruitment.repository.ApplicantRepository;
import com.nulogic.infrastructure.recruitment.repository.CandidateRepository;
import com.nulogic.infrastructure.recruitment.repository.JobOpeningRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.jpa.domain.Specification;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("ApplicantService Tests")
class ApplicantServiceTest {

    @Mock
    private ApplicantRepository applicantRepository;

    @Mock
    private CandidateRepository candidateRepository;

    @Mock
    private JobOpeningRepository jobOpeningRepository;

    @Mock
    private DataScopeService dataScopeService;

    @Mock
    private TenantTimeService tenantTimeService;

    @InjectMocks
    private ApplicantService applicantService;

    private Applicant buildApplicant(UUID tenantId, UUID applicantId, UUID candidateId, UUID jobOpeningId, ApplicationStatus status) {
        Applicant applicant = new Applicant();
        applicant.setId(applicantId);
        applicant.setTenantId(tenantId);
        applicant.setCandidateId(candidateId);
        applicant.setJobOpeningId(jobOpeningId);
        applicant.setStatus(status);
        applicant.setAppliedDate(LocalDate.now());
        return applicant;
    }

    private Candidate buildCandidate(UUID tenantId, UUID candidateId, UUID jobOpeningId) {
        Candidate candidate = new Candidate();
        candidate.setId(candidateId);
        candidate.setTenantId(tenantId);
        candidate.setFirstName("Ava");
        candidate.setLastName("Stone");
        candidate.setJobOpeningId(jobOpeningId);
        return candidate;
    }

    private JobOpening buildJobOpening(UUID tenantId, UUID jobOpeningId) {
        JobOpening jobOpening = new JobOpening();
        jobOpening.setId(jobOpeningId);
        jobOpening.setTenantId(tenantId);
        jobOpening.setJobTitle("Senior Engineer");
        return jobOpening;
    }

    @Test
    @DisplayName("Should create applicant successfully")
    void shouldCreateApplicantSuccessfully() {
        UUID tenantId = UUID.randomUUID();
        UUID candidateId = UUID.randomUUID();
        UUID jobOpeningId = UUID.randomUUID();
        UUID applicantId = UUID.randomUUID();

        ApplicantRequest request = new ApplicantRequest();
        request.setCandidateId(candidateId);
        request.setJobOpeningId(jobOpeningId);
        request.setSource(ApplicationSource.WEBSITE);
        request.setNotes("Strong referral");
        request.setExpectedSalary(new BigDecimal("120000"));

        Candidate candidate = buildCandidate(tenantId, candidateId, jobOpeningId);
        JobOpening jobOpening = buildJobOpening(tenantId, jobOpeningId);

        try (MockedStatic<TenantContext> mockedTenantContext = mockStatic(TenantContext.class)) {
            mockedTenantContext.when(TenantContext::getCurrentTenant).thenReturn(tenantId);

            when(applicantRepository.existsByCandidateIdAndJobOpeningIdAndTenantId(candidateId, jobOpeningId, tenantId))
                    .thenReturn(false);
            when(candidateRepository.findByIdAndTenantId(candidateId, tenantId))
                    .thenReturn(Optional.of(candidate));
            when(jobOpeningRepository.findByIdAndTenantId(jobOpeningId, tenantId))
                    .thenReturn(Optional.of(jobOpening));
            when(tenantTimeService.today(any())).thenReturn(LocalDate.now());
            when(applicantRepository.save(any(Applicant.class)))
                    .thenAnswer(invocation -> {
                        Applicant saved = invocation.getArgument(0);
                        saved.setId(applicantId);
                        return saved;
                    });

            ApplicantResponse response = applicantService.createApplicant(request);

            assertThat(response).isNotNull();
            assertThat(response.getStatus()).isEqualTo(ApplicationStatus.APPLIED);
            assertThat(response.getCandidateName()).isEqualTo("Ava Stone");
            assertThat(response.getJobTitle()).isEqualTo("Senior Engineer");
        }
    }

    @Test
    @DisplayName("Should throw exception when applicant already exists")
    void shouldThrowExceptionWhenDuplicateApplication() {
        UUID tenantId = UUID.randomUUID();
        UUID candidateId = UUID.randomUUID();
        UUID jobOpeningId = UUID.randomUUID();

        ApplicantRequest request = new ApplicantRequest();
        request.setCandidateId(candidateId);
        request.setJobOpeningId(jobOpeningId);

        try (MockedStatic<TenantContext> mockedTenantContext = mockStatic(TenantContext.class)) {
            mockedTenantContext.when(TenantContext::getCurrentTenant).thenReturn(tenantId);
            when(applicantRepository.existsByCandidateIdAndJobOpeningIdAndTenantId(candidateId, jobOpeningId, tenantId))
                    .thenReturn(true);

            assertThatThrownBy(() -> applicantService.createApplicant(request))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("Applicant already exists");

            verify(applicantRepository, never()).save(any(Applicant.class));
        }
    }

    @Test
    @DisplayName("Should update status on valid transition")
    void shouldUpdateStatusOnValidTransition() {
        UUID tenantId = UUID.randomUUID();
        UUID applicantId = UUID.randomUUID();
        UUID candidateId = UUID.randomUUID();
        UUID jobOpeningId = UUID.randomUUID();

        Applicant applicant = buildApplicant(tenantId, applicantId, candidateId, jobOpeningId, ApplicationStatus.APPLIED);

        ApplicantStatusUpdateRequest request = new ApplicantStatusUpdateRequest();
        request.setStatus(ApplicationStatus.SCREENING);
        request.setNotes("Screening scheduled");

        try (MockedStatic<TenantContext> mockedTenantContext = mockStatic(TenantContext.class)) {
            mockedTenantContext.when(TenantContext::getCurrentTenant).thenReturn(tenantId);

            when(applicantRepository.findOne(any(Specification.class))).thenReturn(Optional.of(applicant));
            when(applicantRepository.save(any(Applicant.class))).thenAnswer(invocation -> invocation.getArgument(0));
            when(candidateRepository.findById(any(UUID.class))).thenReturn(Optional.empty());
            when(jobOpeningRepository.findById(any(UUID.class))).thenReturn(Optional.empty());

            ApplicantResponse response = applicantService.updateStatus(applicantId, request);

            assertThat(response.getStatus()).isEqualTo(ApplicationStatus.SCREENING);
            assertThat(response.getNotes()).isEqualTo("Screening scheduled");
        }
    }

    @Test
    @DisplayName("Should throw exception on invalid status transition")
    void shouldThrowExceptionOnInvalidTransition() {
        UUID tenantId = UUID.randomUUID();
        UUID applicantId = UUID.randomUUID();
        UUID candidateId = UUID.randomUUID();
        UUID jobOpeningId = UUID.randomUUID();

        Applicant applicant = buildApplicant(tenantId, applicantId, candidateId, jobOpeningId, ApplicationStatus.APPLIED);

        ApplicantStatusUpdateRequest request = new ApplicantStatusUpdateRequest();
        request.setStatus(ApplicationStatus.OFFERED);

        try (MockedStatic<TenantContext> mockedTenantContext = mockStatic(TenantContext.class)) {
            mockedTenantContext.when(TenantContext::getCurrentTenant).thenReturn(tenantId);
            when(applicantRepository.findOne(any(Specification.class))).thenReturn(Optional.of(applicant));

            assertThatThrownBy(() -> applicantService.updateStatus(applicantId, request))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("Invalid status transition");
        }
    }

    @Test
    @DisplayName("Should return pipeline grouped by status")
    void shouldReturnPipelineGroupedByStatus() {
        UUID tenantId = UUID.randomUUID();
        UUID applicantId1 = UUID.randomUUID();
        UUID applicantId2 = UUID.randomUUID();
        UUID candidateId1 = UUID.randomUUID();
        UUID candidateId2 = UUID.randomUUID();
        UUID jobOpeningId = UUID.randomUUID();

        Applicant applicantOne = buildApplicant(tenantId, applicantId1, candidateId1, jobOpeningId, ApplicationStatus.APPLIED);
        Applicant applicantTwo = buildApplicant(tenantId, applicantId2, candidateId2, jobOpeningId, ApplicationStatus.SCREENING);

        try (MockedStatic<TenantContext> mockedTenantContext = mockStatic(TenantContext.class)) {
            mockedTenantContext.when(TenantContext::getCurrentTenant).thenReturn(tenantId);
            when(dataScopeService.getScopeSpecification(anyString()))
                    .thenReturn((root, query, cb) -> cb.conjunction());
            when(applicantRepository.findAll(any(Specification.class)))
                    .thenReturn(List.of(applicantOne, applicantTwo));
            when(candidateRepository.findById(any(UUID.class))).thenReturn(Optional.empty());
            when(jobOpeningRepository.findById(any(UUID.class))).thenReturn(Optional.empty());

            ApplicantPipelineResponse response = applicantService.getPipeline(jobOpeningId);

            assertThat(response).isNotNull();
            Map<ApplicationStatus, List<ApplicantResponse>> pipeline = response.getPipeline();
            assertThat(pipeline.get(ApplicationStatus.APPLIED)).hasSize(1);
            assertThat(pipeline.get(ApplicationStatus.SCREENING)).hasSize(1);
        }
    }

    @Test
    @DisplayName("Should rate applicant with valid rating")
    void shouldRateApplicantWithValidRating() {
        UUID tenantId = UUID.randomUUID();
        UUID applicantId = UUID.randomUUID();
        UUID candidateId = UUID.randomUUID();
        UUID jobOpeningId = UUID.randomUUID();

        Applicant applicant = buildApplicant(tenantId, applicantId, candidateId, jobOpeningId, ApplicationStatus.APPLIED);

        try (MockedStatic<TenantContext> mockedTenantContext = mockStatic(TenantContext.class)) {
            mockedTenantContext.when(TenantContext::getCurrentTenant).thenReturn(tenantId);
            when(applicantRepository.findOne(any(Specification.class))).thenReturn(Optional.of(applicant));
            when(applicantRepository.save(any(Applicant.class))).thenAnswer(invocation -> invocation.getArgument(0));
            when(candidateRepository.findById(any(UUID.class))).thenReturn(Optional.empty());
            when(jobOpeningRepository.findById(any(UUID.class))).thenReturn(Optional.empty());

            ApplicantResponse response = applicantService.rateApplicant(applicantId, 4);

            assertThat(response.getRating()).isEqualTo(4);
        }
    }

    @Test
    @DisplayName("Should reject rating outside 1-5")
    void shouldRejectInvalidRating() {
        UUID tenantId = UUID.randomUUID();
        UUID applicantId = UUID.randomUUID();

        try (MockedStatic<TenantContext> mockedTenantContext = mockStatic(TenantContext.class)) {
            mockedTenantContext.when(TenantContext::getCurrentTenant).thenReturn(tenantId);

            assertThatThrownBy(() -> applicantService.rateApplicant(applicantId, 0))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("Rating must be between 1 and 5");

            assertThatThrownBy(() -> applicantService.rateApplicant(applicantId, 6))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("Rating must be between 1 and 5");

            verify(applicantRepository, never()).save(any(Applicant.class));
        }
    }

    // ---- H-016: candidate sync ----

    private Candidate runStatusChange(ApplicationStatus from, ApplicationStatus to, boolean hasCandidate,
                                      List<Applicant> otherApplicants, Candidate candidate, UUID tenantId) {
        UUID applicantId = UUID.randomUUID();
        UUID candidateId = candidate.getId();
        Applicant applicant = buildApplicant(tenantId, applicantId, hasCandidate ? candidateId : null, UUID.randomUUID(), from);
        ApplicantStatusUpdateRequest request = new ApplicantStatusUpdateRequest();
        request.setStatus(to);
        try (MockedStatic<TenantContext> ctx = mockStatic(TenantContext.class)) {
            ctx.when(TenantContext::getCurrentTenant).thenReturn(tenantId);
            when(applicantRepository.findOne(any(Specification.class))).thenReturn(Optional.of(applicant));
            when(applicantRepository.save(any(Applicant.class))).thenAnswer(i -> i.getArgument(0));
            lenient().when(candidateRepository.findByIdAndTenantId(candidateId, tenantId)).thenReturn(Optional.of(candidate));
            lenient().when(applicantRepository.findByCandidateIdAndTenantId(candidateId, tenantId))
                    .thenReturn(otherApplicants);
            applicantService.updateStatus(applicantId, request);
        }
        return candidate;
    }

    private Candidate newCandidate(UUID tenantId) {
        Candidate c = buildCandidate(tenantId, UUID.randomUUID(), null);
        c.setStatus(Candidate.CandidateStatus.NEW);
        c.setCurrentStage(Candidate.RecruitmentStage.APPLICATION_RECEIVED);
        return c;
    }

    @ParameterizedTest
    @CsvSource({
            "APPLIED,SCREENING,SCREENING,SCREENING",
            "SCREENING,PHONE_SCREEN,SCREENING,RECRUITERS_PHONE_CALL",
            "SCREENING,INTERVIEW,INTERVIEW,INTERVIEW",
            "SCREENING,TECHNICAL_ROUND,INTERVIEW,TECHNICAL_INTERVIEW_SCHEDULED",
            "SCREENING,HR_ROUND,INTERVIEW,INTERVIEW",
            "SCREENING,OFFER_PENDING,SELECTED,OFFER",
            "INTERVIEW,OFFERED,OFFER_EXTENDED,OFFER",
            "OFFERED,ACCEPTED,OFFER_ACCEPTED,OFFER",
            "SCREENING,REJECTED,REJECTED,CANDIDATE_REJECTED"
    })
    @DisplayName("Applicant status change maps onto candidate status and stage")
    void statusChangeSyncsCandidate(ApplicationStatus from, ApplicationStatus to,
                                    Candidate.CandidateStatus expStatus, Candidate.RecruitmentStage expStage) {
        UUID tenantId = UUID.randomUUID();
        Candidate candidate = newCandidate(tenantId);
        runStatusChange(from, to, true, List.of(), candidate, tenantId);
        assertThat(candidate.getStatus()).isEqualTo(expStatus);
        assertThat(candidate.getCurrentStage()).isEqualTo(expStage);
        verify(candidateRepository).save(candidate);
    }

    @Test
    @DisplayName("APPLIED maps to NEW / APPLICATION_RECEIVED")
    void appliedMapsToNew() {
        UUID tenantId = UUID.randomUUID();
        Candidate candidate = newCandidate(tenantId);
        candidate.setStatus(Candidate.CandidateStatus.SCREENING);
        candidate.setCurrentStage(Candidate.RecruitmentStage.SCREENING);
        // APPLIED is never a legal transition target, so call the mapping directly.
        Applicant applicant = buildApplicant(tenantId, UUID.randomUUID(), candidate.getId(), UUID.randomUUID(), ApplicationStatus.APPLIED);
        when(candidateRepository.findByIdAndTenantId(candidate.getId(), tenantId)).thenReturn(Optional.of(candidate));
        org.springframework.test.util.ReflectionTestUtils.invokeMethod(applicantService, "syncCandidate", applicant, ApplicationStatus.APPLIED);
        assertThat(candidate.getStatus()).isEqualTo(Candidate.CandidateStatus.NEW);
        assertThat(candidate.getCurrentStage()).isEqualTo(Candidate.RecruitmentStage.APPLICATION_RECEIVED);
        verify(candidateRepository).save(candidate);
    }

    @Test
    @DisplayName("WITHDRAWN keeps the stage and sets status when no other live application")
    void withdrawnLeavesStage() {
        UUID tenantId = UUID.randomUUID();
        Candidate candidate = newCandidate(tenantId);
        candidate.setCurrentStage(Candidate.RecruitmentStage.SCREENING);
        runStatusChange(ApplicationStatus.SCREENING, ApplicationStatus.WITHDRAWN, true, List.of(), candidate, tenantId);
        assertThat(candidate.getStatus()).isEqualTo(Candidate.CandidateStatus.WITHDRAWN);
        assertThat(candidate.getCurrentStage()).isEqualTo(Candidate.RecruitmentStage.SCREENING);
    }

    @Test
    @DisplayName("Applicant without candidate does not touch candidates")
    void noCandidateNoSave() {
        UUID tenantId = UUID.randomUUID();
        Candidate candidate = newCandidate(tenantId);
        runStatusChange(ApplicationStatus.APPLIED, ApplicationStatus.SCREENING, false, List.of(), candidate, tenantId);
        verify(candidateRepository, never()).save(any(Candidate.class));
        assertThat(candidate.getStatus()).isEqualTo(Candidate.CandidateStatus.NEW);
    }

    @Test
    @DisplayName("REJECTED while a sibling is live: candidate reflects the sibling")
    void rejectedWithOtherLiveApplicationReflectsSibling() {
        UUID tenantId = UUID.randomUUID();
        Candidate candidate = newCandidate(tenantId);
        Applicant other = buildApplicant(tenantId, UUID.randomUUID(), candidate.getId(), UUID.randomUUID(), ApplicationStatus.INTERVIEW);
        runStatusChange(ApplicationStatus.SCREENING, ApplicationStatus.REJECTED, true, List.of(other), candidate, tenantId);
        assertThat(candidate.getStatus()).isEqualTo(Candidate.CandidateStatus.INTERVIEW);
        assertThat(candidate.getCurrentStage()).isEqualTo(Candidate.RecruitmentStage.INTERVIEW);
    }

    @Test
    @DisplayName("WITHDRAWN while a sibling is live: candidate keeps the sibling mapping, no save")
    void withdrawnWithLiveSiblingUnchanged() {
        UUID tenantId = UUID.randomUUID();
        Candidate candidate = newCandidate(tenantId);
        candidate.setStatus(Candidate.CandidateStatus.OFFER_EXTENDED);
        candidate.setCurrentStage(Candidate.RecruitmentStage.OFFER);
        Applicant other = buildApplicant(tenantId, UUID.randomUUID(), candidate.getId(), UUID.randomUUID(), ApplicationStatus.OFFERED);
        runStatusChange(ApplicationStatus.SCREENING, ApplicationStatus.WITHDRAWN, true, List.of(other), candidate, tenantId);
        assertThat(candidate.getStatus()).isEqualTo(Candidate.CandidateStatus.OFFER_EXTENDED);
        assertThat(candidate.getCurrentStage()).isEqualTo(Candidate.RecruitmentStage.OFFER);
        verify(candidateRepository, never()).save(any(Candidate.class));
    }

    @Test
    @DisplayName("Moving a lagging application does not drag an ACCEPTED candidate backwards")
    void laggingApplicationDoesNotDragBack() {
        UUID tenantId = UUID.randomUUID();
        Candidate candidate = newCandidate(tenantId);
        candidate.setStatus(Candidate.CandidateStatus.OFFER_ACCEPTED);
        candidate.setCurrentStage(Candidate.RecruitmentStage.OFFER);
        Applicant a = buildApplicant(tenantId, UUID.randomUUID(), candidate.getId(), UUID.randomUUID(), ApplicationStatus.ACCEPTED);
        runStatusChange(ApplicationStatus.APPLIED, ApplicationStatus.SCREENING, true, List.of(a), candidate, tenantId);
        assertThat(candidate.getStatus()).isEqualTo(Candidate.CandidateStatus.OFFER_ACCEPTED);
        assertThat(candidate.getCurrentStage()).isEqualTo(Candidate.RecruitmentStage.OFFER);
        verify(candidateRepository, never()).save(any(Candidate.class));
    }

    @Test
    @DisplayName("Moving ahead of a sibling advances the candidate")
    void aheadOfSiblingAdvancesCandidate() {
        UUID tenantId = UUID.randomUUID();
        Candidate candidate = newCandidate(tenantId);
        candidate.setStatus(Candidate.CandidateStatus.INTERVIEW);
        candidate.setCurrentStage(Candidate.RecruitmentStage.INTERVIEW);
        Applicant a = buildApplicant(tenantId, UUID.randomUUID(), candidate.getId(), UUID.randomUUID(), ApplicationStatus.INTERVIEW);
        runStatusChange(ApplicationStatus.INTERVIEW, ApplicationStatus.OFFERED, true, List.of(a), candidate, tenantId);
        assertThat(candidate.getStatus()).isEqualTo(Candidate.CandidateStatus.OFFER_EXTENDED);
        assertThat(candidate.getCurrentStage()).isEqualTo(Candidate.RecruitmentStage.OFFER);
        verify(candidateRepository).save(candidate);
    }

    @Test
    @DisplayName("All applications terminal, last one WITHDRAWN: candidate WITHDRAWN, stage unchanged")
    void allTerminalLastWithdrawn() {
        UUID tenantId = UUID.randomUUID();
        Candidate candidate = newCandidate(tenantId);
        candidate.setCurrentStage(Candidate.RecruitmentStage.SCREENING);
        Applicant a = buildApplicant(tenantId, UUID.randomUUID(), candidate.getId(), UUID.randomUUID(), ApplicationStatus.REJECTED);
        runStatusChange(ApplicationStatus.SCREENING, ApplicationStatus.WITHDRAWN, true, List.of(a), candidate, tenantId);
        assertThat(candidate.getStatus()).isEqualTo(Candidate.CandidateStatus.WITHDRAWN);
        assertThat(candidate.getCurrentStage()).isEqualTo(Candidate.RecruitmentStage.SCREENING);
    }

    @Test
    @DisplayName("REJECTED when other applications are terminal marks candidate rejected")
    void rejectedWithOnlyTerminalOthers() {
        UUID tenantId = UUID.randomUUID();
        Candidate candidate = newCandidate(tenantId);
        Applicant other = buildApplicant(tenantId, UUID.randomUUID(), candidate.getId(), UUID.randomUUID(), ApplicationStatus.WITHDRAWN);
        runStatusChange(ApplicationStatus.SCREENING, ApplicationStatus.REJECTED, true, List.of(other), candidate, tenantId);
        assertThat(candidate.getStatus()).isEqualTo(Candidate.CandidateStatus.REJECTED);
        assertThat(candidate.getCurrentStage()).isEqualTo(Candidate.RecruitmentStage.CANDIDATE_REJECTED);
    }

    @Test
    @DisplayName("Unchanged status does not touch candidate")
    void unchangedStatusNoSave() {
        UUID tenantId = UUID.randomUUID();
        Candidate candidate = newCandidate(tenantId);
        candidate.setStatus(Candidate.CandidateStatus.INTERVIEW);
        runStatusChange(ApplicationStatus.INTERVIEW, ApplicationStatus.INTERVIEW, true, List.of(), candidate, tenantId);
        verify(candidateRepository, never()).save(any(Candidate.class));
        assertThat(candidate.getStatus()).isEqualTo(Candidate.CandidateStatus.INTERVIEW);
    }
}
