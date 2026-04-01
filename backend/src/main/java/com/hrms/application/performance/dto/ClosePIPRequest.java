package com.hrms.application.performance.dto;

import com.hrms.domain.performance.PerformanceImprovementPlan.PIPStatus;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ClosePIPRequest {

    @NotNull
    private PIPStatus finalStatus; // COMPLETED / EXTENDED / TERMINATED

    private String notes;
}
