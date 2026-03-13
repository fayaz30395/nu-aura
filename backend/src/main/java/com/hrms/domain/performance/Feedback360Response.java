package com.hrms.domain.performance;

import com.hrms.common.entity.TenantAware;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "feedback_360_responses", indexes = {
    @Index(name = "idx_f360_resp_tenant", columnList = "tenantId"),
    @Index(name = "idx_f360_resp_request", columnList = "requestId"),
    @Index(name = "idx_f360_resp_subject", columnList = "subjectEmployeeId")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class Feedback360Response extends TenantAware {

    @Column(name = "request_id", nullable = false)
    private UUID requestId;

    @Column(name = "cycle_id", nullable = false)
    private UUID cycleId;

    @Column(name = "subject_employee_id", nullable = false)
    private UUID subjectEmployeeId;

    @Column(name = "reviewer_id", nullable = false)
    private UUID reviewerId;

    @Enumerated(EnumType.STRING)
    @Column(name = "reviewer_type", length = 30)
    private Feedback360Request.ReviewerType reviewerType;

    @Column(name = "submitted_at")
    private LocalDateTime submittedAt;

    @Column(name = "is_draft")
    @Builder.Default
    private Boolean isDraft = true;

    // Overall ratings
    @Column(name = "overall_rating", precision = 3, scale = 2)
    private BigDecimal overallRating;

    // Core competency ratings (stored as JSON or individual columns)
    @Column(name = "communication_rating", precision = 3, scale = 2)
    private BigDecimal communicationRating;

    @Column(name = "teamwork_rating", precision = 3, scale = 2)
    private BigDecimal teamworkRating;

    @Column(name = "leadership_rating", precision = 3, scale = 2)
    private BigDecimal leadershipRating;

    @Column(name = "problem_solving_rating", precision = 3, scale = 2)
    private BigDecimal problemSolvingRating;

    @Column(name = "technical_skills_rating", precision = 3, scale = 2)
    private BigDecimal technicalSkillsRating;

    @Column(name = "adaptability_rating", precision = 3, scale = 2)
    private BigDecimal adaptabilityRating;

    @Column(name = "work_quality_rating", precision = 3, scale = 2)
    private BigDecimal workQualityRating;

    @Column(name = "time_management_rating", precision = 3, scale = 2)
    private BigDecimal timeManagementRating;

    // Open-ended feedback
    @Column(columnDefinition = "TEXT")
    private String strengths;

    @Column(name = "areas_for_improvement", columnDefinition = "TEXT")
    private String areasForImprovement;

    @Column(name = "additional_comments", columnDefinition = "TEXT")
    private String additionalComments;

    @Column(name = "specific_examples", columnDefinition = "TEXT")
    private String specificExamples;

    @Column(name = "development_suggestions", columnDefinition = "TEXT")
    private String developmentSuggestions;

    // Additional JSON field for custom questions/answers
    @Column(name = "custom_responses", columnDefinition = "TEXT")
    private String customResponses; // JSON format
}
