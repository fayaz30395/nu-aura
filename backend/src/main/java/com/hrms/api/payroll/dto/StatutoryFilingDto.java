package com.hrms.api.payroll.dto;

import com.hrms.domain.payroll.StatutoryFilingRun.FilingStatus;
import com.hrms.domain.payroll.StatutoryFilingTemplate.FilingType;
import com.hrms.domain.payroll.StatutoryFilingTemplate.OutputFormat;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * DTOs for the Statutory Filing feature.
 */
public final class StatutoryFilingDto {

    private StatutoryFilingDto() {
    }

    // ─── Request DTOs ────────────────────────────────────────────────────────────

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class GenerateRequest {
        @NotNull(message = "Filing type is required")
        private FilingType filingType;

        @NotNull(message = "Month is required")
        @Min(value = 1, message = "Month must be between 1 and 12")
        @Max(value = 12, message = "Month must be between 1 and 12")
        private Integer month;

        @NotNull(message = "Year is required")
        @Min(value = 2020, message = "Year must be 2020 or later")
        private Integer year;

        private String remarks;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SubmitRequest {
        private String remarks;
    }

    // ─── Response DTOs ───────────────────────────────────────────────────────────

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class FilingTemplateResponse {
        private UUID id;
        private FilingType filingType;
        private String name;
        private String description;
        private OutputFormat format;
        private String templateVersion;
        private Boolean isActive;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class FilingRunResponse {
        private UUID id;
        private FilingType filingType;
        private String filingTypeName;
        private Integer periodMonth;
        private Integer periodYear;
        private String periodLabel;
        private FilingStatus status;
        private UUID generatedBy;
        private LocalDateTime generatedAt;
        private String fileName;
        private Long fileSize;
        private String validationErrors;
        private Integer totalRecords;
        private LocalDateTime submittedAt;
        private UUID submittedBy;
        private String remarks;
        private LocalDateTime createdAt;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class FilingTypeInfo {
        private FilingType filingType;
        private String name;
        private String description;
        private OutputFormat format;
        private String frequency;
        private String portalName;
        private String portalUrl;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ValidationResult {
        private UUID filingRunId;
        private boolean valid;
        private int errorCount;
        private int warningCount;
        private String validationErrors;
    }
}
