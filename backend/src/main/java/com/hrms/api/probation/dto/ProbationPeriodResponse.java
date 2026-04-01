package com.hrms.api.probation.dto;

import com.hrms.domain.probation.ProbationPeriod;
import com.hrms.domain.probation.ProbationPeriod.ProbationStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProbationPeriodResponse {

    private UUID id;
    private UUID employeeId;
    private String employeeName;
    private String employeeEmail;
    private String department;
    private String designation;

    private LocalDate startDate;
    private LocalDate originalEndDate;
    private LocalDate endDate;
    private Integer durationMonths;

    private ProbationStatus status;
    private String statusDisplayName;

    private Integer extensionCount;
    private Integer totalExtensionDays;

    private LocalDate confirmationDate;
    private LocalDate terminationDate;
    private Double finalRating;

    private UUID managerId;
    private String managerName;

    private UUID hrId;
    private String hrName;

    private String notes;
    private String terminationReason;

    private LocalDate nextEvaluationDate;
    private Integer evaluationFrequencyDays;
    private Integer evaluationCount;
    private Double averageRating;

    private long daysRemaining;
    private boolean isOverdue;
    private boolean isEvaluationDue;

    private List<ProbationEvaluationResponse> recentEvaluations;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static ProbationPeriodResponse fromEntity(ProbationPeriod entity) {
        return ProbationPeriodResponse.builder()
                .id(entity.getId())
                .employeeId(entity.getEmployeeId())
                .startDate(entity.getStartDate())
                .originalEndDate(entity.getOriginalEndDate())
                .endDate(entity.getEndDate())
                .durationMonths(entity.getDurationMonths())
                .status(entity.getStatus())
                .statusDisplayName(formatStatus(entity.getStatus()))
                .extensionCount(entity.getExtensionCount())
                .totalExtensionDays(entity.getTotalExtensionDays())
                .confirmationDate(entity.getConfirmationDate())
                .terminationDate(entity.getTerminationDate())
                .finalRating(entity.getFinalRating())
                .managerId(entity.getManagerId())
                .hrId(entity.getHrId())
                .notes(entity.getNotes())
                .terminationReason(entity.getTerminationReason())
                .nextEvaluationDate(entity.getNextEvaluationDate())
                .evaluationFrequencyDays(entity.getEvaluationFrequencyDays())
                .daysRemaining(entity.getDaysRemaining())
                .isOverdue(entity.isOverdue())
                .isEvaluationDue(entity.isEvaluationDue())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }

    private static String formatStatus(ProbationStatus status) {
        if (status == null) return null;
        return switch (status) {
            case ACTIVE -> "Active";
            case EXTENDED -> "Extended";
            case CONFIRMED -> "Confirmed";
            case FAILED -> "Failed";
            case TERMINATED -> "Terminated";
            case ON_HOLD -> "On Hold";
        };
    }
}
