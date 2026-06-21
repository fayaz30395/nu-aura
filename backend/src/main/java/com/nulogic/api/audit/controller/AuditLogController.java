package com.nulogic.api.audit.controller;

import com.nulogic.api.audit.dto.AuditLogResponse;
import com.nulogic.api.audit.dto.AuditStatisticsResponse;
import com.nulogic.application.audit.service.AuditLogService;
import com.nulogic.common.security.Permission;
import com.nulogic.common.security.RequiresPermission;
import com.nulogic.domain.audit.AuditLog;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeParseException;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping({"/api/v1/audit", "/api/v1/audit-logs"})
@RequiredArgsConstructor
@Slf4j
public class AuditLogController {

    private final AuditLogService auditLogService;

    // ==================== Query Endpoints ====================

    @GetMapping
    @RequiresPermission(Permission.AUDIT_VIEW)
    public ResponseEntity<Page<AuditLogResponse>> getAllAuditLogs(Pageable pageable) {
        log.info("Fetching all audit logs");
        return ResponseEntity.ok(auditLogService.getAllAuditLogs(pageable));
    }

    @GetMapping("/search")
    @RequiresPermission(Permission.AUDIT_VIEW)
    public ResponseEntity<Page<AuditLogResponse>> searchAuditLogs(
            @RequestParam(required = false) String entityType,
            @RequestParam(required = false) AuditLog.AuditAction action,
            @RequestParam(required = false) UUID actorId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate,
            Pageable pageable) {
        log.info("Searching audit logs with filters");
        return ResponseEntity.ok(auditLogService.searchAuditLogs(entityType, action, actorId, startDate, endDate, pageable));
    }

    @GetMapping("/entity-type/{entityType}")
    @RequiresPermission(Permission.AUDIT_VIEW)
    public ResponseEntity<Page<AuditLogResponse>> getAuditLogsByEntityType(
            @PathVariable String entityType,
            Pageable pageable) {
        return ResponseEntity.ok(auditLogService.getAuditLogsByEntityType(entityType, pageable));
    }

    @GetMapping("/entity/{entityType}/{entityId}")
    @RequiresPermission(Permission.AUDIT_VIEW)
    public ResponseEntity<Page<AuditLogResponse>> getAuditLogsByEntity(
            @PathVariable String entityType,
            @PathVariable UUID entityId,
            Pageable pageable) {
        return ResponseEntity.ok(auditLogService.getAuditLogsByEntity(entityType, entityId, pageable));
    }

    @GetMapping("/entity/{entityType}/{entityId}/recent")
    @RequiresPermission(Permission.AUDIT_VIEW)
    public ResponseEntity<List<AuditLogResponse>> getRecentAuditLogsForEntity(
            @PathVariable String entityType,
            @PathVariable UUID entityId) {
        return ResponseEntity.ok(auditLogService.getRecentAuditLogsForEntity(entityType, entityId));
    }

    @GetMapping("/actor/{actorId}")
    @RequiresPermission(Permission.AUDIT_VIEW)
    public ResponseEntity<Page<AuditLogResponse>> getAuditLogsByActor(
            @PathVariable UUID actorId,
            Pageable pageable) {
        return ResponseEntity.ok(auditLogService.getAuditLogsByActor(actorId, pageable));
    }

    @GetMapping("/action/{action}")
    @RequiresPermission(Permission.AUDIT_VIEW)
    public ResponseEntity<Page<AuditLogResponse>> getAuditLogsByAction(
            @PathVariable AuditLog.AuditAction action,
            Pageable pageable) {
        return ResponseEntity.ok(auditLogService.getAuditLogsByAction(action, pageable));
    }

    @GetMapping("/date-range")
    @RequiresPermission(Permission.AUDIT_VIEW)
    public ResponseEntity<Page<AuditLogResponse>> getAuditLogsByDateRange(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate,
            Pageable pageable) {
        return ResponseEntity.ok(auditLogService.getAuditLogsByDateRange(startDate, endDate, pageable));
    }

    // ==================== Security Endpoints ====================

    @GetMapping("/security-events")
    @RequiresPermission(value = Permission.AUDIT_VIEW, revalidate = true)
    public ResponseEntity<Page<AuditLogResponse>> getSecurityEvents(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate,
            Pageable pageable) {
        log.info("Fetching security events from {} to {}", startDate, endDate);
        return ResponseEntity.ok(auditLogService.getSecurityEvents(startDate, endDate, pageable));
    }

    // ==================== Statistics Endpoints ====================

    @GetMapping("/statistics")
    @RequiresPermission(Permission.AUDIT_VIEW)
    public ResponseEntity<AuditStatisticsResponse> getAuditStatistics(
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate) {
        // GF Run-5 FIX: the dashboard stats widget sends a date-only range
        // (yyyy-MM-dd) but the params were typed LocalDateTime, so every call from
        // an audit-capable role 400'd ("Expected type: LocalDateTime") and surfaced
        // the "Analytics data could not be loaded" banner. Accept BOTH date-only and
        // full date-time (backward compatible), and keep the NU-006 default 30-day
        // window when the range is omitted.
        LocalDateTime resolvedEnd = parseFlexibleDateTime(endDate, true);
        if (resolvedEnd == null) {
            resolvedEnd = LocalDateTime.now();
        }
        LocalDateTime resolvedStart = parseFlexibleDateTime(startDate, false);
        if (resolvedStart == null) {
            resolvedStart = resolvedEnd.minusDays(30);
        }
        log.info("Getting audit statistics from {} to {}", resolvedStart, resolvedEnd);
        return ResponseEntity.ok(auditLogService.getAuditStatistics(resolvedStart, resolvedEnd));
    }

    /**
     * Parses a query-string date that may be either a full ISO date-time
     * ({@code 2026-05-23T10:15:00}) or a date-only value ({@code 2026-05-23}).
     * Date-only values are widened to the start of day, or the end of day when
     * {@code endOfDay} is true so the range is inclusive. Returns {@code null}
     * for null/blank input; throws {@link DateTimeParseException} (→ HTTP 400)
     * only when the value is genuinely unparseable.
     */
    private static LocalDateTime parseFlexibleDateTime(String value, boolean endOfDay) {
        if (value == null || value.isBlank()) {
            return null;
        }
        String trimmed = value.trim();
        try {
            return LocalDateTime.parse(trimmed);
        } catch (DateTimeParseException ignored) {
            LocalDate date = LocalDate.parse(trimmed);
            return endOfDay ? date.atTime(LocalTime.MAX) : date.atStartOfDay();
        }
    }

    @GetMapping("/summary")
    @RequiresPermission(Permission.AUDIT_VIEW)
    public ResponseEntity<Map<String, Long>> getAuditSummary() {
        log.info("Getting audit summary");
        return ResponseEntity.ok(auditLogService.getAuditSummary());
    }

    // ==================== Reference Data Endpoints ====================

    @GetMapping("/entity-types")
    @RequiresPermission(Permission.AUDIT_VIEW)
    public ResponseEntity<List<String>> getEntityTypes() {
        return ResponseEntity.ok(auditLogService.getDistinctEntityTypes());
    }

    @GetMapping("/actions")
    @RequiresPermission(Permission.AUDIT_VIEW)
    public ResponseEntity<AuditLog.AuditAction[]> getActions() {
        return ResponseEntity.ok(AuditLog.AuditAction.values());
    }
}
