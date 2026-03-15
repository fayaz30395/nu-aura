package com.hrms.application.recruitment.service;

import com.hrms.api.recruitment.dto.ApplicantPipelineResponse;
import com.hrms.api.recruitment.dto.ApplicantRequest;
import com.hrms.api.recruitment.dto.ApplicantResponse;
import com.hrms.api.recruitment.dto.ApplicantStatusUpdateRequest;
import com.hrms.common.security.DataScopeService;
import com.hrms.common.security.Permission;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.recruitment.Applicant;
import com.hrms.domain.recruitment.ApplicationStatus;
import com.hrms.domain.recruitment.Candidate;
import com.hrms.domain.recruitment.JobOpening;
import com.hrms.infrastructure.recruitment.repository.ApplicantRepository;
import com.hrms.infrastructure.recruitment.repository.CandidateRepository;
import com.hrms.infrastructure.recruitment.repository.JobOpeningRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class ApplicantService {

    private static final Map<ApplicationStatus, Set<ApplicationStatus>> ALLOWED_TRANSITIONS = Map.ofEntries(
            Map.entry(ApplicationStatus.APPLIED, Set.of(ApplicationStatus.SCREENING, ApplicationStatus.REJECTED, ApplicationStatus.WITHDRAWN)),
            Map.entry(ApplicationStatus.SCREENING, Set.of(ApplicationStatus.PHONE_SCREEN, ApplicationStatus.INTERVIEW, ApplicationStatus.TECHNICAL_ROUND,
                    ApplicationStatus.HR_ROUND, ApplicationStatus.OFFER_PENDING, ApplicationStatus.REJECTED, ApplicationStatus.WITHDRAWN)),
            Map.entry(ApplicationStatus.PHONE_SCREEN, Set.of(ApplicationStatus.INTERVIEW, ApplicationStatus.TECHNICAL_ROUND, ApplicationStatus.HR_ROUND,
                    ApplicationStatus.OFFER_PENDING, ApplicationStatus.REJECTED, ApplicationStatus.WITHDRAWN)),
            Map.entry(ApplicationStatus.INTERVIEW, Set.of(ApplicationStatus.TECHNICAL_ROUND, ApplicationStatus.HR_ROUND, ApplicationStatus.OFFER_PENDING,
                    ApplicationStatus.OFFERED, ApplicationStatus.REJECTED, ApplicationStatus.WITHDRAWN)),
            Map.entry(ApplicationStatus.TECHNICAL_ROUND, Set.of(ApplicationStatus.HR_ROUND, ApplicationStatus.OFFER_PENDING, ApplicationStatus.OFFERED,
                    ApplicationStatus.REJECTED, ApplicationStatus.WITHDRAWN)),
            Map.entry(ApplicationStatus.HR_ROUND, Set.of(ApplicationStatus.OFFER_PENDING, ApplicationStatus.OFFERED, ApplicationStatus.REJECTED,
                    ApplicationStatus.WITHDRAWN)),
            Map.entry(ApplicationStatus.OFFER_PENDING, Set.of(ApplicationStatus.OFFERED, ApplicationStatus.REJECTED, ApplicationStatus.WITHDRAWN)),
            Map.entry(ApplicationStatus.OFFERED, Set.of(ApplicationStatus.ACCEPTED, ApplicationStatus.REJECTED, ApplicationStatus.WITHDRAWN)),
            Map.entry(ApplicationStatus.ACCEPTED, Set.of(ApplicationStatus.ACCEPTED)),
            Map.entry(ApplicationStatus.REJECTED, Set.of(ApplicationStatus.REJECTED)),
            Map.entry(ApplicationStatus.WITHDRAWN, Set.of(ApplicationStatus.WITHDRAWN))
    );

    private final ApplicantRepository applicantRepository;
    private final CandidateRepository candidateRepository;
    private final JobOpeningRepository jobOpeningRepository;
    private final DataScopeService dataScopeService;

    @Transactional
    public ApplicantResponse createApplicant(ApplicantRequest request) {
        UUID tenantId = TenantContext.getCurrentTenant();
        log.info("Creating applicant for candidate {} and job opening {} for tenant {}",
                request.getCandidateId(), request.getJobOpeningId(), tenantId);

        if (request.getCandidateId() == null || request.getJobOpeningId() == null) {
            throw new IllegalArgumentException("Candidate ID and Job Opening ID are required");
        }

        if (applicantRepository.existsByCandidateIdAndJobOpeningIdAndTenantId(
                request.getCandidateId(), request.getJobOpeningId(), tenantId)) {
            throw new IllegalArgumentException("Applicant already exists for this candidate and job opening");
        }

        Candidate candidate = candidateRepository.findByIdAndTenantId(request.getCandidateId(), tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Candidate not found"));

        JobOpening jobOpening = jobOpeningRepository.findByIdAndTenantId(request.getJobOpeningId(), tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Job opening not found"));

        if (candidate.getJobOpeningId() != null && !candidate.getJobOpeningId().equals(request.getJobOpeningId())) {
            throw new IllegalArgumentException("Candidate is not associated with the specified job opening");
        }

        Applicant applicant = new Applicant();
        applicant.setCandidateId(request.getCandidateId());
        applicant.setJobOpeningId(request.getJobOpeningId());
        applicant.setTenantId(tenantId);
        applicant.setStatus(ApplicationStatus.APPLIED);
        applicant.setSource(request.getSource());
        applicant.setNotes(request.getNotes());
        applicant.setExpectedSalary(request.getExpectedSalary());
        applicant.setAppliedDate(LocalDate.now());
        applicant.setCurrentStageEnteredAt(LocalDateTime.now());

        Applicant savedApplicant = applicantRepository.save(applicant);
        return mapToApplicantResponse(savedApplicant, candidate, jobOpening);
    }

    @Transactional(readOnly = true)
    public ApplicantResponse getApplicant(UUID id) {
        Applicant applicant = getApplicantByIdAndScope(id);
        return mapToApplicantResponse(applicant);
    }

    @Transactional(readOnly = true)
    public Page<ApplicantResponse> listApplicants(UUID jobOpeningId, ApplicationStatus status, Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenant();

        Specification<Applicant> spec = Specification.where(tenantSpec(tenantId))
                .and(scopeSpec())
                .and(jobOpeningId != null ? jobOpeningSpec(jobOpeningId) : null)
                .and(status != null ? statusSpec(status) : null);

        return applicantRepository.findAll(spec, pageable)
                .map(this::mapToApplicantResponse);
    }

    @Transactional
    public ApplicantResponse updateStatus(UUID id, ApplicantStatusUpdateRequest request) {
        Applicant applicant = getApplicantByIdAndTenant(id);
        ApplicationStatus newStatus = request.getStatus();

        if (newStatus == null) {
            throw new IllegalArgumentException("Status is required");
        }

        ApplicationStatus currentStatus = applicant.getStatus();
        if (!isValidTransition(currentStatus, newStatus)) {
            throw new IllegalStateException("Invalid status transition from " + currentStatus + " to " + newStatus);
        }

        if (currentStatus != newStatus) {
            applicant.setStatus(newStatus);
            applicant.setCurrentStageEnteredAt(LocalDateTime.now());
        }

        if (request.getNotes() != null) {
            applicant.setNotes(request.getNotes());
        }

        if (newStatus == ApplicationStatus.REJECTED || newStatus == ApplicationStatus.WITHDRAWN) {
            applicant.setRejectionReason(request.getRejectionReason());
        } else if (request.getRejectionReason() != null) {
            applicant.setRejectionReason(request.getRejectionReason());
        } else {
            applicant.setRejectionReason(null);
        }

        Applicant updatedApplicant = applicantRepository.save(applicant);
        return mapToApplicantResponse(updatedApplicant);
    }

    @Transactional(readOnly = true)
    public ApplicantPipelineResponse getPipeline(UUID jobOpeningId) {
        UUID tenantId = TenantContext.getCurrentTenant();

        Specification<Applicant> spec = Specification.where(tenantSpec(tenantId))
                .and(scopeSpec())
                .and(jobOpeningSpec(jobOpeningId));

        List<ApplicantResponse> applicants = applicantRepository.findAll(spec).stream()
                .map(this::mapToApplicantResponse)
                .toList();

        Map<ApplicationStatus, List<ApplicantResponse>> pipeline = new EnumMap<>(ApplicationStatus.class);
        for (ApplicationStatus status : ApplicationStatus.values()) {
            pipeline.put(status, new ArrayList<>());
        }
        for (ApplicantResponse applicant : applicants) {
            if (applicant.getStatus() != null) {
                pipeline.get(applicant.getStatus()).add(applicant);
            }
        }

        return ApplicantPipelineResponse.builder()
                .pipeline(pipeline)
                .build();
    }

    public ApplicantResponse rateApplicant(UUID id, Integer rating) {
        if (rating == null || rating < 1 || rating > 5) {
            throw new IllegalArgumentException("Rating must be between 1 and 5");
        }

        Applicant applicant = getApplicantByIdAndTenant(id);
        applicant.setRating(rating);
        Applicant updatedApplicant = applicantRepository.save(applicant);
        return mapToApplicantResponse(updatedApplicant);
    }

    @Transactional(readOnly = true)
    public List<ApplicantResponse> getApplicantsByCandidate(UUID candidateId) {
        UUID tenantId = TenantContext.getCurrentTenant();

        Specification<Applicant> spec = Specification.where(tenantSpec(tenantId))
                .and(scopeSpec())
                .and(candidateSpec(candidateId));

        return applicantRepository.findAll(spec).stream()
                .map(this::mapToApplicantResponse)
                .toList();
    }

    @Transactional
    public void deleteApplicant(UUID id) {
        Applicant applicant = getApplicantByIdAndTenant(id);
        applicantRepository.delete(applicant);
    }

    private Applicant getApplicantByIdAndTenant(UUID id) {
        UUID tenantId = TenantContext.getCurrentTenant();
        Specification<Applicant> spec = Specification.where(tenantSpec(tenantId))
                .and(idSpec(id));

        return applicantRepository.findOne(spec)
                .orElseThrow(() -> new IllegalArgumentException("Applicant not found"));
    }

    private Applicant getApplicantByIdAndScope(UUID id) {
        UUID tenantId = TenantContext.getCurrentTenant();
        Specification<Applicant> spec = Specification.where(tenantSpec(tenantId))
                .and(idSpec(id))
                .and(scopeSpec());

        return applicantRepository.findOne(spec)
                .orElseThrow(() -> new IllegalArgumentException("Applicant not found"));
    }

    private Specification<Applicant> tenantSpec(UUID tenantId) {
        return (root, query, cb) -> cb.equal(root.get("tenantId"), tenantId);
    }

    private Specification<Applicant> idSpec(UUID id) {
        return (root, query, cb) -> cb.equal(root.get("id"), id);
    }

    private Specification<Applicant> jobOpeningSpec(UUID jobOpeningId) {
        return (root, query, cb) -> cb.equal(root.get("jobOpeningId"), jobOpeningId);
    }

    private Specification<Applicant> candidateSpec(UUID candidateId) {
        return (root, query, cb) -> cb.equal(root.get("candidateId"), candidateId);
    }

    private Specification<Applicant> statusSpec(ApplicationStatus status) {
        return (root, query, cb) -> cb.equal(root.get("status"), status);
    }

    private Specification<Applicant> scopeSpec() {
        return dataScopeService.getScopeSpecification(Permission.RECRUITMENT_VIEW_ALL);
    }

    private boolean isValidTransition(ApplicationStatus currentStatus, ApplicationStatus newStatus) {
        if (currentStatus == null || currentStatus == newStatus) {
            return true;
        }
        Set<ApplicationStatus> allowed = ALLOWED_TRANSITIONS.getOrDefault(currentStatus, Set.of());
        return allowed.contains(newStatus);
    }

    private ApplicantResponse mapToApplicantResponse(Applicant applicant) {
        return mapToApplicantResponse(applicant, null, null);
    }

    private ApplicantResponse mapToApplicantResponse(Applicant applicant, Candidate candidate, JobOpening jobOpening) {
        Candidate resolvedCandidate = candidate;
        if (resolvedCandidate == null) {
            resolvedCandidate = candidateRepository.findById(applicant.getCandidateId()).orElse(null);
        }

        JobOpening resolvedJobOpening = jobOpening;
        if (resolvedJobOpening == null) {
            resolvedJobOpening = jobOpeningRepository.findById(applicant.getJobOpeningId()).orElse(null);
        }

        String candidateName = resolvedCandidate != null ? resolvedCandidate.getFullName() : null;
        String jobTitle = resolvedJobOpening != null ? resolvedJobOpening.getJobTitle() : null;

        return ApplicantResponse.builder()
                .id(applicant.getId())
                .tenantId(applicant.getTenantId())
                .candidateId(applicant.getCandidateId())
                .jobOpeningId(applicant.getJobOpeningId())
                .status(applicant.getStatus())
                .source(applicant.getSource())
                .appliedDate(applicant.getAppliedDate())
                .currentStageEnteredAt(applicant.getCurrentStageEnteredAt())
                .notes(applicant.getNotes())
                .rating(applicant.getRating())
                .resumeFileId(applicant.getResumeFileId())
                .rejectionReason(applicant.getRejectionReason())
                .offeredSalary(applicant.getOfferedSalary())
                .expectedSalary(applicant.getExpectedSalary())
                .candidateName(candidateName)
                .jobTitle(jobTitle)
                .createdAt(applicant.getCreatedAt())
                .updatedAt(applicant.getUpdatedAt())
                .createdBy(applicant.getCreatedBy())
                .lastModifiedBy(applicant.getLastModifiedBy())
                .version(applicant.getVersion())
                .build();
    }
}
