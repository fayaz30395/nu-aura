package com.hrms.application.recruitment.service;

import com.hrms.api.recruitment.dto.ApplicantPipelineResponse;
import com.hrms.api.recruitment.dto.ApplicantRequest;
import com.hrms.api.recruitment.dto.ApplicantResponse;
import com.hrms.api.recruitment.dto.ApplicantStatusUpdateRequest;
import com.hrms.common.security.DataScopeService;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.recruitment.Applicant;
import com.hrms.domain.recruitment.ApplicationSource;
import com.hrms.domain.recruitment.ApplicationStatus;
import com.hrms.domain.recruitment.Candidate;
import com.hrms.domain.recruitment.JobOpening;
import com.hrms.infrastructure.recruitment.repository.ApplicantRepository;
import com.hrms.infrastructure.recruitment.repository.CandidateRepository;
import com.hrms.infrastructure.recruitment.repository.JobOpeningRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
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
}
