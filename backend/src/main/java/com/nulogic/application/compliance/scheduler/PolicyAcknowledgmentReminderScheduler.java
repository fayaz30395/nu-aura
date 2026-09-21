package com.nulogic.application.compliance.scheduler;

import com.nulogic.application.compliance.service.ComplianceService;
import com.nulogic.application.compliance.service.ComplianceService.PendingAcknowledgmentGap;
import com.nulogic.application.notification.service.NotificationService;
import com.nulogic.common.security.TenantContext;
import com.nulogic.common.util.TenantTimeService;
import com.nulogic.domain.compliance.PolicyAcknowledgmentReminder;
import com.nulogic.domain.notification.Notification;
import com.nulogic.infrastructure.compliance.repository.PolicyAcknowledgmentReminderRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import net.javacrumbs.shedlock.spring.annotation.SchedulerLock;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Daily job that reminds employees who haven't acknowledged a published policy past its
 * acknowledgment window (see {@link ComplianceService#findPendingAcknowledgmentGaps}).
 *
 * <p>Idempotency (no spam): a reminder is only sent again after {@link #REMINDER_COOLDOWN_DAYS}
 * since the last reminder for that (policy, employee) pair, tracked in
 * {@code policy_acknowledgment_reminders} (unique on tenant+policy+employee).</p>
 */
@Component
@ConditionalOnProperty(name = "app.compliance.reminders.enabled", havingValue = "true", matchIfMissing = true)
@RequiredArgsConstructor
@Slf4j
public class PolicyAcknowledgmentReminderScheduler {

    private static final int REMINDER_COOLDOWN_DAYS = 7;

    private final ComplianceService complianceService;
    private final PolicyAcknowledgmentReminderRepository reminderRepository;
    private final NotificationService notificationService;
    private final TenantTimeService tenantTimeService;
    private final JdbcTemplate jdbcTemplate;

    @Scheduled(cron = "${app.compliance.reminders.cron:0 0 6 * * *}", zone = "UTC")
    @SchedulerLock(name = "sendPolicyAcknowledgmentReminders", lockAtLeastFor = "PT1M", lockAtMostFor = "PT30M")
    public void sendReminders() {
        List<UUID> tenants = fetchActiveTenants();
        int totalReminded = 0;

        for (UUID tenantId : tenants) {
            try {
                TenantContext.setCurrentTenant(tenantId);
                totalReminded += remindTenant(tenantId);
            } catch (Exception e) { // Intentional broad catch — scheduled job error boundary
                log.error("PolicyAcknowledgmentReminderScheduler: failed for tenant {}: {}",
                        tenantId, e.getMessage(), e);
            } finally {
                TenantContext.clear();
            }
        }

        log.info("PolicyAcknowledgmentReminderScheduler: completed. Tenants: {}, Reminders sent: {}",
                tenants.size(), totalReminded);
    }

    @Transactional
    int remindTenant(UUID tenantId) {
        LocalDate today = tenantTimeService.today(tenantId);
        LocalDateTime now = tenantTimeService.now(tenantId);
        List<PendingAcknowledgmentGap> gaps = complianceService.findPendingAcknowledgmentGaps(tenantId, today);

        int sent = 0;
        for (PendingAcknowledgmentGap gap : gaps) {
            if (isWithinCooldown(tenantId, gap, now)) {
                continue;
            }
            if (sendReminder(tenantId, gap, now)) {
                sent++;
            }
        }
        return sent;
    }

    private boolean isWithinCooldown(UUID tenantId, PendingAcknowledgmentGap gap, LocalDateTime now) {
        return reminderRepository.findByTenantIdAndPolicyIdAndEmployeeId(
                        tenantId, gap.policy().getId(), gap.employee().getId())
                .map(r -> r.getLastRemindedAt().isAfter(now.minusDays(REMINDER_COOLDOWN_DAYS)))
                .orElse(false);
    }

    private boolean sendReminder(UUID tenantId, PendingAcknowledgmentGap gap, LocalDateTime now) {
        UUID userId = gap.employee().getUser() != null ? gap.employee().getUser().getId() : null;
        if (userId == null) {
            log.warn("No user account for employee {}, skipping acknowledgment reminder for policy {}",
                    gap.employee().getId(), gap.policy().getId());
            return false;
        }

        try {
            notificationService.createNotification(
                    userId,
                    Notification.NotificationType.REMINDER,
                    "Policy Acknowledgment Required: " + gap.policy().getName(),
                    "Please review and acknowledge the policy '" + gap.policy().getName() + "'.",
                    gap.policy().getId(),
                    "CompliancePolicy",
                    "/compliance/policies/" + gap.policy().getId(),
                    Notification.Priority.NORMAL);
        } catch (Exception e) { // Intentional broad catch — best-effort notification dispatch
            log.warn("Failed to send acknowledgment reminder for employee {} policy {}: {}",
                    gap.employee().getId(), gap.policy().getId(), e.getMessage());
            return false;
        }

        upsertReminderRecord(tenantId, gap, now);
        return true;
    }

    private void upsertReminderRecord(UUID tenantId, PendingAcknowledgmentGap gap, LocalDateTime now) {
        PolicyAcknowledgmentReminder record = reminderRepository
                .findByTenantIdAndPolicyIdAndEmployeeId(tenantId, gap.policy().getId(), gap.employee().getId())
                .orElseGet(() -> {
                    PolicyAcknowledgmentReminder r = PolicyAcknowledgmentReminder.builder()
                            .policyId(gap.policy().getId())
                            .employeeId(gap.employee().getId())
                            .build();
                    r.setTenantId(tenantId);
                    return r;
                });
        record.setLastRemindedAt(now);
        reminderRepository.save(record);
    }

    private List<UUID> fetchActiveTenants() {
        try {
            return jdbcTemplate.queryForList("SELECT id FROM tenants WHERE is_active = true", UUID.class);
        } catch (Exception e) { // Intentional broad catch — scheduled job error boundary
            log.warn("Could not fetch active tenants: {}", e.getMessage());
            return List.of();
        }
    }
}
