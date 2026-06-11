package com.nulogic.application.notification.service;

import com.nulogic.common.exception.ResourceNotFoundException;
import com.nulogic.common.security.TenantContext;
import com.nulogic.common.util.TenantTimeService;
import com.nulogic.domain.notification.Notification;
import com.nulogic.infrastructure.notification.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Service for managing user notifications.
 *
 * <p><strong>SECURITY:</strong> All operations enforce tenant isolation using
 * TenantContext.requireCurrentTenant() to prevent cross-tenant data access.</p>
 */
@Service
@RequiredArgsConstructor
@Transactional
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final TenantTimeService tenantTimeService;

    // REQUIRES_NEW so persistence still commits when invoked from
    // @TransactionalEventListener(AFTER_COMMIT) handlers, where no ambient
    // transaction is active and a plain @Transactional would silently no-op.
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public Notification createNotification(
            UUID userId,
            Notification.NotificationType type,
            String title,
            String message,
            UUID relatedEntityId,
            String relatedEntityType,
            String actionUrl,
            Notification.Priority priority
    ) {
        UUID tenantId = TenantContext.requireCurrentTenant();

        Notification notification = Notification.builder()
                .userId(userId)
                .type(type)
                .title(title)
                .message(message)
                .relatedEntityId(relatedEntityId)
                .relatedEntityType(relatedEntityType)
                .actionUrl(actionUrl)
                .priority(priority != null ? priority : Notification.Priority.NORMAL)
                .isRead(false)
                .build();

        notification.setTenantId(tenantId);

        return notificationRepository.save(notification);
    }

    @Transactional(readOnly = true)
    public Page<Notification> getUserNotifications(UUID userId, int page, int size) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        return notificationRepository.findByTenantIdAndUserIdOrderByCreatedAtDesc(tenantId, userId, pageable);
    }

    @Transactional(readOnly = true)
    public List<Notification> getUnreadNotifications(UUID userId) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        return notificationRepository.findByTenantIdAndUserIdAndIsReadFalseOrderByCreatedAtDesc(tenantId, userId);
    }

    /**
     * Returns the unread notification count for a user, cached for 30s per
     * (tenant, user) to absorb the bell-icon poll storm. Cache is bypassed
     * when the result is 0 so a freshly-cleared inbox does not hide newly
     * arrived notifications for up to 30s (wave-3 H5).
     */
    @Transactional(readOnly = true)
    @Cacheable(
            value = "unreadCountByUser",
            key = "T(com.nulogic.common.security.TenantContext).getCurrentTenant() + ':' + #userId",
            unless = "#result == 0L"
    )
    public Long getUnreadCount(UUID userId) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        return notificationRepository.countByTenantIdAndUserIdAndIsReadFalse(tenantId, userId);
    }

    @Transactional(readOnly = true)
    public List<Notification> getRecentNotifications(UUID userId, int hours) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        LocalDateTime since = tenantTimeService.now(tenantId).minusHours(hours);
        return notificationRepository.findRecentNotifications(tenantId, userId, since);
    }

    /**
     * Marks a single notification as read. Evicts the entire unreadCountByUser
     * cache for the current tenant because the API does not give us the userId
     * the notification belongs to — coarse but correct (wave-3 H5).
     */
    @Transactional
    @CacheEvict(value = "unreadCountByUser", allEntries = true)
    public void markAsRead(UUID notificationId) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        notificationRepository.markAsRead(tenantId, notificationId, tenantTimeService.now(tenantId));
    }

    @Transactional
    @CacheEvict(
            value = "unreadCountByUser",
            key = "T(com.nulogic.common.security.TenantContext).getCurrentTenant() + ':' + #userId"
    )
    public void markAllAsRead(UUID userId) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        notificationRepository.markAllAsReadForUser(tenantId, userId, tenantTimeService.now(tenantId));
    }

    @Transactional
    public void deleteNotification(UUID notificationId) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        notificationRepository.deleteByIdAndTenantId(notificationId, tenantId);
    }

    @Transactional
    public void deleteOldNotifications(UUID userId, int daysOld) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        LocalDateTime before = tenantTimeService.now(tenantId).minusDays(daysOld);
        notificationRepository.deleteOldNotifications(tenantId, userId, before);
    }

    @Transactional(readOnly = true)
    public Notification getNotificationById(UUID notificationId) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        return notificationRepository.findByIdAndTenantId(notificationId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Notification not found: " + notificationId));
    }
}
