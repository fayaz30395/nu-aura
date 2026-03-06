package com.hrms.api.lms.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateProgressRequest {

    @NotNull(message = "progressPercent is required")
    @Min(value = 0, message = "progressPercent must be >= 0")
    @Max(value = 100, message = "progressPercent must be <= 100")
    private Integer progressPercent;
}
