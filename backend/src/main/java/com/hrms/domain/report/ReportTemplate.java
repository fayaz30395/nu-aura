package com.hrms.domain.report;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.SQLRestriction;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@SQLRestriction("is_deleted = false")
@Table(name = "report_templates")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReportTemplate {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(updatable = false, nullable = false)
    private UUID id;

    @Column(name = "tenant_id", nullable = false)
    private UUID tenantId;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(length = 500)
    private String description;

    @Column(nullable = false, length = 50)
    private String module;

    @Column(name = "selected_columns", nullable = false, columnDefinition = "TEXT")
    private String selectedColumns;

    @Column(columnDefinition = "TEXT")
    private String filters;

    @Column(name = "sort_by", length = 50)
    private String sortBy;

    @Column(name = "sort_direction", length = 4)
    @Builder.Default
    private String sortDirection = "ASC";

    @Column(name = "created_by")
    private UUID createdBy;

    @Column(name = "created_at")
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at")
    @Builder.Default
    private LocalDateTime updatedAt = LocalDateTime.now();

    @Column(name = "is_deleted")
    @Builder.Default
    private Boolean isDeleted = false;
}
