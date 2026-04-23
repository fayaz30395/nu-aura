package com.hrms.api.recruitment.dto;

import com.hrms.domain.recruitment.Candidate;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO for moving a candidate to a different recruitment stage.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MoveStageRequest {
    @NotNull(message = "Stage is required")
    private Candidate.RecruitmentStage stage;
    private String notes;
}
