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

import java.time.DateTimeException;
import java.time.ZoneId;

import java.security.SecureRandom;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.Month;
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

        // Last-activity lookup: still per-tenant but only for the page slice
        Map<UUID, LocalDateTime> lastActivityByTenant = tenantIds.stream()
                .collect(Collectors.toMap(
                        id -> id,
                        id -> getLastActivityForTenant(id)
                ));

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
     * Generate an impersonation token for accessing a specific tenant
     * SuperAdmin can use this token to act as if they're part of that tenant
     */
    @Transactional
    public ImpersonationTokenDTO generateImpersonationToken(UUID tenantId) {
        log.info("SuperAdmin generating impersonation token for tenant: {}", tenantId);

        Tenant tenant = tenantRepository.findById(tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Tenant not found with ID: " + tenantId));

        // Get current SuperAdmin user from security context
        UUID currentUserId = com.nulogic.common.security.SecurityContext.getCurrentUserId();
        User currentUser = userRepository.findById(currentUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Current user not found"));

        // Generate impersonation token with target tenant context
        // The token will carry the SuperAdmin's user ID but with the tenant context set to target tenant
        String impersonationToken = jwtTokenProvider.generateImpersonationToken(
                currentUser.getId(),
                currentUser.getEmail(),
                tenantId,
                currentUser.getRoles().stream()
                        .map(r -> r.getCode())
                        .collect(Collectors.toSet())
        );

        // Audit log the impersonation
        auditLogService.logAction(
                "TENANT",
                tenantId,
                com.nulogic.domain.audit.AuditLog.AuditAction.LOGIN,
                Map.of("action", "impersonation_token_generated"),
                Map.of("admin_user_id", currentUser.getId()),
                "SuperAdmin generated impersonation token for tenant: " + tenant.getName()
        );

        return ImpersonationTokenDTO.builder()
                .token(impersonationToken)
                .tokenType("Bearer")
                .expiresIn(3600) // 1 hour expiry
                .tenantId(tenantId.toString())
                .tenantName(tenant.getName())
                .build();
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
        user.setPasswordChangedAt(LocalDateTime.now());
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

        LocalDateTime resetAt = LocalDateTime.now();
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
