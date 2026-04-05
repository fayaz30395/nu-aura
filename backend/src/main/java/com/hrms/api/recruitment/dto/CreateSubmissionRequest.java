package com.hrms.api.recruitment.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.math.BigDecimal;
import java.util.UUID;

@Data
public class CreateSubmissionRequest {

    @NotNull(message = "Candidate ID is required")
    private UUID candidateId;

    @NotNull(message = "Job Opening ID is required")
    private UUID jobOpeningId;

    @DecimalMin(value = "0.00", message = "Fee agreed must be non-negative")
    private BigDecimal feeAgreed;

    @Size(max = 3, message = "Fee currency must not exceed 3 characters")
    private String feeCurrency;

    @Size(max = 5000, message = "Notes must not exceed 5000 characters")
    private String notes;
}
