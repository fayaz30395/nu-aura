package com.hrms.api.admin.controller;

import com.hrms.api.admin.dto.*;
import com.hrms.application.admin.service.SystemAdminService;
import com.hrms.common.security.RequiresPermission;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

import static com.hrms.common.security.Permission.SYSTEM_ADMIN;

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
     * Generate an impersonation token for a specific tenant
     * SuperAdmin can use this token to access a tenant's data
     * Useful for troubleshooting and support
     */
    @PostMapping("/tenants/{tenantId}/impersonate")
    @Operation(summary = "Generate impersonation token", description = "Generate a JWT token that allows SuperAdmin to access a specific tenant's data for troubleshooting or support purposes")
    @RequiresPermission(SYSTEM_ADMIN)
    public ResponseEntity<ImpersonationTokenDTO> generateImpersonationToken(
            @Parameter(description = "Target tenant ID for impersonation")
            @PathVariable UUID tenantId) {
        log.info("SuperAdmin generating impersonation token for tenant: {}", tenantId);
        ImpersonationTokenDTO token = systemAdminService.generateImpersonationToken(tenantId);
        return ResponseEntity.ok(token);
    }
}
