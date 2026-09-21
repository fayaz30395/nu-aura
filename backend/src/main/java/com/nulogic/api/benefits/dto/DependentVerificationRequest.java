package com.nulogic.api.benefits.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class DependentVerificationRequest {
    @NotNull(message = "approved is required")
    private Boolean approved;

    @Size(max = 1000, message = "reason cannot exceed 1000 characters")
    private String reason;
}
