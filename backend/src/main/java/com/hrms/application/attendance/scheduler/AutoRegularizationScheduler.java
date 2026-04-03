package com.hrms.application.attendance.scheduler;

import com.hrms.common.security.TenantContext;
import com.hrms.domain.attendance.AttendanceRecord;
import com.hrms.infrastructure.attendance.repository.AttendanceRecordRepository;
import com.hrms.application.attendance.service.CompOffService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import net.javacrumbs.shedlock.spring.annotation.SchedulerLock;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * Nightly scheduler that:
 * <ol>
 *   <li>Auto-regularizes INCOMPLETE attendance records older than the configured threshold.</li>
 *   <li>Auto-approves eligible comp-off requests older than the configured threshold.</li>
 * </ol>
 *
 * <p>Runs at 01:00 AM IST every night.</p>
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class AutoRegularizationScheduler {

    /**
     * Default: regularize INCOMPLETE records that are >= 3 days old.
     */
    private static final int DEFAULT_REGULARIZE_AFTER_DAYS = 3;
    /**
     * BUG-004 FIX: Maximum look-back window when scanning for INCOMPLETE records.
     * Previously the lower bound was hardcoded to {@code LocalDate.of(2020,1,1)},
     * meaning the query window grew unboundedly with time (6+ years by 2026),
     * loading millions of stale records into heap on every nightly run.
     * One year is sufficient — records older than MAX_LOOK_BACK_DAYS + DEFAULT_REGULARIZE_AFTER_DAYS
     * were already regularized in a prior run.
     */
    private static final int MAX_LOOK_BACK_DAYS = 365;
    /**
     * Default: auto-approve comp-off requests >= 7 days old.
     */
    private static final int DEFAULT_COMP_OFF_AUTO_APPROVE_DAYS = 7;

    private final AttendanceRecordRepository attendanceRecordRepository;
    private final CompOffService compOffService;
    private final JdbcTemplate jdbcTemplate;

    /**
     * Auto-regularize INCOMPLETE attendance.
     * Cron: 01:00 AM IST = 19:30 UTC (UTC+5:30).
     */
    @Scheduled(cron = "0 30 19 * * *", zone = "UTC")
    @SchedulerLock(name = "autoRegularizeAttendance", lockAtLeastFor = "PT5M", lockAtMostFor = "PT30M")
    public void autoRegularizeAttendance() {
        log.info("AutoRegularizationScheduler: starting attendance regularization run");

        List<UUID> tenants = fetchActiveTenants();
        int totalFixed = 0;

        for (UUID tenantId : tenants) {
            try {
                int fixed = regularizeTenantAttendance(tenantId);
                totalFixed += fixed;
            } catch (Exception e) { // Intentional broad catch — scheduled job error boundary
                log.error("Failed to regularize attendance for tenant {}: {}", tenantId, e.getMessage(), e);
            }
        }

        log.info("AutoRegularizationScheduler: regularized {} records across {} tenants", totalFixed, tenants.size());
    }

    /**
     * Auto-approve comp-off requests older than threshold.
     * Cron: 01:30 AM IST = 20:00 UTC.
     */
    @Scheduled(cron = "0 0 20 * * *", zone = "UTC")
    @SchedulerLock(name = "autoApproveCompOff", lockAtLeastFor = "PT5M", lockAtMostFor = "PT30M")
    public void autoApproveCompOff() {
        log.info("AutoRegularizationScheduler: starting comp-off auto-approval run");

        List<UUID> tenants = fetchActiveTenants();
        int totalApproved = 0;

        for (UUID tenantId : tenants) {
            try {
                TenantContext.setCurrentTenant(tenantId);
                int approved = compOffService.autoApproveEligibleRequests(tenantId, DEFAULT_COMP_OFF_AUTO_APPROVE_DAYS);
                totalApproved += approved;
            } catch (Exception e) { // Intentional broad catch — scheduled job error boundary
                log.error("Failed to auto-approve comp-off for tenant {}: {}", tenantId, e.getMessage(), e);
            } finally {
                TenantContext.clear();
            }
        }

        log.info("AutoRegularizationScheduler: auto-approved {} comp-off requests", totalApproved);
    }

    // ========== Internals ==========

    @Transactional
    public int regularizeTenantAttendance(UUID tenantId) {
        TenantContext.setCurrentTenant(tenantId);
        try {
            // Load the tenant-specific config (or use defaults)
            int afterDays = getTenantRegularizeAfterDays(tenantId);
            LocalDate cutoffDate = LocalDate.now().minusDays(afterDays);

            // BUG-004 FIX: Use a dynamic rolling window instead of a hardcoded
            // 2020-01-01 floor.  We only need to look back MAX_LOOK_BACK_DAYS
            // because any older INCOMPLETE record was already regularized in a
            // previous nightly run.  This prevents the query from loading an
            // ever-growing slab of historical rows into heap each night.
            LocalDate windowStart = cutoffDate.minusDays(MAX_LOOK_BACK_DAYS);

            List<AttendanceRecord> incompleteRecords = attendanceRecordRepository
                    .findAllByTenantIdAndAttendanceDateBetween(tenantId, windowStart, cutoffDate)
                    .stream()
                    .filter(r -> r.getStatus() == AttendanceRecord.AttendanceStatus.INCOMPLETE)
                    .toList();

            // BUG-004 FIX: Batch-update all records in a single saveAll() call
            // instead of issuing N individual UPDATE statements inside a loop.
            incompleteRecords.forEach(record -> {
                record.setStatus(AttendanceRecord.AttendanceStatus.PRESENT);
                record.setRegularizationRequested(false);
                record.setRegularizationApproved(true);
            });
            attendanceRecordRepository.saveAll(incompleteRecords);

            int count = incompleteRecords.size();
            log.debug("Regularized {} INCOMPLETE records for tenant {}", count, tenantId);
            return count;
        } finally {
            TenantContext.clear();
        }
    }

    private int getTenantRegularizeAfterDays(UUID tenantId) {
        try {
            Integer days = jdbcTemplate.queryForObject(
                    "SELECT auto_regularize_after_days FROM attendance_regularization_config WHERE tenant_id = ?",
                    Integer.class, tenantId);
            return days != null ? days : DEFAULT_REGULARIZE_AFTER_DAYS;
        } catch (Exception e) { // Intentional broad catch — scheduled job error boundary
            return DEFAULT_REGULARIZE_AFTER_DAYS;
        }
    }

    private List<UUID> fetchActiveTenants() {
        try {
            return jdbcTemplate.queryForList(
                    "SELECT id FROM tenants WHERE is_active = true", UUID.class);
        } catch (Exception e) { // Intentional broad catch — scheduled job error boundary
            log.warn("Could not fetch active tenants: {}", e.getMessage());
            return List.of();
        }
    }
}
