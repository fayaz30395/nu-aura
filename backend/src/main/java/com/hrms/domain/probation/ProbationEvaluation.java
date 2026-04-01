package com.hrms.domain.probation;

import com.hrms.common.entity.TenantAware;
import jakarta.persistence.*;
import org.hibernate.annotations.Where;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.time.LocalDate;
import java.util.UUID;

@Where(clause = "is_deleted = false")
@Entity
@Table(name = "probation_evaluations", indexes = {
        @Index(name = "idx_prob_eval_period", columnList = "probation_period_id"),
        @Index(name = "idx_prob_eval_tenant", columnList = "tenant_id"),
        @Index(name = "idx_prob_eval_date", columnList = "evaluation_date")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class ProbationEvaluation extends TenantAware {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "probation_period_id", nullable = false)
    private ProbationPeriod probationPeriod;

    @Column(name = "evaluation_date", nullable = false)
    private LocalDate evaluationDate;

    @Column(name = "evaluator_id", nullable = false)
    private UUID evaluatorId;

    @Enumerated(EnumType.STRING)
    @Column(name = "evaluation_type", nullable = false)
    private EvaluationType evaluationType;

    @Column(name = "performance_rating")
    private Double performanceRating;

    @Column(name = "attendance_rating")
    private Double attendanceRating;

    @Column(name = "communication_rating")
    private Double communicationRating;

    @Column(name = "teamwork_rating")
    private Double teamworkRating;

    @Column(name = "technical_skills_rating")
    private Double technicalSkillsRating;

    @Column(name = "overall_rating")
    private Double overallRating;

    @Column(name = "strengths", length = 2000)
    private String strengths;

    @Column(name = "areas_for_improvement", length = 2000)
    private String areasForImprovement;

    @Column(name = "goals_for_next_period", length = 2000)
    private String goalsForNextPeriod;

    @Column(name = "manager_comments", length = 2000)
    private String managerComments;

    @Column(name = "employee_comments", length = 2000)
    private String employeeComments;

    @Enumerated(EnumType.STRING)
    @Column(name = "recommendation", nullable = false)
    private ProbationRecommendation recommendation;

    @Column(name = "recommendation_reason", length = 1000)
    private String recommendationReason;

    @Column(name = "is_final_evaluation")
    @Builder.Default
    private Boolean isFinalEvaluation = false;

    @Column(name = "employee_acknowledged")
    @Builder.Default
    private Boolean employeeAcknowledged = false;

    @Column(name = "acknowledged_date")
    private LocalDate acknowledgedDate;

    public enum EvaluationType {
        WEEKLY,
        BI_WEEKLY,
        MONTHLY,
        QUARTERLY,
        MID_PROBATION,
        FINAL
    }

    public enum ProbationRecommendation {
        CONFIRM,              // Recommend confirmation
        EXTEND,               // Recommend extension
        TERMINATE,            // Recommend termination
        NEEDS_IMPROVEMENT,    // Continue with close monitoring
        ON_TRACK              // Progressing as expected
    }

    public void calculateOverallRating() {
        int count = 0;
        double sum = 0;

        if (performanceRating != null) { sum += performanceRating; count++; }
        if (attendanceRating != null) { sum += attendanceRating; count++; }
        if (communicationRating != null) { sum += communicationRating; count++; }
        if (teamworkRating != null) { sum += teamworkRating; count++; }
        if (technicalSkillsRating != null) { sum += technicalSkillsRating; count++; }

        this.overallRating = count > 0 ? sum / count : null;
    }

    public void acknowledge() {
        this.employeeAcknowledged = true;
        this.acknowledgedDate = LocalDate.now();
    }
}
