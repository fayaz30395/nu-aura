package com.nulogic.application.document.scheduler;

import com.nulogic.application.notification.service.NotificationService;
import com.nulogic.common.security.TenantContext;
import com.nulogic.common.util.TenantTimeService;
import com.nulogic.domain.document.DocumentAccess;
import com.nulogic.domain.document.DocumentAccessRepository;
import com.nulogic.domain.document.DocumentExpiryTracking;
import com.nulogic.domain.document.DocumentExpiryTrackingRepository;
import com.nulogic.domain.notification.Notification;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import net.javacrumbs.shedlock.spring.annotation.SchedulerLock;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

/**
 * Scheduled job that dispatches notifications for expiring documents.
 *
 * <p>Modeled on {@code ContractLifecycleScheduler}: runs daily per active tenant, finds
 * {@link DocumentExpiryTracking} rows whose reminder window has been reached
 * ({@link DocumentExpiryTracking#shouldSendReminder()}), notifies users with a document
 * access grant, and marks the reminder as sent.</p>
 *
 * <p>ponytail: recipients are resolved from {@link DocumentAccess} user-grants for the
 * document (no dedicated "owner" field exists on the entity). Role/department grants are
 * not resolved to individual users — extend if that's needed.</p>
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class DocumentExpiryScheduler {

    private final DocumentExpiryTrackingRepository expiryTrackingRepository;
    private final DocumentAccessRepository documentAccessRepository;
    private final NotificationService notificationService;
    private final JdbcTemplate jdbcTemplate;
    private final TenantTimeService tenantTimeService;

    @Scheduled(cron = "${app.document.expiry.cron:0 0 3 * * *}", zone = "UTC")
    @SchedulerLock(name = "processDocumentExpiryReminders", lockAtLeastFor = "PT5M", lockAtMostFor = "PT30M")
    public void processDocumentExpiryReminders() {
        log.info("DocumentExpiryScheduler: starting daily expiry reminder run");

        List<UUID> tenants = fetchActiveTenants();
        int totalNotified = 0;

        for (UUID tenantId : tenants) {
            try {
                TenantContext.setCurrentTenant(tenantId);
                totalNotified += dispatchDueReminders(tenantId);
            } catch (Exception e) { // Intentional broad catch — scheduled job error boundary
                log.error("DocumentExpiryScheduler: failed for tenant {}: {}", tenantId, e.getMessage(), e);
            } finally {
                TenantContext.clear();
            }
        }

        log.info("DocumentExpiryScheduler: completed. Tenants: {}, Notifications sent: {}",
                tenants.size(), totalNotified);
    }

    @Transactional
    public int dispatchDueReminders(UUID tenantId) {
        List<DocumentExpiryTracking> pending = expiryTrackingRepository.findByTenantIdAndIsNotifiedFalse(tenantId);

        int notified = 0;
        for (DocumentExpiryTracking tracking : pending) {
            if (!tracking.shouldSendReminder()) {
                continue;
            }

            List<DocumentAccess> grants = documentAccessRepository
                    .findByTenantIdAndDocumentId(tenantId, tracking.getDocumentId());

            String title = tracking.isExpired() ? "Document Expired" : "Document Expiring Soon";
            String message = tracking.isExpired()
                    ? String.format("A document expired on %s.", tracking.getExpiryDate())
                    : String.format("A document is expiring in %d day(s) (%s).",
                            tracking.daysUntilExpiry(), tracking.getExpiryDate());

            for (DocumentAccess grant : grants) {
                if (grant.getUserId() == null || !Boolean.TRUE.equals(grant.getIsActive())) {
                    continue;
                }
                notificationService.createNotification(
                        grant.getUserId(),
                        Notification.NotificationType.REMINDER,
                        title,
                        message,
                        tracking.getDocumentId(),
                        "Document",
                        "/documents/" + tracking.getDocumentId(),
                        Notification.Priority.NORMAL);
                notified++;
            }

            tracking.setIsNotified(true);
            tracking.setNotifiedAt(tenantTimeService.now(tenantId));
            expiryTrackingRepository.save(tracking);
        }

        if (notified > 0) {
            log.debug("Dispatched {} document expiry notifications for tenant {}", notified, tenantId);
        }
        return notified;
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
