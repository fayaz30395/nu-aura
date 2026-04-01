package com.hrms.api.attendance.dto;

import com.hrms.domain.attendance.RestrictedHoliday.HolidayCategory;
import com.hrms.domain.attendance.RestrictedHolidaySelection.SelectionStatus;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * DTOs for the Restricted Holidays feature.
 */
public final class RestrictedHolidayDTOs {

    private RestrictedHolidayDTOs() {}

    // ─── Holiday DTOs ───────────────────────────────────────────────────

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @Schema(description = "Request payload for creating/updating a restricted holiday")
    public static class HolidayRequest {

        @NotBlank(message = "Holiday name is required")
        @Schema(description = "Name of the restricted holiday", example = "Pongal")
        private String holidayName;

        @NotNull(message = "Holiday date is required")
        @Schema(description = "Date of the holiday", example = "2026-01-14")
        private LocalDate holidayDate;

        @Schema(description = "Description of the holiday")
        private String description;

        @Schema(description = "Category of the holiday", example = "RELIGIOUS")
        private HolidayCategory category;

        @Schema(description = "JSON array of applicable region codes", example = "[\"IN-TN\",\"IN-KA\"]")
        private String applicableRegions;

        @Schema(description = "JSON array of applicable department UUIDs")
        private String applicableDepartments;

        @Schema(description = "Whether this holiday is active", example = "true")
        private Boolean isActive;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @Schema(description = "Response payload for a restricted holiday")
    public static class HolidayResponse {
        private UUID id;
        private String holidayName;
        private LocalDate holidayDate;
        private String description;
        private HolidayCategory category;
        private String applicableRegions;
        private String applicableDepartments;
        private Integer year;
        private Boolean isActive;
        private LocalDateTime createdAt;
        private LocalDateTime updatedAt;
        /** Number of employees who have selected this holiday */
        private Long selectionCount;
    }

    // ─── Selection DTOs ─────────────────────────────────────────────────

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @Schema(description = "Response payload for a restricted holiday selection")
    public static class SelectionResponse {
        private UUID id;
        private UUID employeeId;
        private UUID restrictedHolidayId;
        private String holidayName;
        private LocalDate holidayDate;
        private HolidayCategory holidayCategory;
        private SelectionStatus status;
        private UUID approvedBy;
        private LocalDateTime approvedAt;
        private String rejectionReason;
        private LocalDateTime createdAt;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Schema(description = "Request to approve/reject a selection")
    public static class SelectionActionRequest {
        @Schema(description = "Reason for rejection (required when rejecting)")
        private String rejectionReason;
    }

    // ─── Policy DTOs ────────────────────────────────────────────────────

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @Schema(description = "Request payload for creating/updating a restricted holiday policy")
    public static class PolicyRequest {

        @NotNull(message = "Max selections per year is required")
        @Min(value = 1, message = "Must allow at least 1 selection")
        @Schema(description = "Maximum number of restricted holidays per employee per year", example = "3")
        private Integer maxSelectionsPerYear;

        @Schema(description = "Whether manager approval is required", example = "true")
        private Boolean requiresApproval;

        @Schema(description = "JSON array of applicable department UUIDs")
        private String applicableDepartments;

        @NotNull(message = "Year is required")
        @Schema(description = "Year the policy applies to", example = "2026")
        private Integer year;

        @Schema(description = "Minimum days before the holiday that selection must be made", example = "7")
        private Integer minDaysBeforeSelection;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @Schema(description = "Response payload for a restricted holiday policy")
    public static class PolicyResponse {
        private UUID id;
        private Integer maxSelectionsPerYear;
        private Boolean requiresApproval;
        private String applicableDepartments;
        private Integer year;
        private Boolean isActive;
        private Integer minDaysBeforeSelection;
        private LocalDateTime createdAt;
        private LocalDateTime updatedAt;
    }

    // ─── Summary DTO ────────────────────────────────────────────────────

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @Schema(description = "Summary of an employee's restricted holiday usage for a year")
    public static class EmployeeSummaryResponse {
        private Integer year;
        private Integer maxSelections;
        private Long usedSelections;
        private Long remainingSelections;
        private Boolean requiresApproval;
    }
}
