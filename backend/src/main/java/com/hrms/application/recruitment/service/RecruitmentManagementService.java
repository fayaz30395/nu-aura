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
import com.hrms.application.audit.service.AuditLogService;
import com.hrms.domain.audit.AuditLog.AuditAction;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.hrms.api.workflow.dto.WorkflowExecutionRequest;
import com.hrms.application.workflow.callback.ApprovalCallbackHandler;
import com.hrms.application.workflow.service.WorkflowService;
import com.hrms.domain.workflow.WorkflowDefinition;
import com.hrms.application.event.DomainEventPublisher;
import com.hrms.domain.event.recruitment.CandidateHiredEvent;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class RecruitmentManagementService implements ApprovalCallbackHandler {

    private final JobOpeningRepository jobOpeningRepository;
    private final CandidateRepository candidateRepository;
    private final InterviewRepository interviewRepository;
    private final EmployeeRepository employeeRepository;
    private final DataScopeService dataScopeService;
    private final WorkflowService workflowService;
    private final AuditLogService auditLogService;
    private final DomainEventPublisher eventPublisher;
    private final GoogleMeetService googleMeetService;

    // Focused sub-services (facade delegation)
    private final JobOpeningService jobOpeningService;
    private final InterviewManagementService interviewManagementService;

    // ==================== Job Opening Operations (delegated) ====================

    @Transactional
    public JobOpeningResponse createJobOpening(JobOpeningRequest request) {
        return jobOpeningService.createJobOpening(request);
    }

    @Transactional
    public JobOpeningResponse updateJobOpening(UUID jobOpeningId, JobOpeningRequest request) {
        return jobOpeningService.updateJobOpening(jobOpeningId, request);
    }

    @Transactional(readOnly = true)
    public JobOpeningResponse getJobOpeningById(UUID jobOpeningId) {
        return jobOpeningService.getJobOpeningById(jobOpeningId);
    }

    @Transactional(readOnly = true)
    public Page<JobOpeningResponse> getAllJobOpenings(Pageable pageable) {
        return jobOpeningService.getAllJobOpenings(pageable);
    }

    @Transactional(readOnly = true)
    public Page<JobOpeningResponse> getJobOpeningsByStatus(JobOpening.JobStatus status, Pageable pageable) {
        return jobOpeningService.getJobOpeningsByStatus(status, pageable);
    }

    @Transactional
    public void deleteJobOpening(UUID jobOpeningId) {
        jobOpeningService.deleteJobOpening(jobOpeningId);
    }

    // ==================== Candidate Operations ====================

    @Transactional
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

        auditLogService.logAction(
                "CANDIDATE",
                savedCandidate.getId(),
                AuditAction.CREATE,
                null,
                savedCandidate.getFirstName() + " " + savedCandidate.getLastName() + " (" + savedCandidate.getEmail() + ")",
                "Candidate created: " + savedCandidate.getCandidateCode() + " - " + savedCandidate.getFullName() + " for job " + savedCandidate.getJobOpeningId()
        );

        return mapToCandidateResponse(savedCandidate);
    }

    @Transactional
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

        auditLogService.logAction(
                "CANDIDATE",
                candidateId,
                AuditAction.UPDATE,
                null,
                updatedCandidate.getFullName() + " - stage: " + updatedCandidate.getCurrentStage() + ", status: " + updatedCandidate.getStatus(),
                "Candidate updated: " + updatedCandidate.getCandidateCode() + " - " + updatedCandidate.getFullName()
        );

        return mapToCandidateResponse(updatedCandidate);
    }

    @Transactional(readOnly = true)
    public CandidateResponse getCandidateById(UUID candidateId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        Candidate candidate = candidateRepository.findByIdAndTenantId(candidateId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Candidate not found"));

        String permission = determineViewPermission();
        validateCandidateAccess(candidate, permission);

        return mapToCandidateResponse(candidate);
    }

    @Transactional(readOnly = true, timeout = 10)
    public Page<CandidateResponse> getAllCandidates(Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenant();

        Specification<Candidate> tenantSpec = (root, query, cb) -> cb.equal(root.get("tenantId"), tenantId);
        Specification<Candidate> scopeSpec = dataScopeService.getScopeSpecification(Permission.CANDIDATE_VIEW);

        Page<Candidate> page = candidateRepository.findAll(
                Specification.where(tenantSpec).and(scopeSpec), pageable);
        return mapCandidatePageBatch(page);
    }

    @Transactional(readOnly = true, timeout = 10)
    public Page<CandidateResponse> getCandidatesByJobOpening(UUID jobOpeningId, Pageable pageable) {
        String permission = determineViewPermission();
        Specification<Candidate> scopeSpec = dataScopeService.getScopeSpecification(permission);

        UUID tenantId = TenantContext.getCurrentTenant();
        Specification<Candidate> tenantSpec = (root, query, cb) -> cb.equal(root.get("tenantId"), tenantId);
        Specification<Candidate> jobSpec = (root, query, cb) -> cb.equal(root.get("jobOpeningId"), jobOpeningId);

        Page<Candidate> page = candidateRepository.findAll(
                Specification.where(tenantSpec).and(jobSpec).and(scopeSpec), pageable);
        return mapCandidatePageBatch(page);
    }

    /**
     * Batch-map a page of Candidate entities to responses.
     * Fetches job titles and recruiter names in two bulk queries
     * instead of 2N individual queries (eliminates N+1).
     */
    private Page<CandidateResponse> mapCandidatePageBatch(Page<Candidate> page) {
        List<Candidate> candidates = page.getContent();
        if (candidates.isEmpty()) {
            return page.map(this::mapToCandidateResponse);
        }

        // Batch-fetch job titles
        Set<UUID> jobIds = candidates.stream()
                .map(Candidate::getJobOpeningId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
        Map<UUID, String> jobTitles = new HashMap<>();
        if (!jobIds.isEmpty()) {
            try {
                jobOpeningRepository.findAllById(jobIds).forEach(
                        jo -> jobTitles.put(jo.getId(), jo.getJobTitle()));
            } catch (Exception e) {
                log.warn("Failed to batch-fetch job titles: {}", e.getMessage());
            }
        }

        // Batch-fetch recruiter names
        Set<UUID> recruiterIds = candidates.stream()
                .map(Candidate::getAssignedRecruiterId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
        Map<UUID, String> recruiterNames = new HashMap<>();
        if (!recruiterIds.isEmpty()) {
            try {
                employeeRepository.findAllById(recruiterIds).forEach(
                        emp -> recruiterNames.put(emp.getId(), emp.getFullName()));
            } catch (Exception e) {
                log.warn("Failed to batch-fetch recruiter names: {}", e.getMessage());
            }
        }

        return page.map(candidate -> mapToCandidateResponseBatch(candidate, jobTitles, recruiterNames));
    }

    private CandidateResponse mapToCandidateResponseBatch(Candidate candidate,
                                                            Map<UUID, String> jobTitles,
                                                            Map<UUID, String> recruiterNames) {
        String jobTitle = candidate.getJobOpeningId() != null
                ? jobTitles.get(candidate.getJobOpeningId()) : null;
        String recruiterName = candidate.getAssignedRecruiterId() != null
                ? recruiterNames.get(candidate.getAssignedRecruiterId()) : null;

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
                .createdBy(candidate.getCreatedBy())
                .lastModifiedBy(candidate.getLastModifiedBy())
                .version(candidate.getVersion())
                .build();
    }

    @Transactional
    public void deleteCandidate(UUID candidateId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        Candidate candidate = candidateRepository.findByIdAndTenantId(candidateId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Candidate not found"));

        auditLogService.logAction(
                "CANDIDATE",
                candidateId,
                AuditAction.DELETE,
                candidate.getCandidateCode() + " - " + candidate.getFullName(),
                null,
                "Candidate deleted: " + candidate.getCandidateCode() + " - " + candidate.getFullName() + " (" + candidate.getEmail() + ")"
        );

        candidate.setDeleted(true);
        candidateRepository.save(candidate);
    }

    // ==================== Offer Response Operations ====================

    /**
     * Process candidate's acceptance of an offer.
     * Updates candidate status to OFFER_ACCEPTED and records the acceptance date.
     */
    @Transactional
    public CandidateResponse acceptOffer(UUID candidateId, java.time.LocalDate confirmedJoiningDate) {
        UUID tenantId = TenantContext.getCurrentTenant();
        log.info("Processing offer acceptance for candidate {} in tenant {}", candidateId, tenantId);

        Candidate candidate = candidateRepository.findByIdAndTenantId(candidateId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Candidate not found"));

        if (candidate.getStatus() != Candidate.CandidateStatus.OFFER_EXTENDED) {
            throw new IllegalStateException(
                    "Candidate does not have an active offer to accept. Current status: " + candidate.getStatus());
        }

        Candidate.CandidateStatus oldStatus = candidate.getStatus();
        candidate.setStatus(Candidate.CandidateStatus.OFFER_ACCEPTED);
        candidate.setOfferAcceptedDate(java.time.LocalDate.now());

        if (confirmedJoiningDate != null) {
            candidate.setProposedJoiningDate(confirmedJoiningDate);
        }

        Candidate savedCandidate = candidateRepository.save(candidate);

        auditLogService.logAction(
                "CANDIDATE",
                candidateId,
                AuditAction.STATUS_CHANGE,
                oldStatus.toString(),
                Candidate.CandidateStatus.OFFER_ACCEPTED.toString(),
                "Candidate accepted offer - Joining date: " + (confirmedJoiningDate != null ? confirmedJoiningDate : "Not specified")
        );

        log.info("Offer accepted by candidate {}", candidateId);

        return mapToCandidateResponse(savedCandidate);
    }

    /**
     * Process candidate's decline of an offer.
     * Updates candidate status to OFFER_DECLINED and records the reason.
     */
    @Transactional
    public CandidateResponse declineOffer(UUID candidateId, String declineReason) {
        UUID tenantId = TenantContext.getCurrentTenant();
        log.info("Processing offer decline for candidate {} in tenant {}", candidateId, tenantId);

        Candidate candidate = candidateRepository.findByIdAndTenantId(candidateId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Candidate not found"));

        if (candidate.getStatus() != Candidate.CandidateStatus.OFFER_EXTENDED) {
            throw new IllegalStateException(
                    "Candidate does not have an active offer to decline. Current status: " + candidate.getStatus());
        }

        Candidate.CandidateStatus oldStatus = candidate.getStatus();
        candidate.setStatus(Candidate.CandidateStatus.OFFER_DECLINED);
        candidate.setOfferDeclinedDate(java.time.LocalDate.now());
        candidate.setOfferDeclineReason(declineReason);

        Candidate savedCandidate = candidateRepository.save(candidate);

        auditLogService.logAction(
                "CANDIDATE",
                candidateId,
                AuditAction.STATUS_CHANGE,
                oldStatus.toString(),
                Candidate.CandidateStatus.OFFER_DECLINED.toString(),
                "Candidate declined offer - Reason: " + (declineReason != null ? declineReason : "Not specified")
        );

        log.info("Offer declined by candidate {} - Reason: {}", candidateId, declineReason);

        return mapToCandidateResponse(savedCandidate);
    }

    /**
     * Move a candidate to a different recruitment stage.
     */
    @Transactional
    public CandidateResponse moveCandidateStage(UUID candidateId, Candidate.RecruitmentStage stage, String notes) {
        UUID tenantId = TenantContext.getCurrentTenant();
        log.info("Moving candidate {} to stage {} for tenant {}", candidateId, stage, tenantId);

        Candidate candidate = candidateRepository.findByIdAndTenantId(candidateId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Candidate not found"));

        Candidate.RecruitmentStage oldStage = candidate.getCurrentStage();
        Candidate.CandidateStatus oldStatus = candidate.getStatus();

        // BIZ-011: Validate stage transition — prevent skipping stages
        // Rejection (CANDIDATE_REJECTED, PANEL_REJECT) is always allowed from any stage
        if (stage != Candidate.RecruitmentStage.CANDIDATE_REJECTED
                && stage != Candidate.RecruitmentStage.PANEL_REJECT
                && oldStage != null) {
            int oldOrdinal = oldStage.ordinal();
            int newOrdinal = stage.ordinal();
            // Allow forward by at most 2 positions, or backward (re-evaluation)
            if (newOrdinal > oldOrdinal + 2) {
                log.warn("Stage skip attempted: {} -> {} for candidate {}", oldStage, stage, candidateId);
                throw new com.hrms.common.exception.BusinessException(
                        "Cannot skip from " + oldStage + " to " + stage + ". Please follow the recruitment pipeline sequence.");
            }
        }

        candidate.setCurrentStage(stage);
        if (notes != null) {
            candidate.setNotes(notes);
        }

        updateStatusFromStage(candidate, stage);

        Candidate savedCandidate = candidateRepository.save(candidate);

        if (oldStage != stage) {
            auditLogService.logAction(
                    "CANDIDATE",
                    candidateId,
                    AuditAction.STATUS_CHANGE,
                    oldStage != null ? oldStage.toString() : "UNKNOWN",
                    stage.toString(),
                    "Candidate moved to stage: " + stage + (notes != null ? " - Notes: " + notes : "")
            );
        }

        if (stage == Candidate.RecruitmentStage.OFFER_NDA_TO_BE_RELEASED && oldStage != Candidate.RecruitmentStage.OFFER_NDA_TO_BE_RELEASED) {
            try {
                JobOpening jobOpening = jobOpeningRepository.findByIdAndTenantId(candidate.getJobOpeningId(), tenantId)
                        .orElseThrow(() -> new IllegalArgumentException("Job opening not found"));
                eventPublisher.publish(CandidateHiredEvent.of(this, savedCandidate, jobOpening));
                log.info("CandidateHiredEvent published for candidate: {}", candidateId);
            } catch (Exception e) {
                log.error("Failed to publish CandidateHiredEvent for candidate {}: {}", candidateId, e.getMessage(), e);
                // Don't fail the stage transition if event publishing fails
            }
        }

        return mapToCandidateResponse(savedCandidate);
    }

    /**
     * Create/Extend an offer to a candidate and trigger approval workflow.
     * The candidate status is set to OFFER_EXTENDED immediately; the workflow
     * tracks the approval decision. On approval the status remains OFFER_EXTENDED
     * (awaiting candidate acceptance). On rejection the caller should revert status.
     */
    @Transactional
    public CandidateResponse createOffer(UUID candidateId, CreateOfferRequest request) {
        UUID tenantId = TenantContext.getCurrentTenant();
        log.info("Creating offer for candidate {} for tenant {}", candidateId, tenantId);

        Candidate candidate = candidateRepository.findByIdAndTenantId(candidateId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Candidate not found"));

        Candidate.CandidateStatus oldStatus = candidate.getStatus();
        Candidate.RecruitmentStage oldStage = candidate.getCurrentStage();

        candidate.setStatus(Candidate.CandidateStatus.OFFER_EXTENDED);
        candidate.setCurrentStage(Candidate.RecruitmentStage.OFFER_NDA_TO_BE_RELEASED);
        candidate.setOfferedCtc(request.getOfferedSalary());
        candidate.setOfferedDesignation(request.getPositionTitle());
        candidate.setProposedJoiningDate(request.getJoiningDate());
        candidate.setOfferExtendedDate(LocalDate.now());
        if (request.getNotes() != null) {
            candidate.setNotes(request.getNotes());
        }

        Candidate savedCandidate = candidateRepository.save(candidate);

        auditLogService.logAction(
                "CANDIDATE",
                candidateId,
                AuditAction.STATUS_CHANGE,
                oldStatus.toString(),
                Candidate.CandidateStatus.OFFER_EXTENDED.toString(),
                "Offer extended with salary: " + (request.getOfferedSalary() != null ? request.getOfferedSalary() : "N/A") +
                ", Position: " + (request.getPositionTitle() != null ? request.getPositionTitle() : "N/A") +
                ", Joining Date: " + (request.getJoiningDate() != null ? request.getJoiningDate() : "N/A")
        );

        try {
            WorkflowExecutionRequest workflowRequest = new WorkflowExecutionRequest();
            workflowRequest.setEntityType(WorkflowDefinition.EntityType.RECRUITMENT_OFFER);
            workflowRequest.setEntityId(savedCandidate.getId());
            workflowRequest.setTitle("Offer Approval: " + savedCandidate.getFullName()
                    + " - " + (request.getPositionTitle() != null ? request.getPositionTitle() : ""));
            workflowRequest.setAmount(request.getOfferedSalary() != null
                    ? request.getOfferedSalary() : BigDecimal.ZERO);
            if (candidate.getJobOpeningId() != null) {
                jobOpeningRepository.findByIdAndTenantId(candidate.getJobOpeningId(), tenantId)
                        .ifPresent(job -> workflowRequest.setDepartmentId(job.getDepartmentId()));
            }

            workflowService.startWorkflow(workflowRequest);
            log.info("Workflow started for recruitment offer: candidate={}", savedCandidate.getId());
        } catch (Exception e) {
            log.warn("Could not start approval workflow for offer (candidate={}): {}",
                    savedCandidate.getId(), e.getMessage());
        }

        return mapToCandidateResponse(savedCandidate);
    }

    // ==================== Interview Operations (delegated) ====================

    public InterviewResponse scheduleInterview(InterviewRequest request) {
        return interviewManagementService.scheduleInterview(request);
    }

    @Transactional
    public InterviewResponse updateInterview(UUID interviewId, InterviewRequest request) {
        return interviewManagementService.updateInterview(interviewId, request);
    }

    @Transactional(readOnly = true)
    public Page<InterviewResponse> getAllInterviews(Pageable pageable) {
        return interviewManagementService.getAllInterviews(pageable);
    }

    @Transactional(readOnly = true)
    public InterviewResponse getInterviewById(UUID interviewId) {
        return interviewManagementService.getInterviewById(interviewId);
    }

    @Transactional(readOnly = true)
    public Page<InterviewResponse> getInterviewsByCandidate(UUID candidateId, Pageable pageable) {
        return interviewManagementService.getInterviewsByCandidate(candidateId, pageable);
    }

    @Transactional
    public void deleteInterview(UUID interviewId) {
        interviewManagementService.deleteInterview(interviewId);
    }

    // ==================== Approval Callback Implementation ====================

    @Override
    public WorkflowDefinition.EntityType getEntityType() {
        return WorkflowDefinition.EntityType.RECRUITMENT_OFFER;
    }

    @Override
    @Transactional
    public void onApproved(UUID tenantId, UUID entityId, UUID approvedBy) {
        log.info("Offer workflow approved for candidate {} in tenant {} by {}", entityId, tenantId, approvedBy);

        Candidate candidate = candidateRepository.findByIdAndTenantId(entityId, tenantId)
                .orElse(null);

        if (candidate == null) {
            log.warn("Candidate {} not found for offer approval callback", entityId);
            return;
        }

        // Offer was already set to OFFER_EXTENDED when created; approval confirms it.
        // No status change needed — candidate remains in OFFER_EXTENDED awaiting acceptance/decline.
        auditLogService.logAction(
                "CANDIDATE",
                entityId,
                AuditAction.STATUS_CHANGE,
                Candidate.CandidateStatus.OFFER_EXTENDED.toString(),
                Candidate.CandidateStatus.OFFER_EXTENDED.toString(),
                "Offer approval workflow completed - approved by " + approvedBy
        );

        log.info("Offer approval callback completed for candidate {}", entityId);
    }

    @Override
    @Transactional
    public void onRejected(UUID tenantId, UUID entityId, UUID rejectedBy, String reason) {
        log.info("Offer workflow rejected for candidate {} in tenant {} by {}", entityId, tenantId, rejectedBy);

        Candidate candidate = candidateRepository.findByIdAndTenantId(entityId, tenantId)
                .orElse(null);

        if (candidate == null) {
            log.warn("Candidate {} not found for offer rejection callback", entityId);
            return;
        }

        if (candidate.getStatus() != Candidate.CandidateStatus.OFFER_EXTENDED) {
            log.warn("Candidate {} is not in OFFER_EXTENDED status (current: {}), skipping rejection callback",
                    entityId, candidate.getStatus());
            return;
        }

        Candidate.CandidateStatus oldStatus = candidate.getStatus();

        // Revert candidate back to SELECTED status (they passed interviews but offer was rejected internally)
        candidate.setStatus(Candidate.CandidateStatus.SELECTED);
        candidate.setCurrentStage(Candidate.RecruitmentStage.HR_FINAL_INTERVIEW_COMPLETED);
        candidate.setOfferExtendedDate(null);
        candidate.setOfferedCtc(null);
        candidate.setOfferedDesignation(null);
        candidate.setProposedJoiningDate(null);

        candidateRepository.save(candidate);

        auditLogService.logAction(
                "CANDIDATE",
                entityId,
                AuditAction.STATUS_CHANGE,
                oldStatus.toString(),
                Candidate.CandidateStatus.SELECTED.toString(),
                "Offer rejected via approval workflow - Reason: " + (reason != null ? reason : "Not specified")
                        + " - Rejected by: " + rejectedBy
        );

        log.info("Offer rejection callback completed for candidate {} - reverted to SELECTED", entityId);
    }

    // ==================== Private helpers ====================

    private void updateStatusFromStage(Candidate candidate, Candidate.RecruitmentStage stage) {
        switch (stage) {
            case APPLICATION_RECEIVED:
            case RECRUITERS_PHONE_CALL:
            case SCREENING:
                candidate.setStatus(Candidate.CandidateStatus.NEW);
                break;
            case PANEL_REVIEW:
            case PANEL_SHORTLISTED:
                candidate.setStatus(Candidate.CandidateStatus.SCREENING);
                break;
            case TECHNICAL_INTERVIEW_SCHEDULED:
            case TECHNICAL_INTERVIEW_COMPLETED:
            case MANAGEMENT_INTERVIEW_SCHEDULED:
            case MANAGEMENT_INTERVIEW_COMPLETED:
            case CLIENT_INTERVIEW_SCHEDULED:
            case CLIENT_INTERVIEW_COMPLETED:
            case HR_FINAL_INTERVIEW_COMPLETED:
            case INTERVIEW:
                candidate.setStatus(Candidate.CandidateStatus.INTERVIEW);
                break;
            case OFFER_NDA_TO_BE_RELEASED:
            case OFFER:
                candidate.setStatus(Candidate.CandidateStatus.OFFER_EXTENDED);
                break;
            case JOINED:
                candidate.setStatus(Candidate.CandidateStatus.OFFER_ACCEPTED);
                break;
            case PANEL_REJECT:
            case CANDIDATE_REJECTED:
                candidate.setStatus(Candidate.CandidateStatus.REJECTED);
                break;
        }
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
                .createdBy(candidate.getCreatedBy())
                .lastModifiedBy(candidate.getLastModifiedBy())
                .version(candidate.getVersion())
                .build();
    }

    // ==================== Scope Validation Helpers ====================

    /**
     * Determines which view permission the user has (in priority order).
     * Returns the actual permission that has a scope assigned, not just any
     * permission that passes hasPermission() check. This ensures
     * getPermissionScope() can find the scope for validation.
     *
     * Note: Checks for explicit RECRUITMENT_VIEW_* and CANDIDATE_VIEW permissions
     * first, then falls back to RECRUITMENT:MANAGE.
     * Permission hierarchy (MODULE:MANAGE implying MODULE:VIEW_*) is handled
     * by @RequiresPermission for access control, and this method ensures scope
     * enforcement works for users with only MANAGE.
     */
    private String determineViewPermission() {
        if (SecurityContext.getPermissionScope(Permission.RECRUITMENT_VIEW_ALL) != null) {
            return Permission.RECRUITMENT_VIEW_ALL;
        }
        if (SecurityContext.getPermissionScope(Permission.RECRUITMENT_VIEW_TEAM) != null) {
            return Permission.RECRUITMENT_VIEW_TEAM;
        }
        if (SecurityContext.getPermissionScope(Permission.RECRUITMENT_VIEW) != null) {
            return Permission.RECRUITMENT_VIEW;
        }
        if (SecurityContext.getPermissionScope(Permission.CANDIDATE_VIEW) != null) {
            return Permission.CANDIDATE_VIEW;
        }
        RoleScope manageScope = SecurityContext.getPermissionScope(Permission.RECRUITMENT_MANAGE);
        if (manageScope != null) {
            return Permission.RECRUITMENT_MANAGE;
        }
        return Permission.RECRUITMENT_VIEW;
    }

    /**
     * Validates that the current user can access a specific candidate based on
     * their scope. Throws AccessDeniedException if access is not allowed.
     */
    private void validateCandidateAccess(Candidate candidate, String permission) {
        if (candidate.getAssignedRecruiterId() != null) {
            validateEmployeeAccess(candidate.getAssignedRecruiterId(), permission);
        }
    }

    /**
     * Validates that the current user can access data for a specific employee based
     * on their scope. This is used to check access to hiring managers, recruiters,
     * and interviewers. Throws AccessDeniedException if access is not allowed.
     */
    private void validateEmployeeAccess(UUID targetEmployeeId, String permission) {
        UUID currentEmployeeId = SecurityContext.getCurrentEmployeeId();

        if (SecurityContext.isSuperAdmin()) {
            return;
        }

        RoleScope scope = SecurityContext.getPermissionScope(permission);
        if (scope == null) {
            throw new AccessDeniedException("No access to recruitment data");
        }

        switch (scope) {
            case ALL:
                return;

            case LOCATION:
                if (isEmployeeInUserLocations(targetEmployeeId)) {
                    return;
                }
                break;

            case DEPARTMENT:
                if (isEmployeeInUserDepartment(targetEmployeeId)) {
                    return;
                }
                break;

            case TEAM:
                if (targetEmployeeId.equals(currentEmployeeId) || isReportee(targetEmployeeId)) {
                    return;
                }
                break;

            case SELF:
                if (targetEmployeeId.equals(currentEmployeeId)) {
                    return;
                }
                break;

            case CUSTOM:
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
        Set<UUID> customEmployeeIds = SecurityContext.getCustomEmployeeIds(permission);
        if (customEmployeeIds != null && customEmployeeIds.contains(employeeId)) {
            return true;
        }

        Set<UUID> customDepartmentIds = SecurityContext.getCustomDepartmentIds(permission);
        if (customDepartmentIds != null && !customDepartmentIds.isEmpty()) {
            UUID tenantId = TenantContext.getCurrentTenant();
            Optional<Employee> empOpt = employeeRepository.findByIdAndTenantId(employeeId, tenantId);
            if (empOpt.isPresent() && empOpt.get().getDepartmentId() != null
                    && customDepartmentIds.contains(empOpt.get().getDepartmentId())) {
                return true;
            }
        }

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
