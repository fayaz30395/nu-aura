package com.nulogic.api.recruitment.dto;

import com.nulogic.domain.recruitment.Candidate;
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
    private Candidate.RecruitmentStage stage;
    private String notes;
}
