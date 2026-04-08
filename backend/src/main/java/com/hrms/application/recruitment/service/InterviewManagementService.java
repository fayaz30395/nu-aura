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

import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.ArrayList;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class InterviewManagementService {

    private static final String INTERVIEW_NOT_FOUND = "Interview not found";

    private final InterviewRepository interviewRepository;
    private final CandidateRepository candidateRepository;
    private final JobOpeningRepository jobOpeningRepository;
    private final EmployeeRepository employeeRepository;
    private final DataScopeService dataScopeService;
    private final AuditLogService auditLogService;
    private final GoogleMeetService googleMeetService;

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

        // Google Meet integration: create a Calendar event with Meet link if requested
        if (request.isCreateGoogleMeet() && request.getGoogleAccessToken() != null) {
            try {
                String candidateName = candidateRepository.findById(request.getCandidateId())
                        .map(Candidate::getFullName).orElse("Candidate");
                String jobTitle = jobOpeningRepository.findById(request.getJobOpeningId())
                        .map(JobOpening::getJobTitle).orElse("Position");
                String title = interview.getInterviewRound() + " Interview - " + candidateName + " (" + jobTitle + ")";
                String description = "Interview scheduled via NU-AURA HRMS\n"
                        + "Candidate: " + candidateName + "\n"
                        + "Position: " + jobTitle + "\n"
                        + "Round: " + interview.getInterviewRound();

                List<String> attendeeEmails = new ArrayList<>();
                candidateRepository.findById(request.getCandidateId())
                        .map(Candidate::getEmail)
                        .ifPresent(attendeeEmails::add);
                if (request.getInterviewerId() != null) {
                    employeeRepository.findById(request.getInterviewerId())
                            .map(Employee::getPersonalEmail)
                            .ifPresent(attendeeEmails::add);
                }

                int duration = request.getDurationMinutes() != null ? request.getDurationMinutes() : 60;

                GoogleMeetService.GoogleMeetResult meetResult = googleMeetService.createMeetEvent(
                        request.getGoogleAccessToken(),
                        title,
                        description,
                        request.getScheduledAt(),
                        duration,
                        attendeeEmails,
                        request.getLocation()
                );

                if (meetResult.success()) {
                    interview.setGoogleMeetLink(meetResult.meetLink());
                    interview.setGoogleCalendarEventId(meetResult.calendarEventId());
                    if (interview.getMeetingLink() == null || interview.getMeetingLink().isBlank()) {
                        interview.setMeetingLink(meetResult.meetLink());
                    }
                    log.info("Google Meet created for interview: {}", meetResult.meetLink());
                } else {
                    log.warn("Google Meet creation failed: {}. Interview will be saved without Meet link.", meetResult.errorMessage());
                }
            } catch (Exception e) { // Intentional broad catch — recruitment processing error boundary
                log.error("Error creating Google Meet for interview: {}", e.getMessage(), e);
                // Don't fail the interview creation if Meet creation fails
            }
        }

        Interview savedInterview = interviewRepository.save(interview);

        auditLogService.logAction(
                "INTERVIEW",
                savedInterview.getId(),
                AuditAction.CREATE,
                null,
                savedInterview.getInterviewRound() + " - " + savedInterview.getStatus(),
                "Interview scheduled: " + savedInterview.getInterviewRound() + " for candidate " + savedInterview.getCandidateId() + " at " + savedInterview.getScheduledAt()
        );

        return mapToInterviewResponse(savedInterview);
    }

    @Transactional
    public InterviewResponse updateInterview(UUID interviewId, InterviewRequest request) {
        UUID tenantId = TenantContext.getCurrentTenant();
        log.info("Updating interview {} for tenant {}", interviewId, tenantId);

        Interview interview = interviewRepository.findByIdAndTenantId(interviewId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException(INTERVIEW_NOT_FOUND));

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

        auditLogService.logAction(
                "INTERVIEW",
                interviewId,
                AuditAction.UPDATE,
                null,
                updatedInterview.getInterviewRound() + " - " + updatedInterview.getStatus() + (updatedInterview.getResult() != null ? " - " + updatedInterview.getResult() : ""),
                "Interview updated: " + updatedInterview.getInterviewRound() + " for candidate " + updatedInterview.getCandidateId()
        );

        return mapToInterviewResponse(updatedInterview);
    }

    @Transactional(readOnly = true)
    public Page<InterviewResponse> getAllInterviews(Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenant();
        String permission = determineViewPermission();
        Specification<Interview> scopeSpec = dataScopeService.getScopeSpecification(permission);
        Specification<Interview> tenantSpec = (root, query, cb) -> {
            // BUG-006 FIX: Prevent duplicate rows when scope predicates produce joins
            if (query != null && Long.class != query.getResultType()) {
                query.distinct(true);
            }
            return cb.equal(root.get("tenantId"), tenantId);
        };
        return interviewRepository.findAll(
                        Specification.where(tenantSpec).and(scopeSpec), pageable)
                .map(this::mapToInterviewResponse);
    }

    @Transactional(readOnly = true)
    public InterviewResponse getInterviewById(UUID interviewId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        Interview interview = interviewRepository.findByIdAndTenantId(interviewId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException(INTERVIEW_NOT_FOUND));

        String permission = determineViewPermission();
        validateInterviewAccess(interview, permission);

        return mapToInterviewResponse(interview);
    }

    @Transactional(readOnly = true)
    public Page<InterviewResponse> getInterviewsByCandidate(UUID candidateId, Pageable pageable) {
        String permission = determineViewPermission();

        UUID tenantId = TenantContext.getCurrentTenant();
        Candidate candidate = candidateRepository.findByIdAndTenantId(candidateId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Candidate not found"));
        validateCandidateAccess(candidate, permission);

        Specification<Interview> scopeSpec = dataScopeService.getScopeSpecification(permission);
        Specification<Interview> tenantSpec = (root, query, cb) -> {
            // BUG-006 FIX: Prevent duplicate rows when scope predicates produce joins
            if (query != null && Long.class != query.getResultType()) {
                query.distinct(true);
            }
            return cb.equal(root.get("tenantId"), tenantId);
        };
        Specification<Interview> candidateSpec = (root, query, cb) -> cb.equal(root.get("candidateId"), candidateId);

        return interviewRepository.findAll(
                Specification.where(tenantSpec).and(candidateSpec).and(scopeSpec),
                pageable).map(this::mapToInterviewResponse);
    }

    @Transactional
    public void deleteInterview(UUID interviewId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        Interview interview = interviewRepository.findByIdAndTenantId(interviewId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException(INTERVIEW_NOT_FOUND));

        auditLogService.logAction(
                "INTERVIEW",
                interviewId,
                AuditAction.DELETE,
                interview.getInterviewRound() + " - " + interview.getStatus(),
                null,
                "Interview deleted: " + interview.getInterviewRound() + " for candidate " + interview.getCandidateId()
        );

        interviewRepository.delete(interview);
    }

    // ==================== Mapper ====================

    InterviewResponse mapToInterviewResponse(Interview interview) {
        String candidateName = null;
        if (interview.getCandidateId() != null) {
            candidateName = candidateRepository.findById(interview.getCandidateId())
                    .map(Candidate::getFullName)
                    .orElse(null);
        }

        String jobTitle = null;
        if (interview.getJobOpeningId() != null) {
            jobTitle = jobOpeningRepository.findById(interview.getJobOpeningId())
                    .map(JobOpening::getJobTitle)
                    .orElse(null);
        }

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
                .createdBy(interview.getCreatedBy())
                .lastModifiedBy(interview.getLastModifiedBy())
                .version(interview.getVersion())
                .googleMeetLink(interview.getGoogleMeetLink())
                .googleCalendarEventId(interview.getGoogleCalendarEventId())
                .build();
    }

    // ==================== Scope Validation Helpers ====================

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

    private void validateInterviewAccess(Interview interview, String permission) {
        if (interview.getInterviewerId() != null) {
            validateEmployeeAccess(interview.getInterviewerId(), permission);
        }
    }

    private void validateCandidateAccess(Candidate candidate, String permission) {
        if (candidate.getAssignedRecruiterId() != null) {
            validateEmployeeAccess(candidate.getAssignedRecruiterId(), permission);
        }
    }

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

        throw new AccessDeniedException("You do not have permission to access this recruitment data");
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
