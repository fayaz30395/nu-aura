package com.hrms.domain.performance;

import com.hrms.common.entity.TenantAware;
import jakarta.persistence.*;
import org.hibernate.annotations.Where;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.time.LocalDate;

@Where(clause = "is_deleted = false")
@Entity
@Table(name = "review_cycles")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class ReviewCycle extends TenantAware {

    @Column(name = "cycle_name", nullable = false, length = 200)
    private String cycleName;

    @Enumerated(EnumType.STRING)
    @Column(name = "cycle_type", length = 50)
    private CycleType cycleType;

    private LocalDate startDate;

    private LocalDate endDate;

    @Column(name = "self_review_deadline")
    private LocalDate selfReviewDeadline;

    @Column(name = "manager_review_deadline")
    private LocalDate managerReviewDeadline;

    @Enumerated(EnumType.STRING)
    @Column(length = 50)
    @Builder.Default
    private CycleStatus status = CycleStatus.PLANNING;

    @Column(columnDefinition = "TEXT")
    private String description;

    public enum CycleType {
        ANNUAL,         // Annual performance review
        QUARTERLY,      // Quarterly review
        PROBATION,      // Probation review
        MID_YEAR,       // Mid-year review
        PROJECT_END     // End-of-project review
    }

    public enum CycleStatus {
        PLANNING,           // Review cycle is being planned
        DRAFT,              // Alias for PLANNING
        ACTIVE,             // Review cycle is active (legacy — maps to SELF_ASSESSMENT)
        SELF_ASSESSMENT,    // Stage 1: Employees submitting self-assessments
        MANAGER_REVIEW,     // Stage 2: Managers reviewing
        CALIBRATION,        // Stage 3: HR calibration
        RATINGS_PUBLISHED,  // Stage 4: Ratings published to employees
        COMPLETED,          // Review cycle is completed
        CANCELLED           // Review cycle was cancelled
    }
}
