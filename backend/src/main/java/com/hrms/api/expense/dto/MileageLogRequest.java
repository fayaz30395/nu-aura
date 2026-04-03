package com.hrms.api.expense.dto;

import com.hrms.domain.expense.MileageLog;
import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.time.LocalDate;

public record MileageLogRequest(
        @NotNull(message = "Travel date is required")
        @PastOrPresent(message = "Travel date cannot be in the future")
        LocalDate travelDate,

        @NotBlank(message = "From location is required")
        @Size(max = 500, message = "From location cannot exceed 500 characters")
        String fromLocation,

        @NotBlank(message = "To location is required")
        @Size(max = 500, message = "To location cannot exceed 500 characters")
        String toLocation,

        @NotNull(message = "Distance is required")
        @DecimalMin(value = "0.01", message = "Distance must be greater than 0")
        @Digits(integer = 6, fraction = 2, message = "Distance format is invalid")
        BigDecimal distanceKm,

        @Size(max = 1000, message = "Purpose cannot exceed 1000 characters")
        String purpose,

        @NotNull(message = "Vehicle type is required")
        MileageLog.VehicleType vehicleType,

        @Size(max = 1000, message = "Notes cannot exceed 1000 characters")
        String notes
) {
}
