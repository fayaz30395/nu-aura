package com.hrms.domain.document;

import com.hrms.common.entity.TenantAware;
import jakarta.persistence.*;
import org.hibernate.annotations.SQLRestriction;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@SQLRestriction("is_deleted = false")
@Entity
@Table(name = "document_expiry_tracking", indexes = {
        @Index(name = "idx_doc_expiry_tenant", columnList = "tenantId"),
        @Index(name = "idx_doc_expiry_document", columnList = "documentId"),
        @Index(name = "idx_doc_expiry_date", columnList = "tenantId,expiryDate"),
        @Index(name = "idx_doc_expiry_notified", columnList = "tenantId,isNotified")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class DocumentExpiryTracking extends TenantAware {

    @Column(nullable = false)
    private UUID documentId;

    @Column(nullable = false)
    private LocalDate expiryDate;

    @Builder.Default
    @Column
    private Integer reminderDaysBefore = 30;

    @Builder.Default
    @Column(nullable = false)
    private Boolean isNotified = false;

    @Column
    private LocalDateTime notifiedAt;

    @Builder.Default
    @Column(nullable = false)
    private Boolean expiryNotificationSent = false;

    public boolean shouldSendReminder() {
        if (isNotified) {
            return false;
        }
        LocalDate reminderDate = expiryDate.minusDays(reminderDaysBefore != null ? reminderDaysBefore : 30);
        return LocalDate.now().isEqual(reminderDate) || LocalDate.now().isAfter(reminderDate);
    }

    public boolean isExpired() {
        return LocalDate.now().isAfter(expiryDate);
    }

    public long daysUntilExpiry() {
        return java.time.temporal.ChronoUnit.DAYS.between(LocalDate.now(), expiryDate);
    }
}
