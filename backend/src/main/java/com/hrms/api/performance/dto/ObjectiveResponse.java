package com.hrms.api.performance.dto;

import com.hrms.domain.performance.Objective;
import com.hrms.domain.performance.Objective.ObjectiveLevel;
import com.hrms.domain.performance.Objective.ObjectiveStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ObjectiveResponse {

    private UUID id;
    private UUID tenantId;
    private UUID ownerId;
    private String ownerName;
    private UUID cycleId;
    private UUID parentObjectiveId;
    private String title;
    private String description;
    private ObjectiveLevel objectiveLevel;
    private ObjectiveStatus status;
    private LocalDate startDate;
    private LocalDate endDate;
    private BigDecimal progressPercentage;
    private Integer weight;
    private Boolean isStretchGoal;
    private UUID alignedToCompanyObjective;
    private UUID departmentId;
    private UUID teamId;
    private String visibility;
    private UUID approvedBy;
    private String checkInFrequency;
    private LocalDate lastCheckInDate;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private List<KeyResultResponse> keyResults;

    public static ObjectiveResponse fromEntity(Objective objective) {
        return ObjectiveResponse.builder()
                .id(objective.getId())
                .tenantId(objective.getTenantId())
                .ownerId(objective.getOwnerId())
                .cycleId(objective.getCycleId())
                .parentObjectiveId(objective.getParentObjectiveId())
                .title(objective.getTitle())
                .description(objective.getDescription())
                .objectiveLevel(objective.getLevel())
                .status(objective.getStatus())
                .startDate(objective.getStartDate())
                .endDate(objective.getEndDate())
                .progressPercentage(objective.getProgressPercentage())
                .weight(objective.getWeight())
                .isStretchGoal(objective.getIsStretchGoal())
                .alignedToCompanyObjective(objective.getAlignedToCompanyObjective())
                .departmentId(objective.getDepartmentId())
                .teamId(objective.getTeamId())
                .visibility(objective.getVisibility())
                .approvedBy(objective.getApprovedBy())
                .checkInFrequency(objective.getCheckInFrequency())
                .lastCheckInDate(objective.getLastCheckInDate())
                .createdAt(objective.getCreatedAt())
                .updatedAt(objective.getUpdatedAt())
                .keyResults(objective.getKeyResults() != null ?
                        objective.getKeyResults().stream()
                        .map(KeyResultResponse::fromEntity)
                        .collect(Collectors.toList()) : null)
                .build();
    }
}
