package com.hrms.domain.recruitment;

import com.hrms.common.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.SQLRestriction;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@SQLRestriction("is_deleted = false")
@Entity
@Table(name = "interview_scorecards", indexes = {
        @Index(name = "idx_scorecards_tenant", columnList = "tenant_id"),
        @Index(name = "idx_scorecards_interview", columnList = "tenant_id,interview_id"),
        @Index(name = "idx_scorecards_applicant", columnList = "tenant_id,applicant_id"),
        @Index(name = "idx_scorecards_interviewer", columnList = "tenant_id,interviewer_id"),
        @Index(name = "idx_scorecards_template", columnList = "template_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
@EqualsAndHashCode(callSuper = true)
public class InterviewScorecard extends BaseEntity {

    @Column(name = "tenant_id", nullable = false)
    private UUID tenantId;

    @Column(name = "interview_id", nullable = false)
    private UUID interviewId;

    @Column(name = "applicant_id", nullable = false)
    private UUID applicantId;

    @Column(name = "job_opening_id", nullable = false)
    private UUID jobOpeningId;

    @Column(name = "interviewer_id", nullable = false)
    private UUID interviewerId;

    @Column(name = "template_id")
    private UUID templateId;

    @Column(name = "overall_rating")
    private Integer overallRating;

    @Enumerated(EnumType.STRING)
    @Column(name = "recommendation", length = 20)
    private Recommendation recommendation;

    @Column(name = "overall_notes", columnDefinition = "TEXT")
    private String overallNotes;

    @Column(name = "submitted_at")
    private LocalDateTime submittedAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private ScorecardStatus status;

    @Builder.Default
    @OneToMany(mappedBy = "scorecard", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private List<ScorecardCriterion> criteria = new ArrayList<>();

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "interview_id", referencedColumnName = "id", insertable = false, updatable = false)
    private Interview interview;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "applicant_id", referencedColumnName = "id", insertable = false, updatable = false)
    private Applicant applicant;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "template_id", referencedColumnName = "id", insertable = false, updatable = false)
    private ScorecardTemplate template;

    public enum Recommendation {
        STRONG_YES, YES, NEUTRAL, NO, STRONG_NO
    }

    public enum ScorecardStatus {
        DRAFT, SUBMITTED
    }
}
