package com.hrms.application.notification.service;

import com.hrms.common.security.SecurityContext;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.notification.Notification;
import com.hrms.infrastructure.notification.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
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
@Slf4j
@Transactional
public class NotificationService {

    private final NotificationRepository notificationRepository;

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

    @Transactional(readOnly = true)
    public Long getUnreadCount(UUID userId) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        return notificationRepository.countByTenantIdAndUserIdAndIsReadFalse(tenantId, userId);
    }

    @Transactional(readOnly = true)
    public List<Notification> getRecentNotifications(UUID userId, int hours) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        LocalDateTime since = LocalDateTime.now().minusHours(hours);
        return notificationRepository.findRecentNotifications(tenantId, userId, since);
    }

    public void markAsRead(UUID notificationId) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        notificationRepository.markAsRead(tenantId, notificationId, LocalDateTime.now());
    }

    public void markAllAsRead(UUID userId) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        notificationRepository.markAllAsReadForUser(tenantId, userId, LocalDateTime.now());
    }

    public void deleteNotification(UUID notificationId) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        notificationRepository.deleteByIdAndTenantId(notificationId, tenantId);
    }

    public void deleteOldNotifications(UUID userId, int daysOld) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        LocalDateTime before = LocalDateTime.now().minusDays(daysOld);
        notificationRepository.deleteOldNotifications(tenantId, userId, before);
    }

    @Transactional(readOnly = true)
    public Notification getNotificationById(UUID notificationId) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        return notificationRepository.findByIdAndTenantId(notificationId, tenantId)
                .orElseThrow(() -> new RuntimeException("Notification not found with id: " + notificationId));
    }
}
