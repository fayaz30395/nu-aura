package com.hrms.api.performance.dto;

import com.hrms.domain.performance.Objective.ObjectiveLevel;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ObjectiveRequest {

    @NotBlank(message = "Title is required")
    private String title;

    private String description;

    @NotNull(message = "Start date is required")
    private LocalDate startDate;

    @NotNull(message = "End date is required")
    private LocalDate endDate;

    private ObjectiveLevel objectiveLevel;

    private UUID parentObjectiveId;

    private UUID cycleId;

    private UUID departmentId;

    private UUID teamId;

    private Integer weight;

    private Boolean isStretchGoal;

    private UUID alignedToCompanyObjective;

    private String visibility;

    private String checkInFrequency;

    private List<KeyResultRequest> keyResults;
}
