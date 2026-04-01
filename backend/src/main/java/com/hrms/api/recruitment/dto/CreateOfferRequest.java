package com.hrms.api.recruitment.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * DTO for creating/extending a job offer to a candidate.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreateOfferRequest {
    @NotNull(message = "Offered salary is required")
    @Min(value = 0, message = "Offered salary must be non-negative")
    private BigDecimal offeredSalary;

    @NotBlank(message = "Position title is required")
    @Size(max = 200, message = "Position title must not exceed 200 characters")
    private String positionTitle;

    @NotNull(message = "Joining date is required")
    private LocalDate joiningDate;

    private LocalDate offerExpiryDate;

    @Size(max = 2000, message = "Notes must not exceed 2000 characters")
    private String notes;
}
