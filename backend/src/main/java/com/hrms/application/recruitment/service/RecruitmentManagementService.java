package com.hrms.application.recruitment.service;

import com.hrms.api.recruitment.dto.*;
import com.hrms.domain.employee.Employee;
import com.hrms.domain.recruitment.*;
import com.hrms.domain.user.RoleScope;
import com.hrms.infrastructure.employee.repository.EmployeeRepository;
import com.hrms.infrastructure.recruitment.repository.*;
import com.hrms.common.security.DataScopeService;
import com.hrms.common.security.Permission;
import com.hrms.common.security.SecurityContext;
import com.hrms.common.security.TenantContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class RecruitmentManagementService {

    private final JobOpeningRepository jobOpeningRepository;
    private final CandidateRepository candidateRepository;
    private final InterviewRepository interviewRepository;
    private final EmployeeRepository employeeRepository;
    private final DataScopeService dataScopeService;

    // ==================== Job Opening Operations ====================

    public JobOpeningResponse createJobOpening(JobOpeningRequest request) {
        UUID tenantId = TenantContext.getCurrentTenant();
        log.info("Creating job opening {} for tenant {}", request.getJobCode(), tenantId);

        if (jobOpeningRepository.existsByTenantIdAndJobCode(tenantId, request.getJobCode())) {
            throw new IllegalArgumentException("Job opening with code " + request.getJobCode() + " already exists");
        }

        JobOpening jobOpening = new JobOpening();
        jobOpening.setId(UUID.randomUUID());
        jobOpening.setTenantId(tenantId);
        jobOpening.setJobCode(request.getJobCode());
        jobOpening.setJobTitle(request.getJobTitle());
        jobOpening.setDepartmentId(request.getDepartmentId());
        jobOpening.setLocation(request.getLocation());
        jobOpening.setEmploymentType(request.getEmploymentType());
        jobOpening.setExperienceRequired(request.getExperienceRequired());
        jobOpening.setMinSalary(request.getMinSalary());
        jobOpening.setMaxSalary(request.getMaxSalary());
        jobOpening.setNumberOfOpenings(request.getNumberOfOpenings());
        jobOpening.setJobDescription(request.getJobDescription());
        jobOpening.setRequirements(request.getRequirements());
        jobOpening.setSkillsRequired(request.getSkillsRequired());
        jobOpening.setHiringManagerId(request.getHiringManagerId());
        jobOpening.setStatus(request.getStatus() != null ? request.getStatus() : JobOpening.JobStatus.DRAFT);
        jobOpening.setPostedDate(request.getPostedDate());
        jobOpening.setClosingDate(request.getClosingDate());
        jobOpening.setPriority(request.getPriority());
        jobOpening.setIsActive(request.getIsActive() != null ? request.getIsActive() : true);

        JobOpening savedJobOpening = jobOpeningRepository.save(jobOpening);
        return mapToJobOpeningResponse(savedJobOpening);
    }

    public JobOpeningResponse updateJobOpening(UUID jobOpeningId, JobOpeningRequest request) {
        UUID tenantId = TenantContext.getCurrentTenant();
        log.info("Updating job opening {} for tenant {}", jobOpeningId, tenantId);

        JobOpening jobOpening = jobOpeningRepository.findByIdAndTenantId(jobOpeningId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Job opening not found"));

        jobOpening.setJobTitle(request.getJobTitle());
        jobOpening.setDepartmentId(request.getDepartmentId());
        jobOpening.setLocation(request.getLocation());
        jobOpening.setEmploymentType(request.getEmploymentType());
        jobOpening.setExperienceRequired(request.getExperienceRequired());
        jobOpening.setMinSalary(request.getMinSalary());
        jobOpening.setMaxSalary(request.getMaxSalary());
        jobOpening.setNumberOfOpenings(request.getNumberOfOpenings());
        jobOpening.setJobDescription(request.getJobDescription());
        jobOpening.setRequirements(request.getRequirements());
        jobOpening.setSkillsRequired(request.getSkillsRequired());
        jobOpening.setHiringManagerId(request.getHiringManagerId());
        jobOpening.setStatus(request.getStatus());
        jobOpening.setPostedDate(request.getPostedDate());
        jobOpening.setClosingDate(request.getClosingDate());
        jobOpening.setPriority(request.getPriority());
        jobOpening.setIsActive(request.getIsActive());

        JobOpening updatedJobOpening = jobOpeningRepository.save(jobOpening);
        return mapToJobOpeningResponse(updatedJobOpening);
    }

    @Transactional(readOnly = true)
    public JobOpeningResponse getJobOpeningById(UUID jobOpeningId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        JobOpening jobOpening = jobOpeningRepository.findByIdAndTenantId(jobOpeningId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Job opening not found"));

        // Enforce scope: validate the user can access this job opening
        String permission = determineViewPermission();
        validateJobOpeningAccess(jobOpening, permission);

        return mapToJobOpeningResponse(jobOpening);
    }

    @Transactional(readOnly = true)
    public Page<JobOpeningResponse> getAllJobOpenings(Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenant();

        Specification<JobOpening> tenantSpec = (root, query, cb) -> cb.equal(root.get("tenantId"), tenantId);
        Specification<JobOpening> scopeSpec = dataScopeService.getScopeSpecification(Permission.RECRUITMENT_VIEW);

        return jobOpeningRepository.findAll(Specification.where(tenantSpec).and(scopeSpec), pageable)
                .map(this::mapToJobOpeningResponse);
    }

    @Transactional(readOnly = true)
    public Page<JobOpeningResponse> getJobOpeningsByStatus(JobOpening.JobStatus status, Pageable pageable) {
        String permission = determineViewPermission();
        Specification<JobOpening> scopeSpec = dataScopeService.getScopeSpecification(permission);

        UUID tenantId = TenantContext.getCurrentTenant();
        Specification<JobOpening> tenantSpec = (root, query, cb) -> cb.equal(root.get("tenantId"), tenantId);
        Specification<JobOpening> statusSpec = (root, query, cb) -> cb.equal(root.get("status"), status);

        return jobOpeningRepository.findAll(
                Specification.where(tenantSpec).and(statusSpec).and(scopeSpec),
                pageable
        ).map(this::mapToJobOpeningResponse);
    }

    public void deleteJobOpening(UUID jobOpeningId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        JobOpening jobOpening = jobOpeningRepository.findByIdAndTenantId(jobOpeningId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Job opening not found"));
        jobOpeningRepository.delete(jobOpening);
    }

    // ==================== Candidate Operations ====================

    public CandidateResponse createCandidate(CandidateRequest request) {
        UUID tenantId = TenantContext.getCurrentTenant();
        log.info("Creating candidate {} for tenant {}", request.getEmail(), tenantId);

        if (candidateRepository.existsByTenantIdAndCandidateCode(tenantId, request.getCandidateCode())) {
            throw new IllegalArgumentException("Candidate with code " + request.getCandidateCode() + " already exists");
        }

        Candidate candidate = new Candidate();
        candidate.setId(UUID.randomUUID());
        candidate.setTenantId(tenantId);
        candidate.setCandidateCode(request.getCandidateCode());
        candidate.setJobOpeningId(request.getJobOpeningId());
        candidate.setFirstName(request.getFirstName());
        candidate.setLastName(request.getLastName());
        candidate.setEmail(request.getEmail());
        candidate.setPhone(request.getPhone());
        candidate.setCurrentLocation(request.getCurrentLocation());
        candidate.setCurrentCompany(request.getCurrentCompany());
        candidate.setCurrentDesignation(request.getCurrentDesignation());
        candidate.setTotalExperience(request.getTotalExperience());
        candidate.setCurrentCtc(request.getCurrentCtc());
        candidate.setExpectedCtc(request.getExpectedCtc());
        candidate.setNoticePeriodDays(request.getNoticePeriodDays());
        candidate.setResumeUrl(request.getResumeUrl());
        candidate.setSource(request.getSource());
        candidate.setStatus(request.getStatus() != null ? request.getStatus() : Candidate.CandidateStatus.NEW);
        candidate.setCurrentStage(request.getCurrentStage());
        candidate.setAppliedDate(request.getAppliedDate());
        candidate.setNotes(request.getNotes());
        candidate.setAssignedRecruiterId(request.getAssignedRecruiterId());

        Candidate savedCandidate = candidateRepository.save(candidate);
        return mapToCandidateResponse(savedCandidate);
    }

    public CandidateResponse updateCandidate(UUID candidateId, CandidateRequest request) {
        UUID tenantId = TenantContext.getCurrentTenant();
        log.info("Updating candidate {} for tenant {}", candidateId, tenantId);

        Candidate candidate = candidateRepository.findByIdAndTenantId(candidateId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Candidate not found"));

        candidate.setFirstName(request.getFirstName());
        candidate.setLastName(request.getLastName());
        candidate.setEmail(request.getEmail());
        candidate.setPhone(request.getPhone());
        candidate.setCurrentLocation(request.getCurrentLocation());
        candidate.setCurrentCompany(request.getCurrentCompany());
        candidate.setCurrentDesignation(request.getCurrentDesignation());
        candidate.setTotalExperience(request.getTotalExperience());
        candidate.setCurrentCtc(request.getCurrentCtc());
        candidate.setExpectedCtc(request.getExpectedCtc());
        candidate.setNoticePeriodDays(request.getNoticePeriodDays());
        candidate.setResumeUrl(request.getResumeUrl());
        candidate.setSource(request.getSource());
        candidate.setStatus(request.getStatus());
        candidate.setCurrentStage(request.getCurrentStage());
        candidate.setNotes(request.getNotes());
        candidate.setAssignedRecruiterId(request.getAssignedRecruiterId());

        Candidate updatedCandidate = candidateRepository.save(candidate);
        return mapToCandidateResponse(updatedCandidate);
    }

    @Transactional(readOnly = true)
    public CandidateResponse getCandidateById(UUID candidateId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        Candidate candidate = candidateRepository.findByIdAndTenantId(candidateId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Candidate not found"));

        // Enforce scope: validate the user can access this candidate
        String permission = determineViewPermission();
        validateCandidateAccess(candidate, permission);

        return mapToCandidateResponse(candidate);
    }

    @Transactional(readOnly = true)
    public Page<CandidateResponse> getAllCandidates(Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenant();

        Specification<Candidate> tenantSpec = (root, query, cb) -> cb.equal(root.get("tenantId"), tenantId);
        Specification<Candidate> scopeSpec = dataScopeService.getScopeSpecification(Permission.CANDIDATE_VIEW);

        return candidateRepository.findAll(Specification.where(tenantSpec).and(scopeSpec), pageable)
                .map(this::mapToCandidateResponse);
    }

    @Transactional(readOnly = true)
    public Page<CandidateResponse> getCandidatesByJobOpening(UUID jobOpeningId, Pageable pageable) {
        String permission = determineViewPermission();
        Specification<Candidate> scopeSpec = dataScopeService.getScopeSpecification(permission);

        UUID tenantId = TenantContext.getCurrentTenant();
        Specification<Candidate> tenantSpec = (root, query, cb) -> cb.equal(root.get("tenantId"), tenantId);
        Specification<Candidate> jobSpec = (root, query, cb) -> cb.equal(root.get("jobOpeningId"), jobOpeningId);

        return candidateRepository.findAll(
                Specification.where(tenantSpec).and(jobSpec).and(scopeSpec),
                pageable
        ).map(this::mapToCandidateResponse);
    }

    public void deleteCandidate(UUID candidateId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        Candidate candidate = candidateRepository.findByIdAndTenantId(candidateId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Candidate not found"));
        candidateRepository.delete(candidate);
    }

    // ==================== Offer Response Operations ====================

    /**
     * Process candidate's acceptance of an offer.
     * Updates candidate status to OFFER_ACCEPTED and records the acceptance date.
     */
    public CandidateResponse acceptOffer(UUID candidateId, java.time.LocalDate confirmedJoiningDate) {
        UUID tenantId = TenantContext.getCurrentTenant();
        log.info("Processing offer acceptance for candidate {} in tenant {}", candidateId, tenantId);

        Candidate candidate = candidateRepository.findByIdAndTenantId(candidateId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Candidate not found"));

        if (candidate.getStatus() != Candidate.CandidateStatus.OFFER_EXTENDED) {
            throw new IllegalStateException("Candidate does not have an active offer to accept. Current status: " + candidate.getStatus());
        }

        candidate.setStatus(Candidate.CandidateStatus.OFFER_ACCEPTED);
        candidate.setOfferAcceptedDate(java.time.LocalDate.now());

        // Update joining date if candidate provided a different one
        if (confirmedJoiningDate != null) {
            candidate.setProposedJoiningDate(confirmedJoiningDate);
        }

        // Keep stage at OFFER - candidate moves to JOINED only after actual onboarding/joining
        // The JOINED stage is set by a separate process when the employee record is created

        Candidate savedCandidate = candidateRepository.save(candidate);
        log.info("Offer accepted by candidate {}", candidateId);

        return mapToCandidateResponse(savedCandidate);
    }

    /**
     * Process candidate's decline of an offer.
     * Updates candidate status to OFFER_DECLINED and records the reason.
     */
    public CandidateResponse declineOffer(UUID candidateId, String declineReason) {
        UUID tenantId = TenantContext.getCurrentTenant();
        log.info("Processing offer decline for candidate {} in tenant {}", candidateId, tenantId);

        Candidate candidate = candidateRepository.findByIdAndTenantId(candidateId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Candidate not found"));

        if (candidate.getStatus() != Candidate.CandidateStatus.OFFER_EXTENDED) {
            throw new IllegalStateException("Candidate does not have an active offer to decline. Current status: " + candidate.getStatus());
        }

        candidate.setStatus(Candidate.CandidateStatus.OFFER_DECLINED);
        candidate.setOfferDeclinedDate(java.time.LocalDate.now());
        candidate.setOfferDeclineReason(declineReason);

        Candidate savedCandidate = candidateRepository.save(candidate);
        log.info("Offer declined by candidate {} - Reason: {}", candidateId, declineReason);

        return mapToCandidateResponse(savedCandidate);
    }

    // ==================== Interview Operations ====================

    public InterviewResponse scheduleInterview(InterviewRequest request) {
        UUID tenantId = TenantContext.getCurrentTenant();
        log.info("Scheduling interview for candidate {} for tenant {}", request.getCandidateId(), tenantId);

        Interview interview = new Interview();
        interview.setId(UUID.randomUUID());
        interview.setTenantId(tenantId);
        interview.setCandidateId(request.getCandidateId());
        interview.setJobOpeningId(request.getJobOpeningId());
        interview.setInterviewRound(request.getInterviewRound());
        interview.setInterviewType(request.getInterviewType());
        interview.setScheduledAt(request.getScheduledAt());
        interview.setDurationMinutes(request.getDurationMinutes());
        interview.setInterviewerId(request.getInterviewerId());
        interview.setLocation(request.getLocation());
        interview.setMeetingLink(request.getMeetingLink());
        interview.setStatus(request.getStatus() != null ? request.getStatus() : Interview.InterviewStatus.SCHEDULED);
        interview.setFeedback(request.getFeedback());
        interview.setRating(request.getRating());
        interview.setResult(request.getResult());
        interview.setNotes(request.getNotes());

        Interview savedInterview = interviewRepository.save(interview);
        return mapToInterviewResponse(savedInterview);
    }

    public InterviewResponse updateInterview(UUID interviewId, InterviewRequest request) {
        UUID tenantId = TenantContext.getCurrentTenant();
        log.info("Updating interview {} for tenant {}", interviewId, tenantId);

        Interview interview = interviewRepository.findByIdAndTenantId(interviewId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Interview not found"));

        interview.setInterviewRound(request.getInterviewRound());
        interview.setInterviewType(request.getInterviewType());
        interview.setScheduledAt(request.getScheduledAt());
        interview.setDurationMinutes(request.getDurationMinutes());
        interview.setInterviewerId(request.getInterviewerId());
        interview.setLocation(request.getLocation());
        interview.setMeetingLink(request.getMeetingLink());
        interview.setStatus(request.getStatus());
        interview.setFeedback(request.getFeedback());
        interview.setRating(request.getRating());
        interview.setResult(request.getResult());
        interview.setNotes(request.getNotes());

        Interview updatedInterview = interviewRepository.save(interview);
        return mapToInterviewResponse(updatedInterview);
    }

    @Transactional(readOnly = true)
    public InterviewResponse getInterviewById(UUID interviewId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        Interview interview = interviewRepository.findByIdAndTenantId(interviewId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Interview not found"));

        // Enforce scope: validate the user can access this interview
        String permission = determineViewPermission();
        validateInterviewAccess(interview, permission);

        return mapToInterviewResponse(interview);
    }

    @Transactional(readOnly = true)
    public Page<InterviewResponse> getInterviewsByCandidate(UUID candidateId, Pageable pageable) {
        String permission = determineViewPermission();

        // First validate access to the candidate
        UUID tenantId = TenantContext.getCurrentTenant();
        Candidate candidate = candidateRepository.findByIdAndTenantId(candidateId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Candidate not found"));
        validateCandidateAccess(candidate, permission);

        // Apply scope filtering to interviews
        Specification<Interview> scopeSpec = dataScopeService.getScopeSpecification(permission);
        Specification<Interview> tenantSpec = (root, query, cb) -> cb.equal(root.get("tenantId"), tenantId);
        Specification<Interview> candidateSpec = (root, query, cb) -> cb.equal(root.get("candidateId"), candidateId);

        return interviewRepository.findAll(
                Specification.where(tenantSpec).and(candidateSpec).and(scopeSpec),
                pageable
        ).map(this::mapToInterviewResponse);
    }

    public void deleteInterview(UUID interviewId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        Interview interview = interviewRepository.findByIdAndTenantId(interviewId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Interview not found"));
        interviewRepository.delete(interview);
    }

    // ==================== Mapper Methods ====================

    private JobOpeningResponse mapToJobOpeningResponse(JobOpening jobOpening) {
        String hiringManagerName = null;
        if (jobOpening.getHiringManagerId() != null) {
            hiringManagerName = employeeRepository.findById(jobOpening.getHiringManagerId())
                    .map(Employee::getFullName)
                    .orElse(null);
        }

        Integer candidateCount = candidateRepository.findByTenantIdAndJobOpeningId(
                jobOpening.getTenantId(), jobOpening.getId()).size();

        return JobOpeningResponse.builder()
                .id(jobOpening.getId())
                .tenantId(jobOpening.getTenantId())
                .jobCode(jobOpening.getJobCode())
                .jobTitle(jobOpening.getJobTitle())
                .departmentId(jobOpening.getDepartmentId())
                .departmentName(null)
                .location(jobOpening.getLocation())
                .employmentType(jobOpening.getEmploymentType())
                .experienceRequired(jobOpening.getExperienceRequired())
                .minSalary(jobOpening.getMinSalary())
                .maxSalary(jobOpening.getMaxSalary())
                .numberOfOpenings(jobOpening.getNumberOfOpenings())
                .jobDescription(jobOpening.getJobDescription())
                .requirements(jobOpening.getRequirements())
                .skillsRequired(jobOpening.getSkillsRequired())
                .hiringManagerId(jobOpening.getHiringManagerId())
                .hiringManagerName(hiringManagerName)
                .status(jobOpening.getStatus())
                .postedDate(jobOpening.getPostedDate())
                .closingDate(jobOpening.getClosingDate())
                .priority(jobOpening.getPriority())
                .isActive(jobOpening.getIsActive())
                .candidateCount(candidateCount)
                .createdAt(jobOpening.getCreatedAt())
                .updatedAt(jobOpening.getUpdatedAt())
                .build();
    }

    private CandidateResponse mapToCandidateResponse(Candidate candidate) {
        String jobTitle = jobOpeningRepository.findById(candidate.getJobOpeningId())
                .map(JobOpening::getJobTitle)
                .orElse(null);

        String recruiterName = null;
        if (candidate.getAssignedRecruiterId() != null) {
            recruiterName = employeeRepository.findById(candidate.getAssignedRecruiterId())
                    .map(Employee::getFullName)
                    .orElse(null);
        }

        return CandidateResponse.builder()
                .id(candidate.getId())
                .tenantId(candidate.getTenantId())
                .candidateCode(candidate.getCandidateCode())
                .jobOpeningId(candidate.getJobOpeningId())
                .jobTitle(jobTitle)
                .firstName(candidate.getFirstName())
                .lastName(candidate.getLastName())
                .fullName(candidate.getFullName())
                .email(candidate.getEmail())
                .phone(candidate.getPhone())
                .currentLocation(candidate.getCurrentLocation())
                .currentCompany(candidate.getCurrentCompany())
                .currentDesignation(candidate.getCurrentDesignation())
                .totalExperience(candidate.getTotalExperience())
                .currentCtc(candidate.getCurrentCtc())
                .expectedCtc(candidate.getExpectedCtc())
                .noticePeriodDays(candidate.getNoticePeriodDays())
                .resumeUrl(candidate.getResumeUrl())
                .source(candidate.getSource())
                .status(candidate.getStatus())
                .currentStage(candidate.getCurrentStage())
                .appliedDate(candidate.getAppliedDate())
                .notes(candidate.getNotes())
                .assignedRecruiterId(candidate.getAssignedRecruiterId())
                .assignedRecruiterName(recruiterName)
                .createdAt(candidate.getCreatedAt())
                .updatedAt(candidate.getUpdatedAt())
                .build();
    }

    private InterviewResponse mapToInterviewResponse(Interview interview) {
        String candidateName = candidateRepository.findById(interview.getCandidateId())
                .map(Candidate::getFullName)
                .orElse(null);

        String jobTitle = jobOpeningRepository.findById(interview.getJobOpeningId())
                .map(JobOpening::getJobTitle)
                .orElse(null);

        String interviewerName = null;
        if (interview.getInterviewerId() != null) {
            interviewerName = employeeRepository.findById(interview.getInterviewerId())
                    .map(Employee::getFullName)
                    .orElse(null);
        }

        return InterviewResponse.builder()
                .id(interview.getId())
                .tenantId(interview.getTenantId())
                .candidateId(interview.getCandidateId())
                .candidateName(candidateName)
                .jobOpeningId(interview.getJobOpeningId())
                .jobTitle(jobTitle)
                .interviewRound(interview.getInterviewRound())
                .interviewType(interview.getInterviewType())
                .scheduledAt(interview.getScheduledAt())
                .durationMinutes(interview.getDurationMinutes())
                .interviewerId(interview.getInterviewerId())
                .interviewerName(interviewerName)
                .location(interview.getLocation())
                .meetingLink(interview.getMeetingLink())
                .status(interview.getStatus())
                .feedback(interview.getFeedback())
                .rating(interview.getRating())
                .result(interview.getResult())
                .notes(interview.getNotes())
                .createdAt(interview.getCreatedAt())
                .updatedAt(interview.getUpdatedAt())
                .build();
    }

    // ==================== Scope Validation Helpers ====================

    /**
     * Determines which view permission the user has (in priority order).
     * Returns the actual permission that has a scope assigned, not just any permission that passes
     * hasPermission() check. This ensures getPermissionScope() can find the scope for validation.
     *
     * Note: Checks for explicit RECRUITMENT_VIEW_* and CANDIDATE_VIEW permissions first, then falls back to RECRUITMENT:MANAGE.
     * Permission hierarchy (MODULE:MANAGE implying MODULE:VIEW_*) is handled by @RequiresPermission
     * for access control, and this method ensures scope enforcement works for users with only MANAGE.
     */
    private String determineViewPermission() {
        // Check recruitment view permissions in priority order (highest to lowest privilege)
        if (SecurityContext.getPermissionScope(Permission.RECRUITMENT_VIEW_ALL) != null) {
            return Permission.RECRUITMENT_VIEW_ALL;
        }
        if (SecurityContext.getPermissionScope(Permission.RECRUITMENT_VIEW_TEAM) != null) {
            return Permission.RECRUITMENT_VIEW_TEAM;
        }
        if (SecurityContext.getPermissionScope(Permission.RECRUITMENT_VIEW) != null) {
            return Permission.RECRUITMENT_VIEW;
        }

        // Check candidate view permissions
        if (SecurityContext.getPermissionScope(Permission.CANDIDATE_VIEW) != null) {
            return Permission.CANDIDATE_VIEW;
        }

        // Fallback to RECRUITMENT:MANAGE - users with MANAGE permission can view with that permission's scope
        RoleScope manageScope = SecurityContext.getPermissionScope(Permission.RECRUITMENT_MANAGE);
        if (manageScope != null) {
            return Permission.RECRUITMENT_MANAGE;
        }

        // Final fallback: user passed @RequiresPermission check but has no scoped permission
        // This can happen with system admin. Return VIEW as safest default for scope lookup.
        return Permission.RECRUITMENT_VIEW;
    }

    /**
     * Validates that the current user can access a specific job opening based on their scope.
     * Throws AccessDeniedException if access is not allowed.
     */
    private void validateJobOpeningAccess(JobOpening jobOpening, String permission) {
        if (jobOpening.getHiringManagerId() != null) {
            validateEmployeeAccess(jobOpening.getHiringManagerId(), permission);
        }
    }

    /**
     * Validates that the current user can access a specific candidate based on their scope.
     * Throws AccessDeniedException if access is not allowed.
     */
    private void validateCandidateAccess(Candidate candidate, String permission) {
        if (candidate.getAssignedRecruiterId() != null) {
            validateEmployeeAccess(candidate.getAssignedRecruiterId(), permission);
        }
    }

    /**
     * Validates that the current user can access a specific interview based on their scope.
     * Throws AccessDeniedException if access is not allowed.
     */
    private void validateInterviewAccess(Interview interview, String permission) {
        if (interview.getInterviewerId() != null) {
            validateEmployeeAccess(interview.getInterviewerId(), permission);
        }
    }

    /**
     * Validates that the current user can access data for a specific employee based on their scope.
     * This is used to check access to hiring managers, recruiters, and interviewers.
     * Throws AccessDeniedException if access is not allowed.
     */
    private void validateEmployeeAccess(UUID targetEmployeeId, String permission) {
        UUID currentEmployeeId = SecurityContext.getCurrentEmployeeId();

        // Super admin (includes system admin and SUPER_ADMIN role) bypasses all checks
        if (SecurityContext.isSuperAdmin()) {
            return;
        }

        RoleScope scope = SecurityContext.getPermissionScope(permission);
        if (scope == null) {
            throw new AccessDeniedException("No access to recruitment data");
        }

        switch (scope) {
            case ALL:
                // ALL scope: can access any employee's data
                return;

            case LOCATION:
                // LOCATION scope: target employee must be in same location
                if (isEmployeeInUserLocations(targetEmployeeId)) {
                    return;
                }
                break;

            case DEPARTMENT:
                // DEPARTMENT scope: target employee must be in same department
                if (isEmployeeInUserDepartment(targetEmployeeId)) {
                    return;
                }
                break;

            case TEAM:
                // TEAM scope: target must be self or a reportee
                if (targetEmployeeId.equals(currentEmployeeId) || isReportee(targetEmployeeId)) {
                    return;
                }
                break;

            case SELF:
                // SELF scope: can only access own data
                if (targetEmployeeId.equals(currentEmployeeId)) {
                    return;
                }
                break;

            case CUSTOM:
                // CUSTOM scope: check if target is in custom targets
                if (targetEmployeeId.equals(currentEmployeeId) || isInCustomTargets(targetEmployeeId, permission)) {
                    return;
                }
                break;
        }

        throw new AccessDeniedException(
                "You do not have permission to access this recruitment data");
    }

    private boolean isReportee(UUID employeeId) {
        Set<UUID> reporteeIds = SecurityContext.getAllReporteeIds();
        return reporteeIds != null && reporteeIds.contains(employeeId);
    }

    private boolean isEmployeeInUserLocations(UUID employeeId) {
        Set<UUID> locationIds = SecurityContext.getCurrentLocationIds();
        if (locationIds == null || locationIds.isEmpty()) {
            return false;
        }
        UUID tenantId = TenantContext.getCurrentTenant();
        return employeeRepository.findByIdAndTenantId(employeeId, tenantId)
                .map(emp -> emp.getOfficeLocationId() != null && locationIds.contains(emp.getOfficeLocationId()))
                .orElse(false);
    }

    private boolean isEmployeeInUserDepartment(UUID employeeId) {
        UUID departmentId = SecurityContext.getCurrentDepartmentId();
        if (departmentId == null) {
            return false;
        }
        UUID tenantId = TenantContext.getCurrentTenant();
        return employeeRepository.findByIdAndTenantId(employeeId, tenantId)
                .map(emp -> departmentId.equals(emp.getDepartmentId()))
                .orElse(false);
    }

    private boolean isInCustomTargets(UUID employeeId, String permission) {
        // Check if employee is directly in custom employee targets
        Set<UUID> customEmployeeIds = SecurityContext.getCustomEmployeeIds(permission);
        if (customEmployeeIds != null && customEmployeeIds.contains(employeeId)) {
            return true;
        }

        // Check if employee's department is in custom department targets
        Set<UUID> customDepartmentIds = SecurityContext.getCustomDepartmentIds(permission);
        if (customDepartmentIds != null && !customDepartmentIds.isEmpty()) {
            UUID tenantId = TenantContext.getCurrentTenant();
            Optional<Employee> empOpt = employeeRepository.findByIdAndTenantId(employeeId, tenantId);
            if (empOpt.isPresent() && empOpt.get().getDepartmentId() != null
                    && customDepartmentIds.contains(empOpt.get().getDepartmentId())) {
                return true;
            }
        }

        // Check if employee's location is in custom location targets
        Set<UUID> customLocationIds = SecurityContext.getCustomLocationIds(permission);
        if (customLocationIds != null && !customLocationIds.isEmpty()) {
            UUID tenantId = TenantContext.getCurrentTenant();
            Optional<Employee> empOpt = employeeRepository.findByIdAndTenantId(employeeId, tenantId);
            if (empOpt.isPresent() && empOpt.get().getOfficeLocationId() != null
                    && customLocationIds.contains(empOpt.get().getOfficeLocationId())) {
                return true;
            }
        }

        return false;
    }
}
