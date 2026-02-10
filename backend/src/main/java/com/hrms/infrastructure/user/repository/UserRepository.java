package com.hrms.infrastructure.user.repository;

import com.hrms.domain.user.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserRepository extends JpaRepository<User, UUID> {

    Optional<User> findByEmailAndTenantId(String email, UUID tenantId);

    boolean existsByEmailAndTenantId(String email, UUID tenantId);

    List<User> findByTenantId(UUID tenantId);

    /**
     * Paginated version of findByTenantId.
     * Use this for large tenants with many users.
     */
    Page<User> findByTenantId(UUID tenantId, Pageable pageable);

    // Alias for findByTenantId to maintain compatibility with other services
    default Iterable<User> findAllByTenantId(UUID tenantId) {
        return findByTenantId(tenantId);
    }

    Optional<User> findByIdAndTenantId(UUID id, UUID tenantId);

    Optional<User> findByPasswordResetToken(String token);

    /**
     * Find user by email across all tenants.
     * Used for Google SSO where email uniquely identifies the user.
     */
    Optional<User> findByEmail(String email);

    // ==================== EXPLICIT FETCH QUERIES (REQUIRED FOR LAZY ROLES) ====================

    /**
     * Find user by ID with roles and permissions eagerly fetched.
     * Used for authentication to load all permissions in one query.
     *
     * <p><strong>IMPORTANT:</strong> This is the PRIMARY method for loading users when
     * role/permission access is needed. The User.roles collection is LAZY, so direct
     * access will cause LazyInitializationException or N+1 queries.</p>
     */
    @Query("SELECT DISTINCT u FROM User u " +
           "LEFT JOIN FETCH u.roles r " +
           "LEFT JOIN FETCH r.permissions rp " +
           "LEFT JOIN FETCH rp.permission " +
           "WHERE u.id = :userId")
    Optional<User> findByIdWithRolesAndPermissions(@Param("userId") UUID userId);

    /**
     * Find user by ID with roles only (without permissions).
     * Use when you need role codes/names but not full permission details.
     */
    @Query("SELECT DISTINCT u FROM User u " +
           "LEFT JOIN FETCH u.roles " +
           "WHERE u.id = :userId")
    Optional<User> findByIdWithRoles(@Param("userId") UUID userId);

    /**
     * Find user by email with roles and permissions eagerly fetched.
     * Used for login/authentication flows.
     */
    @Query("SELECT DISTINCT u FROM User u " +
           "LEFT JOIN FETCH u.roles r " +
           "LEFT JOIN FETCH r.permissions rp " +
           "LEFT JOIN FETCH rp.permission " +
           "WHERE u.email = :email AND u.tenantId = :tenantId")
    Optional<User> findByEmailWithRolesAndPermissions(@Param("email") String email, @Param("tenantId") UUID tenantId);

    /**
     * Find user by email (cross-tenant) with roles and permissions.
     * Used for Google SSO where email uniquely identifies the user.
     */
    @Query("SELECT DISTINCT u FROM User u " +
           "LEFT JOIN FETCH u.roles r " +
           "LEFT JOIN FETCH r.permissions rp " +
           "LEFT JOIN FETCH rp.permission " +
           "WHERE u.email = :email")
    Optional<User> findByEmailWithRolesAndPermissionsAcrossTenants(@Param("email") String email);

    // ==================== ROLE-BASED QUERIES ====================

    /**
     * Find any active user with a specific role code.
     * Used for workflow approver resolution.
     */
    @Query("SELECT u.id FROM User u JOIN u.roles r WHERE u.tenantId = :tenantId AND r.code = :roleCode AND u.status = 'ACTIVE' ORDER BY u.createdAt ASC")
    List<UUID> findUserIdsByRoleCode(@Param("tenantId") UUID tenantId, @Param("roleCode") String roleCode);

    /**
     * Find any active user with a specific role ID.
     * Used for workflow approver resolution.
     */
    @Query("SELECT u.id FROM User u JOIN u.roles r WHERE u.tenantId = :tenantId AND r.id = :roleId AND u.status = 'ACTIVE' ORDER BY u.createdAt ASC")
    List<UUID> findUserIdsByRoleId(@Param("tenantId") UUID tenantId, @Param("roleId") UUID roleId);
}
