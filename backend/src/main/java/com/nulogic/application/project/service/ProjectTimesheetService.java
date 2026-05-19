package com.nulogic.application.project.service;

import com.nulogic.api.project.dto.ProjectMemberRequest;
import com.nulogic.api.project.dto.ProjectMemberResponse;
import com.nulogic.api.project.dto.TimeEntryRequest;
import com.nulogic.api.project.dto.TimeEntryResponse;
import com.nulogic.api.workflow.dto.WorkflowExecutionRequest;
import com.nulogic.application.project.validation.TimeEntryValidator;
import com.nulogic.application.workflow.callback.ApprovalCallbackHandler;
import com.nulogic.application.workflow.service.WorkflowService;
import com.nulogic.common.security.Permission;
import com.nulogic.common.security.SecurityContext;
import com.nulogic.common.security.TenantContext;
import com.nulogic.common.util.TenantTimeService;
import com.nulogic.domain.employee.Employee;
import com.nulogic.domain.project.ProjectMember;
import com.nulogic.domain.project.TimeEntry;
import com.nulogic.domain.workflow.WorkflowDefinition;
import com.nulogic.infrastructure.employee.repository.EmployeeRepository;
import com.nulogic.infrastructure.project.repository.HrmsProjectMemberRepository;
import com.nulogic.infrastructure.project.repository.ProjectTimeEntryRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service("projectTimesheetService")
@Transactional
public class ProjectTimesheetService implements ApprovalCallbackHandler {

    private final ProjectTimeEntryRepository timeEntryRepository;
    private final HrmsProjectMemberRepository projectMemberRepository;
    private final EmployeeRepository employeeRepository;
    private final TimeEntryValidator timeEntryValidator;
    private final WorkflowService workflowService;
    private final TenantTimeService tenantTimeService;

    public ProjectTimesheetService(ProjectTimeEntryRepository timeEntryRepository,
                                   HrmsProjectMemberRepository projectMemberRepository,
                                   EmployeeRepository employeeRepository,
                                   TimeEntryValidator timeEntryValidator,
                                   @org.springframework.context.annotation.Lazy WorkflowService workflowService,
                                   TenantTimeService tenantTimeService) {
        this.timeEntryRepository = timeEntryRepository;
        this.projectMemberRepository = projectMemberRepository;
        this.employeeRepository = employeeRepository;
        this.timeEntryValidator = timeEntryValidator;
        this.workflowService = workflowService;
        this.tenantTimeService = tenantTimeService;
    }

    // ==================== Time Entry Operations ====================

    @Transactional
    public TimeEntryResponse createTimeEntry(TimeEntryRequest request) {
        UUID tenantId = TenantContext.getCurrentTenant();
        UUID employeeId = resolveSelfServiceEmployeeId(request.getEmployeeId());
        log.info("Creating time entry for employee {} on project {} for date {}",
                employeeId, request.getProjectId(), request.getWorkDate());

        // Validate time entry
        TimeEntryValidator.TimeEntryValidationRequest validationRequest =
                new TimeEntryValidator.TimeEntryValidationRequest(
                        employeeId,
                        request.getProjectId(),
                        request.getWorkDate(),
                        request.getHoursWorked(),
                        request.getIsBillable(),
                        request.getBillingRate()
                );
        List<String> validationErrors = timeEntryValidator.validate(validationRequest, tenantId, null);
        if (!validationErrors.isEmpty()) {
            throw new IllegalArgumentException("Validation failed: " + String.join(", ", validationErrors));
        }

        // Verify employee exists
        employeeRepository.findByIdAndTenantId(employeeId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Employee not found"));

        TimeEntry timeEntry = new TimeEntry();
        timeEntry.setId(UUID.randomUUID());
        timeEntry.setTenantId(tenantId);
        timeEntry.setProjectId(request.getProjectId());
        timeEntry.setEmployeeId(employeeId);
        timeEntry.setWorkDate(request.getWorkDate());
        timeEntry.setHoursWorked(request.getHoursWorked());
        timeEntry.setDescription(request.getDescription());
        timeEntry.setTaskName(request.getTaskName());
        timeEntry.setEntryType(request.getEntryType() != null ? request.getEntryType() : TimeEntry.EntryType.REGULAR);
        timeEntry.setIsBillable(request.getIsBillable() != null ? request.getIsBillable() : true);
        timeEntry.setStatus(request.getStatus() != null ? request.getStatus() : TimeEntry.TimeEntryStatus.DRAFT);

        // Set billing rate from request or from project member
        if (request.getBillingRate() != null) {
            timeEntry.setBillingRate(request.getBillingRate());
        } else if (timeEntry.getIsBillable()) {
            projectMemberRepository.findByTenantIdAndProjectIdAndEmployeeId(
                            tenantId, request.getProjectId(), employeeId)
                    .ifPresent(member -> timeEntry.setBillingRate(member.getBillingRate()));
        }

        // Calculate billed amount if billable
        if (timeEntry.getIsBillable() && timeEntry.getBillingRate() != null) {
            BigDecimal billedAmount = timeEntry.getHoursWorked().multiply(timeEntry.getBillingRate());
            timeEntry.setBilledAmount(billedAmount);
        }

        TimeEntry savedEntry = timeEntryRepository.save(timeEntry);
        return mapToTimeEntryResponse(savedEntry);
    }

    @Transactional
    public TimeEntryResponse updateTimeEntry(UUID entryId, TimeEntryRequest request) {
        UUID tenantId = TenantContext.getCurrentTenant();
        log.info("Updating time entry {}", entryId);

        TimeEntry timeEntry = timeEntryRepository.findByIdAndTenantId(entryId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Time entry not found"));
        assertCanAccessEmployee(timeEntry.getEmployeeId());

        // Only allow update if in DRAFT or REJECTED status
        if (!timeEntryValidator.canModifyEntry(timeEntry)) {
            throw new IllegalStateException("Cannot update time entry in " + timeEntry.getStatus() + " status");
        }

        // Validate updated time entry
        TimeEntryValidator.TimeEntryValidationRequest validationRequest =
                new TimeEntryValidator.TimeEntryValidationRequest(
                        timeEntry.getEmployeeId(),
                        request.getProjectId(),
                        request.getWorkDate(),
                        request.getHoursWorked(),
                        request.getIsBillable(),
                        request.getBillingRate()
                );
        List<String> validationErrors = timeEntryValidator.validate(validationRequest, tenantId, entryId);
        if (!validationErrors.isEmpty()) {
            throw new IllegalArgumentException("Validation failed: " + String.join(", ", validationErrors));
        }

        timeEntry.setWorkDate(request.getWorkDate());
        timeEntry.setHoursWorked(request.getHoursWorked());
        timeEntry.setDescription(request.getDescription());
        timeEntry.setTaskName(request.getTaskName());
        timeEntry.setEntryType(request.getEntryType());
        timeEntry.setIsBillable(request.getIsBillable());
        timeEntry.setBillingRate(request.getBillingRate());

        // Recalculate billed amount
        if (timeEntry.getIsBillable() && timeEntry.getBillingRate() != null) {
            BigDecimal billedAmount = timeEntry.getHoursWorked().multiply(timeEntry.getBillingRate());
            timeEntry.setBilledAmount(billedAmount);
        } else {
            timeEntry.setBilledAmount(null);
        }

        TimeEntry updatedEntry = timeEntryRepository.save(timeEntry);
        return mapToTimeEntryResponse(updatedEntry);
    }

    @Transactional
    public TimeEntryResponse submitTimeEntry(UUID entryId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        log.info("Submitting time entry {}", entryId);

        TimeEntry timeEntry = timeEntryRepository.findByIdAndTenantId(entryId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Time entry not found"));
        assertCanAccessEmployee(timeEntry.getEmployeeId());

        if (timeEntry.getStatus() != TimeEntry.TimeEntryStatus.DRAFT &&
                timeEntry.getStatus() != TimeEntry.TimeEntryStatus.REJECTED) {
            throw new IllegalStateException("Time entry is already submitted");
        }

        timeEntry.setStatus(TimeEntry.TimeEntryStatus.SUBMITTED);
        timeEntry.setSubmittedAt(tenantTimeService.now(tenantId));

        TimeEntry updatedEntry = timeEntryRepository.save(timeEntry);

        // Start workflow for this time entry's project
        startTimesheetApprovalWorkflow(updatedEntry, tenantId);

        return mapToTimeEntryResponse(updatedEntry);
    }

    @Transactional
    public TimeEntryResponse approveTimeEntry(UUID entryId, UUID approverId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        log.info("Approving time entry {} by approver {}", entryId, approverId);

        TimeEntry timeEntry = timeEntryRepository.findByIdAndTenantId(entryId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Time entry not found"));

        if (timeEntry.getStatus() != TimeEntry.TimeEntryStatus.SUBMITTED) {
            throw new IllegalStateException("Only submitted time entries can be approved");
        }

        timeEntry.setStatus(TimeEntry.TimeEntryStatus.APPROVED);
        timeEntry.setApprovedBy(approverId);
        timeEntry.setApprovedAt(tenantTimeService.now(tenantId));

        TimeEntry updatedEntry = timeEntryRepository.save(timeEntry);
        return mapToTimeEntryResponse(updatedEntry);
    }

    @Transactional
    public TimeEntryResponse rejectTimeEntry(UUID entryId, UUID approverId, String reason) {
        UUID tenantId = TenantContext.getCurrentTenant();
        log.info("Rejecting time entry {} by approver {}", entryId, approverId);

        TimeEntry timeEntry = timeEntryRepository.findByIdAndTenantId(entryId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Time entry not found"));

        if (timeEntry.getStatus() != TimeEntry.TimeEntryStatus.SUBMITTED) {
            throw new IllegalStateException("Only submitted time entries can be rejected");
        }

        timeEntry.setStatus(TimeEntry.TimeEntryStatus.REJECTED);
        timeEntry.setApprovedBy(approverId);
        timeEntry.setApprovedAt(tenantTimeService.now(tenantId));
        timeEntry.setRejectedReason(reason);

        TimeEntry updatedEntry = timeEntryRepository.save(timeEntry);
        return mapToTimeEntryResponse(updatedEntry);
    }

    @Transactional(readOnly = true)
    public TimeEntryResponse getTimeEntryById(UUID entryId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        TimeEntry timeEntry = timeEntryRepository.findByIdAndTenantId(entryId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Time entry not found"));
        assertCanAccessEmployee(timeEntry.getEmployeeId());
        return mapToTimeEntryResponse(timeEntry);
    }

    @Transactional(readOnly = true)
    public Page<TimeEntryResponse> getAllTimeEntries(Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenant();
        if (!canViewAllTimesheets()) {
            UUID employeeId = requireCurrentEmployeeId();
            return timeEntryRepository.findByTenantIdAndEmployeeId(tenantId, employeeId, pageable)
                    .map(this::mapToTimeEntryResponse);
        }
        return timeEntryRepository.findAll(
                (root, query, cb) -> cb.equal(root.get("tenantId"), tenantId),
                pageable
        ).map(this::mapToTimeEntryResponse);
    }

    @Transactional(readOnly = true)
    public List<TimeEntryResponse> getTimeEntriesByEmployee(UUID employeeId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        assertCanAccessEmployee(employeeId);
        return timeEntryRepository.findByTenantIdAndEmployeeId(tenantId, employeeId).stream()
                .map(this::mapToTimeEntryResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<TimeEntryResponse> getTimeEntriesByProject(UUID projectId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        if (!canViewAllTimesheets()) {
            UUID employeeId = requireCurrentEmployeeId();
            return timeEntryRepository.findByTenantIdAndProjectIdAndEmployeeId(tenantId, projectId, employeeId).stream()
                    .map(this::mapToTimeEntryResponse)
                    .collect(Collectors.toList());
        }
        return timeEntryRepository.findByTenantIdAndProjectId(tenantId, projectId).stream()
                .map(this::mapToTimeEntryResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<TimeEntryResponse> getTimeEntriesByDateRange(UUID employeeId, LocalDate startDate, LocalDate endDate) {
        UUID tenantId = TenantContext.getCurrentTenant();
        assertCanAccessEmployee(employeeId);
        return timeEntryRepository.findByTenantIdAndEmployeeIdAndWorkDateBetween(
                        tenantId, employeeId, startDate, endDate).stream()
                .map(this::mapToTimeEntryResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<TimeEntryResponse> getTimeEntriesByStatus(TimeEntry.TimeEntryStatus status) {
        UUID tenantId = TenantContext.getCurrentTenant();
        if (!canViewAllTimesheets()) {
            UUID employeeId = requireCurrentEmployeeId();
            return timeEntryRepository.findByTenantIdAndEmployeeIdAndStatus(tenantId, employeeId, status).stream()
                    .map(this::mapToTimeEntryResponse)
                    .collect(Collectors.toList());
        }
        return timeEntryRepository.findByTenantIdAndStatus(tenantId, status).stream()
                .map(this::mapToTimeEntryResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public void deleteTimeEntry(UUID entryId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        TimeEntry timeEntry = timeEntryRepository.findByIdAndTenantId(entryId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Time entry not found"));
        assertCanAccessEmployee(timeEntry.getEmployeeId());

        // Only allow deletion if in DRAFT status
        if (!timeEntryValidator.canDeleteEntry(timeEntry)) {
            throw new IllegalStateException("Only draft time entries can be deleted");
        }

        timeEntryRepository.delete(timeEntry);
    }

    /**
     * Calculate overtime hours for an employee on a specific date
     */
    @Transactional(readOnly = true)
    public BigDecimal calculateOvertimeForDate(UUID employeeId, LocalDate workDate) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return timeEntryValidator.calculateOvertimeHours(employeeId, workDate, tenantId);
    }

    // ==================== Project Member Operations ====================

    @Transactional
    public ProjectMemberResponse addProjectMember(ProjectMemberRequest request) {
        UUID tenantId = TenantContext.getCurrentTenant();
        log.info("Adding member {} to project {}", request.getEmployeeId(), request.getProjectId());

        // Verify employee exists
        employeeRepository.findByIdAndTenantId(request.getEmployeeId(), tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Employee not found"));

        // Check if member already exists
        projectMemberRepository.findByTenantIdAndProjectIdAndEmployeeId(
                        tenantId, request.getProjectId(), request.getEmployeeId())
                .ifPresent(existing -> {
                    throw new IllegalArgumentException("Employee is already a member of this project");
                });

        ProjectMember member = new ProjectMember();
        member.setId(UUID.randomUUID());
        member.setTenantId(tenantId);
        member.setProjectId(request.getProjectId());
        member.setEmployeeId(request.getEmployeeId());
        member.setRole(request.getRole() != null ? request.getRole() : ProjectMember.ProjectRole.MEMBER);
        member.setAllocationPercentage(request.getAllocationPercentage());
        member.setBillingRate(request.getBillingRate());
        member.setCostRate(request.getCostRate());
        member.setStartDate(request.getStartDate() != null ? request.getStartDate() : tenantTimeService.today(tenantId));
        member.setEndDate(request.getEndDate());
        member.setIsActive(request.getIsActive() != null ? request.getIsActive() : true);
        member.setCanApproveTime(request.getCanApproveTime() != null ? request.getCanApproveTime() : false);
        member.setNotes(request.getNotes());

        ProjectMember savedMember = projectMemberRepository.save(member);
        return mapToProjectMemberResponse(savedMember);
    }

    @Transactional
    public ProjectMemberResponse updateProjectMember(UUID memberId, ProjectMemberRequest request) {
        UUID tenantId = TenantContext.getCurrentTenant();
        log.info("Updating project member {}", memberId);

        ProjectMember member = projectMemberRepository.findByIdAndTenantId(memberId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Project member not found"));

        member.setRole(request.getRole());
        member.setAllocationPercentage(request.getAllocationPercentage());
        member.setBillingRate(request.getBillingRate());
        member.setCostRate(request.getCostRate());
        member.setStartDate(request.getStartDate());
        member.setEndDate(request.getEndDate());
        member.setIsActive(request.getIsActive());
        member.setCanApproveTime(request.getCanApproveTime());
        member.setNotes(request.getNotes());

        ProjectMember updatedMember = projectMemberRepository.save(member);
        return mapToProjectMemberResponse(updatedMember);
    }

    @Transactional(readOnly = true)
    public ProjectMemberResponse getProjectMemberById(UUID memberId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        ProjectMember member = projectMemberRepository.findByIdAndTenantId(memberId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Project member not found"));
        return mapToProjectMemberResponse(member);
    }

    @Transactional(readOnly = true)
    public List<ProjectMemberResponse> getProjectMembers(UUID projectId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return projectMemberRepository.findByTenantIdAndProjectId(tenantId, projectId).stream()
                .map(this::mapToProjectMemberResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<ProjectMemberResponse> getEmployeeProjects(UUID employeeId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return projectMemberRepository.findByTenantIdAndEmployeeId(tenantId, employeeId).stream()
                .map(this::mapToProjectMemberResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<ProjectMemberResponse> getActiveProjectMembers(UUID projectId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return projectMemberRepository.findByTenantIdAndProjectIdAndIsActive(tenantId, projectId, true).stream()
                .map(this::mapToProjectMemberResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public void removeProjectMember(UUID memberId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        ProjectMember member = projectMemberRepository.findByIdAndTenantId(memberId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Project member not found"));
        projectMemberRepository.delete(member);
    }

    // ==================== ApprovalCallbackHandler ====================

    @Override
    public WorkflowDefinition.EntityType getEntityType() {
        return WorkflowDefinition.EntityType.TIMESHEET;
    }

    @Override
    @Transactional
    public void onApproved(UUID tenantId, UUID entityId, UUID approvedBy) {
        log.info("Timesheet entry {} approved via workflow by {}", entityId, approvedBy);

        TimeEntry timeEntry = timeEntryRepository.findByIdAndTenantId(entityId, tenantId).orElse(null);
        if (timeEntry == null) {
            log.warn("Time entry {} not found for approval callback", entityId);
            return;
        }

        if (timeEntry.getStatus() != TimeEntry.TimeEntryStatus.SUBMITTED) {
            log.warn("Time entry {} already in status {}, skipping approval", entityId, timeEntry.getStatus());
            return;
        }

        timeEntry.setStatus(TimeEntry.TimeEntryStatus.APPROVED);
        timeEntry.setApprovedBy(approvedBy);
        timeEntry.setApprovedAt(tenantTimeService.now(tenantId));
        timeEntryRepository.save(timeEntry);
    }

    @Override
    @Transactional
    public void onRejected(UUID tenantId, UUID entityId, UUID rejectedBy, String reason) {
        log.info("Timesheet entry {} rejected via workflow by {}", entityId, rejectedBy);

        TimeEntry timeEntry = timeEntryRepository.findByIdAndTenantId(entityId, tenantId).orElse(null);
        if (timeEntry == null) {
            log.warn("Time entry {} not found for rejection callback", entityId);
            return;
        }

        if (timeEntry.getStatus() != TimeEntry.TimeEntryStatus.SUBMITTED) {
            log.warn("Time entry {} already in status {}, skipping rejection", entityId, timeEntry.getStatus());
            return;
        }

        timeEntry.setStatus(TimeEntry.TimeEntryStatus.REJECTED);
        timeEntry.setApprovedBy(rejectedBy);
        timeEntry.setApprovedAt(tenantTimeService.now(tenantId));
        timeEntry.setRejectedReason(reason);
        timeEntryRepository.save(timeEntry);
    }

    /**
     * Starts a timesheet approval workflow for a single time entry.
     * Each time entry is submitted per-project; the workflow engine resolves
     * the approver (typically the project manager or reporting manager).
     */
    private void startTimesheetApprovalWorkflow(TimeEntry timeEntry, UUID tenantId) {
        try {
            String employeeName = employeeRepository.findByIdAndTenantId(timeEntry.getEmployeeId(), tenantId)
                    .map(Employee::getFullName).orElse("Employee");

            WorkflowExecutionRequest workflowRequest = new WorkflowExecutionRequest();
            workflowRequest.setEntityType(WorkflowDefinition.EntityType.TIMESHEET);
            workflowRequest.setEntityId(timeEntry.getId());
            workflowRequest.setTitle("Timesheet Approval: " + employeeName
                    + " - " + timeEntry.getWorkDate() + " (" + timeEntry.getHoursWorked() + "h)");

            workflowService.startWorkflow(workflowRequest);
            log.info("Workflow started for timesheet entry: {}", timeEntry.getId());
        } catch (Exception e) { // Intentional broad catch — timesheet calculation error boundary
            log.warn("Could not start approval workflow for timesheet entry {}: {}",
                    timeEntry.getId(), e.getMessage());
        }
    }

    // ==================== Helper Methods ====================

    private TimeEntryResponse mapToTimeEntryResponse(TimeEntry entry) {
        String projectName = null; // Would fetch from ProjectRepository

        String employeeName = employeeRepository.findByIdAndTenantId(entry.getEmployeeId(), entry.getTenantId())
                .map(Employee::getFullName)
                .orElse(null);

        String approvedByName = null;
        if (entry.getApprovedBy() != null) {
            approvedByName = employeeRepository.findByIdAndTenantId(entry.getApprovedBy(), entry.getTenantId())
                    .map(Employee::getFullName)
                    .orElse(null);
        }

        return TimeEntryResponse.builder()
                .id(entry.getId())
                .tenantId(entry.getTenantId())
                .projectId(entry.getProjectId())
                .projectName(projectName)
                .employeeId(entry.getEmployeeId())
                .employeeName(employeeName)
                .workDate(entry.getWorkDate())
                .hoursWorked(entry.getHoursWorked())
                .description(entry.getDescription())
                .taskName(entry.getTaskName())
                .entryType(entry.getEntryType())
                .isBillable(entry.getIsBillable())
                .billingRate(entry.getBillingRate())
                .billedAmount(entry.getBilledAmount())
                .status(entry.getStatus())
                .approvedBy(entry.getApprovedBy())
                .approvedByName(approvedByName)
                .approvedAt(entry.getApprovedAt())
                .submittedAt(entry.getSubmittedAt())
                .rejectedReason(entry.getRejectedReason())
                .createdAt(entry.getCreatedAt())
                .updatedAt(entry.getUpdatedAt())
                .build();
    }

    private UUID resolveSelfServiceEmployeeId(UUID requestedEmployeeId) {
        if (canManageTimesheets()) {
            return requestedEmployeeId != null ? requestedEmployeeId : requireCurrentEmployeeId();
        }

        UUID currentEmployeeId = requireCurrentEmployeeId();
        if (requestedEmployeeId != null && !currentEmployeeId.equals(requestedEmployeeId)) {
            throw new AccessDeniedException("Cannot log time for another employee");
        }
        return currentEmployeeId;
    }

    private void assertCanAccessEmployee(UUID employeeId) {
        if (canViewAllTimesheets()) {
            return;
        }
        UUID currentEmployeeId = requireCurrentEmployeeId();
        if (!currentEmployeeId.equals(employeeId)) {
            throw new AccessDeniedException("Cannot access another employee's time entry");
        }
    }

    private UUID requireCurrentEmployeeId() {
        UUID currentEmployeeId = SecurityContext.getCurrentEmployeeId();
        if (currentEmployeeId == null) {
            throw new AccessDeniedException("Current user is not linked to an employee");
        }
        return currentEmployeeId;
    }

    private boolean canManageTimesheets() {
        return SecurityContext.isSuperAdmin()
                || SecurityContext.hasAnyPermission(Permission.PROJECT_MANAGE, Permission.TIMESHEET_APPROVE);
    }

    private boolean canViewAllTimesheets() {
        return canManageTimesheets();
    }

    private ProjectMemberResponse mapToProjectMemberResponse(ProjectMember member) {
        String projectName = null; // Would fetch from ProjectRepository

        String employeeName = employeeRepository.findByIdAndTenantId(member.getEmployeeId(), member.getTenantId())
                .map(Employee::getFullName)
                .orElse(null);

        return ProjectMemberResponse.builder()
                .id(member.getId())
                .tenantId(member.getTenantId())
                .projectId(member.getProjectId())
                .projectName(projectName)
                .employeeId(member.getEmployeeId())
                .employeeName(employeeName)
                .role(member.getRole())
                .allocationPercentage(member.getAllocationPercentage())
                .billingRate(member.getBillingRate())
                .costRate(member.getCostRate())
                .startDate(member.getStartDate())
                .endDate(member.getEndDate())
                .isActive(member.getIsActive())
                .canApproveTime(member.getCanApproveTime())
                .notes(member.getNotes())
                .createdAt(member.getCreatedAt())
                .updatedAt(member.getUpdatedAt())
                .build();
    }
}
