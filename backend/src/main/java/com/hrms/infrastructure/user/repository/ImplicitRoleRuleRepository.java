package com.hrms.infrastructure.user.repository;

import com.hrms.domain.user.ImplicitRoleCondition;
import com.hrms.domain.user.ImplicitRoleRule;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Repository for ImplicitRoleRule entities.
 * Manages rules that define conditions for automatic role assignment.
 */
@Repository
public interface ImplicitRoleRuleRepository extends JpaRepository<ImplicitRoleRule, UUID> {

    /**
     * Find all active implicit role rules for a tenant.
     */
    List<ImplicitRoleRule> findByTenantIdAndIsActiveTrue(UUID tenantId);

    /**
     * Find all implicit role rules for a tenant (active and inactive).
     */
    Page<ImplicitRoleRule> findByTenantId(UUID tenantId, Pageable pageable);

    /**
     * Find all implicit role rules for a tenant filtered by active status.
     */
    Page<ImplicitRoleRule> findByTenantIdAndIsActive(UUID tenantId, Boolean isActive, Pageable pageable);

    /**
     * Find a specific implicit role rule by ID and tenant (for secure access).
     */
    Optional<ImplicitRoleRule> findByIdAndTenantId(UUID id, UUID tenantId);

    /**
     * Check if a rule with the same condition and target role already exists.
     * Prevents duplicate implicit role assignments.
     */
    boolean existsByTenantIdAndConditionTypeAndTargetRoleId(
            UUID tenantId, ImplicitRoleCondition conditionType, UUID targetRoleId);

    /**
     * Find multiple rules by their IDs and tenant (batch load).
     */
    List<ImplicitRoleRule> findByIdInAndTenantId(java.util.Collection<UUID> ids, UUID tenantId);

    /**
     * Find all rules for a specific target role.
     * Used when re-evaluating which users should have a role.
     */
    List<ImplicitRoleRule> findByTargetRoleIdAndTenantIdAndIsActiveTrue(UUID targetRoleId, UUID tenantId);

    /**
     * Find all rules with a specific condition type.
     * Used when re-evaluating based on condition changes (e.g., "someone was promoted to manager").
     */
    List<ImplicitRoleRule> findByConditionTypeAndTenantIdAndIsActiveTrue(
            ImplicitRoleCondition conditionType, UUID tenantId);

    /**
     * Count rules matching a condition to detect duplicate/conflicting conditions.
     */
    long countByTenantIdAndConditionTypeAndTargetRoleId(
            UUID tenantId, ImplicitRoleCondition conditionType, UUID targetRoleId);
}
