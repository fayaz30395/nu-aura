package com.hrms.infrastructure.notification.repository;

import com.hrms.domain.notification.EmailNotification;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Repository
public interface EmailNotificationRepository extends JpaRepository<EmailNotification, UUID> {

    Page<EmailNotification> findAllByTenantId(UUID tenantId, Pageable pageable);

    List<EmailNotification> findAllByTenantIdAndStatus(UUID tenantId, EmailNotification.EmailStatus status);

    @Query("SELECT e FROM EmailNotification e WHERE e.tenantId = :tenantId AND e.status = :status AND e.scheduledAt <= :now")
    List<EmailNotification> findScheduledEmailsDue(@Param("tenantId") UUID tenantId,
                                                     @Param("status") EmailNotification.EmailStatus status,
                                                     @Param("now") LocalDateTime now);

    @Query("SELECT e FROM EmailNotification e WHERE e.status = 'PENDING' OR (e.status = 'FAILED' AND e.retryCount < 3)")
    List<EmailNotification> findPendingOrRetryableEmails();

    /**
     * Tenant-scoped version of {@link #findPendingOrRetryableEmails()}.
     * Use this in scheduled jobs to avoid cross-tenant data leakage.
     */
    @Query("SELECT e FROM EmailNotification e WHERE e.tenantId = :tenantId AND (e.status = 'PENDING' OR (e.status = 'FAILED' AND e.retryCount < 3))")
    List<EmailNotification> findPendingOrRetryableEmailsByTenantId(@Param("tenantId") UUID tenantId);

    Long countByTenantIdAndStatus(UUID tenantId, EmailNotification.EmailStatus status);

    List<EmailNotification> findAllByTenantIdAndRecipientEmailAndEmailType(
        UUID tenantId,
        String recipientEmail,
        EmailNotification.EmailType emailType
    );
}
