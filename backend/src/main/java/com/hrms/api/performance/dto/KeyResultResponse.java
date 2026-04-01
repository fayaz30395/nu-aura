package com.hrms.api.performance.dto;

import com.hrms.domain.performance.KeyResult;
import com.hrms.domain.performance.KeyResult.KeyResultStatus;
import com.hrms.domain.performance.KeyResult.MeasurementType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class KeyResultResponse {

    private UUID id;
    private UUID tenantId;
    private UUID objectiveId;
    private UUID ownerId;
    private String ownerName;
    private String title;
    private String description;
    private MeasurementType measurementType;
    private BigDecimal startValue;
    private BigDecimal currentValue;
    private BigDecimal targetValue;
    private String measurementUnit;
    private KeyResultStatus status;
    private BigDecimal progressPercentage;
    private Integer weight;
    private LocalDate dueDate;
    private Boolean isMilestone;
    private Integer milestoneOrder;
    private Integer confidenceLevel;
    private String lastUpdatedNotes;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static KeyResultResponse fromEntity(KeyResult keyResult) {
        return KeyResultResponse.builder()
                .id(keyResult.getId())
                .tenantId(keyResult.getTenantId())
                .objectiveId(keyResult.getObjectiveId())
                .ownerId(keyResult.getOwnerId())
                .title(keyResult.getTitle())
                .description(keyResult.getDescription())
                .measurementType(keyResult.getMeasurementType())
                .startValue(keyResult.getStartValue())
                .currentValue(keyResult.getCurrentValue())
                .targetValue(keyResult.getTargetValue())
                .measurementUnit(keyResult.getMeasurementUnit())
                .status(keyResult.getStatus())
                .progressPercentage(keyResult.getProgressPercentage())
                .weight(keyResult.getWeight())
                .dueDate(keyResult.getDueDate())
                .isMilestone(keyResult.getIsMilestone())
                .milestoneOrder(keyResult.getMilestoneOrder())
                .confidenceLevel(keyResult.getConfidenceLevel())
                .lastUpdatedNotes(keyResult.getLastUpdatedNotes())
                .createdAt(keyResult.getCreatedAt())
                .updatedAt(keyResult.getUpdatedAt())
                .build();
    }
}
