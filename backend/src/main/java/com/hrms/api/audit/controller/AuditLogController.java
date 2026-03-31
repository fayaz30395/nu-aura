package com.hrms.api.audit.controller;

import com.hrms.api.audit.dto.AuditLogResponse;
import com.hrms.api.audit.dto.AuditStatisticsResponse;
import com.hrms.application.audit.service.AuditLogService;
import com.hrms.common.security.Permission;
import com.hrms.common.security.RequiresPermission;
import com.hrms.domain.audit.AuditLog;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
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
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate) {
        log.info("Getting audit statistics from {} to {}", startDate, endDate);
        return ResponseEntity.ok(auditLogService.getAuditStatistics(startDate, endDate));
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
