package com.hrms.application.attendance.scheduler;

import com.hrms.common.security.TenantContext;
import com.hrms.domain.attendance.AttendanceRecord;
import com.hrms.infrastructure.attendance.repository.AttendanceRecordRepository;
import com.hrms.application.attendance.service.CompOffService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
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

    /** Default: regularize INCOMPLETE records that are >= 3 days old. */
    private static final int DEFAULT_REGULARIZE_AFTER_DAYS = 3;
    /** Default: auto-approve comp-off requests >= 7 days old. */
    private static final int DEFAULT_COMP_OFF_AUTO_APPROVE_DAYS = 7;

    private final AttendanceRecordRepository attendanceRecordRepository;
    private final CompOffService compOffService;
    private final JdbcTemplate jdbcTemplate;

    /**
     * Auto-regularize INCOMPLETE attendance.
     * Cron: 01:00 AM IST = 19:30 UTC (UTC+5:30).
     */
    @Scheduled(cron = "0 30 19 * * *", zone = "UTC")
    public void autoRegularizeAttendance() {
        log.info("AutoRegularizationScheduler: starting attendance regularization run");

        List<UUID> tenants = fetchActiveTenants();
        int totalFixed = 0;

        for (UUID tenantId : tenants) {
            try {
                int fixed = regularizeTenantAttendance(tenantId);
                totalFixed += fixed;
            } catch (Exception e) {
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
    public void autoApproveCompOff() {
        log.info("AutoRegularizationScheduler: starting comp-off auto-approval run");

        List<UUID> tenants = fetchActiveTenants();
        int totalApproved = 0;

        for (UUID tenantId : tenants) {
            try {
                TenantContext.setCurrentTenant(tenantId);
                int approved = compOffService.autoApproveEligibleRequests(tenantId, DEFAULT_COMP_OFF_AUTO_APPROVE_DAYS);
                totalApproved += approved;
            } catch (Exception e) {
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

            // Find INCOMPLETE records older than cutoff date
            List<AttendanceRecord> incompleteRecords = attendanceRecordRepository
                    .findAllByTenantIdAndAttendanceDateBetween(tenantId, LocalDate.of(2020, 1, 1), cutoffDate)
                    .stream()
                    .filter(r -> r.getStatus() == AttendanceRecord.AttendanceStatus.INCOMPLETE)
                    .toList();

            int count = 0;
            for (AttendanceRecord record : incompleteRecords) {
                try {
                    record.setStatus(AttendanceRecord.AttendanceStatus.PRESENT);
                    record.setRegularizationRequested(false);
                    record.setRegularizationApproved(true);
                    attendanceRecordRepository.save(record);
                    count++;
                } catch (Exception e) {
                    log.warn("Failed to regularize record {} for tenant {}: {}",
                            record.getId(), tenantId, e.getMessage());
                }
            }

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
        } catch (Exception e) {
            return DEFAULT_REGULARIZE_AFTER_DAYS;
        }
    }

    private List<UUID> fetchActiveTenants() {
        try {
            return jdbcTemplate.queryForList(
                    "SELECT id FROM tenants WHERE is_active = true", UUID.class);
        } catch (Exception e) {
            log.warn("Could not fetch active tenants: {}", e.getMessage());
            return List.of();
        }
    }
}
