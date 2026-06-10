package com.nulogic.api.leave.dto;

import com.nulogic.common.validation.DateRangeValid;
import jakarta.validation.constraints.*;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

/**
 * DTO for creating/updating a leave request.
 * Includes validation for date ranges, reason length, and totalDays.
 */
@Data
@DateRangeValid(
        startDateField = "startDate",
        endDateField = "endDate",
        message = "Leave end date must be on or after start date"
)
public class LeaveRequestRequest {

    @NotNull(message = "Employee ID is required")
    private UUID employeeId;

    @NotNull(message = "Leave type is required")
    private UUID leaveTypeId;

    @NotNull(message = "Start date is required")
    // BUG-QA2-008 FIX: Removed @FutureOrPresent to allow retroactive leave applications.
    // Business logic for retroactive leave limit (e.g. backdated within N days) should be
    // enforced in LeaveService based on leave type policy configuration, not at validation layer.
    private LocalDate startDate;

    @NotNull(message = "End date is required")
    private LocalDate endDate;

    // BUG-QA2-001 FIX: totalDays is optional — if not provided by the frontend,
    // the service layer computes it from startDate/endDate. @NotNull removed for
    // backward compatibility while still allowing explicit submission.
    @DecimalMin(value = "0.5", message = "Total days must be at least 0.5")
    @DecimalMax(value = "365", message = "Total days cannot exceed 365")
    private BigDecimal totalDays;

    private Boolean isHalfDay = false;

    // BUG-QA2-007 FIX: Accept both FIRST_HALF/SECOND_HALF (Java enum values) and
    // MORNING/AFTERNOON (frontend/spec values). Normalization happens in LeaveService.
    @Pattern(regexp = "^(FIRST_HALF|SECOND_HALF|MORNING|AFTERNOON)?$",
            message = "Half day period must be FIRST_HALF, SECOND_HALF, MORNING, or AFTERNOON")
    private String halfDayPeriod;

    @NotBlank(message = "Reason is required")
    @Size(min = 10, max = 1000, message = "Reason must be between 10 and 1000 characters")
    private String reason;

    @Size(max = 500, message = "Document path cannot exceed 500 characters")
    private String documentPath;

    /**
     * BA-3/DATA-5 FIX: half-day single-day invariant. A half-day request spanning
     * multiple days would reserve/deduct 0.5 day while blocking the full range —
     * a direct balance-bypass exploit. Enforced again in LeaveRequestService
     * (defence in depth for non-DTO callers).
     */
    @AssertTrue(message = "Half-day leave must start and end on the same day")
    public boolean isHalfDaySingleDay() {
        if (!Boolean.TRUE.equals(isHalfDay) || startDate == null || endDate == null) {
            return true;
        }
        return startDate.equals(endDate);
    }

    /**
     * DATA-5 FIX: fail fast at the API boundary instead of bouncing off the entity's
     * pre-persist {@code isHalfDayPeriodValid()} with an opaque 500/400 at save time.
     */
    @AssertTrue(message = "halfDayPeriod is required when isHalfDay is true")
    public boolean isHalfDayPeriodProvided() {
        return !Boolean.TRUE.equals(isHalfDay) || (halfDayPeriod != null && !halfDayPeriod.isBlank());
    }
}
