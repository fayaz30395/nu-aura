package com.hrms.api.probation.dto;

import com.hrms.domain.probation.ProbationEvaluation.EvaluationType;
import com.hrms.domain.probation.ProbationEvaluation.ProbationRecommendation;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProbationEvaluationRequest {

    @NotNull(message = "Probation period ID is required")
    private UUID probationPeriodId;

    private LocalDate evaluationDate;

    @NotNull(message = "Evaluation type is required")
    private EvaluationType evaluationType;

    @DecimalMin(value = "1.0", message = "Rating must be between 1 and 5")
    @DecimalMax(value = "5.0", message = "Rating must be between 1 and 5")
    private Double performanceRating;

    @DecimalMin(value = "1.0", message = "Rating must be between 1 and 5")
    @DecimalMax(value = "5.0", message = "Rating must be between 1 and 5")
    private Double attendanceRating;

    @DecimalMin(value = "1.0", message = "Rating must be between 1 and 5")
    @DecimalMax(value = "5.0", message = "Rating must be between 1 and 5")
    private Double communicationRating;

    @DecimalMin(value = "1.0", message = "Rating must be between 1 and 5")
    @DecimalMax(value = "5.0", message = "Rating must be between 1 and 5")
    private Double teamworkRating;

    @DecimalMin(value = "1.0", message = "Rating must be between 1 and 5")
    @DecimalMax(value = "5.0", message = "Rating must be between 1 and 5")
    private Double technicalSkillsRating;

    private String strengths;
    private String areasForImprovement;
    private String goalsForNextPeriod;
    private String managerComments;

    @NotNull(message = "Recommendation is required")
    private ProbationRecommendation recommendation;

    private String recommendationReason;

    private Boolean isFinalEvaluation;
}
