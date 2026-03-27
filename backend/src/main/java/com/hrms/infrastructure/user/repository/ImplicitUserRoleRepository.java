package com.hrms.infrastructure.user.repository;

import com.hrms.domain.user.ImplicitUserRole;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;
import java.util.UUID;

/**
 * Repository for ImplicitUserRole entities.
 * Manages computed role assignments derived from organizational hierarchy.
 */
@Repository
public interface ImplicitUserRoleRepository extends JpaRepository<ImplicitUserRole, UUID> {

    /**
     * Find all active implicit roles for a user in a tenant.
     */
    List<ImplicitUserRole> findByUserIdAndTenantIdAndIsActiveTrue(UUID userId, UUID tenantId);

    /**
     * Find all implicit roles for a tenant (paginated, for administration).
     */
    Page<ImplicitUserRole> findByTenantId(UUID tenantId, Pageable pageable);

    /**
     * Find all implicit roles for a specific user (including inactive).
     */
    List<ImplicitUserRole> findByUserIdAndTenantId(UUID userId, UUID tenantId);

    /**
     * Find all implicit roles with a specific rule (for tracking rule impact).
     */
    List<ImplicitUserRole> findByDerivedFromRuleIdAndTenantId(UUID ruleId, UUID tenantId);

    /**
     * Deactivate all implicit roles for a user.
     * Called when org chart changes or user is terminated.
     * Must be wrapped in @Transactional by caller.
     */
    @Modifying
    @Transactional
    @Query("UPDATE ImplicitUserRole iur SET iur.isActive = false " +
           "WHERE iur.userId = :userId AND iur.tenantId = :tenantId")
    int deactivateAllForUser(@Param("userId") UUID userId, @Param("tenantId") UUID tenantId);

    /**
     * Deactivate all implicit roles derived from a specific rule.
     * Called when a rule is disabled or modified.
     */
    @Modifying
    @Transactional
    @Query("UPDATE ImplicitUserRole iur SET iur.isActive = false " +
           "WHERE iur.derivedFromRuleId = :ruleId AND iur.tenantId = :tenantId")
    int deactivateAllForRule(@Param("ruleId") UUID ruleId, @Param("tenantId") UUID tenantId);

    /**
     * Count distinct users affected by a rule.
     * Used for impact analysis before disabling a rule.
     */
    @Query("SELECT COUNT(DISTINCT iur.userId) FROM ImplicitUserRole iur " +
           "WHERE iur.derivedFromRuleId = :ruleId AND iur.tenantId = :tenantId AND iur.isActive = true")
    long countAffectedUsers(@Param("ruleId") UUID ruleId, @Param("tenantId") UUID tenantId);

    /**
     * Find all user IDs who have a specific role (implicit).
     * Used for approval routing: "find all Reporting Managers to escalate to".
     */
    @Query("SELECT DISTINCT iur.userId FROM ImplicitUserRole iur " +
           "WHERE iur.roleId = :roleId AND iur.tenantId = :tenantId AND iur.isActive = true")
    List<UUID> findUserIdsByRoleIdAndTenantId(@Param("roleId") UUID roleId, @Param("tenantId") UUID tenantId);

    /**
     * Check if a user has a specific implicit role.
     */
    boolean existsByUserIdAndRoleIdAndTenantIdAndIsActiveTrue(
            UUID userId, UUID roleId, UUID tenantId);

    /**
     * Find all users who received implicit roles from a specific rule.
     */
    Set<UUID> findDistinctUserIdByDerivedFromRuleIdAndTenantIdAndIsActiveTrue(
            UUID ruleId, UUID tenantId);
}
