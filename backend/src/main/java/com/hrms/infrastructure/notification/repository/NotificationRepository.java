package com.hrms.infrastructure.notification.repository;

import com.hrms.domain.notification.Notification;
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
import java.util.Optional;
import java.util.UUID;

/**
 * Repository for Notification entity with mandatory tenant isolation.
 *
 * <p><strong>SECURITY:</strong> All queries MUST include tenantId to prevent cross-tenant data leaks.
 * The inherited JpaRepository methods (findAll, findById, deleteById) are intentionally
 * overridden to enforce tenant isolation at the repository level.</p>
 */
@Repository
public interface NotificationRepository extends JpaRepository<Notification, UUID> {

    // ==================== TENANT-SAFE OVERRIDE METHODS ====================

    /**
     * Find notification by ID with mandatory tenant isolation.
     * Use this instead of the inherited findById().
     */
    @Query("SELECT n FROM Notification n WHERE n.id = :id AND n.tenantId = :tenantId")
    Optional<Notification> findByIdAndTenantId(@Param("id") UUID id, @Param("tenantId") UUID tenantId);

    /**
     * Find all notifications for a tenant with pagination.
     * Use this instead of the inherited findAll().
     */
    @Query("SELECT n FROM Notification n WHERE n.tenantId = :tenantId ORDER BY n.createdAt DESC")
    Page<Notification> findAllByTenantId(@Param("tenantId") UUID tenantId, Pageable pageable);

    /**
     * Find all notifications for a tenant (unpaginated).
     * WARNING: Use with caution on large datasets. Prefer findAllByTenantId(tenantId, pageable).
     */
    @Query("SELECT n FROM Notification n WHERE n.tenantId = :tenantId ORDER BY n.createdAt DESC")
    List<Notification> findByTenantId(@Param("tenantId") UUID tenantId);

    /**
     * Delete notification by ID with mandatory tenant isolation.
     * Use this instead of the inherited deleteById().
     */
    @Modifying
    @Transactional
    @Query("DELETE FROM Notification n WHERE n.id = :id AND n.tenantId = :tenantId")
    void deleteByIdAndTenantId(@Param("id") UUID id, @Param("tenantId") UUID tenantId);

    /**
     * Check if notification exists with mandatory tenant isolation.
     */
    @Query("SELECT CASE WHEN COUNT(n) > 0 THEN true ELSE false END FROM Notification n WHERE n.id = :id AND n.tenantId = :tenantId")
    boolean existsByIdAndTenantId(@Param("id") UUID id, @Param("tenantId") UUID tenantId);

    // ==================== USER-SCOPED QUERY METHODS ====================

    @Query("SELECT n FROM Notification n WHERE n.tenantId = :tenantId AND n.userId = :userId ORDER BY n.createdAt DESC")
    Page<Notification> findByTenantIdAndUserIdOrderByCreatedAtDesc(
            @Param("tenantId") UUID tenantId,
            @Param("userId") UUID userId,
            Pageable pageable
    );

    @Query("SELECT n FROM Notification n WHERE n.tenantId = :tenantId AND n.userId = :userId AND n.isRead = false ORDER BY n.createdAt DESC")
    List<Notification> findByTenantIdAndUserIdAndIsReadFalseOrderByCreatedAtDesc(
            @Param("tenantId") UUID tenantId,
            @Param("userId") UUID userId
    );

    /**
     * Paginated version for unread notifications.
     * Use this when the user may have many unread notifications.
     */
    @Query("SELECT n FROM Notification n WHERE n.tenantId = :tenantId AND n.userId = :userId AND n.isRead = false ORDER BY n.createdAt DESC")
    Page<Notification> findUnreadNotificationsPaged(
            @Param("tenantId") UUID tenantId,
            @Param("userId") UUID userId,
            Pageable pageable
    );

    @Query("SELECT COUNT(n) FROM Notification n WHERE n.tenantId = :tenantId AND n.userId = :userId AND n.isRead = false")
    Long countByTenantIdAndUserIdAndIsReadFalse(
            @Param("tenantId") UUID tenantId,
            @Param("userId") UUID userId
    );

    @Query("SELECT n FROM Notification n WHERE n.tenantId = :tenantId AND n.userId = :userId AND n.createdAt > :since ORDER BY n.createdAt DESC")
    List<Notification> findRecentNotifications(
            @Param("tenantId") UUID tenantId,
            @Param("userId") UUID userId,
            @Param("since") LocalDateTime since
    );

    /**
     * Paginated version for recent notifications.
     * Use this when querying a longer time window that may return many results.
     */
    @Query("SELECT n FROM Notification n WHERE n.tenantId = :tenantId AND n.userId = :userId AND n.createdAt > :since ORDER BY n.createdAt DESC")
    Page<Notification> findRecentNotificationsPaged(
            @Param("tenantId") UUID tenantId,
            @Param("userId") UUID userId,
            @Param("since") LocalDateTime since,
            Pageable pageable
    );

    // ==================== MODIFICATION METHODS ====================

    @Modifying
    @Transactional
    @Query("UPDATE Notification n SET n.isRead = true, n.readAt = :readAt WHERE n.tenantId = :tenantId AND n.id = :notificationId")
    void markAsRead(
            @Param("tenantId") UUID tenantId,
            @Param("notificationId") UUID notificationId,
            @Param("readAt") LocalDateTime readAt
    );

    @Modifying
    @Transactional
    @Query("UPDATE Notification n SET n.isRead = true, n.readAt = :readAt WHERE n.tenantId = :tenantId AND n.userId = :userId AND n.isRead = false")
    void markAllAsReadForUser(
            @Param("tenantId") UUID tenantId,
            @Param("userId") UUID userId,
            @Param("readAt") LocalDateTime readAt
    );

    @Modifying
    @Transactional
    @Query("DELETE FROM Notification n WHERE n.tenantId = :tenantId AND n.userId = :userId AND n.createdAt < :before")
    void deleteOldNotifications(
            @Param("tenantId") UUID tenantId,
            @Param("userId") UUID userId,
            @Param("before") LocalDateTime before
    );

    // ==================== DEPRECATED - DO NOT USE ====================

    /**
     * @deprecated Use {@link #findByIdAndTenantId(UUID, UUID)} instead.
     * This method is unsafe for multi-tenant environments.
     */
    @Override
    @Deprecated
    Optional<Notification> findById(UUID id);

    /**
     * @deprecated Use {@link #findAllByTenantId(UUID, Pageable)} instead.
     * This method is unsafe for multi-tenant environments.
     */
    @Override
    @Deprecated
    List<Notification> findAll();

    /**
     * @deprecated Use {@link #deleteByIdAndTenantId(UUID, UUID)} instead.
     * This method is unsafe for multi-tenant environments.
     */
    @Override
    @Deprecated
    void deleteById(UUID id);
}
