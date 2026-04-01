package com.hrms.api.probation.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProbationTerminationRequest {

    @NotBlank(message = "Reason for termination is required")
    private String reason;

    private Boolean notifyEmployee;

    private Boolean initiateExitProcess;
}
