package com.hrms.application.workflow.service;

import com.hrms.api.workflow.dto.*;
import com.hrms.common.security.SecurityContext;
import com.hrms.common.security.TenantContext;
import com.hrms.common.exception.BusinessException;
import com.hrms.domain.workflow.*;
import com.hrms.infrastructure.employee.repository.DepartmentRepository;
import com.hrms.infrastructure.employee.repository.EmployeeRepository;
import com.hrms.infrastructure.user.repository.UserRepository;
import com.hrms.infrastructure.workflow.repository.*;
import com.hrms.infrastructure.leave.repository.LeaveRequestRepository;
import com.hrms.application.event.DomainEventPublisher;
import com.hrms.application.audit.service.AuditLogService;
import com.hrms.application.workflow.callback.ApprovalCallbackHandler;
import com.hrms.domain.event.workflow.ApprovalDecisionEvent;
import com.hrms.domain.event.workflow.ApprovalTaskAssignedEvent;
import com.hrms.domain.audit.AuditLog.AuditAction;
import com.hrms.domain.leave.LeaveRequest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@Slf4j
public class WorkflowService {

    private final WorkflowDefinitionRepository workflowDefinitionRepository;
    private final ApprovalStepRepository approvalStepRepository;
    private final WorkflowExecutionRepository workflowExecutionRepository;
    private final StepExecutionRepository stepExecutionRepository;
    private final ApprovalDelegateRepository approvalDelegateRepository;
    private final WorkflowRuleRepository workflowRuleRepository;
    private final EmployeeRepository employeeRepository;
    private final DepartmentRepository departmentRepository;
    private final UserRepository userRepository;
    private final DomainEventPublisher domainEventPublisher;
    private final AuditLogService auditLogService;
    private final LeaveRequestRepository leaveRequestRepository;

    /** Callback handlers indexed by entity type — populated at startup. */
    private Map<WorkflowDefinition.EntityType, ApprovalCallbackHandler> callbackHandlerMap = Collections.emptyMap();

    public WorkflowService(
            WorkflowDefinitionRepository workflowDefinitionRepository,
            ApprovalStepRepository approvalStepRepository,
            WorkflowExecutionRepository workflowExecutionRepository,
            StepExecutionRepository stepExecutionRepository,
            ApprovalDelegateRepository approvalDelegateRepository,
            WorkflowRuleRepository workflowRuleRepository,
            EmployeeRepository employeeRepository,
            DepartmentRepository departmentRepository,
            UserRepository userRepository,
            DomainEventPublisher domainEventPublisher,
            AuditLogService auditLogService,
            LeaveRequestRepository leaveRequestRepository,
            @org.springframework.lang.Nullable List<ApprovalCallbackHandler> callbackHandlers) {
        this.workflowDefinitionRepository = workflowDefinitionRepository;
        this.approvalStepRepository = approvalStepRepository;
        this.workflowExecutionRepository = workflowExecutionRepository;
        this.stepExecutionRepository = stepExecutionRepository;
        this.approvalDelegateRepository = approvalDelegateRepository;
        this.workflowRuleRepository = workflowRuleRepository;
        this.employeeRepository = employeeRepository;
        this.departmentRepository = departmentRepository;
        this.userRepository = userRepository;
        this.domainEventPublisher = domainEventPublisher;
        this.auditLogService = auditLogService;
        this.leaveRequestRepository = leaveRequestRepository;
        if (callbackHandlers != null && !callbackHandlers.isEmpty()) {
            this.callbackHandlerMap = callbackHandlers.stream()
                    .collect(Collectors.toMap(
                            ApprovalCallbackHandler::getEntityType,
                            Function.identity(),
                            (a, b) -> {
                                log.warn("Duplicate ApprovalCallbackHandler for entity type {}; keeping first", a.getEntityType());
                                return a;
                            }));
            log.info("Registered {} approval callback handlers: {}", callbackHandlerMap.size(), callbackHandlerMap.keySet());
        }
    }

    /**
     * Get user name from employee repository, falling back to UUID prefix if not found.
     */
    private String getUserName(UUID userId, UUID tenantId) {
        if (userId == null) return "System";
        return employeeRepository.findByIdAndTenantId(userId, tenantId)
                .map(emp -> emp.getFirstName() + " " + emp.getLastName())
                .orElse("User " + userId.toString().substring(0, 8));
    }

    // ==================== Workflow Definition Management ====================

    @Transactional
    public WorkflowDefinitionResponse createWorkflowDefinition(WorkflowDefinitionRequest request) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        UUID currentUser = SecurityContext.getCurrentUserId();

        if (workflowDefinitionRepository.existsByTenantIdAndNameAndIsActiveTrue(tenantId, request.getName())) {
            throw new BusinessException("Workflow with name '" + request.getName() + "' already exists");
        }

        WorkflowDefinition definition = WorkflowDefinition.builder()
                .name(request.getName())
                .description(request.getDescription())
                .entityType(request.getEntityType())
                .workflowType(request.getWorkflowType())
                .workflowVersion(1)
                .isActive(true)
                .isDefault(request.isDefault())
                .departmentId(request.getDepartmentId())
                .locationId(request.getLocationId())
                .applicableGrades(request.getApplicableGrades())
                .minAmount(request.getMinAmount())
                .maxAmount(request.getMaxAmount())
                .defaultSlaHours(request.getDefaultSlaHours())
                .escalationEnabled(request.isEscalationEnabled())
                .escalationAfterHours(request.getEscalationAfterHours())
                .notifyOnSubmission(request.isNotifyOnSubmission())
                .notifyOnApproval(request.isNotifyOnApproval())
                .notifyOnRejection(request.isNotifyOnRejection())
                .notifyOnEscalation(request.isNotifyOnEscalation())
                .allowParallelApproval(request.isAllowParallelApproval())
                .autoApproveEnabled(request.isAutoApproveEnabled())
                .autoApproveCondition(request.getAutoApproveCondition())
                .skipLevelAllowed(request.isSkipLevelAllowed())
                // createdBy is handled by JPA auditing via @CreatedBy in BaseEntity
                .build();

        definition.setTenantId(tenantId);

        // Handle default workflow - unset any existing default for same entity type
        if (request.isDefault()) {
            workflowDefinitionRepository.findDefaultWorkflow(tenantId, request.getEntityType())
                    .ifPresent(existing -> {
                        existing.setDefault(false);
                        workflowDefinitionRepository.save(existing);
                    });
        }

        WorkflowDefinition saved = workflowDefinitionRepository.save(definition);

        // Add approval steps
        if (request.getSteps() != null && !request.getSteps().isEmpty()) {
            for (ApprovalStepRequest stepRequest : request.getSteps()) {
                ApprovalStep step = createApprovalStep(saved, stepRequest);
                step.setTenantId(tenantId);
                saved.addStep(step);
            }
            saved = workflowDefinitionRepository.save(saved);
        }

        log.info("Created workflow definition: {} for entity type: {}", saved.getName(), saved.getEntityType());
        return WorkflowDefinitionResponse.from(saved);
    }

    private ApprovalStep createApprovalStep(WorkflowDefinition definition, ApprovalStepRequest request) {
        return ApprovalStep.builder()
                .workflowDefinition(definition)
                .stepOrder(request.getStepOrder())
                .stepName(request.getStepName())
                .description(request.getDescription())
                .approverType(request.getApproverType())
                .specificUserId(request.getSpecificUserId())
                .roleId(request.getRoleId())
                .roleName(request.getRoleName())
                .departmentId(request.getDepartmentId())
                .hierarchyLevel(request.getHierarchyLevel())
                .approverExpression(request.getApproverExpression())
                .minApprovals(request.getMinApprovals())
                .isOptional(request.isOptional())
                .condition(request.getCondition())
                .slaHours(request.getSlaHours())
                .escalationEnabled(request.isEscalationEnabled())
                .escalateAfterHours(request.getEscalateAfterHours())
                .escalateToUserId(request.getEscalateToUserId())
                .escalateToRoleId(request.getEscalateToRoleId())
                .autoApproveOnTimeout(request.isAutoApproveOnTimeout())
                .autoRejectOnTimeout(request.isAutoRejectOnTimeout())
                .notificationTemplate(request.getNotificationTemplate())
                .reminderTemplate(request.getReminderTemplate())
                .escalationTemplate(request.getEscalationTemplate())
                .delegationAllowed(request.isDelegationAllowed())
                .commentsRequired(request.isCommentsRequired())
                .attachmentsAllowed(request.isAttachmentsAllowed())
                .build();
    }

    @Transactional(readOnly = true)
    public WorkflowDefinitionResponse getWorkflowDefinition(UUID id) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        WorkflowDefinition definition = workflowDefinitionRepository.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new BusinessException("Workflow definition not found"));
        return WorkflowDefinitionResponse.from(definition);
    }

    @Transactional(readOnly = true)
    public Page<WorkflowDefinitionResponse> getAllWorkflowDefinitions(Pageable pageable) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        return workflowDefinitionRepository.findByTenantId(tenantId, pageable)
                .map(WorkflowDefinitionResponse::from);
    }

    @Transactional(readOnly = true)
    public List<WorkflowDefinitionResponse> getWorkflowsByEntityType(WorkflowDefinition.EntityType entityType) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        return workflowDefinitionRepository.findByEntityType(tenantId, entityType).stream()
                .map(WorkflowDefinitionResponse::from)
                .collect(Collectors.toList());
    }

    @Transactional
    public WorkflowDefinitionResponse updateWorkflowDefinition(UUID id, WorkflowDefinitionRequest request) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        UUID currentUser = SecurityContext.getCurrentUserId();

        WorkflowDefinition definition = workflowDefinitionRepository.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new BusinessException("Workflow definition not found"));

        // Check for active executions
        long activeExecutions = workflowExecutionRepository.countByStatus(tenantId,
                WorkflowExecution.ExecutionStatus.PENDING);
        if (activeExecutions > 0) {
            // Create new version instead of updating
            definition.setActive(false);
            workflowDefinitionRepository.save(definition);

            request.setDefault(definition.isDefault());
            WorkflowDefinitionResponse newVersion = createWorkflowDefinition(request);
            log.info("Created new version of workflow: {}", definition.getName());
            return newVersion;
        }

        // Update existing
        definition.setName(request.getName());
        definition.setDescription(request.getDescription());
        definition.setWorkflowType(request.getWorkflowType());
        definition.setDepartmentId(request.getDepartmentId());
        definition.setLocationId(request.getLocationId());
        definition.setApplicableGrades(request.getApplicableGrades());
        definition.setMinAmount(request.getMinAmount());
        definition.setMaxAmount(request.getMaxAmount());
        definition.setDefaultSlaHours(request.getDefaultSlaHours());
        definition.setEscalationEnabled(request.isEscalationEnabled());
        definition.setEscalationAfterHours(request.getEscalationAfterHours());
        definition.setNotifyOnSubmission(request.isNotifyOnSubmission());
        definition.setNotifyOnApproval(request.isNotifyOnApproval());
        definition.setNotifyOnRejection(request.isNotifyOnRejection());
        definition.setNotifyOnEscalation(request.isNotifyOnEscalation());
        definition.setAllowParallelApproval(request.isAllowParallelApproval());
        definition.setAutoApproveEnabled(request.isAutoApproveEnabled());
        definition.setAutoApproveCondition(request.getAutoApproveCondition());
        definition.setSkipLevelAllowed(request.isSkipLevelAllowed());
        // updatedBy is handled by JPA auditing via @LastModifiedBy in BaseEntity

        // Update steps
        if (request.getSteps() != null) {
            definition.getSteps().clear();
            for (ApprovalStepRequest stepRequest : request.getSteps()) {
                ApprovalStep step = createApprovalStep(definition, stepRequest);
                step.setTenantId(tenantId);
                definition.addStep(step);
            }
        }

        WorkflowDefinition saved = workflowDefinitionRepository.save(definition);
        return WorkflowDefinitionResponse.from(saved);
    }

    @Transactional
    public void deactivateWorkflowDefinition(UUID id) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        WorkflowDefinition definition = workflowDefinitionRepository.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new BusinessException("Workflow definition not found"));

        definition.setActive(false);
        // updatedBy is handled by JPA auditing via @LastModifiedBy in BaseEntity
        workflowDefinitionRepository.save(definition);

        log.info("Deactivated workflow definition: {}", definition.getName());
    }

    // ==================== Workflow Execution ====================

    @Transactional
    public WorkflowExecutionResponse startWorkflow(WorkflowExecutionRequest request) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        UUID currentUser = SecurityContext.getCurrentUserId();

        // Find appropriate workflow
        WorkflowDefinition workflow = findApplicableWorkflow(tenantId, request);

        if (workflow == null) {
            throw new BusinessException("No applicable workflow found for entity type: " + request.getEntityType());
        }

        // Check for existing execution
        workflowExecutionRepository.findByEntity(tenantId, request.getEntityType(), request.getEntityId())
                .ifPresent(existing -> {
                    if (!existing.isCompleted()) {
                        throw new BusinessException("Active workflow already exists for this entity");
                    }
                });

        // Create execution
        WorkflowExecution execution = WorkflowExecution.builder()
                .workflowDefinition(workflow)
                .entityType(request.getEntityType())
                .entityId(request.getEntityId())
                .requesterId(currentUser)
                .requesterName(null) // Will be set later
                .status(WorkflowExecution.ExecutionStatus.PENDING)
                .currentStepOrder(1)
                .priority(request.getPriority() != null ? request.getPriority() : WorkflowExecution.Priority.NORMAL)
                .title(request.getTitle())
                .contextJson(request.getContextJson())
                .amount(request.getAmount())
                .departmentId(request.getDepartmentId())
                .locationId(request.getLocationId())
                // createdBy is handled by JPA auditing via @CreatedBy in BaseEntity
                .build();

        execution.setTenantId(tenantId);
        execution.setRequesterName(getUserName(currentUser, tenantId));

        // Calculate deadline
        if (workflow.getDefaultSlaHours() > 0) {
            execution.setDeadline(LocalDateTime.now().plusHours(workflow.getDefaultSlaHours()));
        }

        WorkflowExecution saved = workflowExecutionRepository.save(execution);

        // Create first step execution
        createFirstStepExecution(saved, workflow);

        log.info("Started workflow execution: {} for entity: {}", saved.getReferenceNumber(), request.getEntityId());
        return WorkflowExecutionResponse.from(saved);
    }

    private WorkflowDefinition findApplicableWorkflow(UUID tenantId, WorkflowExecutionRequest request) {
        // If specific workflow requested
        if (request.getWorkflowDefinitionId() != null) {
            return workflowDefinitionRepository.findByIdAndTenantId(request.getWorkflowDefinitionId(), tenantId)
                    .filter(WorkflowDefinition::isActive)
                    .orElse(null);
        }

        // Find by amount range if applicable
        if (request.getAmount() != null) {
            List<WorkflowDefinition> workflows = workflowDefinitionRepository
                    .findByEntityTypeAndAmountRange(tenantId, request.getEntityType(), request.getAmount());
            if (!workflows.isEmpty()) {
                return workflows.get(0);
            }
        }

        // Find by department
        if (request.getDepartmentId() != null) {
            Optional<WorkflowDefinition> deptWorkflow = workflowDefinitionRepository
                    .findByEntityTypeAndDepartment(tenantId, request.getEntityType(), request.getDepartmentId());
            if (deptWorkflow.isPresent()) {
                return deptWorkflow.get();
            }
        }

        // Fall back to default
        return workflowDefinitionRepository.findDefaultWorkflow(tenantId, request.getEntityType())
                .orElse(null);
    }

    private void createFirstStepExecution(WorkflowExecution execution, WorkflowDefinition workflow) {
        if (workflow.getSteps().isEmpty()) {
            // No steps - auto approve
            execution.approve();
            workflowExecutionRepository.save(execution);
            return;
        }

        ApprovalStep firstStep = workflow.getSteps().stream()
                .filter(s -> s.getStepOrder() == 1)
                .findFirst()
                .orElse(workflow.getSteps().get(0));

        UUID assigneeId = determineApprover(execution, firstStep);

        StepExecution stepExecution = StepExecution.builder()
                .workflowExecution(execution)
                .approvalStep(firstStep)
                .stepOrder(firstStep.getStepOrder())
                .stepName(firstStep.getStepName())
                .status(StepExecution.StepStatus.PENDING)
                .assignedToUserId(assigneeId)
                .build();

        stepExecution.setTenantId(execution.getTenantId());

        if (firstStep.getSlaHours() > 0) {
            stepExecution.setDeadline(LocalDateTime.now().plusHours(firstStep.getSlaHours()));
        }

        execution.addStepExecution(stepExecution);
        execution.setCurrentStepId(firstStep.getId());
        workflowExecutionRepository.save(execution);

        // Publish event to notify the assigned approver
        domainEventPublisher.publish(
                ApprovalTaskAssignedEvent.of(
                        this,
                        execution.getTenantId(),
                        stepExecution.getId(),
                        assigneeId,
                        execution.getEntityType().name(),
                        execution.getRequesterName(),
                        execution.getRequesterId()
                )
        );

        log.debug("Published ApprovalTaskAssignedEvent for step {} assigned to {}", stepExecution.getId(), assigneeId);
    }

    private UUID determineApprover(WorkflowExecution execution, ApprovalStep step) {
        // Check for delegation first
        LocalDate today = LocalDate.now();
        UUID tenantId = execution.getTenantId();
        UUID approverId = null;

        switch (step.getApproverType()) {
            case SPECIFIC_USER:
                approverId = step.getSpecificUserId();
                break;
            case REPORTING_MANAGER:
                approverId = findReportingManager(execution.getRequesterId(), tenantId);
                break;
            case DEPARTMENT_HEAD:
                approverId = findDepartmentHead(execution.getDepartmentId(), tenantId);
                break;
            case HR_MANAGER:
                approverId = findUserByRoleCode("HR_MANAGER", tenantId);
                break;
            case FINANCE_MANAGER:
                approverId = findUserByRoleCode("FINANCE_MANAGER", tenantId);
                break;
            case CEO:
                approverId = findUserByRoleCode("CEO", tenantId);
                break;
            case ROLE:
            case ANY_OF_ROLE:
                approverId = findUserByRoleId(step.getRoleId(), tenantId);
                break;
            default:
                approverId = step.getSpecificUserId();
        }

        if (approverId == null) {
            log.warn("Could not determine approver for step '{}' with approver type '{}' in workflow execution {}",
                    step.getStepName(), step.getApproverType(), execution.getId());
            throw new BusinessException(
                    "Unable to determine approver for step '" + step.getStepName() +
                    "'. Please configure an approver for type: " + step.getApproverType());
        }

        UUID finalApprover = checkDelegation(approverId, tenantId, today);

        // Defensive check: checkDelegation should never return null when given a non-null approver
        if (finalApprover == null) {
            log.error("Delegation check returned null for approver {} - falling back to original approver", approverId);
            return approverId;
        }

        return finalApprover;
    }

    private UUID findReportingManager(UUID employeeUserId, UUID tenantId) {
        return employeeRepository.findByUserIdAndTenantId(employeeUserId, tenantId)
                .map(employee -> employee.getManagerId())
                .orElse(null);
    }

    /**
     * Find the department head (manager) for a given department.
     *
     * <p>Uses {@link com.hrms.domain.employee.Department#getManagerId()}, which stores
     * the employee ID of the person designated as department head/manager.</p>
     *
     * @param departmentId the department to look up
     * @param tenantId     current tenant for isolation
     * @return the employee UUID of the department head, or {@code null} if the
     *         department doesn't exist or has no manager assigned
     */
    private UUID findDepartmentHead(UUID departmentId, UUID tenantId) {
        if (departmentId == null) {
            return null;
        }
        return departmentRepository.findByIdAndTenantId(departmentId, tenantId)
                .map(dept -> dept.getManagerId())
                .orElse(null);
    }

    private UUID findUserByRoleCode(String roleCode, UUID tenantId) {
        List<UUID> userIds = userRepository.findUserIdsByRoleCode(tenantId, roleCode);
        return userIds.isEmpty() ? null : userIds.get(0);
    }

    private UUID findUserByRoleId(UUID roleId, UUID tenantId) {
        if (roleId == null) {
            return null;
        }
        List<UUID> userIds = userRepository.findUserIdsByRoleId(tenantId, roleId);
        return userIds.isEmpty() ? null : userIds.get(0);
    }

    private UUID checkDelegation(UUID originalApprover, UUID tenantId, LocalDate date) {
        if (originalApprover == null) return null;

        // 1. Explicit manual delegation always wins
        List<ApprovalDelegate> delegations = approvalDelegateRepository
                .findActiveDelegations(tenantId, originalApprover, date);

        if (!delegations.isEmpty()) {
            UUID delegate = delegations.get(0).getDelegateId();
            log.debug("Explicit delegation found: {} -> {}", originalApprover, delegate);
            return delegate;
        }

        // 2. Auto-delegation: if approver is on leave, walk up reporting chain
        return autoDelegateIfOnLeave(originalApprover, tenantId, date);
    }

    /**
     * Auto-delegation: when the designated approver is on approved leave, walk up
     * the reporting chain (max 5 levels) to find the first available manager.
     * Falls back to any SUPER_ADMIN user if the chain is exhausted.
     */
    private UUID autoDelegateIfOnLeave(UUID approverId, UUID tenantId, LocalDate date) {
        // Quick check: if approver is NOT on leave, return them immediately
        if (!isUserOnLeave(approverId, tenantId, date)) {
            return approverId;
        }

        log.info("Approver {} is on leave on {}; walking up reporting chain", approverId, date);

        UUID currentId = approverId;
        int maxLevels = 5;
        Set<UUID> visited = new HashSet<>();
        visited.add(currentId);

        for (int level = 0; level < maxLevels; level++) {
            UUID managerId = findReportingManager(currentId, tenantId);
            if (managerId == null || visited.contains(managerId)) {
                break; // chain exhausted or cycle detected
            }

            visited.add(managerId);

            // Check if this manager also has an explicit delegation
            List<ApprovalDelegate> managerDelegations = approvalDelegateRepository
                    .findActiveDelegations(tenantId, managerId, date);
            if (!managerDelegations.isEmpty()) {
                UUID delegate = managerDelegations.get(0).getDelegateId();
                log.debug("Manager {} has explicit delegation to {}", managerId, delegate);
                return delegate;
            }

            // Check if this manager is available (not on leave)
            if (!isUserOnLeave(managerId, tenantId, date)) {
                log.info("Auto-delegated from {} to {} (level {})", approverId, managerId, level + 1);
                return managerId;
            }

            currentId = managerId;
        }

        // 3. Chain exhausted: fall back to any SUPER_ADMIN user
        UUID superAdmin = findUserByRoleCode("SUPER_ADMIN", tenantId);
        if (superAdmin != null) {
            log.info("Reporting chain exhausted; falling back to SUPER_ADMIN {} for approver {}", superAdmin, approverId);
            return superAdmin;
        }

        // Ultimate fallback: return original approver (better than null)
        log.warn("No available delegate or SUPER_ADMIN found for approver {}; using original", approverId);
        return approverId;
    }

    /**
     * Checks whether a user (identified by their employee/user ID) has an active
     * approved leave covering the given date. Resolves the employee ID from the
     * user ID first, then checks the leave repository.
     */
    private boolean isUserOnLeave(UUID userId, UUID tenantId, LocalDate date) {
        try {
            // The userId in the workflow context could be either a user ID or an employee ID.
            // Try employee lookup by userId (most common for managers stored as employee IDs).
            UUID employeeId = userId;

            // If the user-employee mapping is via a separate User entity, resolve it.
            // However, in this codebase managerId stores the employee ID directly.
            return leaveRequestRepository.isEmployeeOnLeave(tenantId, employeeId, date);
        } catch (Exception e) {
            log.warn("Failed to check leave status for user {}: {}", userId, e.getMessage());
            return false; // assume available on error
        }
    }

    @Transactional
    public WorkflowExecutionResponse processApprovalAction(UUID executionId, ApprovalActionRequest request) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        UUID currentUser = SecurityContext.getCurrentUserId();

        WorkflowExecution execution = workflowExecutionRepository.findByIdAndTenantId(executionId, tenantId)
                .orElseThrow(() -> new BusinessException("Workflow execution not found"));

        // Idempotency: if the workflow is already in a terminal state, return 409 (CONFLICT)
        // BusinessException is mapped to HTTP 409 by GlobalExceptionHandler
        if (execution.isCompleted()) {
            throw new BusinessException(
                    "This approval has already been processed. Current status: " + execution.getStatus());
        }

        if (!execution.canBeApproved()) {
            throw new BusinessException("Workflow cannot be approved in current state: " + execution.getStatus());
        }

        StepExecution currentStep = execution.getCurrentStepExecution();
        if (currentStep == null) {
            throw new BusinessException("No pending step found");
        }

        // Idempotency: if this specific step is already acted upon
        if (currentStep.getStatus() != StepExecution.StepStatus.PENDING) {
            throw new BusinessException(
                    "This step has already been acted upon. Current status: " + currentStep.getStatus());
        }

        if (!currentStep.canBeActedUponBy(currentUser)) {
            throw new BusinessException("You are not authorized to act on this step");
        }

        String userName = getUserName(currentUser, tenantId);
        WorkflowExecution.ExecutionStatus oldStatus = execution.getStatus();

        switch (request.getAction()) {
            case APPROVE:
                currentStep.approve(currentUser, userName, request.getComments());
                advanceToNextStep(execution, currentStep);
                // Audit log: step approved
                auditLogService.logAction(
                        "WORKFLOW_EXECUTION",
                        executionId,
                        AuditAction.STATUS_CHANGE,
                        StepExecution.StepStatus.PENDING.toString(),
                        StepExecution.StepStatus.APPROVED.toString(),
                        "Step '" + currentStep.getStepName() + "' approved for " + execution.getTitle() +
                        (request.getComments() != null ? " - Comments: " + request.getComments() : "")
                );
                break;

            case REJECT:
                currentStep.reject(currentUser, userName, request.getComments());
                execution.reject(request.getComments());
                // Audit log: workflow rejected
                auditLogService.logAction(
                        "WORKFLOW_EXECUTION",
                        executionId,
                        AuditAction.STATUS_CHANGE,
                        oldStatus.toString(),
                        WorkflowExecution.ExecutionStatus.REJECTED.toString(),
                        "Workflow rejected at step '" + currentStep.getStepName() + "' for " + execution.getTitle() +
                        (request.getComments() != null ? " - Reason: " + request.getComments() : "")
                );
                break;

            case RETURN_FOR_MODIFICATION:
                currentStep.returnForModification(currentUser, userName, request.getComments());
                execution.setStatus(WorkflowExecution.ExecutionStatus.RETURNED);
                // Audit log: workflow returned
                auditLogService.logAction(
                        "WORKFLOW_EXECUTION",
                        executionId,
                        AuditAction.STATUS_CHANGE,
                        oldStatus.toString(),
                        WorkflowExecution.ExecutionStatus.RETURNED.toString(),
                        "Workflow returned for modification at step '" + currentStep.getStepName() + "' for " + execution.getTitle() +
                        (request.getComments() != null ? " - Reason: " + request.getComments() : "")
                );
                break;

            case DELEGATE:
                if (request.getDelegateToUserId() == null) {
                    throw new BusinessException("Delegate user ID is required");
                }
                if (!currentStep.getApprovalStep().isDelegationAllowed()) {
                    throw new BusinessException("Delegation is not allowed for this step");
                }
                currentStep.delegate(currentUser, userName, request.getDelegateToUserId());
                // Audit log: approval delegated
                String delegateName = getUserName(request.getDelegateToUserId(), tenantId);
                auditLogService.logAction(
                        "WORKFLOW_EXECUTION",
                        executionId,
                        AuditAction.UPDATE,
                        "Assigned to: " + userName,
                        "Delegated to: " + delegateName,
                        "Approval at step '" + currentStep.getStepName() + "' delegated for " + execution.getTitle()
                );
                break;

            case HOLD:
                execution.setStatus(WorkflowExecution.ExecutionStatus.ON_HOLD);
                // Audit log: workflow on hold
                auditLogService.logAction(
                        "WORKFLOW_EXECUTION",
                        executionId,
                        AuditAction.STATUS_CHANGE,
                        oldStatus.toString(),
                        WorkflowExecution.ExecutionStatus.ON_HOLD.toString(),
                        "Workflow placed on hold for " + execution.getTitle()
                );
                break;

            default:
                throw new BusinessException("Unsupported action: " + request.getAction());
        }

        WorkflowExecution saved = workflowExecutionRepository.save(execution);
        log.info("Processed action {} on execution {} by user {}", request.getAction(), executionId, currentUser);

        // Publish domain event for APPROVE and REJECT actions
        if (request.getAction() == StepExecution.ApprovalAction.APPROVE ||
                request.getAction() == StepExecution.ApprovalAction.REJECT) {
            String eventAction = request.getAction() == StepExecution.ApprovalAction.APPROVE ? "APPROVED" : "REJECTED";
            domainEventPublisher.publish(
                    ApprovalDecisionEvent.of(this, tenantId, saved, currentStep, eventAction, currentUser, request.getComments()));
        }

        // Invoke module callback when workflow reaches terminal state
        if (saved.isCompleted()) {
            invokeCallback(saved, currentUser, request.getComments());
        }

        return WorkflowExecutionResponse.from(saved);
    }

    /**
     * Invokes the registered {@link ApprovalCallbackHandler} for the entity type
     * of the completed workflow execution, if one exists.
     * Wrapped in try-catch to prevent callback failures from breaking the approval flow.
     */
    private void invokeCallback(WorkflowExecution execution, UUID actingUser, String comments) {
        ApprovalCallbackHandler handler = callbackHandlerMap.get(execution.getEntityType());
        if (handler == null) {
            log.debug("No callback handler registered for entity type: {}", execution.getEntityType());
            return;
        }

        try {
            if (execution.getStatus() == WorkflowExecution.ExecutionStatus.APPROVED) {
                handler.onApproved(execution.getTenantId(), execution.getEntityId(), actingUser);
                log.info("Callback onApproved invoked for {} entity {}", execution.getEntityType(), execution.getEntityId());
            } else if (execution.getStatus() == WorkflowExecution.ExecutionStatus.REJECTED) {
                handler.onRejected(execution.getTenantId(), execution.getEntityId(), actingUser, comments);
                log.info("Callback onRejected invoked for {} entity {}", execution.getEntityType(), execution.getEntityId());
            }
        } catch (Exception e) {
            log.error("Approval callback failed for {} entity {}: {}",
                    execution.getEntityType(), execution.getEntityId(), e.getMessage(), e);
        }
    }

    private void advanceToNextStep(WorkflowExecution execution, StepExecution completedStep) {
        WorkflowDefinition workflow = execution.getWorkflowDefinition();
        ApprovalStep nextStep = workflow.getNextStep(completedStep.getStepOrder());

        if (nextStep == null || workflow.isLastStep(completedStep.getStepOrder())) {
            // All steps completed
            WorkflowExecution.ExecutionStatus oldStatus = execution.getStatus();
            execution.approve();

            // Audit log: workflow completed/approved
            auditLogService.logAction(
                    "WORKFLOW_EXECUTION",
                    execution.getId(),
                    AuditAction.STATUS_CHANGE,
                    oldStatus.toString(),
                    WorkflowExecution.ExecutionStatus.APPROVED.toString(),
                    "All approval steps completed - Workflow approved for " + execution.getTitle()
            );
        } else {
            // Create next step execution
            UUID assigneeId = determineApprover(execution, nextStep);

            StepExecution nextStepExecution = StepExecution.builder()
                    .workflowExecution(execution)
                    .approvalStep(nextStep)
                    .stepOrder(nextStep.getStepOrder())
                    .stepName(nextStep.getStepName())
                    .status(StepExecution.StepStatus.PENDING)
                    .assignedToUserId(assigneeId)
                    .build();

            nextStepExecution.setTenantId(execution.getTenantId());

            if (nextStep.getSlaHours() > 0) {
                nextStepExecution.setDeadline(LocalDateTime.now().plusHours(nextStep.getSlaHours()));
            }

            execution.addStepExecution(nextStepExecution);
            execution.setCurrentStepOrder(nextStep.getStepOrder());
            execution.setCurrentStepId(nextStep.getId());
            execution.setStatus(WorkflowExecution.ExecutionStatus.IN_PROGRESS);

            // Audit log: workflow moved to next step
            auditLogService.logAction(
                    "WORKFLOW_EXECUTION",
                    execution.getId(),
                    AuditAction.UPDATE,
                    "Step: " + completedStep.getStepName(),
                    "Step: " + nextStep.getStepName(),
                    "Workflow moved to next approval step for " + execution.getTitle()
            );

            // Publish event to notify the next step's assigned approver
            domainEventPublisher.publish(
                    ApprovalTaskAssignedEvent.of(
                            this,
                            execution.getTenantId(),
                            nextStepExecution.getId(),
                            assigneeId,
                            execution.getEntityType().name(),
                            execution.getRequesterName(),
                            execution.getRequesterId()
                    )
            );

            log.debug("Published ApprovalTaskAssignedEvent for next step {} assigned to {}", nextStepExecution.getId(), assigneeId);
        }
    }

    @Transactional(readOnly = true)
    public WorkflowExecutionResponse getWorkflowExecution(UUID id) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        WorkflowExecution execution = workflowExecutionRepository.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new BusinessException("Workflow execution not found"));
        return WorkflowExecutionResponse.from(execution);
    }

    @Transactional(readOnly = true)
    public WorkflowExecutionResponse getWorkflowByReferenceNumber(String referenceNumber) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        WorkflowExecution execution = workflowExecutionRepository.findByReferenceNumberAndTenantId(referenceNumber, tenantId)
                .orElseThrow(() -> new BusinessException("Workflow execution not found"));
        return WorkflowExecutionResponse.from(execution);
    }

    @Transactional(readOnly = true)
    public List<WorkflowExecutionResponse> getPendingApprovalsForUser(UUID userId) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        List<StepExecution> pendingSteps = stepExecutionRepository.findPendingForUser(tenantId, userId);

        return pendingSteps.stream()
                .map(step -> WorkflowExecutionResponse.from(step.getWorkflowExecution()))
                .distinct()
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<WorkflowExecutionResponse> getMyPendingApprovals() {
        return getPendingApprovalsForUser(SecurityContext.getCurrentUserId());
    }

    @Transactional(readOnly = true)
    public List<WorkflowExecutionResponse> getMyRequests() {
        UUID tenantId = TenantContext.requireCurrentTenant();
        UUID currentUser = SecurityContext.getCurrentUserId();

        return workflowExecutionRepository.findByTenantIdAndRequesterId(tenantId, currentUser).stream()
                .map(WorkflowExecutionResponse::from)
                .collect(Collectors.toList());
    }

    // ==================== Approval Inbox ====================

    /**
     * Paginated approval inbox with server-side filters.
     */
    @Transactional(readOnly = true)
    public Page<WorkflowExecutionResponse> getApprovalInbox(
            String status,
            String module,
            LocalDateTime fromDate,
            LocalDateTime toDate,
            String search,
            Pageable pageable) {

        UUID tenantId = TenantContext.requireCurrentTenant();
        UUID currentUser = SecurityContext.getCurrentUserId();

        // BUG-003 FIX: Guard against null context - return empty page instead of NPE
        if (tenantId == null || currentUser == null) {
            log.warn("Tenant or user context unavailable in getApprovalInbox - returning empty page");
            return Page.empty(pageable);
        }

        // Resolve status filter
        StepExecution.StepStatus stepStatus = null;
        if (status == null || "PENDING".equalsIgnoreCase(status)) {
            stepStatus = StepExecution.StepStatus.PENDING;
        }
        // If status == "ALL", stepStatus remains null → no status filter

        // Resolve entity type filter
        WorkflowDefinition.EntityType entityType = null;
        if (module != null && !module.isEmpty() && !"ALL".equalsIgnoreCase(module)) {
            try {
                entityType = WorkflowDefinition.EntityType.valueOf(module.toUpperCase());
            } catch (IllegalArgumentException e) {
                log.warn("Invalid module filter value: {}", module);
            }
        }

        // Normalize search
        String searchTerm = (search != null && !search.trim().isEmpty()) ? search.trim() : null;

        // Convert enums to strings for native query (PostgreSQL CAST workaround)
        String statusStr = stepStatus != null ? stepStatus.name() : null;
        String entityTypeStr = entityType != null ? entityType.name() : null;

        Page<StepExecution> steps = stepExecutionRepository.findInboxForUser(
                tenantId, currentUser, statusStr, entityTypeStr, fromDate, toDate, searchTerm, pageable);

        // BUG-003 FIX: Filter out steps with null workflowExecution to prevent NPE
        java.util.List<WorkflowExecutionResponse> responses = steps.getContent().stream()
                .filter(step -> {
                    if (step.getWorkflowExecution() == null) {
                        log.warn("StepExecution {} has null workflowExecution - skipping", step.getId());
                        return false;
                    }
                    return true;
                })
                .map(step -> WorkflowExecutionResponse.from(step.getWorkflowExecution()))
                .collect(java.util.stream.Collectors.toList());

        return new org.springframework.data.domain.PageImpl<>(responses, pageable, steps.getTotalElements());
    }

    /**
     * Returns inbox summary counts for the current user:
     * pending, approvedToday, rejectedToday.
     */
    @Transactional(readOnly = true)
    public Map<String, Long> getInboxCounts() {
        UUID tenantId = TenantContext.requireCurrentTenant();
        UUID currentUser = SecurityContext.getCurrentUserId();

        Map<String, Long> counts = new HashMap<>();

        // Guard: if tenant or user context is unavailable, return zeros
        if (tenantId == null || currentUser == null) {
            counts.put("pending", 0L);
            counts.put("approvedToday", 0L);
            counts.put("rejectedToday", 0L);
            return counts;
        }

        try {
            long pending = stepExecutionRepository.countPendingForUser(tenantId, currentUser);
            counts.put("pending", pending);

            LocalDateTime startOfDay = LocalDate.now().atStartOfDay();
            List<Object[]> todayActions = stepExecutionRepository.countTodayActionsByUser(tenantId, currentUser, startOfDay,
                    java.util.List.of(StepExecution.ApprovalAction.APPROVE, StepExecution.ApprovalAction.REJECT));

            long approvedToday = 0;
            long rejectedToday = 0;
            if (todayActions != null) {
                for (Object[] row : todayActions) {
                    if (row == null || row.length < 2 || row[0] == null || row[1] == null) continue;
                    StepExecution.ApprovalAction action = (StepExecution.ApprovalAction) row[0];
                    long count = ((Number) row[1]).longValue();
                    if (action == StepExecution.ApprovalAction.APPROVE) {
                        approvedToday = count;
                    } else if (action == StepExecution.ApprovalAction.REJECT) {
                        rejectedToday = count;
                    }
                }
            }
            counts.put("approvedToday", approvedToday);
            counts.put("rejectedToday", rejectedToday);
        } catch (Exception e) {
            log.warn("Error getting inbox counts for user {}: {}", currentUser, e.getMessage());
            counts.putIfAbsent("pending", 0L);
            counts.putIfAbsent("approvedToday", 0L);
            counts.putIfAbsent("rejectedToday", 0L);
        }

        return counts;
    }

    @Transactional
    public void cancelWorkflow(UUID executionId, String reason) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        UUID currentUser = SecurityContext.getCurrentUserId();

        WorkflowExecution execution = workflowExecutionRepository.findByIdAndTenantId(executionId, tenantId)
                .orElseThrow(() -> new BusinessException("Workflow execution not found"));

        if (!execution.getRequesterId().equals(currentUser)) {
            throw new BusinessException("Only the requester can cancel this workflow");
        }

        if (execution.isCompleted()) {
            throw new BusinessException("Cannot cancel completed workflow");
        }

        WorkflowExecution.ExecutionStatus oldStatus = execution.getStatus();
        execution.cancel(reason);
        workflowExecutionRepository.save(execution);

        // Audit log: workflow cancelled
        auditLogService.logAction(
                "WORKFLOW_EXECUTION",
                executionId,
                AuditAction.STATUS_CHANGE,
                oldStatus.toString(),
                WorkflowExecution.ExecutionStatus.CANCELLED.toString(),
                "Workflow cancelled for " + execution.getTitle() +
                (reason != null ? " - Reason: " + reason : "")
        );

        log.info("Cancelled workflow execution: {} by user {}", executionId, currentUser);
    }

    // ==================== Delegation Management ====================

    @Transactional
    public ApprovalDelegateResponse createDelegation(ApprovalDelegateRequest request) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        UUID currentUser = SecurityContext.getCurrentUserId();

        // Check for existing active delegation
        approvalDelegateRepository.findExistingDelegation(tenantId, currentUser, request.getDelegateId(), LocalDate.now())
                .ifPresent(existing -> {
                    throw new BusinessException("Active delegation already exists for this delegate");
                });

        ApprovalDelegate delegate = ApprovalDelegate.builder()
                .delegatorId(currentUser)
                .delegatorName(getUserName(currentUser, tenantId))
                .delegateId(request.getDelegateId())
                .startDate(request.getStartDate())
                .endDate(request.getEndDate())
                .reason(request.getReason())
                .isActive(true)
                .entityType(request.getEntityType())
                .workflowDefinitionId(request.getWorkflowDefinitionId())
                .departmentId(request.getDepartmentId())
                .maxApprovalAmount(request.getMaxApprovalAmount())
                .canSubDelegate(request.isCanSubDelegate())
                .notifyDelegatorOnAction(request.isNotifyDelegatorOnAction())
                .notifyDelegateOnAssignment(request.isNotifyDelegateOnAssignment())
                .expiryNotificationDays(request.getExpiryNotificationDays())
                // createdBy is handled by JPA auditing via @CreatedBy in BaseEntity
                .build();

        delegate.setTenantId(tenantId);

        ApprovalDelegate saved = approvalDelegateRepository.save(delegate);
        log.info("Created delegation from {} to {} until {}", currentUser, request.getDelegateId(), request.getEndDate());

        return ApprovalDelegateResponse.from(saved);
    }

    @Transactional(readOnly = true)
    public List<ApprovalDelegateResponse> getMyDelegations() {
        UUID tenantId = TenantContext.requireCurrentTenant();
        UUID currentUser = SecurityContext.getCurrentUserId();

        return approvalDelegateRepository.findByDelegatorIdAndTenantId(currentUser, tenantId).stream()
                .map(ApprovalDelegateResponse::from)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<ApprovalDelegateResponse> getDelegationsToMe() {
        UUID tenantId = TenantContext.requireCurrentTenant();
        UUID currentUser = SecurityContext.getCurrentUserId();

        return approvalDelegateRepository.findActiveDelegationsForDelegate(tenantId, currentUser, LocalDate.now()).stream()
                .map(ApprovalDelegateResponse::from)
                .collect(Collectors.toList());
    }

    @Transactional
    public void revokeDelegation(UUID delegationId, String reason) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        UUID currentUser = SecurityContext.getCurrentUserId();

        ApprovalDelegate delegate = approvalDelegateRepository.findByIdAndTenantId(delegationId, tenantId)
                .orElseThrow(() -> new BusinessException("Delegation not found"));

        if (!delegate.getDelegatorId().equals(currentUser)) {
            throw new BusinessException("Only the delegator can revoke this delegation");
        }

        delegate.revoke(currentUser, reason);
        approvalDelegateRepository.save(delegate);

        log.info("Revoked delegation {} by user {}", delegationId, currentUser);
    }

    // ==================== Dashboard & Analytics ====================

    @Transactional(readOnly = true)
    public Map<String, Object> getWorkflowDashboard() {
        UUID tenantId = TenantContext.requireCurrentTenant();
        UUID currentUser = SecurityContext.getCurrentUserId();

        Map<String, Object> dashboard = new HashMap<>();

        // Pending approvals for current user
        long pendingApprovals = stepExecutionRepository.countPendingForUser(tenantId, currentUser);
        dashboard.put("pendingApprovals", pendingApprovals);

        // My pending requests
        long myPendingRequests = workflowExecutionRepository.findByTenantIdAndRequesterId(tenantId, currentUser).stream()
                .filter(e -> e.getStatus() == WorkflowExecution.ExecutionStatus.PENDING ||
                             e.getStatus() == WorkflowExecution.ExecutionStatus.IN_PROGRESS)
                .count();
        dashboard.put("myPendingRequests", myPendingRequests);

        // Overall statistics
        dashboard.put("totalPending", workflowExecutionRepository.countByStatus(tenantId, WorkflowExecution.ExecutionStatus.PENDING));
        dashboard.put("totalApproved", workflowExecutionRepository.countByStatus(tenantId, WorkflowExecution.ExecutionStatus.APPROVED));
        dashboard.put("totalRejected", workflowExecutionRepository.countByStatus(tenantId, WorkflowExecution.ExecutionStatus.REJECTED));

        // Pending by entity type
        List<Object[]> pendingByType = workflowExecutionRepository.getPendingCountByEntityType(tenantId);
        Map<String, Long> pendingByEntityType = new HashMap<>();
        for (Object[] row : pendingByType) {
            pendingByEntityType.put(row[0].toString(), (Long) row[1]);
        }
        dashboard.put("pendingByEntityType", pendingByEntityType);

        // Overdue executions
        long overdueCount = workflowExecutionRepository.findOverdueExecutions(tenantId, LocalDateTime.now()).size();
        dashboard.put("overdueCount", overdueCount);

        // Active delegations
        long activeDelegations = approvalDelegateRepository.countActiveDelegations(tenantId, currentUser);
        dashboard.put("activeDelegations", activeDelegations);

        return dashboard;
    }

    @Transactional(readOnly = true)
    public List<WorkflowExecutionResponse> getOverdueExecutions() {
        UUID tenantId = TenantContext.requireCurrentTenant();
        return workflowExecutionRepository.findOverdueExecutions(tenantId, LocalDateTime.now()).stream()
                .map(WorkflowExecutionResponse::from)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<WorkflowExecutionResponse> getExecutionsDueForEscalation() {
        UUID tenantId = TenantContext.requireCurrentTenant();
        return workflowExecutionRepository.findDueForEscalation(tenantId, LocalDateTime.now()).stream()
                .map(WorkflowExecutionResponse::from)
                .collect(Collectors.toList());
    }
}
