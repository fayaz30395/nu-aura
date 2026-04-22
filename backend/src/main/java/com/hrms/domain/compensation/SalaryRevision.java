package com.hrms.domain.compensation;

import com.hrms.common.entity.TenantAware;
import jakarta.persistence.*;
import org.hibernate.annotations.SQLRestriction;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@SQLRestriction("is_deleted = false")
@Entity
@Table(name = "salary_revisions", indexes = {
        @Index(name = "idx_salary_rev_employee", columnList = "employee_id"),
        @Index(name = "idx_salary_rev_tenant", columnList = "tenant_id"),
        @Index(name = "idx_salary_rev_status", columnList = "status"),
        @Index(name = "idx_salary_rev_effective_date", columnList = "effective_date"),
        @Index(name = "idx_salary_rev_cycle", columnList = "review_cycle_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class SalaryRevision extends TenantAware {

    @Column(name = "employee_id", nullable = false)
    private UUID employeeId;

    @Column(name = "review_cycle_id")
    private UUID reviewCycleId;

    @Enumerated(EnumType.STRING)
    @Column(name = "revision_type", nullable = false)
    private RevisionType revisionType;

    @Column(name = "previous_salary", nullable = false, precision = 12, scale = 2)
    private BigDecimal previousSalary;

    @Column(name = "new_salary", nullable = false, precision = 12, scale = 2)
    private BigDecimal newSalary;

    @Column(name = "increment_amount", precision = 12, scale = 2)
    private BigDecimal incrementAmount;

    @Column(name = "increment_percentage", precision = 5, scale = 2)
    private BigDecimal incrementPercentage;

    @Column(name = "previous_designation", length = 100)
    private String previousDesignation;

    @Column(name = "new_designation", length = 100)
    private String newDesignation;

    @Column(name = "previous_level", length = 50)
    private String previousLevel;

    @Column(name = "new_level", length = 50)
    private String newLevel;

    @Column(name = "effective_date", nullable = false)
    private LocalDate effectiveDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    @Builder.Default
    private RevisionStatus status = RevisionStatus.DRAFT;

    @Column(name = "justification", length = 2000)
    private String justification;

    @Column(name = "performance_rating")
    private Double performanceRating;

    @Column(name = "proposed_by")
    private UUID proposedBy;

    @Column(name = "proposed_date")
    private LocalDate proposedDate;

    @Column(name = "reviewed_by")
    private UUID reviewedBy;

    @Column(name = "reviewed_date")
    private LocalDate reviewedDate;

    @Column(name = "reviewer_comments", length = 1000)
    private String reviewerComments;

    @Column(name = "approved_by")
    private UUID approvedBy;

    @Column(name = "approved_date")
    private LocalDate approvedDate;

    @Column(name = "approver_comments", length = 1000)
    private String approverComments;

    @Column(name = "rejection_reason", length = 1000)
    private String rejectionReason;

    @Column(name = "letter_generated")
    @Builder.Default
    private Boolean letterGenerated = false;

    @Column(name = "letter_id")
    private UUID letterId;

    @Column(name = "payroll_processed")
    @Builder.Default
    private Boolean payrollProcessed = false;

    @Column(name = "currency", length = 3)
    @Builder.Default
    private String currency = "USD";

    public void calculateIncrement() {
        if (previousSalary != null && newSalary != null) {
            this.incrementAmount = newSalary.subtract(previousSalary);
            if (previousSalary.compareTo(BigDecimal.ZERO) > 0) {
                this.incrementPercentage = incrementAmount
                        .multiply(new BigDecimal("100"))
                        .divide(previousSalary, 2, java.math.RoundingMode.HALF_UP);
            }
        }
    }

    public void submit() {
        this.status = RevisionStatus.PENDING_REVIEW;
        this.proposedDate = LocalDate.now();
    }

    public void review(UUID reviewerId, String comments) {
        this.status = RevisionStatus.REVIEWED;
        this.reviewedBy = reviewerId;
        this.reviewedDate = LocalDate.now();
        this.reviewerComments = comments;
    }

    public void approve(UUID approverId, String comments) {
        this.status = RevisionStatus.APPROVED;
        this.approvedBy = approverId;
        this.approvedDate = LocalDate.now();
        this.approverComments = comments;
    }

    public void reject(UUID rejectedBy, String reason) {
        this.status = RevisionStatus.REJECTED;
        this.approvedBy = rejectedBy;
        this.approvedDate = LocalDate.now();
        this.rejectionReason = reason;
    }

    public void apply() {
        this.status = RevisionStatus.APPLIED;
    }

    public boolean isPromotion() {
        return revisionType == RevisionType.PROMOTION ||
                (newDesignation != null && !newDesignation.equals(previousDesignation));
    }

    public enum RevisionType {
        ANNUAL_INCREMENT,
        PROMOTION,
        ROLE_CHANGE,
        MARKET_ADJUSTMENT,
        PERFORMANCE_BONUS,
        SPECIAL_INCREMENT,
        PROBATION_CONFIRMATION,
        RETENTION,
        CORRECTION
    }

    public enum RevisionStatus {
        DRAFT,
        PENDING_REVIEW,
        REVIEWED,
        PENDING_APPROVAL,
        APPROVED,
        REJECTED,
        CANCELLED,
        APPLIED
    }
}
