package com.hrms.domain.performance;

import com.hrms.common.entity.TenantAware;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "feedback_360_summaries", indexes = {
    @Index(name = "idx_f360_sum_tenant", columnList = "tenantId"),
    @Index(name = "idx_f360_sum_subject", columnList = "subjectEmployeeId"),
    @Index(name = "idx_f360_sum_cycle", columnList = "cycleId")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Feedback360Summary extends TenantAware {

    @Column(name = "cycle_id", nullable = false)
    private UUID cycleId;

    @Column(name = "subject_employee_id", nullable = false)
    private UUID subjectEmployeeId;

    // Response counts
    @Column(name = "total_reviewers")
    @Builder.Default
    private Integer totalReviewers = 0;

    @Column(name = "responses_received")
    @Builder.Default
    private Integer responsesReceived = 0;

    @Column(name = "self_review_completed")
    @Builder.Default
    private Boolean selfReviewCompleted = false;

    @Column(name = "manager_review_completed")
    @Builder.Default
    private Boolean managerReviewCompleted = false;

    @Column(name = "peer_reviews_completed")
    @Builder.Default
    private Integer peerReviewsCompleted = 0;

    @Column(name = "upward_reviews_completed")
    @Builder.Default
    private Integer upwardReviewsCompleted = 0;

    // Aggregated ratings by reviewer type
    @Column(name = "self_overall_rating", precision = 3, scale = 2)
    private BigDecimal selfOverallRating;

    @Column(name = "manager_overall_rating", precision = 3, scale = 2)
    private BigDecimal managerOverallRating;

    @Column(name = "peer_avg_rating", precision = 3, scale = 2)
    private BigDecimal peerAverageRating;

    @Column(name = "upward_avg_rating", precision = 3, scale = 2)
    private BigDecimal upwardAverageRating;

    // Final aggregated rating
    @Column(name = "final_rating", precision = 3, scale = 2)
    private BigDecimal finalRating;

    // Competency averages
    @Column(name = "avg_communication", precision = 3, scale = 2)
    private BigDecimal avgCommunication;

    @Column(name = "avg_teamwork", precision = 3, scale = 2)
    private BigDecimal avgTeamwork;

    @Column(name = "avg_leadership", precision = 3, scale = 2)
    private BigDecimal avgLeadership;

    @Column(name = "avg_problem_solving", precision = 3, scale = 2)
    private BigDecimal avgProblemSolving;

    @Column(name = "avg_technical_skills", precision = 3, scale = 2)
    private BigDecimal avgTechnicalSkills;

    @Column(name = "avg_adaptability", precision = 3, scale = 2)
    private BigDecimal avgAdaptability;

    @Column(name = "avg_work_quality", precision = 3, scale = 2)
    private BigDecimal avgWorkQuality;

    @Column(name = "avg_time_management", precision = 3, scale = 2)
    private BigDecimal avgTimeManagement;

    // Aggregated text feedback (HR consolidated)
    @Column(name = "consolidated_strengths", columnDefinition = "TEXT")
    private String consolidatedStrengths;

    @Column(name = "consolidated_improvements", columnDefinition = "TEXT")
    private String consolidatedImprovements;

    @Column(name = "action_items", columnDefinition = "TEXT")
    private String actionItems;

    @Column(name = "generated_at")
    private LocalDateTime generatedAt;

    @Column(name = "shared_with_employee")
    @Builder.Default
    private Boolean sharedWithEmployee = false;

    @Column(name = "shared_at")
    private LocalDateTime sharedAt;

    public void calculateCompletionRate() {
        if (totalReviewers != null && totalReviewers > 0) {
            int completion = (responsesReceived != null ? responsesReceived : 0) * 100 / totalReviewers;
            // Store completion rate if needed
        }
    }
}
