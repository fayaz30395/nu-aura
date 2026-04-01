package com.hrms.domain.performance;

import com.hrms.common.entity.TenantAware;
import jakarta.persistence.*;
import org.hibernate.annotations.Where;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.time.LocalDate;
import java.util.UUID;

@Where(clause = "is_deleted = false")
@Entity
@Table(name = "feedback_360_cycles", indexes = {
    @Index(name = "idx_f360_cycle_tenant", columnList = "tenantId"),
    @Index(name = "idx_f360_cycle_status", columnList = "status")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class Feedback360Cycle extends TenantAware {

    @Column(nullable = false, length = 200)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(length = 30)
    @Builder.Default
    private CycleStatus status = CycleStatus.DRAFT;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "end_date", nullable = false)
    private LocalDate endDate;

    @Column(name = "nomination_deadline")
    private LocalDate nominationDeadline;

    @Column(name = "self_review_deadline")
    private LocalDate selfReviewDeadline;

    @Column(name = "peer_review_deadline")
    private LocalDate peerReviewDeadline;

    @Column(name = "manager_review_deadline")
    private LocalDate managerReviewDeadline;

    @Column(name = "min_peers_required")
    @Builder.Default
    private Integer minPeersRequired = 3;

    @Column(name = "max_peers_allowed")
    @Builder.Default
    private Integer maxPeersAllowed = 8;

    @Column(name = "is_anonymous")
    @Builder.Default
    private Boolean isAnonymous = true;

    @Column(name = "include_self_review")
    @Builder.Default
    private Boolean includeSelfReview = true;

    @Column(name = "include_manager_review")
    @Builder.Default
    private Boolean includeManagerReview = true;

    @Column(name = "include_peer_review")
    @Builder.Default
    private Boolean includePeerReview = true;

    @Column(name = "include_upward_review")
    @Builder.Default
    private Boolean includeUpwardReview = false;

    @Column(name = "template_id")
    private UUID templateId;

    public enum CycleStatus {
        DRAFT,
        NOMINATION_OPEN,
        IN_PROGRESS,
        REVIEW_COMPLETE,
        CLOSED
    }
}
