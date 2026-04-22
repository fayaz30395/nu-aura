package com.hrms.domain.payroll;

import com.hrms.common.entity.TenantAware;
import jakarta.persistence.*;
import org.hibernate.annotations.SQLRestriction;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Tracks each statutory filing generation run.
 * Records the filing type, period, generation status, file location in storage,
 * validation results, and submission tracking.
 */
@SQLRestriction("is_deleted = false")
@Entity
@Table(name = "statutory_filing_runs", indexes = {
        @Index(name = "idx_sfr_tenant", columnList = "tenantId"),
        @Index(name = "idx_sfr_tenant_type_period", columnList = "tenantId, filingType, periodMonth, periodYear"),
        @Index(name = "idx_sfr_status", columnList = "tenantId, status")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class StatutoryFilingRun extends TenantAware {

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private StatutoryFilingTemplate.FilingType filingType;

    @Column(nullable = false)
    private Integer periodMonth;

    @Column(nullable = false)
    private Integer periodYear;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private FilingStatus status = FilingStatus.DRAFT;

    @Column(nullable = false)
    private UUID generatedBy;

    @Column
    private LocalDateTime generatedAt;

    /**
     * Storage object name for the generated file.
     * Follows pattern: {tenantId}/statutory-filings/{entityId}/{timestamp}_{uniqueId}.ext
     */
    @Column(length = 500)
    private String fileStoragePath;

    @Column(length = 200)
    private String fileName;

    @Column(length = 50)
    private String contentType;

    @Column
    private Long fileSize;

    /**
     * JSON array of validation errors/warnings found during validation step.
     * Example: [{"field":"uan","row":5,"message":"UAN missing for employee X"}]
     */
    @Column(columnDefinition = "TEXT")
    private String validationErrors;

    @Column
    private Integer totalRecords;

    @Column
    private LocalDateTime submittedAt;

    @Column
    private UUID submittedBy;

    @Column(columnDefinition = "TEXT")
    private String remarks;

    /**
     * Transition from DRAFT/GENERATED to GENERATED after file generation.
     */
    public void markGenerated(String storagePath, String fileName, String contentType,
                              long fileSize, int totalRecords) {
        this.status = FilingStatus.GENERATED;
        this.fileStoragePath = storagePath;
        this.fileName = fileName;
        this.contentType = contentType;
        this.fileSize = fileSize;
        this.totalRecords = totalRecords;
        this.generatedAt = LocalDateTime.now();
    }

    /**
     * Transition to VALIDATED after validation passes.
     */
    public void markValidated(String validationErrors) {
        this.status = FilingStatus.VALIDATED;
        this.validationErrors = validationErrors;
    }

    /**
     * Transition to SUBMITTED when the filing has been submitted to the government portal.
     */
    public void markSubmitted(UUID submittedBy, String remarks) {
        if (this.status != FilingStatus.VALIDATED && this.status != FilingStatus.GENERATED) {
            throw new IllegalStateException(
                    "Only validated or generated filings can be marked as submitted");
        }
        this.status = FilingStatus.SUBMITTED;
        this.submittedBy = submittedBy;
        this.submittedAt = LocalDateTime.now();
        this.remarks = remarks;
    }

    /**
     * Transition to REJECTED if filing was rejected by the portal.
     */
    public void markRejected(String remarks) {
        this.status = FilingStatus.REJECTED;
        this.remarks = remarks;
    }

    public enum FilingStatus {
        DRAFT,
        GENERATED,
        VALIDATED,
        SUBMITTED,
        REJECTED
    }
}
