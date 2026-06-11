package com.nulogic.application.admin.service;

import com.nulogic.api.admin.dto.*;
import com.nulogic.application.document.service.StorageMetricsService;
import com.nulogic.application.notification.service.EmailNotificationService;
import com.nulogic.common.config.TenantCacheManager;
import com.nulogic.common.exception.BusinessException;
import com.nulogic.common.exception.ResourceNotFoundException;
import com.nulogic.common.exception.ValidationException;
import com.nulogic.common.security.JwtTokenProvider;
import com.nulogic.common.security.TenantContext;
import com.nulogic.common.security.TenantFilter;
import com.nulogic.common.security.TokenBlacklistService;
import com.nulogic.common.util.TenantTimeService;
import com.nulogic.domain.audit.AuditLog;
import com.nulogic.domain.tenant.Tenant;
import com.nulogic.domain.user.User;
import com.nulogic.domain.workflow.WorkflowExecution;
import com.nulogic.infrastructure.employee.repository.EmployeeRepository;
import com.nulogic.infrastructure.tenant.repository.TenantRepository;
import com.nulogic.infrastructure.tenant.repository.TenantStatusCache;
import com.nulogic.infrastructure.user.repository.UserRepository;
import com.nulogic.infrastructure.workflow.repository.WorkflowExecutionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.security.SecureRandom;
import java.time.DateTimeException;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.Month;
import java.time.ZoneId;
import java.time.format.TextStyle;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Service for cross-tenant system administration (SuperAdmin only)
 * All queries bypass tenant isolation and operate on the entire system
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SystemAdminService {

    /**
     * Cryptographically-secure RNG for temp-password byte generation.
     */
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();
    private final TenantRepository tenantRepository;
    private final UserRepository userRepository;
    private final EmployeeRepository employeeRepository;
    private final WorkflowExecutionRepository workflowExecutionRepository;
    private final JwtTokenProvider jwtTokenProvider;
    private final com.nulogic.application.audit.service.AuditLogService auditLogService;
    private final TenantFilter tenantFilter;
    private final TenantCacheManager tenantCacheManager;
    private final StorageMetricsService storageMetricsService;
    private final AiUsageService aiUsageService;
    // Sprint-4 wave-3 follow-up: evict the per-request tenant-status cache so suspend/activate
    // propagate immediately rather than waiting for the 30-second TTL.
    private final TenantStatusCache tenantStatusCache;
    // Sprint-4: tenant-wide token revocation marker on suspension (belt-and-braces with the
    // JWT-filter tenant-status check from sprint 2, which remains the primary defense).
    private final TokenBlacklistService tokenBlacklistService;
    // Sprint-6 wave-3 (S6-B): SuperAdmin password-reset path — encode the new temp credential
    // and deliver it out-of-band via email so it never appears in the API response.
    private final PasswordEncoder passwordEncoder;
    private final EmailNotificationService emailNotificationService;
    // Wave-10 follow-up: tenant-timezone update flow must invalidate the per-tenant ZoneId
    // cache so a new zone takes effect within the JVM without waiting for the 1-hour TTL.
    private final TenantTimeService tenantTimeService;
    // M-12: two-phase impersonation — exchange-token store (Redis-backed, 60s TTL, single-use).
    private final ImpersonationExchangeTokenService impersonationExchangeTokenService;

    /**
     * Get comprehensive system overview across all tenants
     */
    @Transactional(readOnly = true)
    public SystemOverviewDTO getSystemOverview() {
        log.info("SuperAdmin requesting system overview");

        long totalTenants = tenantRepository.count();
        long activeTenants = countActiveTenants();
        long totalEmployees = employeeRepository.count();
        long totalActiveUsers = countActiveUsers();
        long pendingApprovals = countPendingApprovals();

        // Calculate storage usage from generated documents and document versions
        long storageUsageBytes = storageMetricsService.getStorageBytesAcrossAllTenants();

        // Get total AI credits used across all tenants
        long aiCreditsUsed = aiUsageService.getAiCreditsUsedAcrossAllTenants();

        return SystemOverviewDTO.builder()
                .totalTenants(totalTenants)
                .activeTenants(activeTenants)
                .totalEmployees(totalEmployees)
                .totalActiveUsers(totalActiveUsers)
                .storageUsageBytes(storageUsageBytes)
                .aiCreditsUsed(aiCreditsUsed)
                .pendingApprovals(pendingApprovals)
                .build();
    }

    /**
     * Get paginated list of all tenants with basic metrics.
     *
     * <p>Uses batched aggregate queries to avoid N+1: employee count, user count, and last
     * activity are all fetched for the entire page in 3 queries rather than 3×N queries.</p>
     */
    @Transactional(readOnly = true)
    public Page<TenantListItemDTO> getTenantList(Pageable pageable) {
        log.info("SuperAdmin requesting tenant list, page: {}, size: {}",
                pageable.getPageNumber(), pageable.getPageSize());

        Page<Tenant> tenantsPage = tenantRepository.findAll(pageable);

        // Collect IDs of tenants on this page for batch queries
        List<UUID> tenantIds = tenantsPage.getContent().stream()
                .map(Tenant::getId)
                .collect(Collectors.toList());

        if (tenantIds.isEmpty()) {
            return tenantsPage.map(t -> mapToTenantListItem(t, 0L, 0L, null));
        }

        // Batch queries — 2 queries for the whole page instead of 2×N
        Map<UUID, Long> employeeCountByTenant = employeeRepository.countByTenantIdIn(tenantIds)
                .stream().collect(Collectors.toMap(
                        r -> (UUID) r[0],
                        r -> (Long) r[1]
                ));

        Map<UUID, Long> userCountByTenant = userRepository.countByTenantIdIn(tenantIds)
                .stream().collect(Collectors.toMap(
                        r -> (UUID) r[0],
                        r -> (Long) r[1]
                ));

        // Last-activity lookup: still per-tenant but only for the page slice.
        // A tenant with no login history yields a null timestamp; Collectors.toMap
        // rejects null values (NPE), so build a null-tolerant map instead.
        Map<UUID, LocalDateTime> lastActivityByTenant = new HashMap<>();
        for (UUID id : tenantIds) {
            lastActivityByTenant.put(id, getLastActivityForTenant(id));
        }

        return tenantsPage.map(tenant -> mapToTenantListItem(
                tenant,
                employeeCountByTenant.getOrDefault(tenant.getId(), 0L),
                userCountByTenant.getOrDefault(tenant.getId(), 0L),
                lastActivityByTenant.get(tenant.getId())
        ));
    }

    /**
     * Get deep-dive metrics for a specific tenant
     */
    @Transactional(readOnly = true)
    public TenantMetricsDTO getTenantMetrics(UUID tenantId) {
        log.info("SuperAdmin requesting metrics for tenant: {}", tenantId);

        Tenant tenant = tenantRepository.findById(tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Tenant not found with ID: " + tenantId));

        long activeUsers = countActiveUsersForTenant(tenantId);
        long totalUsers = countUsersForTenant(tenantId);
        long employeeCount = countEmployeesForTenant(tenantId);
        long storageUsageBytes = storageMetricsService.getStorageBytesForTenant(tenantId);
        long pendingApprovals = countPendingApprovalsForTenant(tenantId);
        LocalDateTime lastActivityAt = getLastActivityForTenant(tenantId);

        return TenantMetricsDTO.builder()
                .tenantId(tenantId)
                .tenantName(tenant.getName())
                .activeUsers(activeUsers)
                .totalUsers(totalUsers)
                .employeeCount(employeeCount)
                .storageUsageBytes(storageUsageBytes)
                .pendingApprovals(pendingApprovals)
                .lastActivityAt(lastActivityAt)
                .createdAt(tenant.getCreatedAt())
                .build();
    }

    /**
     * Phase 1 of the two-phase impersonation flow (M-12).
     *
     * <p>Generates a short-lived (60s), single-use opaque exchange token stored in Redis.
     * The impersonation JWT is NOT minted here and is NOT returned to the caller — it is
     * minted only in {@link #consumeImpersonationExchangeToken} and placed directly in
     * an httpOnly cookie. This eliminates the prior gap where a 15-min JWT was returned
     * to the browser's JS context but never consumed.</p>
     *
     * @param tenantId the target tenant to impersonate
     * @return exchange token metadata (opaque token + TTL + tenant info for UI display)
     * @throws ResourceNotFoundException if the tenant does not exist
     * @throws IllegalStateException     if the Redis token store is unavailable (fail-closed)
     */
    @Transactional
    public ImpersonationExchangeResponse generateImpersonationExchangeToken(UUID tenantId) {
        log.info("SuperAdmin initiating impersonation exchange token generation for tenant: {}", tenantId);

        Tenant tenant = tenantRepository.findById(tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Tenant not found with ID: " + tenantId));

        UUID currentUserId = com.nulogic.common.security.SecurityContext.getCurrentUserId();
        // Verify the calling user exists in our DB (defence-in-depth against stale JWT).
        userRepository.findById(currentUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Issuing admin not found"));

        String exchangeToken = impersonationExchangeTokenService.generateExchangeToken(currentUserId, tenantId);

        // Audit-log exchange token generation. Full impersonation audit emitted at consume time.
        auditLogService.logAction(
                "TENANT",
                tenantId,
                AuditLog.AuditAction.LOGIN,
                Map.of("action", "impersonation_exchange_token_generated"),
                Map.of("admin_user_id", currentUserId.toString()),
                "SuperAdmin generated impersonation exchange token for tenant: " + tenant.getName()
        );

        return ImpersonationExchangeResponse.builder()
                .exchangeToken(exchangeToken)
                .tenantId(tenantId.toString())
                .tenantName(tenant.getName())
                .expiresInSeconds(ImpersonationExchangeTokenService.TTL_SECONDS)
                .build();
    }

    /**
     * Phase 2 of the two-phase impersonation flow (M-12).
     *
     * <p>Atomically consumes the exchange token from Redis (single-use enforcement),
     * mints an impersonation JWT, and returns it so the caller (SystemAdminController)
     * can place it in an httpOnly cookie. The JWT never enters a JS-readable context.</p>
     *
     * <p>Security properties enforced here:
     * <ul>
     *   <li><strong>Single-use:</strong> Redis GETDEL is atomic — a second call with the same token
     *       returns null immediately.</li>
     *   <li><strong>Expiry:</strong> Redis TTL (60s) enforced by the store; expired tokens also return
     *       null.</li>
     *   <li><strong>SuperAdmin-only issuance:</strong> the controller guard ({@code @RequiresPermission}
     *       with {@code revalidate=true}) verifies SYSTEM_ADMIN permission from the database.</li>
     *   <li><strong>Issuer binding:</strong> the exchange token embeds the admin's user ID; this
     *       method verifies the current caller matches the issuer.</li>
     *   <li><strong>Audit completeness:</strong> full impersonation event is written to the audit log.</li>
     * </ul></p>
     *
     * @param exchangeToken the opaque token from phase 1
     * @return a signed impersonation JWT to be set as an httpOnly cookie by the controller
     * @throws BusinessException if the exchange token is invalid, expired, or already used
     */
    @Transactional
    public String consumeImpersonationExchangeToken(String exchangeToken) {
        Map<String, UUID> payload = impersonationExchangeTokenService.consumeExchangeToken(exchangeToken);
        if (payload == null) {
            log.warn("Impersonation consume failed — exchange token not found, expired, or replayed");
            throw new BusinessException("Impersonation exchange token is invalid, expired, or already used");
        }

        UUID adminUserId = payload.get("adminId");
        UUID targetTenantId = payload.get("targetTenantId");

        Tenant tenant = tenantRepository.findById(targetTenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Target tenant not found: " + targetTenantId));

        User adminUser = userRepository.findById(adminUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Issuing admin user not found: " + adminUserId));

        // Issuer binding: verify the current caller is the same admin who generated the token.
        // The @RequiresPermission guard already verified SYSTEM_ADMIN; this closes the race
        // where Admin-A generates and Admin-B presents the same token.
        UUID currentUserId = com.nulogic.common.security.SecurityContext.getCurrentUserId();
        if (!adminUserId.equals(currentUserId)) {
            log.error("SEC: Impersonation exchange token issuer {} does not match caller {}",
                    adminUserId, currentUserId);
            throw new BusinessException("Exchange token was not issued by the current user");
        }

        String impersonationJwt = jwtTokenProvider.generateImpersonationToken(
                adminUser.getId(),
                adminUser.getEmail(),
                targetTenantId,
                adminUser.getRoles().stream()
                        .map(r -> r.getCode())
                        .collect(Collectors.toSet())
        );

        // Full impersonation audit: who impersonated whom, when, from which IP.
        auditLogService.logAction(
                "TENANT",
                targetTenantId,
                AuditLog.AuditAction.LOGIN,
                Map.of("action", "impersonation_session_started"),
                Map.of(
                        "admin_user_id", adminUser.getId().toString(),
                        "admin_email", adminUser.getEmail(),
                        "target_tenant_id", targetTenantId.toString(),
                        "target_tenant_name", tenant.getName()
                ),
                "SuperAdmin " + adminUser.getEmail() + " started impersonation session for tenant: " + tenant.getName()
        );

        log.info("Impersonation JWT minted and session started: admin={} targetTenant={}",
                adminUser.getId(), targetTenantId);
        return impersonationJwt;
    }

    /**
     * Revoke an outstanding impersonation session (H-3).
     *
     * <p>Extracts the dedicated {@code impersonationJti} from the supplied impersonation
     * token and blacklists it via {@link TokenBlacklistService#revokeImpersonationToken}.
     * {@link com.nulogic.common.security.JwtTokenProvider#validateToken} consults this
     * blacklist for impersonation tokens, so the session is rejected immediately rather
     * than living out its natural 15-minute TTL. The SuperAdmin's own (home) session is
     * unaffected because revocation keys off the impersonationJti, not the userId.</p>
     */
    @Transactional
    public void revokeImpersonationToken(String impersonationToken) {
        if (!jwtTokenProvider.isImpersonationToken(impersonationToken)) {
            throw new IllegalArgumentException("Token is not an impersonation token");
        }
        UUID impersonationJti = jwtTokenProvider.getImpersonationJtiFromToken(impersonationToken);
        if (impersonationJti == null) {
            throw new IllegalArgumentException("Impersonation token has no revocation key");
        }
        Date expiration = jwtTokenProvider.getExpirationFromToken(impersonationToken);
        tokenBlacklistService.revokeImpersonationToken(impersonationJti, expiration);
        log.info("SuperAdmin revoked impersonation session {}", impersonationJti);
    }

    /**
     * Get growth metrics over the last N months.
     *
     * <p>Previously loaded all tenants, employees, and users into heap and filtered in Java —
     * O(N) memory per entity type. Now issues 3 DB aggregate queries per month slice, which is
     * O(1) memory regardless of dataset size (PERF fix).</p>
     */
    @Transactional(readOnly = true)
    public GrowthMetricsDTO getGrowthMetrics(int months) {
        log.info("SuperAdmin requesting growth metrics for last {} months", months);

        // JVM-local: SuperAdmin cross-tenant aggregation — no single tenant zone applies.
        LocalDate now = LocalDate.now();
        List<GrowthMetricsDTO.MonthlyGrowth> growthList = new ArrayList<>();

        for (int i = months - 1; i >= 0; i--) {
            LocalDate monthEnd = now.minusMonths(i)
                    .withDayOfMonth(now.minusMonths(i).lengthOfMonth());
            LocalDateTime monthEndDateTime = monthEnd.atTime(23, 59, 59);

            // Delegate counting to the database — zero heap allocation for entity graphs
            long tenantCount = tenantRepository.countByCreatedAtBefore(monthEndDateTime);
            long employeeCount = employeeRepository.countJoinedOnOrBefore(monthEnd, monthEndDateTime);
            long activeUserCount = userRepository.countByStatusAndCreatedAtBefore(
                    User.UserStatus.ACTIVE, monthEndDateTime);

            Month month = monthEnd.getMonth();
            growthList.add(GrowthMetricsDTO.MonthlyGrowth.builder()
                    .month(month.getDisplayName(TextStyle.SHORT, Locale.ENGLISH))
                    .year(monthEnd.getYear())
                    .tenants(tenantCount)
                    .activeUsers(activeUserCount)
                    .employees(employeeCount)
                    .build());
        }

        return GrowthMetricsDTO.builder().months(growthList).build();
    }

    /**
     * Suspend a tenant — immediately revokes access by invalidating all caches.
     *
     * <p>This method performs three cache-invalidation steps to ensure the suspended
     * tenant cannot continue making requests:
     * <ol>
     *   <li>Persist the status change to the database.</li>
     *   <li>Remove the tenant from {@link TenantFilter}'s in-memory valid-tenant cache
     *       so subsequent requests are rejected immediately (SEC-B10).</li>
     *   <li>Flush all Redis caches scoped to the tenant via {@link TenantCacheManager}
     *       to prevent stale data from being served.</li>
     * </ol>
     */
    @Transactional
    public Tenant suspendTenant(UUID tenantId) {
        log.info("SuperAdmin suspending tenant: {}", tenantId);

        Tenant tenant = tenantRepository.findById(tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Tenant not found with ID: " + tenantId));

        tenant.suspend(); // throws IllegalStateException if not ACTIVE
        tenantRepository.save(tenant);

        // Immediately invalidate caches so the tenant is locked out (SEC-B10)
        tenantFilter.invalidateTenant(tenantId);
        tenantCacheManager.invalidateTenantCaches(tenantId);
        // Sprint-4 follow-up: bypass the 30-second TenantStatusCache TTL so the
        // JwtAuthenticationFilter sees the SUSPENDED status on the very next request.
        tenantStatusCache.evict(tenantId);
        // Sprint-4 M-C4: drop a tenant-wide revocation marker so any token already in flight
        // for users of this tenant is treated as revoked. The primary defense remains the
        // JWT-filter tenant-status check; this is belt-and-braces for race windows where a
        // token was minted just before suspension.
        tokenBlacklistService.revokeAllTokensForTenant(tenantId, Instant.now());

        // Audit log the suspension
        UUID currentUserId = com.nulogic.common.security.SecurityContext.getCurrentUserId();
        auditLogService.logAction(
                "TENANT",
                tenantId,
                com.nulogic.domain.audit.AuditLog.AuditAction.UPDATE,
                Map.of("previousStatus", "ACTIVE", "newStatus", "SUSPENDED"),
                Map.of("admin_user_id", currentUserId),
                "SuperAdmin suspended tenant: " + tenant.getName()
        );

        log.info("Tenant {} suspended successfully. Caches invalidated.", tenantId);
        return tenant;
    }

    /**
     * Re-activate a previously suspended tenant.
     */
    @Transactional
    public Tenant activateTenant(UUID tenantId) {
        log.info("SuperAdmin activating tenant: {}", tenantId);

        Tenant tenant = tenantRepository.findById(tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Tenant not found with ID: " + tenantId));

        String previousStatus = tenant.getStatus().name();
        tenant.activate(); // throws IllegalStateException if not SUSPENDED/PENDING_ACTIVATION
        tenantRepository.save(tenant);
        // Sprint-4 follow-up: bypass the 30-second TenantStatusCache TTL so users of this
        // tenant regain access on the very next request instead of waiting for TTL expiry.
        tenantStatusCache.evict(tenantId);

        // Audit log the activation
        UUID currentUserId = com.nulogic.common.security.SecurityContext.getCurrentUserId();
        auditLogService.logAction(
                "TENANT",
                tenantId,
                com.nulogic.domain.audit.AuditLog.AuditAction.UPDATE,
                Map.of("previousStatus", previousStatus, "newStatus", "ACTIVE"),
                Map.of("admin_user_id", currentUserId),
                "SuperAdmin activated tenant: " + tenant.getName()
        );

        log.info("Tenant {} activated successfully.", tenantId);
        return tenant;
    }

    /**
     * Update the IANA timezone for a tenant and invalidate the per-tenant {@link ZoneId}
     * cache in {@link TenantTimeService} so the change takes effect within the JVM without
     * waiting for the 1-hour cache TTL.
     *
     * <p><strong>Why invalidate AFTER commit.</strong> If we invalidated before the
     * transaction commits, a parallel request could:
     * <ol>
     *   <li>see the invalidation,</li>
     *   <li>call {@code zoneFor(tenantId)} which DB-reads the <em>old</em> timezone (the
     *       update isn't visible to another connection until commit), and</li>
     *   <li>repopulate the cache with the stale value — leaving us right back where we
     *       started for up to another TTL window.</li>
     * </ol>
     * Deferring to {@code afterCommit} closes that race: by the time the cache is cleared,
     * any subsequent read will see the new row. If the transaction rolls back, the cache
     * is left untouched (correct — the DB value didn't change).</p>
     *
     * <p><strong>Multi-pod caveat.</strong> This invalidates only the local JVM cache.
     * Other pods will continue serving the old zone for up to 1 hour. That is acceptable
     * for admin-triggered changes (rare, plannable) per the wave-10 audit. If we need
     * cross-pod immediate consistency we should publish a Redis pub/sub event and have
     * each pod subscribe — out of scope here.</p>
     *
     * @param tenantId target tenant
     * @param newTimezone IANA zone-id; must match the V165 regex (already enforced at
     *                    the controller boundary, re-validated here as defence-in-depth)
     * @return the updated tenant
     */
    @Transactional
    public Tenant updateTenantTimezone(UUID tenantId, String newTimezone) {
        log.info("SuperAdmin updating timezone for tenant {} to '{}'", tenantId, newTimezone);

        if (newTimezone == null || newTimezone.isBlank()) {
            throw new ValidationException("Timezone is required");
        }

        // Semantic validation — the regex at the controller checks shape, but only ZoneId.of
        // can tell us whether the string is a known zone-id. Better to fail here with a clear
        // error than to write a row that TenantTimeService will silently fall back from.
        try {
            ZoneId.of(newTimezone);
        } catch (DateTimeException e) {
            throw new ValidationException("Unknown IANA timezone: '" + newTimezone + "'");
        }

        Tenant tenant = tenantRepository.findById(tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Tenant not found with ID: " + tenantId));

        String previousTimezone = tenant.getTimezone();
        if (newTimezone.equals(previousTimezone)) {
            log.info("Tenant {} timezone already '{}' — no-op", tenantId, newTimezone);
            return tenant;
        }

        tenant.setTimezone(newTimezone);
        tenantRepository.save(tenant);

        // Defer cache invalidation to afterCommit so a concurrent read cannot repopulate
        // the cache with the pre-commit (stale) value. Mirrors the DomainEventPublisher
        // pattern used elsewhere in the codebase.
        if (TransactionSynchronizationManager.isActualTransactionActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    tenantTimeService.invalidate(tenantId);
                    log.info("TenantTimeService cache invalidated for tenant {} after timezone commit", tenantId);
                }
            });
        } else {
            // Defensive branch — @Transactional on this method guarantees a tx is active,
            // but if a caller ever bypasses the proxy (e.g. self-invocation, test setup),
            // invalidate inline so behaviour is still correct.
            tenantTimeService.invalidate(tenantId);
        }

        // Audit log the timezone change
        UUID currentUserId = com.nulogic.common.security.SecurityContext.getCurrentUserId();
        auditLogService.logAction(
                "TENANT",
                tenantId,
                com.nulogic.domain.audit.AuditLog.AuditAction.UPDATE,
                Map.of("previousTimezone", previousTimezone == null ? "" : previousTimezone,
                        "newTimezone", newTimezone),
                Map.of("admin_user_id", currentUserId == null ? "" : currentUserId.toString()),
                "SuperAdmin updated timezone for tenant: " + tenant.getName()
        );

        log.info("Tenant {} timezone updated from '{}' to '{}'", tenantId, previousTimezone, newTimezone);
        return tenant;
    }

    // ===================== Helper Methods =====================

    private long countActiveTenants() {
        return tenantRepository.countByStatus(Tenant.TenantStatus.ACTIVE);
    }

    private long countActiveUsers() {
        // Single aggregate query — no longer loads all users into memory
        return userRepository.countByStatus(User.UserStatus.ACTIVE);
    }

    private long countActiveUsersForTenant(UUID tenantId) {
        // Delegate to batch query map entry — avoids loading all tenant users into memory
        return userRepository.countActiveByTenantIdIn(List.of(tenantId))
                .stream()
                .filter(r -> tenantId.equals(r[0]))
                .map(r -> (Long) r[1])
                .findFirst()
                .orElse(0L);
    }

    private long countUsersForTenant(UUID tenantId) {
        return userRepository.countByTenantId(tenantId);
    }

    private long countEmployeesForTenant(UUID tenantId) {
        return employeeRepository.countByTenantId(tenantId);
    }

    private long countPendingApprovals() {
        // Single cross-tenant query replaces the previous 2N+1 queries per tenant (N+1 fix)
        try {
            return workflowExecutionRepository.countAllPendingCrossTenant();
        } catch (Exception e) { // Intentional broad catch — admin operation error boundary
            log.warn("Could not count pending approvals: {}", e.getMessage());
            return 0L;
        }
    }

    private long countPendingApprovalsForTenant(UUID tenantId) {
        long count = 0;
        try {
            count += workflowExecutionRepository.countByStatus(
                    tenantId,
                    WorkflowExecution.ExecutionStatus.PENDING
            );
            count += workflowExecutionRepository.countByStatus(
                    tenantId,
                    WorkflowExecution.ExecutionStatus.IN_PROGRESS
            );
        } catch (Exception e) { // Intentional broad catch — admin operation error boundary
            log.warn("Could not count pending approvals for tenant {}: {}", tenantId, e.getMessage());
        }
        return count;
    }

    private LocalDateTime getLastActivityForTenant(UUID tenantId) {
        // Query the database for the maximum lastLoginAt timestamp for the tenant.
        // This avoids loading all users into the Java heap and streaming them.
        return userRepository.findMaxLastLoginAtByTenantId(tenantId).orElse(null);
    }

    /**
     * SuperAdmin-initiated password reset.
     *
     * <p>Sequence:
     * <ol>
     *   <li>Resolve the target user inside the current tenant scope (defence-in-depth — even
     *       though {@code SYSTEM_ADMIN} bypasses tenant filters at the security layer, we
     *       still pin the lookup to {@link TenantContext} so cross-tenant accidents require
     *       an explicit impersonation token first).</li>
     *   <li>Generate a 12-char URL-safe Base64 temp password from {@link SecureRandom}.</li>
     *   <li>Persist the BCrypt-encoded hash and stamp {@code passwordChangedAt} so existing
     *       password-age policies kick in.</li>
     *   <li>Revoke all in-flight JWTs for the user via
     *       {@link TokenBlacklistService#revokeAllTokensBefore(String, Instant)}.</li>
     *   <li>Write an audit-log entry (action = {@code PASSWORD_CHANGE}; the enum has no
     *       dedicated {@code PASSWORD_RESET} value — extend the enum in a follow-up if a
     *       distinct event type is required).</li>
     *   <li>Send the temp password to the user out-of-band via email.</li>
     * </ol></p>
     *
     * <p><strong>Security:</strong> the returned DTO never contains the temp password.</p>
     */
    @Transactional
    public AdminPasswordResetResponse adminResetPassword(AdminPasswordResetRequest request, UUID adminUserId) {
        UUID currentTenant = TenantContext.getCurrentTenant();
        log.info("SuperAdmin {} initiating password reset for user {} in tenant {}",
                adminUserId, request.getUserId(), currentTenant);

        User user = userRepository.findByIdAndTenantId(request.getUserId(), currentTenant)
                .orElseThrow(() -> new BusinessException("User not found"));

        String tempPassword = generateSecureTempPassword();
        user.setPasswordHash(passwordEncoder.encode(tempPassword));
        user.setPasswordChangedAt(tenantTimeService.now(currentTenant));
        userRepository.save(user);

        // Revoke all outstanding JWTs for this user so the old password can't be used post-reset.
        // The marker key is the userId; signature requires String, hence toString().
        tokenBlacklistService.revokeAllTokensBefore(user.getId().toString(), Instant.now());

        // Audit log — using PASSWORD_CHANGE because AuditAction.PASSWORD_RESET does not exist
        // in the enum. If a distinct event type is needed downstream, extend AuditLog.AuditAction
        // in a follow-up sprint (out of scope here — the audit domain belongs to another owner).
        auditLogService.logAction(
                "USER",
                user.getId(),
                AuditLog.AuditAction.PASSWORD_CHANGE,
                null,
                null,
                "Admin reset by " + adminUserId + ": " + request.getReason()
        );

        // TODO(S6-B-followup): add EmailNotificationService#sendAdminPasswordReset(User, String)
        //   that uses a dedicated "admin-initiated reset" template explaining the rotation cause.
        //   Method signature:
        //     public void sendAdminPasswordReset(User user, String tempPassword)
        //   For now we reuse the generic password-reset template — the user receives the temp
        //   credential in the token slot so they can sign in once and immediately rotate.
        emailNotificationService.sendPasswordResetEmail(
                user.getEmail(),
                user.getFirstName() != null ? user.getFirstName() : user.getEmail(),
                tempPassword
        );

        LocalDateTime resetAt = tenantTimeService.now(currentTenant);
        log.info("Password reset completed for user {} by admin {} at {}",
                user.getId(), adminUserId, resetAt);

        return AdminPasswordResetResponse.builder()
                .success(true)
                .userId(user.getId())
                .resetAt(resetAt)
                .mustChange(true)
                .build();
    }

    /**
     * Generate a 12-character URL-safe Base64 temp password from 9 random bytes
     * (9 bytes × 8 bits = 72 bits of entropy, encoded as 12 Base64 chars without padding).
     */
    private String generateSecureTempPassword() {
        byte[] bytes = new byte[9];
        SECURE_RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    /**
     * Map a Tenant to TenantListItemDTO using pre-fetched batch counts (N+1 fix).
     */
    private TenantListItemDTO mapToTenantListItem(Tenant tenant, long employeeCount, long userCount,
                                                  LocalDateTime lastActivityAt) {
        long storageUsageBytes = storageMetricsService.getStorageBytesForTenant(tenant.getId());

        return TenantListItemDTO.builder()
                .tenantId(tenant.getId())
                .name(tenant.getName())
                .plan("STANDARD") // Default plan, can be extended in future
                .status(tenant.getStatus() != null ? tenant.getStatus().name() : "ACTIVE")
                .employeeCount(employeeCount)
                .userCount(userCount)
                .storageUsageBytes(storageUsageBytes)
                .createdAt(tenant.getCreatedAt())
                .lastActivityAt(lastActivityAt)
                .build();
    }
}
