package com.hrms.api.attendance.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Request body for submitting a new attendance regularization request.
 * Used by employees who were absent/late and need to apply for attendance correction.
 */
@Data
public class RegularizationRequest {

    /**
     * Employee to regularize attendance for. Defaults to the currently authenticated employee.
     */
    private UUID employeeId;

    @NotNull(message = "Date is required")
    private LocalDate date;

    /**
     * Desired check-in time for the corrected record (optional).
     */
    private LocalDateTime checkInTime;

    /**
     * Desired check-out time for the corrected record (optional).
     */
    private LocalDateTime checkOutTime;

    @NotBlank(message = "Reason is required")
    @Size(max = 1000, message = "Reason must not exceed 1000 characters")
    private String reason;
}
