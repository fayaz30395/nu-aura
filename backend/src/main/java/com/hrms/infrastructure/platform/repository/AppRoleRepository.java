package com.hrms.infrastructure.platform.repository;

import com.hrms.domain.platform.AppRole;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface AppRoleRepository extends JpaRepository<AppRole, UUID> {

    /**
     * Find role by code, tenant, and application.
     * Fetches permissions eagerly via @EntityGraph to prevent LazyInitializationException
     * when hasPermission() or getPermissionCodes() is called on the returned role.
     */
    @EntityGraph(attributePaths = {"permissions"})
    Optional<AppRole> findByCodeAndTenantIdAndApplicationId(String code, UUID tenantId, UUID applicationId);

    /**
     * Find all roles for a tenant and application
     */
    List<AppRole> findByTenantIdAndApplicationIdOrderByLevelDesc(UUID tenantId, UUID applicationId);

    /**
     * Find all roles for a tenant and application code
     */
    @Query("SELECT r FROM AppRole r JOIN r.application a WHERE r.tenantId = :tenantId AND a.code = :appCode " +
            "ORDER BY r.level DESC")
    List<AppRole> findByTenantIdAndApplicationCode(
            @Param("tenantId") UUID tenantId,
            @Param("appCode") String appCode
    );

    /**
     * Find role with permissions
     */
    @Query("SELECT DISTINCT r FROM AppRole r LEFT JOIN FETCH r.permissions " +
            "WHERE r.id = :roleId AND r.tenantId = :tenantId")
    Optional<AppRole> findByIdAndTenantIdWithPermissions(
            @Param("roleId") UUID roleId,
            @Param("tenantId") UUID tenantId
    );

    /**
     * Find default role for an application
     */
    Optional<AppRole> findByTenantIdAndApplicationIdAndIsDefaultRoleTrue(UUID tenantId, UUID applicationId);

    /**
     * Check if role code exists
     */
    boolean existsByCodeAndTenantIdAndApplicationId(String code, UUID tenantId, UUID applicationId);

    /**
     * Find system roles for an application (across all tenants)
     */
    List<AppRole> findByApplicationIdAndIsSystemRoleTrue(UUID applicationId);

    /**
     * Check if role is assigned to any user
     */
    @Query("SELECT CASE WHEN COUNT(ua) > 0 THEN true ELSE false END " +
            "FROM UserAppAccess ua JOIN ua.roles r WHERE r.id = :roleId")
    boolean isRoleAssignedToUsers(@Param("roleId") UUID roleId);
}
