package com.nulogic.api.admin.controller;

import com.nulogic.api.admin.dto.*;
import com.nulogic.application.admin.service.SystemAdminService;
import com.nulogic.common.config.CookieConfig;
import com.nulogic.common.security.RequiresPermission;
import com.nulogic.common.security.SecurityContext;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

import static com.nulogic.common.security.Permission.SYSTEM_ADMIN;

/**
 * SuperAdmin system-wide mission control endpoint
 * All endpoints require SYSTEM_ADMIN permission (SuperAdmin role only)
 * Provides cross-tenant visibility and control
 */
@RestController
@RequestMapping("/api/v1/admin/system")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "System Admin", description = "SuperAdmin mission control and cross-tenant management endpoints")
public class SystemAdminController {

    private final SystemAdminService systemAdminService;
    private final CookieConfig cookieConfig;

    /**
     * Get comprehensive system overview
     * Returns aggregated metrics across all tenants
     */
    @GetMapping("/overview")
    @Operation(summary = "Get system overview", description = "Returns comprehensive cross-tenant system metrics including total tenants, active users, pending approvals, and storage usage")
    @RequiresPermission(SYSTEM_ADMIN)
    public ResponseEntity<SystemOverviewDTO> getSystemOverview() {
        log.info("SuperAdmin requesting system overview");
        SystemOverviewDTO overview = systemAdminService.getSystemOverview();
        return ResponseEntity.ok(overview);
    }

    /**
     * Get paginated list of all tenants
     * SuperAdmin only - includes metrics for each tenant
     */
    @GetMapping("/tenants")
    @Operation(summary = "Get paginated tenant list", description = "Returns a paginated list of all tenants with basic metrics including employee count, user count, and storage usage")
    @RequiresPermission(SYSTEM_ADMIN)
    public ResponseEntity<Page<TenantListItemDTO>> getTenantList(
            @PageableDefault(size = 20, page = 0) Pageable pageable) {
        log.info("SuperAdmin requesting tenant list, page: {}, size: {}",
                pageable.getPageNumber(), pageable.getPageSize());
        Page<TenantListItemDTO> tenants = systemAdminService.getTenantList(pageable);
        return ResponseEntity.ok(tenants);
    }

    /**
     * Get deep-dive metrics for a specific tenant
     * SuperAdmin only - returns comprehensive metrics for a single tenant
     */
    @GetMapping("/tenants/{tenantId}/metrics")
    @Operation(summary = "Get tenant metrics", description = "Returns detailed metrics for a specific tenant including active users, employee count, pending approvals, and last activity timestamp")
    @RequiresPermission(SYSTEM_ADMIN)
    public ResponseEntity<TenantMetricsDTO> getTenantMetrics(
            @Parameter(description = "Tenant ID")
            @PathVariable UUID tenantId) {
        log.info("SuperAdmin requesting metrics for tenant: {}", tenantId);
        TenantMetricsDTO metrics = systemAdminService.getTenantMetrics(tenantId);
        return ResponseEntity.ok(metrics);
    }

    /**
     * Get platform growth metrics over the last N months
     * Returns cumulative tenant, employee, and user counts by month
     */
    @GetMapping("/growth-metrics")
    @Operation(summary = "Get platform growth metrics", description = "Returns monthly cumulative counts of tenants, employees, and active users over the specified number of months")
    @RequiresPermission(SYSTEM_ADMIN)
    public ResponseEntity<GrowthMetricsDTO> getGrowthMetrics(
            @Parameter(description = "Number of months of history (default 6, max 24)")
            @RequestParam(defaultValue = "6") int months) {
        log.info("SuperAdmin requesting growth metrics for last {} months", months);
        GrowthMetricsDTO metrics = systemAdminService.getGrowthMetrics(Math.min(months, 24));
        return ResponseEntity.ok(metrics);
    }

    /**
     * Suspend a tenant — blocks all access immediately.
     * Invalidates TenantFilter cache + Redis caches (SEC-B10).
     */
    @PostMapping("/tenants/{tenantId}/suspend")
    @Operation(summary = "Suspend tenant", description = "Suspend a tenant, immediately revoking access by invalidating all caches")
    @RequiresPermission(value = SYSTEM_ADMIN, revalidate = true)
    public ResponseEntity<TenantStatusDTO> suspendTenant(
            @Parameter(description = "Tenant ID to suspend")
            @PathVariable UUID tenantId) {
        log.info("SuperAdmin suspending tenant: {}", tenantId);
        var tenant = systemAdminService.suspendTenant(tenantId);
        return ResponseEntity.ok(TenantStatusDTO.builder()
                .tenantId(tenant.getId())
                .name(tenant.getName())
                .status(tenant.getStatus().name())
                .build());
    }

    /**
     * Re-activate a previously suspended or pending tenant.
     */
    @PostMapping("/tenants/{tenantId}/activate")
    @Operation(summary = "Activate tenant", description = "Re-activate a suspended or pending tenant")
    @RequiresPermission(value = SYSTEM_ADMIN, revalidate = true)
    public ResponseEntity<TenantStatusDTO> activateTenant(
            @Parameter(description = "Tenant ID to activate")
            @PathVariable UUID tenantId) {
        log.info("SuperAdmin activating tenant: {}", tenantId);
        var tenant = systemAdminService.activateTenant(tenantId);
        return ResponseEntity.ok(TenantStatusDTO.builder()
                .tenantId(tenant.getId())
                .name(tenant.getName())
                .status(tenant.getStatus().name())
                .build());
    }

    /**
     * Update a tenant's IANA timezone.
     *
     * <p>Persists the new zone-id on the tenant row and (after the transaction commits)
     * invalidates the per-tenant {@link com.nulogic.common.util.TenantTimeService} cache
     * entry so all scheduled jobs and request handlers running in this JVM pick up the
     * new zone on the next call. Other pods catch up within the cache TTL (1 hour).</p>
     */
    @PatchMapping("/tenants/{tenantId}/timezone")
    @Operation(summary = "Update tenant timezone",
            description = "Update the IANA timezone for a tenant and invalidate the TenantTimeService cache entry on commit")
    @RequiresPermission(value = SYSTEM_ADMIN, revalidate = true)
    public ResponseEntity<TenantStatusDTO> updateTenantTimezone(
            @Parameter(description = "Tenant ID")
            @PathVariable UUID tenantId,
            @Valid @RequestBody UpdateTenantTimezoneRequest request) {
        log.info("SuperAdmin updating timezone for tenant {} to '{}'", tenantId, request.getTimezone());
        var tenant = systemAdminService.updateTenantTimezone(tenantId, request.getTimezone());
        return ResponseEntity.ok(TenantStatusDTO.builder()
                .tenantId(tenant.getId())
                .name(tenant.getName())
                .status(tenant.getStatus().name())
                .build());
    }

    /**
     * Phase 1 of the two-phase impersonation flow (M-12).
     *
     * <p>Generates a short-lived (60s), single-use opaque exchange token stored in Redis.
     * The impersonation JWT is NOT minted here — it is minted only when the client presents
     * the exchange token to {@link #consumeImpersonationExchangeToken}, where it is placed
     * directly into an httpOnly cookie. This design ensures the impersonation JWT is never
     * exposed to JavaScript.</p>
     *
     * <p>Returns: {@code 200 OK} with exchange token + tenant info for UI confirmation.</p>
     */
    @PostMapping("/tenants/{tenantId}/impersonate")
    @Operation(summary = "Generate impersonation exchange token (phase 1 of 2)",
            description = "Generates a short-lived (60s) single-use opaque exchange token. " +
                    "Present the exchangeToken to POST /impersonate/consume to obtain the " +
                    "impersonated session cookie. The JWT is never returned here.")
    @RequiresPermission(value = SYSTEM_ADMIN, revalidate = true)
    public ResponseEntity<ImpersonationExchangeResponse> generateImpersonationExchangeToken(
            @Parameter(description = "Target tenant ID for impersonation")
            @PathVariable UUID tenantId) {
        log.info("SuperAdmin initiating impersonation exchange token for tenant: {}", tenantId);
        ImpersonationExchangeResponse response =
                systemAdminService.generateImpersonationExchangeToken(tenantId);
        return ResponseEntity.ok(response);
    }

    /**
     * Phase 2 of the two-phase impersonation flow (M-12).
     *
     * <p>Atomically consumes the exchange token (Redis single-use enforcement), mints the
     * impersonation JWT, and places it in an httpOnly access-token cookie identical to the
     * normal login cookie. The impersonation JWT is never returned in the response body —
     * it exists only in the cookie jar, inaccessible to JavaScript.</p>
     *
     * <p>Security controls applied here:
     * <ul>
     *   <li>{@code @RequiresPermission(revalidate=true)}: verifies SYSTEM_ADMIN from DB,
     *       not from cached JWT claims, immediately before consumption.</li>
     *   <li>Issuer binding: service verifies the consuming admin matches the token issuer.</li>
     *   <li>Single-use: Redis GETDEL atomicity prevents replay.</li>
     *   <li>Audit log: full impersonation event written asynchronously.</li>
     * </ul></p>
     *
     * <p>Returns: {@code 204 No Content} on success (no body — the session is in the cookie).
     * Returns {@code 403} if the exchange token is invalid, expired, or already used.</p>
     */
    @PostMapping("/impersonate/consume")
    @Operation(summary = "Consume impersonation exchange token (phase 2 of 2)",
            description = "Validates and consumes the exchange token from phase 1 (single-use, 60s TTL). " +
                    "On success, sets the impersonation JWT as an httpOnly access-token cookie and returns 204. " +
                    "The JWT is never present in the response body.")
    @RequiresPermission(value = SYSTEM_ADMIN, revalidate = true)
    public ResponseEntity<Void> consumeImpersonationExchangeToken(
            @Valid @RequestBody ConsumeImpersonationRequest request,
            HttpServletResponse response) {
        log.info("SuperAdmin consuming impersonation exchange token");
        String impersonationJwt = systemAdminService.consumeImpersonationExchangeToken(
                request.getExchangeToken());

        // Place the impersonation JWT in the same httpOnly cookie the normal login flow uses.
        // The cookie is not readable by JavaScript (HttpOnly). The JwtAuthenticationFilter
        // already understands impersonation tokens: it sets SecurityContext + TenantContext
        // from the token's tenantId / impersonatorId claims.
        response.addHeader(HttpHeaders.SET_COOKIE,
                cookieConfig.createAccessTokenCookie(impersonationJwt).toString());
        // Also emit the hardened __Host- variant for clients that accept it (S10-J rollover).
        response.addHeader(HttpHeaders.SET_COOKIE,
                cookieConfig.createHardenedAccessTokenCookie(impersonationJwt).toString());

        log.info("Impersonation session established via httpOnly cookie for admin={}",
                SecurityContext.getCurrentUserId());
        return ResponseEntity.noContent().build();
    }

    /**
     * Revoke an outstanding impersonation session (H-3).
     *
     * <p>Blacklists the supplied impersonation token's dedicated {@code impersonationJti}
     * so {@code validateToken} rejects it on the next request, without affecting the
     * SuperAdmin's own home session.</p>
     */
    @PostMapping("/impersonate/revoke")
    @Operation(summary = "Revoke impersonation token", description = "Immediately revoke a previously-issued impersonation session by blacklisting its impersonationJti")
    @RequiresPermission(value = SYSTEM_ADMIN, revalidate = true)
    public ResponseEntity<Void> revokeImpersonationToken(
            @Valid @RequestBody RevokeImpersonationRequest request) {
        log.info("SuperAdmin revoking impersonation token");
        systemAdminService.revokeImpersonationToken(request.getToken());
        return ResponseEntity.noContent().build();
    }

    /**
     * SuperAdmin-initiated password reset for a target user.
     *
     * <p>Generates a cryptographically-random 12-char temp password (URL-safe Base64),
     * persists the encoded hash, revokes all outstanding JWTs for the user, writes an
     * audit-log entry, and dispatches the temp password to the user via email. The temp
     * password is intentionally <em>not</em> included in the response — it is delivered
     * out-of-band to the user only.</p>
     *
     * <p>Closes wave-3 multi-tenant audit finding: "no admin password reset path".</p>
     */
    @PostMapping("/users/reset-password")
    @RequiresPermission(value = SYSTEM_ADMIN, revalidate = true)
    @Operation(summary = "Admin-initiated user password reset",
            description = "Generates a random temp password, sets force-change flag on next login, emails user")
    public AdminPasswordResetResponse adminResetPassword(@Valid @RequestBody AdminPasswordResetRequest request) {
        log.info("SuperAdmin initiating password reset for user {} (reason length={})",
                request.getUserId(), request.getReason() == null ? 0 : request.getReason().length());
        return systemAdminService.adminResetPassword(request, SecurityContext.getCurrentUserId());
    }
}
