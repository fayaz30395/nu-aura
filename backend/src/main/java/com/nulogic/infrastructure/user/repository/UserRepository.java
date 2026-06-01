package com.nulogic.infrastructure.user.repository;

import com.nulogic.domain.user.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserRepository extends JpaRepository<User, UUID> {

    Optional<User> findByEmailAndTenantId(String email, UUID tenantId);

    boolean existsByEmailAndTenantId(String email, UUID tenantId);

    /**
     * Record a successful login WITHOUT triggering JPA optimistic locking.
     *
     * `User.recordSuccessfulLogin()` followed by `save()` mutates the entity and
     * relies on the `@Version` column to detect concurrent edits. Under
     * parallel E2E workers (4+ Playwright workers all logging in as the same
     * SUPER_ADMIN) the four reads see the same version, the first save wins,
     * the rest fail with `ObjectOptimisticLockingFailureException` -> HTTP 409.
     *
     * Login bookkeeping is idempotent: whoever wins the race, the final state
     * is identical (lastLoginAt within a few ms, failed_attempts=0, lockout
     * cleared). A bare UPDATE bypasses the version check and lets all callers
     * complete cleanly. The version field is intentionally NOT bumped — the
     * downstream save() of the same entity from any concurrent transaction
     * still uses the original version (no false conflict).
     */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("UPDATE User u SET u.lastLoginAt = :now, " +
            "u.failedLoginAttempts = 0, u.lockedUntil = null " +
            "WHERE u.id = :id")
    int recordSuccessfulLogin(@Param("id") UUID id, @Param("now") LocalDateTime now);

    List<User> findByTenantId(UUID tenantId);

    /**
     * Paginated version of findByTenantId.
     * Use this for large tenants with many users.
     */
    Page<User> findByTenantId(UUID tenantId, Pageable pageable);

    /**
     * Count users for a specific tenant
     */
    long countByTenantId(UUID tenantId);

    /**
     * Count users by status across all tenants (SuperAdmin overview).
     */
    long countByStatus(User.UserStatus status);

    /**
     * Count users with given status created on or before a cutoff timestamp.
     * Used by getGrowthMetrics() to replace in-memory stream filtering.
     */
    @Query("SELECT COUNT(u) FROM User u WHERE u.status = :status AND u.createdAt <= :cutoff")
    long countByStatusAndCreatedAtBefore(@Param("status") User.UserStatus status,
                                         @Param("cutoff") LocalDateTime cutoff);

    // Alias for findByTenantId to maintain compatibility with other services
    default Iterable<User> findAllByTenantId(UUID tenantId) {
        return findByTenantId(tenantId);
    }

    Optional<User> findByIdAndTenantId(UUID id, UUID tenantId);

    @Query("SELECT u.id, CONCAT(u.firstName, ' ', COALESCE(u.lastName, '')) FROM User u " +
            "WHERE u.tenantId = :tenantId AND u.id IN :ids")
    List<Object[]> findFullNamesByIdsAndTenantId(@Param("ids") Collection<UUID> ids,
                                                 @Param("tenantId") UUID tenantId);

    /**
     * @deprecated SEC: plaintext reset tokens are no longer stored. Use
     * {@link #findActivePasswordResetCandidates(LocalDateTime)} and BCrypt-compare
     * each candidate's {@code password_reset_token_hash} against the submitted token.
     * Kept for backward compatibility with any caller still inflight on rollout.
     */
    @Deprecated
    Optional<User> findByPasswordResetToken(String token);

    /**
     * Return all users with an unexpired hashed password-reset token.
     * The caller iterates and uses {@link org.springframework.security.crypto.password.PasswordEncoder#matches}
     * to identify the right candidate in constant time per comparison.
     */
    @Query("SELECT u FROM User u WHERE u.passwordResetTokenHash IS NOT NULL " +
            "AND u.passwordResetTokenExpiry IS NOT NULL " +
            "AND u.passwordResetTokenExpiry > :now")
    List<User> findActivePasswordResetCandidates(@Param("now") LocalDateTime now);

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
     * Batch count of users grouped by tenantId.
     * Returns Object[]{UUID tenantId, Long count} for each tenant in the provided set.
     * Replaces N per-tenant countByTenantId() calls in paginated list views (N+1 fix).
     */
    @Query("SELECT u.tenantId, COUNT(u) FROM User u WHERE u.tenantId IN :tenantIds GROUP BY u.tenantId")
    List<Object[]> countByTenantIdIn(@Param("tenantIds") Collection<UUID> tenantIds);

    /**
     * Batch count of ACTIVE users grouped by tenantId.
     * Returns Object[]{UUID tenantId, Long count} for each tenant in the provided set.
     */
    @Query("SELECT u.tenantId, COUNT(u) FROM User u WHERE u.tenantId IN :tenantIds AND u.status = 'ACTIVE' GROUP BY u.tenantId")
    List<Object[]> countActiveByTenantIdIn(@Param("tenantIds") Collection<UUID> tenantIds);

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

    /**
     * Find the most recent lastLoginAt timestamp for a specific tenant.
     * Used by SystemAdminService to fetch last activity without loading all users into memory.
     * Returns empty Optional if no users have logged in.
     */
    @Query("SELECT MAX(u.lastLoginAt) FROM User u WHERE u.tenantId = :tenantId")
    Optional<LocalDateTime> findMaxLastLoginAtByTenantId(@Param("tenantId") UUID tenantId);

    // ==================== GDPR Art. 17 / Anonymisation Probes ====================

    /**
     * Lightweight projection used by {@code JwtAuthenticationFilter} to reject
     * requests authenticated as a principal whose User row has been anonymised
     * under GDPR Article 17 (right to erasure). Returns the
     * {@code anonymized_at} timestamp wrapped in a single-element list when the
     * row exists; the wrapper avoids a {@link IncorrectResultSizeDataAccessException}
     * if the user has been hard-deleted between the JWT being issued and the
     * request being filtered.
     *
     * <p>Defence-in-depth: the only other guard against an anonymised principal
     * authenticating is {@code status = INACTIVE} set by {@code UserAnonymizer},
     * and that single signal would silently break if any future code path were
     * to flip status back to ACTIVE on an anonymised row. The explicit
     * {@code anonymized_at} check here cannot be undone by a status flip.</p>
     *
     * <p>The query intentionally selects only the single column so this hot-path
     * check costs a single index seek per request rather than hydrating the
     * full User entity (which has lazy role/permission graphs).</p>
     */
    @Query("SELECT u.anonymizedAt FROM User u WHERE u.id = :userId")
    Optional<LocalDateTime> findAnonymizedAtById(@Param("userId") UUID userId);

    /**
     * Companion to {@link #findAnonymizedAtById(UUID)} keyed by email. Used by
     * the {@code JwtAuthenticationFilter} fallback path when the JWT does not
     * carry a {@code userId} claim (legacy tokens issued before the userId
     * claim was added) and only the username (email) is known.
     */
    @Query("SELECT u.anonymizedAt FROM User u WHERE u.email = :email")
    Optional<LocalDateTime> findAnonymizedAtByEmail(@Param("email") String email);
}
