package com.hrms.domain.document;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "document_categories")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DocumentCategory {
    @Id
    private UUID id;

    @Column(name = "tenant_id", nullable = false)
    private UUID tenantId;

    @Column(name = "category_code", nullable = false, length = 50, unique = true)
    private String categoryCode;

    @Column(name = "category_name", nullable = false, length = 200)
    private String categoryName;

    @Column(name = "parent_category_id")
    private UUID parentCategoryId;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "retention_period_days")
    private Integer retentionPeriodDays; // For compliance

    @Column(name = "is_mandatory")
    private Boolean isMandatory;

    @Column(name = "requires_expiry_tracking")
    private Boolean requiresExpiryTracking;

    @Column(name = "is_active", nullable = false)
    private Boolean isActive;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "created_by")
    private UUID createdBy;

    @Column(name = "updated_by")
    private UUID updatedBy;
}
