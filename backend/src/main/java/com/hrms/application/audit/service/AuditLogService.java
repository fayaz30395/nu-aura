package com.hrms.application.audit.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.api.audit.dto.AuditLogResponse;
import com.hrms.api.audit.dto.AuditStatisticsResponse;
import com.hrms.common.exception.BusinessException;
import com.hrms.common.security.SecurityContext;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.audit.AuditLog;
import com.hrms.domain.audit.AuditLog.AuditAction;
import com.hrms.infrastructure.audit.repository.AuditLogRepository;
import com.hrms.infrastructure.employee.repository.EmployeeRepository;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.scheduling.annotation.Async;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuditLogService {

    private final AuditLogRepository auditLogRepository;
    private final EmployeeRepository employeeRepository;
    private final ObjectMapper objectMapper;

    // ==================== Logging Methods ====================

    /**
     * Asynchronous, isolated audit write — runs in its own REQUIRES_NEW transaction
     * so an audit failure cannot poison the caller's business transaction, and audit
     * persistence happens off the request thread (Q-P19).
     *
     * <p>Return type is {@code void} because no caller consumes the return value and
     * {@code @Async} requires void or {@code Future<>}. Resolution: any failure is
     * logged but not propagated.</p>
     */
    @Async
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public AuditLog logAction(
            String entityType,
            UUID entityId,
            AuditAction action,
            Object oldValue,
            Object newValue,
            String description
    ) {
        try {
            UUID actorId = SecurityContext.getCurrentUserId();

            // FIX (wave-3 2.3): {@link TenantAwareTaskDecorator} now snapshots
            // RequestAttributes from the calling thread and re-attaches them on
            // this @Async worker thread, so {@link #getHttpServletRequest()}
            // returns the originating request rather than null. If you remove
            // that decorator, IP/User-Agent capture here will silently break —
            // see {@code AsyncConfig#getAsyncExecutor()}.
            HttpServletRequest request = getHttpServletRequest();
            String ipAddress = request != null ? getClientIp(request) : null;
            String userAgent = request != null ? request.getHeader("User-Agent") : null;

            UUID tenantId = SecurityContext.getCurrentTenantId();

            AuditLog auditLog = AuditLog.builder()
                    .entityType(entityType)
                    .entityId(entityId)
                    .action(action)
                    .actorId(actorId)
                    .actorEmail(null)
                    .oldValue(oldValue != null ? objectMapper.writeValueAsString(oldValue) : null)
                    .newValue(newValue != null ? objectMapper.writeValueAsString(newValue) : null)
                    .changes(description)
                    .ipAddress(ipAddress)
                    .userAgent(userAgent != null && userAgent.length() > 500 ? userAgent.substring(0, 500) : userAgent)
                    .build();

            auditLog.setTenantId(tenantId);

            // Audit M-C3 / M-M5 wave-3: when SuperAdmin acts on behalf of a tenant user,
            // capture the underlying admin so the audit chain records both principals.
            // Field + SecurityContext accessor were added in sprint 2 (agent H).
            UUID impersonatorId = SecurityContext.getCurrentImpersonatorId();
            if (impersonatorId != null) {
                auditLog.setImpersonatorId(impersonatorId);
            }

            return auditLogRepository.save(auditLog);
        } catch (JsonProcessingException e) {
            log.error("Failed to serialize audit log values", e);
            throw new BusinessException("Failed to create audit log");
        }
    }

    @Async
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public AuditLog logAction(String entityType, UUID entityId, AuditAction action) {
        return logAction(entityType, entityId, action, null, null, null);
    }

    @Async
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public AuditLog logSecurityEvent(AuditAction action, UUID userId, String description) {
        return logAction("USER", userId, action, null, null, description);
    }

    // ==================== Query Methods (Tenant-Aware) ====================

    @Transactional(readOnly = true)
    public Page<AuditLogResponse> getAllAuditLogs(Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return auditLogRepository.findAllByTenantIdOrderByCreatedAtDesc(tenantId, pageable)
                .map(this::enrichResponse);
    }

    @Transactional(readOnly = true)
    public Page<AuditLogResponse> searchAuditLogs(
            String entityType,
            AuditAction action,
            UUID actorId,
            LocalDateTime startDate,
            LocalDateTime endDate,
            Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return auditLogRepository.searchAuditLogs(tenantId, entityType, action, actorId, startDate, endDate, pageable)
                .map(this::enrichResponse);
    }

    @Transactional(readOnly = true)
    public Page<AuditLogResponse> getAuditLogsByEntityType(String entityType, Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return auditLogRepository.findByTenantIdAndEntityTypeOrderByCreatedAtDesc(tenantId, entityType, pageable)
                .map(this::enrichResponse);
    }

    @Transactional(readOnly = true)
    public Page<AuditLogResponse> getAuditLogsByEntity(String entityType, UUID entityId, Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return auditLogRepository.findByTenantIdAndEntityTypeAndEntityIdOrderByCreatedAtDesc(tenantId, entityType, entityId, pageable)
                .map(this::enrichResponse);
    }

    @Transactional(readOnly = true)
    public Page<AuditLogResponse> getAuditLogsByActor(UUID actorId, Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return auditLogRepository.findByTenantIdAndActorIdOrderByCreatedAtDesc(tenantId, actorId, pageable)
                .map(this::enrichResponse);
    }

    @Transactional(readOnly = true)
    public Page<AuditLogResponse> getAuditLogsByAction(AuditAction action, Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return auditLogRepository.findByTenantIdAndActionOrderByCreatedAtDesc(tenantId, action, pageable)
                .map(this::enrichResponse);
    }

    @Transactional(readOnly = true)
    public Page<AuditLogResponse> getAuditLogsByDateRange(LocalDateTime startDate, LocalDateTime endDate, Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return auditLogRepository.findByTenantIdAndDateRange(tenantId, startDate, endDate, pageable)
                .map(this::enrichResponse);
    }

    @Transactional(readOnly = true)
    public Page<AuditLogResponse> getSecurityEvents(LocalDateTime startDate, LocalDateTime endDate, Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return auditLogRepository.findSecurityEvents(tenantId, startDate, endDate, pageable)
                .map(this::enrichResponse);
    }

    @Transactional(readOnly = true)
    public List<AuditLogResponse> getRecentAuditLogsForEntity(String entityType, UUID entityId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return auditLogRepository.findTop10ByTenantIdAndEntityTypeAndEntityIdOrderByCreatedAtDesc(tenantId, entityType, entityId)
                .stream()
                .map(this::enrichResponse)
                .collect(Collectors.toList());
    }

    // ==================== Cross-Tenant Query Methods (SUPER_ADMIN only — wave-3 M-C2) ====================

    /**
     * Cross-tenant audit-log query for SuperAdmin / SYSTEM:ADMIN.
     *
     * <p><strong>Security:</strong> intentionally bypasses {@link TenantContext}'s
     * tenant filter. The caller-side controller already gates entry via
     * {@code @RequiresPermission(SYSTEM_ADMIN, revalidate=true)}; we re-check here
     * for defense-in-depth so a misconfigured controller cannot accidentally expose
     * cross-tenant audit data.</p>
     */
    @Transactional(readOnly = true)
    public Page<AuditLogResponse> getAllAuditLogsCrossTenant(Pageable pageable) {
        requireSuperAdminOrSystemAdmin();
        return auditLogRepository.findAllByOrderByCreatedAtDesc(pageable)
                .map(this::enrichResponseCrossTenant);
    }

    /**
     * Cross-tenant search with optional {@code tenantId} narrowing for SuperAdmin.
     * When {@code tenantId} is null, the search spans all tenants.
     */
    @Transactional(readOnly = true)
    public Page<AuditLogResponse> searchCrossTenant(UUID tenantId, String entityType, AuditAction action,
                                                    UUID actorId, LocalDateTime startDate, LocalDateTime endDate,
                                                    Pageable pageable) {
        requireSuperAdminOrSystemAdmin();
        return auditLogRepository.searchCrossTenant(tenantId, entityType, action, actorId, startDate, endDate, pageable)
                .map(this::enrichResponseCrossTenant);
    }

    /**
     * Defense-in-depth re-check that the current security context holds SUPER_ADMIN
     * role or the SYSTEM:ADMIN permission. Throws {@link AccessDeniedException}
     * (handled by the global exception handler -> 403) when neither is present.
     */
    private void requireSuperAdminOrSystemAdmin() {
        if (!SecurityContext.isSuperAdmin() && !SecurityContext.hasPermission("SYSTEM:ADMIN")) {
            throw new AccessDeniedException(
                    "Cross-tenant audit-log query requires SUPER_ADMIN or SYSTEM:ADMIN");
        }
    }

    /**
     * Cross-tenant variant of {@link #enrichResponse(AuditLog)} — uses the audit
     * log's own tenantId rather than {@link TenantContext}, so actor-name enrichment
     * works correctly when the result spans many tenants.
     */
    private AuditLogResponse enrichResponseCrossTenant(AuditLog entity) {
        AuditLogResponse response = AuditLogResponse.fromEntity(entity);
        if (entity.getActorId() != null && entity.getTenantId() != null) {
            employeeRepository.findByIdAndTenantId(entity.getActorId(), entity.getTenantId())
                    .ifPresent(emp -> response.setActorName(emp.getFirstName() + " " + emp.getLastName()));
        }
        return response;
    }

    // ==================== Statistics Methods ====================

    @Transactional(readOnly = true)
    public AuditStatisticsResponse getAuditStatistics(LocalDateTime startDate, LocalDateTime endDate) {
        UUID tenantId = TenantContext.getCurrentTenant();

        long totalEvents = auditLogRepository.countByTenantIdAndDateRange(tenantId, startDate, endDate);

        // Events by action
        Map<String, Long> eventsByAction = new LinkedHashMap<>();
        List<Object[]> actionCounts = auditLogRepository.countByActionForDateRange(tenantId, startDate, endDate);
        for (Object[] row : actionCounts) {
            AuditAction action = (AuditAction) row[0];
            Long count = (Long) row[1];
            eventsByAction.put(action.name(), count);
        }

        // Events by entity type
        Map<String, Long> eventsByEntityType = new LinkedHashMap<>();
        List<Object[]> entityTypeCounts = auditLogRepository.countByEntityTypeForDateRange(tenantId, startDate, endDate);
        for (Object[] row : entityTypeCounts) {
            String entityType = (String) row[0];
            Long count = (Long) row[1];
            eventsByEntityType.put(entityType, count);
        }

        // Top actors
        List<AuditStatisticsResponse.ActorActivity> topActors = new ArrayList<>();
        List<Object[]> actorCounts = auditLogRepository.countByActorForDateRange(tenantId, startDate, endDate);
        int limit = Math.min(10, actorCounts.size());
        for (int i = 0; i < limit; i++) {
            Object[] row = actorCounts.get(i);
            topActors.add(AuditStatisticsResponse.ActorActivity.builder()
                    .actorId((UUID) row[0])
                    .actorEmail((String) row[1])
                    .eventCount((Long) row[2])
                    .build());
        }

        // Daily counts
        List<AuditStatisticsResponse.DailyCount> dailyCounts = new ArrayList<>();
        List<Object[]> dayCounts = auditLogRepository.countByDayForDateRange(tenantId, startDate, endDate);
        for (Object[] row : dayCounts) {
            java.sql.Date sqlDate = (java.sql.Date) row[0];
            Long count = (Long) row[1];
            dailyCounts.add(AuditStatisticsResponse.DailyCount.builder()
                    .date(sqlDate.toLocalDate())
                    .count(count)
                    .build());
        }

        return AuditStatisticsResponse.builder()
                .totalEvents(totalEvents)
                .startDate(startDate)
                .endDate(endDate)
                .eventsByAction(eventsByAction)
                .eventsByEntityType(eventsByEntityType)
                .topActors(topActors)
                .dailyCounts(dailyCounts)
                .build();
    }

    @Transactional(readOnly = true)
    public Map<String, Long> getAuditSummary() {
        UUID tenantId = TenantContext.getCurrentTenant();
        Map<String, Long> summary = new LinkedHashMap<>();

        summary.put("totalEvents", auditLogRepository.countByTenantId(tenantId));

        // Last 24 hours
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime yesterday = now.minusDays(1);
        summary.put("eventsLast24Hours", auditLogRepository.countByTenantIdAndDateRange(tenantId, yesterday, now));

        // Last 7 days
        LocalDateTime lastWeek = now.minusDays(7);
        summary.put("eventsLast7Days", auditLogRepository.countByTenantIdAndDateRange(tenantId, lastWeek, now));

        // Last 30 days
        LocalDateTime lastMonth = now.minusDays(30);
        summary.put("eventsLast30Days", auditLogRepository.countByTenantIdAndDateRange(tenantId, lastMonth, now));

        return summary;
    }

    @Transactional(readOnly = true)
    public List<String> getDistinctEntityTypes() {
        UUID tenantId = TenantContext.getCurrentTenant();
        // Return common entity types
        return Arrays.asList(
                "USER", "EMPLOYEE", "DEPARTMENT", "LEAVE_REQUEST", "ATTENDANCE",
                "PAYROLL", "EXPENSE", "DOCUMENT", "ROLE", "PERMISSION"
        );
    }

    // ==================== Helper Methods ====================

    private AuditLogResponse enrichResponse(AuditLog entity) {
        AuditLogResponse response = AuditLogResponse.fromEntity(entity);

        // Enrich with actor name
        UUID tenantId = TenantContext.getCurrentTenant();
        if (entity.getActorId() != null) {
            employeeRepository.findByIdAndTenantId(entity.getActorId(), tenantId)
                    .ifPresent(emp -> response.setActorName(emp.getFirstName() + " " + emp.getLastName()));
        }

        return response;
    }

    private HttpServletRequest getHttpServletRequest() {
        try {
            ServletRequestAttributes attributes = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
            return attributes != null ? attributes.getRequest() : null;
        } catch (Exception e) { // Intentional broad catch — service error boundary
            return null;
        }
    }

    private String getClientIp(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isEmpty()) {
            return xForwardedFor.split(",")[0].trim();
        }
        String ip = request.getRemoteAddr();
        return ip != null && ip.length() <= 50 ? ip : (ip != null ? ip.substring(0, 50) : null);
    }

    // ==================== Legacy Methods (Backward Compatibility) ====================

    @Transactional(readOnly = true)
    public Page<AuditLog> getAuditLogs(int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        return auditLogRepository.findAll(pageable);
    }

    @Transactional(readOnly = true)
    public Page<AuditLog> getAuditLogsByEntityType(String entityType, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        return auditLogRepository.findByEntityTypeOrderByCreatedAtDesc(entityType, pageable);
    }

    @Transactional(readOnly = true)
    public Page<AuditLog> getAuditLogsByEntity(String entityType, UUID entityId, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        return auditLogRepository.findByEntityTypeAndEntityIdOrderByCreatedAtDesc(entityType, entityId, pageable);
    }

    @Transactional(readOnly = true)
    public Page<AuditLog> getAuditLogsByActor(UUID actorId, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        return auditLogRepository.findByActorIdOrderByCreatedAtDesc(actorId, pageable);
    }

    @Transactional(readOnly = true)
    public Page<AuditLog> getAuditLogsByAction(AuditAction action, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        return auditLogRepository.findByActionOrderByCreatedAtDesc(action, pageable);
    }

    @Transactional(readOnly = true)
    public Page<AuditLog> getAuditLogsByDateRange(LocalDateTime startDate, LocalDateTime endDate, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        return auditLogRepository.findByDateRange(startDate, endDate, pageable);
    }
}
