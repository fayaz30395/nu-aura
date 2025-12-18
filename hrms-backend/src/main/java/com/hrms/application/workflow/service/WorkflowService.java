package com.hrms.application.workflow.service;

import com.hrms.api.workflow.dto.*;
import com.hrms.common.security.SecurityContext;
import com.hrms.common.security.TenantContext;
import com.hrms.common.exception.BusinessException;
import com.hrms.domain.workflow.*;
import com.hrms.infrastructure.employee.repository.EmployeeRepository;
import com.hrms.infrastructure.workflow.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class WorkflowService {

    private final WorkflowDefinitionRepository workflowDefinitionRepository;
    private final ApprovalStepRepository approvalStepRepository;
    private final WorkflowExecutionRepository workflowExecutionRepository;
    private final StepExecutionRepository stepExecutionRepository;
    private final ApprovalDelegateRepository approvalDelegateRepository;
    private final WorkflowRuleRepository workflowRuleRepository;
    private final EmployeeRepository employeeRepository;

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

    public WorkflowDefinitionResponse createWorkflowDefinition(WorkflowDefinitionRequest request) {
        UUID tenantId = TenantContext.getCurrentTenant();
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

    public WorkflowDefinitionResponse getWorkflowDefinition(UUID id) {
        UUID tenantId = TenantContext.getCurrentTenant();
        WorkflowDefinition definition = workflowDefinitionRepository.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new BusinessException("Workflow definition not found"));
        return WorkflowDefinitionResponse.from(definition);
    }

    public Page<WorkflowDefinitionResponse> getAllWorkflowDefinitions(Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return workflowDefinitionRepository.findByTenantId(tenantId, pageable)
                .map(WorkflowDefinitionResponse::from);
    }

    public List<WorkflowDefinitionResponse> getWorkflowsByEntityType(WorkflowDefinition.EntityType entityType) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return workflowDefinitionRepository.findByEntityType(tenantId, entityType).stream()
                .map(WorkflowDefinitionResponse::from)
                .collect(Collectors.toList());
    }

    public WorkflowDefinitionResponse updateWorkflowDefinition(UUID id, WorkflowDefinitionRequest request) {
        UUID tenantId = TenantContext.getCurrentTenant();
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

    public void deactivateWorkflowDefinition(UUID id) {
        UUID tenantId = TenantContext.getCurrentTenant();
        WorkflowDefinition definition = workflowDefinitionRepository.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new BusinessException("Workflow definition not found"));

        definition.setActive(false);
        // updatedBy is handled by JPA auditing via @LastModifiedBy in BaseEntity
        workflowDefinitionRepository.save(definition);

        log.info("Deactivated workflow definition: {}", definition.getName());
    }

    // ==================== Workflow Execution ====================

    public WorkflowExecutionResponse startWorkflow(WorkflowExecutionRequest request) {
        UUID tenantId = TenantContext.getCurrentTenant();
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
    }

    private UUID determineApprover(WorkflowExecution execution, ApprovalStep step) {
        // Check for delegation first
        LocalDate today = LocalDate.now();

        switch (step.getApproverType()) {
            case SPECIFIC_USER:
                return checkDelegation(step.getSpecificUserId(), execution.getTenantId(), today);
            case REPORTING_MANAGER:
                // Would need employee service integration
                return null;
            case DEPARTMENT_HEAD:
                // Would need department service integration
                return null;
            case HR_MANAGER:
            case FINANCE_MANAGER:
            case CEO:
                // Would need role-based lookup
                return null;
            case ROLE:
            case ANY_OF_ROLE:
                // Would need role service integration
                return null;
            default:
                return step.getSpecificUserId();
        }
    }

    private UUID checkDelegation(UUID originalApprover, UUID tenantId, LocalDate date) {
        if (originalApprover == null) return null;

        List<ApprovalDelegate> delegations = approvalDelegateRepository
                .findActiveDelegations(tenantId, originalApprover, date);

        if (!delegations.isEmpty()) {
            return delegations.get(0).getDelegateId();
        }

        return originalApprover;
    }

    public WorkflowExecutionResponse processApprovalAction(UUID executionId, ApprovalActionRequest request) {
        UUID tenantId = TenantContext.getCurrentTenant();
        UUID currentUser = SecurityContext.getCurrentUserId();

        WorkflowExecution execution = workflowExecutionRepository.findByIdAndTenantId(executionId, tenantId)
                .orElseThrow(() -> new BusinessException("Workflow execution not found"));

        if (!execution.canBeApproved()) {
            throw new BusinessException("Workflow cannot be approved in current state: " + execution.getStatus());
        }

        StepExecution currentStep = execution.getCurrentStepExecution();
        if (currentStep == null) {
            throw new BusinessException("No pending step found");
        }

        if (!currentStep.canBeActedUponBy(currentUser)) {
            throw new BusinessException("You are not authorized to act on this step");
        }

        String userName = getUserName(currentUser, tenantId);

        switch (request.getAction()) {
            case APPROVE:
                currentStep.approve(currentUser, userName, request.getComments());
                advanceToNextStep(execution, currentStep);
                break;

            case REJECT:
                currentStep.reject(currentUser, userName, request.getComments());
                execution.reject(request.getComments());
                break;

            case RETURN_FOR_MODIFICATION:
                currentStep.returnForModification(currentUser, userName, request.getComments());
                execution.setStatus(WorkflowExecution.ExecutionStatus.RETURNED);
                break;

            case DELEGATE:
                if (request.getDelegateToUserId() == null) {
                    throw new BusinessException("Delegate user ID is required");
                }
                if (!currentStep.getApprovalStep().isDelegationAllowed()) {
                    throw new BusinessException("Delegation is not allowed for this step");
                }
                currentStep.delegate(currentUser, userName, request.getDelegateToUserId());
                break;

            case HOLD:
                execution.setStatus(WorkflowExecution.ExecutionStatus.ON_HOLD);
                break;

            default:
                throw new BusinessException("Unsupported action: " + request.getAction());
        }

        WorkflowExecution saved = workflowExecutionRepository.save(execution);
        log.info("Processed action {} on execution {} by user {}", request.getAction(), executionId, currentUser);

        return WorkflowExecutionResponse.from(saved);
    }

    private void advanceToNextStep(WorkflowExecution execution, StepExecution completedStep) {
        WorkflowDefinition workflow = execution.getWorkflowDefinition();
        ApprovalStep nextStep = workflow.getNextStep(completedStep.getStepOrder());

        if (nextStep == null || workflow.isLastStep(completedStep.getStepOrder())) {
            // All steps completed
            execution.approve();
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
        }
    }

    public WorkflowExecutionResponse getWorkflowExecution(UUID id) {
        UUID tenantId = TenantContext.getCurrentTenant();
        WorkflowExecution execution = workflowExecutionRepository.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new BusinessException("Workflow execution not found"));
        return WorkflowExecutionResponse.from(execution);
    }

    public WorkflowExecutionResponse getWorkflowByReferenceNumber(String referenceNumber) {
        WorkflowExecution execution = workflowExecutionRepository.findByReferenceNumber(referenceNumber)
                .orElseThrow(() -> new BusinessException("Workflow execution not found"));
        return WorkflowExecutionResponse.from(execution);
    }

    public List<WorkflowExecutionResponse> getPendingApprovalsForUser(UUID userId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        List<StepExecution> pendingSteps = stepExecutionRepository.findPendingForUser(tenantId, userId);

        return pendingSteps.stream()
                .map(step -> WorkflowExecutionResponse.from(step.getWorkflowExecution()))
                .distinct()
                .collect(Collectors.toList());
    }

    public List<WorkflowExecutionResponse> getMyPendingApprovals() {
        return getPendingApprovalsForUser(SecurityContext.getCurrentUserId());
    }

    public List<WorkflowExecutionResponse> getMyRequests() {
        UUID tenantId = TenantContext.getCurrentTenant();
        UUID currentUser = SecurityContext.getCurrentUserId();

        return workflowExecutionRepository.findByTenantIdAndRequesterId(tenantId, currentUser).stream()
                .map(WorkflowExecutionResponse::from)
                .collect(Collectors.toList());
    }

    public void cancelWorkflow(UUID executionId, String reason) {
        UUID tenantId = TenantContext.getCurrentTenant();
        UUID currentUser = SecurityContext.getCurrentUserId();

        WorkflowExecution execution = workflowExecutionRepository.findByIdAndTenantId(executionId, tenantId)
                .orElseThrow(() -> new BusinessException("Workflow execution not found"));

        if (!execution.getRequesterId().equals(currentUser)) {
            throw new BusinessException("Only the requester can cancel this workflow");
        }

        if (execution.isCompleted()) {
            throw new BusinessException("Cannot cancel completed workflow");
        }

        execution.cancel(reason);
        workflowExecutionRepository.save(execution);

        log.info("Cancelled workflow execution: {} by user {}", executionId, currentUser);
    }

    // ==================== Delegation Management ====================

    public ApprovalDelegateResponse createDelegation(ApprovalDelegateRequest request) {
        UUID tenantId = TenantContext.getCurrentTenant();
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

    public List<ApprovalDelegateResponse> getMyDelegations() {
        UUID tenantId = TenantContext.getCurrentTenant();
        UUID currentUser = SecurityContext.getCurrentUserId();

        return approvalDelegateRepository.findByDelegatorIdAndTenantId(currentUser, tenantId).stream()
                .map(ApprovalDelegateResponse::from)
                .collect(Collectors.toList());
    }

    public List<ApprovalDelegateResponse> getDelegationsToMe() {
        UUID tenantId = TenantContext.getCurrentTenant();
        UUID currentUser = SecurityContext.getCurrentUserId();

        return approvalDelegateRepository.findActiveDelegationsForDelegate(tenantId, currentUser, LocalDate.now()).stream()
                .map(ApprovalDelegateResponse::from)
                .collect(Collectors.toList());
    }

    public void revokeDelegation(UUID delegationId, String reason) {
        UUID tenantId = TenantContext.getCurrentTenant();
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

    public Map<String, Object> getWorkflowDashboard() {
        UUID tenantId = TenantContext.getCurrentTenant();
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

    public List<WorkflowExecutionResponse> getOverdueExecutions() {
        UUID tenantId = TenantContext.getCurrentTenant();
        return workflowExecutionRepository.findOverdueExecutions(tenantId, LocalDateTime.now()).stream()
                .map(WorkflowExecutionResponse::from)
                .collect(Collectors.toList());
    }

    public List<WorkflowExecutionResponse> getExecutionsDueForEscalation() {
        UUID tenantId = TenantContext.getCurrentTenant();
        return workflowExecutionRepository.findDueForEscalation(tenantId, LocalDateTime.now()).stream()
                .map(WorkflowExecutionResponse::from)
                .collect(Collectors.toList());
    }
}
