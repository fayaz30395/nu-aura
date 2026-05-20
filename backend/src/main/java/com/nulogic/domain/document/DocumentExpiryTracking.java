package com.nulogic.domain.document;

import com.nulogic.common.entity.TenantAware;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.Where;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Where(clause = "is_deleted = false")
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
        return LocalDate.now().isEqual(reminderDate) || LocalDate.now().isAfter(reminderDate); // JVM-local: entity-layer; push to service per docs/architecture/tenant-time-wave-13-summary.md if cross-region zone correctness is needed
    }

    public boolean isExpired() {
        return LocalDate.now().isAfter(expiryDate); // JVM-local: entity-layer; push to service per docs/architecture/tenant-time-wave-13-summary.md if cross-region zone correctness is needed
    }

    public long daysUntilExpiry() {
        return java.time.temporal.ChronoUnit.DAYS.between(LocalDate.now(), expiryDate); // JVM-local: entity-layer; push to service per docs/architecture/tenant-time-wave-13-summary.md if cross-region zone correctness is needed
    }
}
