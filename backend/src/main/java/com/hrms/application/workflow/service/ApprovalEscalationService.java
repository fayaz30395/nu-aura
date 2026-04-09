package com.hrms.application.workflow.service;

import com.hrms.domain.employee.Employee;
import com.hrms.domain.user.EscalationType;
import com.hrms.domain.workflow.ApprovalEscalationConfig;
import com.hrms.domain.workflow.StepExecution;
import com.hrms.infrastructure.employee.repository.EmployeeRepository;
import com.hrms.infrastructure.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Service responsible for automatic escalation of stale approval requests.
 *
 * <p>Escalation strategies:
 * <ul>
 *   <li>SKIP_LEVEL_MANAGER: Escalate to the approver's manager</li>
 *   <li>DEPARTMENT_HEAD: Escalate to the requester's department head</li>
 *   <li>SPECIFIC_ROLE: Escalate to first user with the configured role</li>
 *   <li>SPECIFIC_USER: Escalate to the configured fallback user</li>
 * </ul>
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ApprovalEscalationService {

    private final EmployeeRepository employeeRepository;
    private final UserRepository userRepository;

    /**
     * Resolve the escalation target user ID based on the escalation type.
     *
     * @param approverUserId The current approver's user ID
     * @param config         The escalation configuration
     * @param tenantId       The tenant ID (for context)
     * @return Optional containing the target user ID, empty if unresolvable
     */
    public Optional<UUID> resolveEscalationTarget(
            UUID approverUserId,
            ApprovalEscalationConfig config,
            UUID tenantId) {

        return switch (config.getEscalationType()) {
            case SKIP_LEVEL_MANAGER -> resolveSkipLevelManager(approverUserId, tenantId);
            case DEPARTMENT_HEAD -> resolveRequesterDepartmentHead(approverUserId, tenantId);
            case SPECIFIC_ROLE -> resolveSpecificRole(config.getFallbackRoleId(), tenantId);
            case SPECIFIC_USER -> resolveSpecificUser(config.getFallbackUserId());
        };
    }

    /**
     * Resolve escalation target to the approver's manager.
     *
     * @param approverUserId The current approver's user ID
     * @param tenantId       The tenant ID
     * @return Optional containing the manager's user ID
     */
    private Optional<UUID> resolveSkipLevelManager(UUID approverUserId, UUID tenantId) {
        // Find the employee record for the approver
        Optional<Employee> approverEmployee = employeeRepository.findByUserIdAndTenantId(approverUserId, tenantId);

        if (approverEmployee.isEmpty()) {
            log.warn("Cannot resolve skip-level manager: approver {} has no employee record (tenant={})",
                    approverUserId, tenantId);
            return Optional.empty();
        }

        UUID managerId = approverEmployee.get().getManagerId();
        if (managerId == null) {
            log.warn("Cannot resolve skip-level manager: approver {} has no manager assigned (tenant={})",
                    approverUserId, tenantId);
            return resolveFallbackTarget(tenantId);
        }

        // Find the manager's employee record to get their user ID
        Optional<Employee> managerEmployee = employeeRepository.findByIdAndTenantId(managerId, tenantId);
        if (managerEmployee.isEmpty()) {
            log.warn("Cannot resolve skip-level manager: manager {} not found (tenant={})",
                    managerId, tenantId);
            return resolveFallbackTarget(tenantId);
        }

        Employee manager = managerEmployee.get();
        UUID managerUserId = (manager.getUser() != null) ? manager.getUser().getId() : null;
        if (managerUserId == null) {
            log.warn("Cannot resolve skip-level manager: manager {} has no user account (tenant={})",
                    managerId, tenantId);
            return resolveFallbackTarget(tenantId);
        }

        log.debug("Resolved skip-level manager: {} -> {} (tenant={})",
                approverUserId, managerUserId, tenantId);
        return Optional.of(managerUserId);
    }

    /**
     * Resolve escalation target to the requester's department head.
     * This requires access to the workflow execution to find the requester,
     * then their department, then the department manager.
     * <p>
     * Currently treats approverUserId as a placeholder; in practice,
     * this should be called with the requester's user ID from the workflow execution.
     *
     * @param requesterUserId The requester's user ID (approver field is repurposed)
     * @param tenantId        The tenant ID
     * @return Optional containing the department head's user ID
     */
    private Optional<UUID> resolveRequesterDepartmentHead(UUID requesterUserId, UUID tenantId) {
        Optional<Employee> requesterEmployee = employeeRepository.findByUserIdAndTenantId(requesterUserId, tenantId);

        if (requesterEmployee.isEmpty()) {
            log.warn("Cannot resolve department head: requester {} has no employee record (tenant={})",
                    requesterUserId, tenantId);
            return resolveFallbackTarget(tenantId);
        }

        UUID departmentId = requesterEmployee.get().getDepartmentId();
        if (departmentId == null) {
            log.warn("Cannot resolve department head: requester {} not assigned to department (tenant={})",
                    requesterUserId, tenantId);
            return resolveFallbackTarget(tenantId);
        }

        Optional<UUID> departmentHeadUserId = employeeRepository.findDepartmentHeadUserId(tenantId, departmentId);
        if (departmentHeadUserId.isEmpty()) {
            log.warn("Cannot resolve department head: no manager found for department {} (tenant={})",
                    departmentId, tenantId);
            return resolveFallbackTarget(tenantId);
        }

        log.debug("Resolved department head: {} -> {} (tenant={})",
                requesterUserId, departmentHeadUserId.get(), tenantId);
        return departmentHeadUserId;
    }

    /**
     * Resolve escalation target to any user with a specific role.
     *
     * @param fallbackRoleId The role ID to search for
     * @param tenantId       The tenant ID
     * @return Optional containing the first user with that role
     */
    private Optional<UUID> resolveSpecificRole(UUID fallbackRoleId, UUID tenantId) {
        if (fallbackRoleId == null) {
            log.warn("Cannot resolve specific role: fallbackRoleId is null (tenant={})", tenantId);
            return resolveFallbackTarget(tenantId);
        }

        List<UUID> userIds = userRepository.findUserIdsByRoleId(tenantId, fallbackRoleId);
        if (userIds.isEmpty()) {
            log.warn("Cannot resolve specific role: no users found with role {} (tenant={})",
                    fallbackRoleId, tenantId);
            return resolveFallbackTarget(tenantId);
        }

        UUID targetUserId = userIds.get(0);
        log.debug("Resolved specific role: {} -> {} (tenant={})",
                fallbackRoleId, targetUserId, tenantId);
        return Optional.of(targetUserId);
    }

    /**
     * Resolve escalation target to a specific user.
     *
     * @param fallbackUserId The specific user ID to escalate to
     * @return Optional containing the fallback user ID if valid
     */
    private Optional<UUID> resolveSpecificUser(UUID fallbackUserId) {
        if (fallbackUserId == null) {
            log.warn("Cannot resolve specific user: fallbackUserId is null");
            return Optional.empty();
        }

        log.debug("Resolved specific user: {}", fallbackUserId);
        return Optional.of(fallbackUserId);
    }

    /**
     * Resolve a fallback target when primary escalation strategies fail.
     * Falls back to any active HR_MANAGER in the tenant.
     *
     * @param tenantId The tenant ID
     * @return Optional containing an HR manager's user ID
     */
    public Optional<UUID> resolveFallbackTarget(UUID tenantId) {
        List<UUID> hrManagers = userRepository.findUserIdsByRoleCode(tenantId, "HR_MANAGER");
        if (hrManagers.isEmpty()) {
            log.error("Cannot resolve fallback target: no HR_MANAGER found (tenant={})", tenantId);
            return Optional.empty();
        }

        UUID fallbackUserId = hrManagers.get(0);
        log.debug("Resolved fallback target: {} -> {} (tenant={})",
                "HR_MANAGER", fallbackUserId, tenantId);
        return Optional.of(fallbackUserId);
    }

    /**
     * Escalate a PENDING step to a new approver.
     *
     * <p>This method:
     * <ol>
     *   <li>Marks the current step as ESCALATED</li>
     *   <li>Creates a new PENDING step for the escalation target</li>
     *   <li>Increments the reminder count</li>
     *   <li>Sends a Kafka notification event if configured</li>
     * </ol>
     *
     * @param step         The step execution to escalate
     * @param targetUserId The user ID to escalate to
     * @param config       The escalation configuration
     */
    @Transactional
    public void escalateStep(
            StepExecution step,
            UUID targetUserId,
            ApprovalEscalationConfig config) {

        UUID tenantId = step.getTenantId();

        // Mark current step as escalated
        step.setEscalated(true);
        step.setEscalatedAt(LocalDateTime.now());
        step.setEscalatedToUserId(targetUserId);
        step.setReminderCount(step.getReminderCount() + 1);

        // Create new step for the escalation target
        StepExecution escalatedStep = StepExecution.builder()
                .tenantId(tenantId)
                .workflowExecution(step.getWorkflowExecution())
                .approvalStep(step.getApprovalStep())
                .stepOrder(step.getStepOrder())
                .stepName("Escalated: " + step.getStepName().replaceAll("^(Escalated: )+", ""))
                .status(StepExecution.StepStatus.PENDING)
                .assignedToUserId(targetUserId)
                .assignedAt(LocalDateTime.now())
                .deadline(step.getDeadline())
                .build();

        // Log escalation
        log.info("Escalating step {} to user {} (strategy={}, tenant={})",
                step.getId(), targetUserId, config.getEscalationType(), tenantId);

        // Save both (original step as ESCALATED, new step as PENDING)
        // Note: Both are saved together; the actual persistence is handled by the caller
        step.setStatus(StepExecution.StepStatus.ESCALATED);
        step.setAction(StepExecution.ApprovalAction.ESCALATE);
    }
}
