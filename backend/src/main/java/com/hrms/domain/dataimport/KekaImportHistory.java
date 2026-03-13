package com.hrms.domain.dataimport;

import com.hrms.common.entity.TenantAware;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.time.LocalDateTime;

/**
 * Track history of KEKA imports
 */
@Entity
@Table(name = "keka_import_history", indexes = {
    @Index(name = "idx_keka_import_tenant", columnList = "tenantId"),
    @Index(name = "idx_keka_import_status", columnList = "status"),
    @Index(name = "idx_keka_import_uploaded_by", columnList = "uploadedBy"),
    @Index(name = "idx_keka_import_uploaded_at", columnList = "uploadedAt")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class KekaImportHistory extends TenantAware {

    @Column(nullable = false, length = 255)
    private String fileName;

    @Column(nullable = false, length = 20)
    private String status; // SUCCESS, PARTIAL_SUCCESS, FAILED, IN_PROGRESS

    @Column(nullable = false)
    private Integer totalRows;

    @Column(nullable = false, columnDefinition = "INTEGER DEFAULT 0")
    private Integer createdCount;

    @Column(nullable = false, columnDefinition = "INTEGER DEFAULT 0")
    private Integer updatedCount;

    @Column(nullable = false, columnDefinition = "INTEGER DEFAULT 0")
    private Integer skippedCount;

    @Column(nullable = false, columnDefinition = "INTEGER DEFAULT 0")
    private Integer errorCount;

    @Column(nullable = false)
    private Long duration; // milliseconds

    @Column(nullable = false)
    private LocalDateTime uploadedAt;

    @Column(nullable = false, length = 36)
    private String uploadedBy; // User ID

    @Column(columnDefinition = "TEXT")
    private String errorSummary; // JSON-serialized error details

    @Column(columnDefinition = "TEXT")
    private String mappingConfig; // JSON-serialized mapping configuration
}
