package com.hrms.api.probation.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProbationExtensionRequest {

    @NotNull(message = "Extension days is required")
    @Min(value = 1, message = "Extension must be at least 1 day")
    private Integer extensionDays;

    @NotBlank(message = "Reason for extension is required")
    private String reason;
}
