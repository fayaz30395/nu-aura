package com.hrms.application.notification.service;

import com.hrms.common.security.SecurityContext;
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

        notification.setTenantId(SecurityContext.getCurrentTenantId());

        return notificationRepository.save(notification);
    }

    @Transactional(readOnly = true)
    public Page<Notification> getUserNotifications(UUID userId, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(userId, pageable);
    }

    @Transactional(readOnly = true)
    public List<Notification> getUnreadNotifications(UUID userId) {
        return notificationRepository.findByUserIdAndIsReadFalseOrderByCreatedAtDesc(userId);
    }

    @Transactional(readOnly = true)
    public Long getUnreadCount(UUID userId) {
        return notificationRepository.countByUserIdAndIsReadFalse(userId);
    }

    @Transactional(readOnly = true)
    public List<Notification> getRecentNotifications(UUID userId, int hours) {
        LocalDateTime since = LocalDateTime.now().minusHours(hours);
        return notificationRepository.findRecentNotifications(userId, since);
    }

    public void markAsRead(UUID notificationId) {
        notificationRepository.markAsRead(notificationId, LocalDateTime.now());
    }

    public void markAllAsRead(UUID userId) {
        notificationRepository.markAllAsReadForUser(userId, LocalDateTime.now());
    }

    public void deleteNotification(UUID notificationId) {
        notificationRepository.deleteById(notificationId);
    }

    public void deleteOldNotifications(UUID userId, int daysOld) {
        LocalDateTime before = LocalDateTime.now().minusDays(daysOld);
        notificationRepository.deleteOldNotifications(userId, before);
    }

    @Transactional(readOnly = true)
    public Notification getNotificationById(UUID notificationId) {
        return notificationRepository.findById(notificationId)
                .orElseThrow(() -> new RuntimeException("Notification not found with id: " + notificationId));
    }
}
