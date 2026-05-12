package com.nulogic.api.admin.controller;

import com.nulogic.api.audit.dto.AuditLogResponse;
import com.nulogic.application.audit.service.AuditLogService;
import com.nulogic.common.security.RequiresPermission;
import com.nulogic.domain.audit.AuditLog.AuditAction;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.UUID;

import static com.nulogic.common.security.Permission.SYSTEM_ADMIN;

/**
 * SuperAdmin cross-tenant audit-log inspection endpoint (wave-3 M-C2).
 *
 * <p>All endpoints require the {@code SYSTEM:ADMIN} permission with {@code revalidate=true}
 * so every request re-reads the user's current role from the database — stale JWT claims
 * cannot grant cross-tenant audit visibility. The service layer re-checks the same gate
 * for defense-in-depth.</p>
 *
 * <p>Distinct from the tenant-scoped {@code AuditLogController} which is filtered by
 * {@link com.nulogic.common.security.TenantContext}.</p>
 */
@RestController
@RequestMapping("/api/v1/admin/system/audit-logs")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "System Audit Logs", description = "SuperAdmin cross-tenant audit log inspection")
public class SystemAuditLogController {

    private final AuditLogService auditLogService;

    /**
     * List audit logs across all tenants, paginated. Ordered by createdAt DESC.
     */
    @GetMapping
    @Operation(summary = "Get all audit logs (cross-tenant)",
            description = "Returns paginated audit logs across all tenants. SuperAdmin only.")
    @RequiresPermission(value = SYSTEM_ADMIN, revalidate = true)
    public Page<AuditLogResponse> getAllAuditLogsCrossTenant(
            @PageableDefault(size = 50, page = 0) Pageable pageable) {
        log.info("SuperAdmin requesting cross-tenant audit logs, page: {}, size: {}",
                pageable.getPageNumber(), pageable.getPageSize());
        return auditLogService.getAllAuditLogsCrossTenant(pageable);
    }

    /**
     * Search audit logs across tenants with optional filters. When {@code tenantId}
     * is omitted the search spans all tenants; otherwise it narrows to a single tenant.
     */
    @GetMapping("/search")
    @Operation(summary = "Search audit logs (cross-tenant)",
            description = "Searches audit logs across tenants. Pass tenantId to narrow to a single tenant, " +
                    "omit it to search the whole system. SuperAdmin only.")
    @RequiresPermission(value = SYSTEM_ADMIN, revalidate = true)
    public Page<AuditLogResponse> searchCrossTenant(
            @Parameter(description = "Optional tenant ID to narrow the search")
            @RequestParam(required = false) UUID tenantId,
            @Parameter(description = "Optional entity-type filter (e.g. USER, TENANT)")
            @RequestParam(required = false) String entityType,
            @Parameter(description = "Optional audit-action filter")
            @RequestParam(required = false) AuditAction action,
            @Parameter(description = "Optional actor user-ID filter")
            @RequestParam(required = false) UUID actorId,
            @Parameter(description = "Lower bound on createdAt (ISO-8601 date-time)")
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
            @Parameter(description = "Upper bound on createdAt (ISO-8601 date-time)")
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate,
            @PageableDefault(size = 50, page = 0) Pageable pageable) {
        log.info("SuperAdmin searching cross-tenant audit logs (tenantId={}, entityType={}, action={})",
                tenantId, entityType, action);
        return auditLogService.searchCrossTenant(tenantId, entityType, action, actorId, startDate, endDate, pageable);
    }
}
