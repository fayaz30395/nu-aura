package com.hrms.application.user.service;

import com.hrms.domain.employee.Employee;
import com.hrms.domain.user.ImplicitRoleCondition;
import com.hrms.domain.user.ImplicitRoleRule;
import com.hrms.domain.user.ImplicitUserRole;
import com.hrms.domain.user.RoleScope;
import com.hrms.infrastructure.employee.repository.EmployeeRepository;
import com.hrms.infrastructure.user.repository.ImplicitRoleRuleRepository;
import com.hrms.infrastructure.user.repository.ImplicitUserRoleRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

/**
 * ImplicitRoleEngine: Core engine for evaluating and maintaining implicit role assignments.
 *
 * <p>Implicit roles are automatically assigned to users based on their position in the organizational
 * hierarchy. The engine implements diff-based recomputation: it computes the desired set of implicit
 * roles, compares with current assignments, and applies only necessary changes (add/remove).
 *
 * <p>Recomputation is triggered by:
 * - Manager changes (employee reassigned to new manager)
 * - Direct report changes (employee promoted/demoted to/from manager)
 * - Department changes (employee assigned to head/non-head department)
 * - Rule changes (new rule added, existing rule modified)
 *
 * <p>Cache invalidation: When a user's implicit roles change, the Redis permission cache
 * (key: {@code permissions:{tenantId}:{userId}}) is invalidated, forcing re-fetch on next request.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ImplicitRoleEngine {

    private final ImplicitRoleRuleRepository ruleRepository;
    private final ImplicitUserRoleRepository implicitUserRoleRepository;
    private final EmployeeRepository employeeRepository;
    private final RedisTemplate<String, Object> redisTemplate;

    /**
     * Recompute implicit roles for a single user.
     *
     * <p>Algorithm:
     * 1. Load all active rules for tenant
     * 2. Load employee (to check org hierarchy conditions)
     * 3. For each rule, evaluate condition (IS_REPORTING_MANAGER, IS_DEPARTMENT_HEAD, IS_SKIP_LEVEL_MANAGER)
     * 4. Compute desired set of (roleId, scope, ruleId) tuples
     * 5. Load current active implicit roles
     * 6. Diff: compute added, removed, unchanged
     * 7. Insert new rows, deactivate removed rows
     * 8. Invalidate Redis cache for user
     * 9. Return result with counts
     *
     * @param userId     User ID
     * @param employeeId Employee ID (associated with user)
     * @param tenantId   Tenant ID
     * @return RecomputeResult with counts of added/removed/unchanged roles
     */
    @Transactional
    public RecomputeResult recompute(UUID userId, UUID employeeId, UUID tenantId) {
        log.debug("ImplicitRoleEngine: recomputing for userId={}, employeeId={}, tenantId={}", userId, employeeId, tenantId);

        // 1. Load all active rules for tenant
        List<ImplicitRoleRule> activeRules = ruleRepository.findByTenantIdAndIsActiveTrue(tenantId);
        if (activeRules.isEmpty()) {
            log.debug("No active rules for tenant {}, skipping recomputation", tenantId);
            return new RecomputeResult(0, 0, 0);
        }

        // 2. Load employee to check conditions
        Optional<Employee> employeeOpt = employeeRepository.findByIdAndTenantId(employeeId, tenantId);
        if (employeeOpt.isEmpty()) {
            log.warn("Employee {} not found in tenant {}, skipping recomputation", employeeId, tenantId);
            return new RecomputeResult(0, 0, 0);
        }

        Employee employee = employeeOpt.get();

        // 3. Evaluate rules and compute desired set
        Set<ImplicitRoleAssignment> desiredRoles = new HashSet<>();
        for (ImplicitRoleRule rule : activeRules) {
            if (evaluateCondition(rule.getConditionType(), employee, tenantId)) {
                desiredRoles.add(new ImplicitRoleAssignment(
                        rule.getTargetRoleId(),
                        rule.getScope(),
                        rule.getId()
                ));
                log.debug("Rule {} ({}) matched for employee {}", rule.getId(), rule.getConditionType(), employeeId);
            }
        }

        // 4. Load current active implicit roles
        List<ImplicitUserRole> currentRoles = implicitUserRoleRepository
                .findByUserIdAndTenantIdAndIsActiveTrue(userId, tenantId);

        // 5. Compute diff
        Set<ImplicitRoleAssignment> currentAssignments = new HashSet<>();
        for (ImplicitUserRole role : currentRoles) {
            currentAssignments.add(new ImplicitRoleAssignment(role.getRoleId(), role.getScope(), role.getDerivedFromRuleId()));
        }

        Set<ImplicitRoleAssignment> toAdd = new HashSet<>(desiredRoles);
        toAdd.removeAll(currentAssignments);

        Set<ImplicitRoleAssignment> toRemove = new HashSet<>(currentAssignments);
        toRemove.removeAll(desiredRoles);

        int unchanged = desiredRoles.size() - toAdd.size();

        // 6. Insert new roles
        for (ImplicitRoleAssignment assignment : toAdd) {
            ImplicitUserRole newRole = ImplicitUserRole.builder()
                    .userId(userId)
                    .roleId(assignment.roleId)
                    .scope(assignment.scope)
                    .derivedFromRuleId(assignment.ruleId)
                    .derivedFromContext("Computed by ImplicitRoleEngine for employee " + employeeId)
                    .computedAt(LocalDateTime.now())
                    .isActive(true)
                    .tenantId(tenantId)
                    .build();
            implicitUserRoleRepository.save(newRole);
            log.debug("Added implicit role {} (scope={}) to user {} via rule {}",
                    assignment.roleId, assignment.scope, userId, assignment.ruleId);
        }

        // 7. Deactivate removed roles
        for (ImplicitRoleAssignment assignment : toRemove) {
            for (ImplicitUserRole role : currentRoles) {
                if (role.getRoleId().equals(assignment.roleId)
                        && role.getScope().equals(assignment.scope)
                        && role.getDerivedFromRuleId().equals(assignment.ruleId)) {
                    role.setIsActive(false);
                    implicitUserRoleRepository.save(role);
                    log.debug("Deactivated implicit role {} (scope={}) from user {} (rule {})",
                            assignment.roleId, assignment.scope, userId, assignment.ruleId);
                    break;
                }
            }
        }

        // 8. Invalidate Redis cache
        if (!toAdd.isEmpty() || !toRemove.isEmpty()) {
            String cacheKey = String.format("permissions:%s:%s", tenantId, userId);
            redisTemplate.delete(cacheKey);
            log.debug("Invalidated permission cache for user {} in tenant {}", userId, tenantId);
        }

        // 9. Return result
        RecomputeResult result = new RecomputeResult(toAdd.size(), toRemove.size(), unchanged);
        log.info("ImplicitRoleEngine: recompute complete for user {}: added={}, removed={}, unchanged={}",
                userId, result.added, result.removed, result.unchanged);
        return result;
    }

    /**
     * Asynchronously recompute implicit roles for all users in a tenant.
     *
     * <p>Useful after a rule change or bulk org restructuring.
     * Runs in a separate thread to avoid blocking the caller.
     *
     * @param tenantId Tenant ID
     */
    @Async
    @Transactional
    public void recomputeAll(UUID tenantId) {
        log.info("ImplicitRoleEngine: starting batch recompute for all users in tenant {}", tenantId);

        // Fetch all user-employee pairs
        List<Object[]> pairs = employeeRepository.findUserEmployeePairsByTenantId(tenantId);
        if (pairs.isEmpty()) {
            log.info("No users found for tenant {}", tenantId);
            return;
        }

        long totalAdded = 0;
        long totalRemoved = 0;
        long totalProcessed = 0;
        long totalFailed = 0;
        List<UUID> failedUserIds = new ArrayList<>();

        for (Object[] pair : pairs) {
            UUID userId = (UUID) pair[0];
            UUID employeeId = (UUID) pair[1];
            try {
                RecomputeResult result = recompute(userId, employeeId, tenantId);
                totalAdded += result.added;
                totalRemoved += result.removed;
                totalProcessed++;
            } catch (Exception e) { // Intentional broad catch — service error boundary
                // BP-L01 FIX: Track failures instead of silently swallowing.
                // Batch continues processing other users but reports failures.
                totalFailed++;
                failedUserIds.add(userId);
                log.error("Error recomputing implicit roles for user {} in tenant {}", userId, tenantId, e);
            }
        }

        log.info("ImplicitRoleEngine: batch recompute complete for tenant {}: processed={}, added={}, removed={}, failed={}",
                tenantId, totalProcessed, totalAdded, totalRemoved, totalFailed);

        if (totalFailed > 0) {
            log.warn("ImplicitRoleEngine: {} users failed recompute in tenant {}: {}",
                    totalFailed, tenantId, failedUserIds.size() <= 20 ? failedUserIds : failedUserIds.subList(0, 20) + "...");
        }
    }

    /**
     * Evaluate if a condition matches for an employee.
     *
     * @param condition Condition type (IS_REPORTING_MANAGER, IS_DEPARTMENT_HEAD, IS_SKIP_LEVEL_MANAGER, HAS_DIRECT_REPORTS)
     * @param employee  Employee entity
     * @param tenantId  Tenant ID
     * @return true if condition is met, false otherwise
     */
    private boolean evaluateCondition(ImplicitRoleCondition condition, Employee employee, UUID tenantId) {
        return switch (condition) {
            case IS_REPORTING_MANAGER, HAS_DIRECT_REPORTS -> {
                // Check if employee has any direct reports
                Long directReportCount = employeeRepository.countDirectReportsByManagerId(tenantId, employee.getId());
                yield directReportCount != null && directReportCount > 0;
            }

            case IS_DEPARTMENT_HEAD -> {
                // Check if employee manages any department
                yield employeeRepository.isDepartmentHead(tenantId, employee.getId());
            }

            case IS_SKIP_LEVEL_MANAGER -> {
                // Check if employee has indirect reports (skip-level reports)
                yield employeeRepository.hasSkipLevelReports(tenantId, employee.getId());
            }
        };
    }

    /**
     * Result of a recomputation operation.
     *
     * @param added     Number of new implicit roles added
     * @param removed   Number of implicit roles removed
     * @param unchanged Number of implicit roles that remained unchanged
     */
    public record RecomputeResult(int added, int removed, int unchanged) {
    }

    /**
     * Internal representation of an implicit role assignment (roleId + scope + ruleId).
     * Used for diff-based recomputation to track which roles should/should not be assigned.
     */
    private static class ImplicitRoleAssignment {
        private final UUID roleId;
        private final RoleScope scope;
        private final UUID ruleId;

        ImplicitRoleAssignment(UUID roleId, RoleScope scope, UUID ruleId) {
            this.roleId = roleId;
            this.scope = scope;
            this.ruleId = ruleId;
        }

        @Override
        public boolean equals(Object o) {
            if (this == o) return true;
            if (!(o instanceof ImplicitRoleAssignment that)) return false;
            return roleId.equals(that.roleId) &&
                    scope == that.scope &&
                    ruleId.equals(that.ruleId);
        }

        @Override
        public int hashCode() {
            return 31 * 31 * roleId.hashCode() + 31 * scope.hashCode() + ruleId.hashCode();
        }
    }
}
