package com.hrms.api.recruitment.dto;

import com.hrms.domain.recruitment.ApplicationSource;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.math.BigDecimal;
import java.util.UUID;

@Data
public class ApplicantRequest {
    @NotNull(message = "Candidate ID is required")
    private UUID candidateId;

    @NotNull(message = "Job opening ID is required")
    private UUID jobOpeningId;

    private ApplicationSource source;

    @Size(max = 2000, message = "Notes must not exceed 2000 characters")
    private String notes;

    @Min(value = 0, message = "Expected salary must be non-negative")
    private BigDecimal expectedSalary;
}
