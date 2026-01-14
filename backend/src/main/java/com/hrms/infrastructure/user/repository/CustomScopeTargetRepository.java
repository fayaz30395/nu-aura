package com.hrms.infrastructure.user.repository;

import com.hrms.domain.user.CustomScopeTarget;
import com.hrms.domain.user.TargetType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Set;
import java.util.UUID;

/**
 * Repository for managing CustomScopeTarget entities.
 * Used for Keka-style CUSTOM scope permission filtering.
 */
@Repository
public interface CustomScopeTargetRepository extends JpaRepository<CustomScopeTarget, UUID> {

    /**
     * Find all custom targets for a specific role permission.
     */
    List<CustomScopeTarget> findByRolePermissionId(UUID rolePermissionId);

    /**
     * Find all custom targets of a specific type for a role permission.
     */
    List<CustomScopeTarget> findByRolePermissionIdAndTargetType(UUID rolePermissionId, TargetType targetType);

    /**
     * Find all custom targets for a set of role permissions.
     * Useful when computing effective permissions for a user with multiple roles.
     */
    @Query("SELECT c FROM CustomScopeTarget c WHERE c.rolePermission.id IN :rolePermissionIds")
    List<CustomScopeTarget> findByRolePermissionIdIn(@Param("rolePermissionIds") Set<UUID> rolePermissionIds);

    /**
     * Find all employee IDs that are custom targets for a given set of role permissions.
     */
    @Query("SELECT c.targetId FROM CustomScopeTarget c " +
           "WHERE c.rolePermission.id IN :rolePermissionIds AND c.targetType = 'EMPLOYEE'")
    Set<UUID> findEmployeeTargetIdsByRolePermissionIds(@Param("rolePermissionIds") Set<UUID> rolePermissionIds);

    /**
     * Find all department IDs that are custom targets for a given set of role permissions.
     */
    @Query("SELECT c.targetId FROM CustomScopeTarget c " +
           "WHERE c.rolePermission.id IN :rolePermissionIds AND c.targetType = 'DEPARTMENT'")
    Set<UUID> findDepartmentTargetIdsByRolePermissionIds(@Param("rolePermissionIds") Set<UUID> rolePermissionIds);

    /**
     * Find all location IDs that are custom targets for a given set of role permissions.
     */
    @Query("SELECT c.targetId FROM CustomScopeTarget c " +
           "WHERE c.rolePermission.id IN :rolePermissionIds AND c.targetType = 'LOCATION'")
    Set<UUID> findLocationTargetIdsByRolePermissionIds(@Param("rolePermissionIds") Set<UUID> rolePermissionIds);

    /**
     * Delete all custom targets for a role permission.
     */
    @Modifying
    @Query("DELETE FROM CustomScopeTarget c WHERE c.rolePermission.id = :rolePermissionId")
    void deleteByRolePermissionId(@Param("rolePermissionId") UUID rolePermissionId);

    /**
     * Check if a specific target exists for a role permission.
     */
    boolean existsByRolePermissionIdAndTargetTypeAndTargetId(UUID rolePermissionId, TargetType targetType, UUID targetId);

    /**
     * Find all custom targets for a specific target (e.g., find all permissions that grant access to employee X).
     */
    List<CustomScopeTarget> findByTargetTypeAndTargetId(TargetType targetType, UUID targetId);

    /**
     * Count custom targets for a role permission.
     */
    long countByRolePermissionId(UUID rolePermissionId);
}
