package com.hrms.api.leave.dto;

import com.hrms.common.validation.DateRangeValid;
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
    @FutureOrPresent(message = "Start date cannot be in the past")
    private LocalDate startDate;

    @NotNull(message = "End date is required")
    private LocalDate endDate;

    @NotNull(message = "Total days is required")
    @DecimalMin(value = "0.5", message = "Total days must be at least 0.5")
    @DecimalMax(value = "365", message = "Total days cannot exceed 365")
    private BigDecimal totalDays;

    private Boolean isHalfDay = false;

    @Pattern(regexp = "^(FIRST_HALF|SECOND_HALF)?$", message = "Half day period must be FIRST_HALF or SECOND_HALF")
    private String halfDayPeriod;

    @NotBlank(message = "Reason is required")
    @Size(min = 10, max = 1000, message = "Reason must be between 10 and 1000 characters")
    private String reason;

    @Size(max = 500, message = "Document path cannot exceed 500 characters")
    private String documentPath;
}
