package com.hrms.api.probation.dto;

import com.hrms.domain.probation.ProbationEvaluation;
import com.hrms.domain.probation.ProbationEvaluation.EvaluationType;
import com.hrms.domain.probation.ProbationEvaluation.ProbationRecommendation;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProbationEvaluationResponse {

    private UUID id;
    private UUID probationPeriodId;

    private LocalDate evaluationDate;
    private UUID evaluatorId;
    private String evaluatorName;

    private EvaluationType evaluationType;
    private String evaluationTypeDisplayName;

    private Double performanceRating;
    private Double attendanceRating;
    private Double communicationRating;
    private Double teamworkRating;
    private Double technicalSkillsRating;
    private Double overallRating;

    private String strengths;
    private String areasForImprovement;
    private String goalsForNextPeriod;
    private String managerComments;
    private String employeeComments;

    private ProbationRecommendation recommendation;
    private String recommendationDisplayName;
    private String recommendationReason;

    private Boolean isFinalEvaluation;
    private Boolean employeeAcknowledged;
    private LocalDate acknowledgedDate;

    private LocalDateTime createdAt;

    public static ProbationEvaluationResponse fromEntity(ProbationEvaluation entity) {
        return ProbationEvaluationResponse.builder()
                .id(entity.getId())
                .probationPeriodId(entity.getProbationPeriod().getId())
                .evaluationDate(entity.getEvaluationDate())
                .evaluatorId(entity.getEvaluatorId())
                .evaluationType(entity.getEvaluationType())
                .evaluationTypeDisplayName(formatEvaluationType(entity.getEvaluationType()))
                .performanceRating(entity.getPerformanceRating())
                .attendanceRating(entity.getAttendanceRating())
                .communicationRating(entity.getCommunicationRating())
                .teamworkRating(entity.getTeamworkRating())
                .technicalSkillsRating(entity.getTechnicalSkillsRating())
                .overallRating(entity.getOverallRating())
                .strengths(entity.getStrengths())
                .areasForImprovement(entity.getAreasForImprovement())
                .goalsForNextPeriod(entity.getGoalsForNextPeriod())
                .managerComments(entity.getManagerComments())
                .employeeComments(entity.getEmployeeComments())
                .recommendation(entity.getRecommendation())
                .recommendationDisplayName(formatRecommendation(entity.getRecommendation()))
                .recommendationReason(entity.getRecommendationReason())
                .isFinalEvaluation(entity.getIsFinalEvaluation())
                .employeeAcknowledged(entity.getEmployeeAcknowledged())
                .acknowledgedDate(entity.getAcknowledgedDate())
                .createdAt(entity.getCreatedAt())
                .build();
    }

    private static String formatEvaluationType(EvaluationType type) {
        if (type == null) return null;
        return switch (type) {
            case WEEKLY -> "Weekly Check-in";
            case BI_WEEKLY -> "Bi-Weekly Check-in";
            case MONTHLY -> "Monthly Review";
            case QUARTERLY -> "Quarterly Review";
            case MID_PROBATION -> "Mid-Probation Review";
            case FINAL -> "Final Evaluation";
        };
    }

    private static String formatRecommendation(ProbationRecommendation rec) {
        if (rec == null) return null;
        return switch (rec) {
            case CONFIRM -> "Recommend Confirmation";
            case EXTEND -> "Recommend Extension";
            case TERMINATE -> "Recommend Termination";
            case NEEDS_IMPROVEMENT -> "Needs Improvement";
            case ON_TRACK -> "On Track";
        };
    }
}
