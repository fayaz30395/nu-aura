package com.hrms.infrastructure.platform.repository;

import com.hrms.domain.platform.UserAppAccess;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserAppAccessRepository extends JpaRepository<UserAppAccess, UUID> {

    /**
     * Find user's access to a specific application.
     * Fetches roles and directPermissions to prevent LazyInitializationException
     * when role/permission data is accessed outside a transaction boundary.
     */
    @EntityGraph(attributePaths = {"roles", "roles.permissions", "directPermissions"})
    Optional<UserAppAccess> findByUserIdAndApplicationId(UUID userId, UUID applicationId);

    /**
     * Find user's access to application by app code
     */
    @Query("SELECT ua FROM UserAppAccess ua JOIN ua.application a " +
            "WHERE ua.user.id = :userId AND a.code = :appCode")
    Optional<UserAppAccess> findByUserIdAndApplicationCode(
            @Param("userId") UUID userId,
            @Param("appCode") String appCode
    );

    /**
     * Find all applications a user has access to
     */
    @Query("SELECT ua FROM UserAppAccess ua JOIN FETCH ua.application " +
            "WHERE ua.user.id = :userId AND ua.status = 'ACTIVE' " +
            "ORDER BY ua.application.displayOrder ASC")
    List<UserAppAccess> findActiveAccessByUserId(@Param("userId") UUID userId);

    /**
     * Find user's access with roles and permissions (for authentication)
     */
    @Query("SELECT DISTINCT ua FROM UserAppAccess ua " +
            "LEFT JOIN FETCH ua.roles r " +
            "LEFT JOIN FETCH r.permissions " +
            "LEFT JOIN FETCH ua.directPermissions " +
            "WHERE ua.user.id = :userId AND ua.application.code = :appCode")
    Optional<UserAppAccess> findByUserIdAndAppCodeWithPermissions(
            @Param("userId") UUID userId,
            @Param("appCode") String appCode
    );

    /**
     * Find all users with access to an application
     */
    List<UserAppAccess> findByApplicationIdAndStatus(UUID applicationId, UserAppAccess.AccessStatus status);

    /**
     * Find all users with access to an application (by tenant)
     */
    List<UserAppAccess> findByTenantIdAndApplicationIdAndStatus(
            UUID tenantId,
            UUID applicationId,
            UserAppAccess.AccessStatus status
    );

    /**
     * Check if user has access to an application
     */
    boolean existsByUserIdAndApplicationIdAndStatus(
            UUID userId,
            UUID applicationId,
            UserAppAccess.AccessStatus status
    );

    /**
     * Check if user has access by app code
     */
    @Query("SELECT CASE WHEN COUNT(ua) > 0 THEN true ELSE false END " +
            "FROM UserAppAccess ua JOIN ua.application a " +
            "WHERE ua.user.id = :userId AND a.code = :appCode AND ua.status = 'ACTIVE'")
    boolean hasActiveAccess(@Param("userId") UUID userId, @Param("appCode") String appCode);

    /**
     * Find access records for a tenant
     */
    List<UserAppAccess> findByTenantIdAndStatus(UUID tenantId, UserAppAccess.AccessStatus status);

    /**
     * Count users per application for a tenant
     */
    @Query("SELECT a.code, COUNT(ua) FROM UserAppAccess ua JOIN ua.application a " +
            "WHERE ua.tenantId = :tenantId AND ua.status = 'ACTIVE' GROUP BY a.code")
    List<Object[]> countUsersByApplicationForTenant(@Param("tenantId") UUID tenantId);

    /**
     * Find user's access to all applications (for app switcher)
     */
    @Query("SELECT ua FROM UserAppAccess ua " +
            "JOIN FETCH ua.application a " +
            "WHERE ua.user.id = :userId AND ua.status = 'ACTIVE' AND a.status = 'ACTIVE' " +
            "ORDER BY a.displayOrder ASC")
    List<UserAppAccess> findUserApplications(@Param("userId") UUID userId);

    /**
     * Lightweight projection: fetch only application codes the user has active access to.
     * Avoids hydrating full UserAppAccess + NuApplication entities during login.
     */
    @Query("SELECT a.code FROM UserAppAccess ua JOIN ua.application a " +
            "WHERE ua.user.id = :userId AND ua.status = 'ACTIVE' AND a.status = 'ACTIVE' " +
            "ORDER BY a.displayOrder ASC")
    List<String> findActiveApplicationCodesByUserId(@Param("userId") UUID userId);
}
