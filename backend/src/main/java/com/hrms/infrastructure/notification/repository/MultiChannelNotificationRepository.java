package com.hrms.infrastructure.notification.repository;

import com.hrms.domain.notification.MultiChannelNotification;
import com.hrms.domain.notification.NotificationChannel;
import com.hrms.domain.notification.NotificationStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Repository
public interface MultiChannelNotificationRepository extends JpaRepository<MultiChannelNotification, UUID> {

    Page<MultiChannelNotification> findByRecipientIdAndTenantIdOrderByCreatedAtDesc(UUID recipientId, UUID tenantId, Pageable pageable);

    List<MultiChannelNotification> findByRecipientIdAndStatusAndTenantId(UUID recipientId, NotificationStatus status, UUID tenantId);

    List<MultiChannelNotification> findByStatusAndScheduledAtBeforeAndTenantId(NotificationStatus status, LocalDateTime dateTime, UUID tenantId);

    @Query("SELECT n FROM MultiChannelNotification n WHERE n.tenantId = :tenantId " +
            "AND n.status = :status AND n.retryCount < :maxRetries " +
            "AND n.lastRetryAt < :retryAfter")
    List<MultiChannelNotification> findNotificationsForRetry(
            @Param("tenantId") UUID tenantId,
            @Param("status") NotificationStatus status,
            @Param("maxRetries") Integer maxRetries,
            @Param("retryAfter") LocalDateTime retryAfter);

    @Query("SELECT COUNT(n) FROM MultiChannelNotification n WHERE n.recipientId = :userId " +
            "AND n.tenantId = :tenantId AND n.status != 'READ' AND n.channel = 'IN_APP'")
    Long countUnreadInAppNotifications(@Param("userId") UUID userId, @Param("tenantId") UUID tenantId);

    @Modifying
    @Transactional
    @Query("UPDATE MultiChannelNotification n SET n.status = 'READ', n.readAt = :readAt " +
            "WHERE n.recipientId = :userId AND n.tenantId = :tenantId AND n.channel = 'IN_APP' AND n.status != 'READ'")
    int markAllAsRead(@Param("userId") UUID userId, @Param("tenantId") UUID tenantId, @Param("readAt") LocalDateTime readAt);

    Page<MultiChannelNotification> findByChannelAndStatusAndTenantId(NotificationChannel channel, NotificationStatus status, UUID tenantId, Pageable pageable);

    @Query("SELECT n.channel, COUNT(n) FROM MultiChannelNotification n WHERE n.tenantId = :tenantId " +
            "AND n.createdAt >= :startDate GROUP BY n.channel")
    List<Object[]> countByChannelSince(@Param("tenantId") UUID tenantId, @Param("startDate") LocalDateTime startDate);

    @Query("SELECT n.status, COUNT(n) FROM MultiChannelNotification n WHERE n.tenantId = :tenantId " +
            "AND n.createdAt >= :startDate GROUP BY n.status")
    List<Object[]> countByStatusSince(@Param("tenantId") UUID tenantId, @Param("startDate") LocalDateTime startDate);

    List<MultiChannelNotification> findByReferenceTypeAndReferenceIdAndTenantId(String referenceType, UUID referenceId, UUID tenantId);

    List<MultiChannelNotification> findByGroupKeyAndTenantId(String groupKey, UUID tenantId);

    @Query("SELECT n FROM MultiChannelNotification n WHERE n.tenantId = :tenantId " +
            "AND n.recipientId = :userId AND n.channel = 'IN_APP' " +
            "ORDER BY n.createdAt DESC")
    Page<MultiChannelNotification> findInAppNotificationsForUser(
            @Param("tenantId") UUID tenantId,
            @Param("userId") UUID userId,
            Pageable pageable);
}
