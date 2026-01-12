package com.hrms.infrastructure.notification.repository;

import com.hrms.domain.notification.Notification;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, UUID> {

    Page<Notification> findByUserIdOrderByCreatedAtDesc(UUID userId, Pageable pageable);

    List<Notification> findByUserIdAndIsReadFalseOrderByCreatedAtDesc(UUID userId);

    Long countByUserIdAndIsReadFalse(UUID userId);

    @Query("SELECT n FROM Notification n WHERE n.userId = :userId AND n.createdAt > :since ORDER BY n.createdAt DESC")
    List<Notification> findRecentNotifications(
        @Param("userId") UUID userId,
        @Param("since") LocalDateTime since
    );

    @Modifying
    @Query("UPDATE Notification n SET n.isRead = true, n.readAt = :readAt WHERE n.id = :notificationId")
    void markAsRead(@Param("notificationId") UUID notificationId, @Param("readAt") LocalDateTime readAt);

    @Modifying
    @Query("UPDATE Notification n SET n.isRead = true, n.readAt = :readAt WHERE n.userId = :userId AND n.isRead = false")
    void markAllAsReadForUser(@Param("userId") UUID userId, @Param("readAt") LocalDateTime readAt);

    @Modifying
    @Query("DELETE FROM Notification n WHERE n.userId = :userId AND n.createdAt < :before")
    void deleteOldNotifications(@Param("userId") UUID userId, @Param("before") LocalDateTime before);
}
