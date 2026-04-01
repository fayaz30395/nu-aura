package com.hrms.domain.performance;

import com.hrms.common.entity.TenantAware;
import jakarta.persistence.*;
import org.hibernate.annotations.Where;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Where(clause = "is_deleted = false")
@Entity
@Table(name = "objectives", indexes = {
    @Index(name = "idx_objective_tenant", columnList = "tenantId"),
    @Index(name = "idx_objective_owner", columnList = "ownerId"),
    @Index(name = "idx_objective_cycle", columnList = "cycleId"),
    @Index(name = "idx_objective_status", columnList = "status")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class Objective extends TenantAware {

    @Column(name = "owner_id", nullable = false)
    private UUID ownerId;

    @Column(name = "cycle_id")
    private UUID cycleId;

    @Column(name = "parent_objective_id")
    private UUID parentObjectiveId;

    @Column(nullable = false, length = 500)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "objective_level", length = 30)
    @Builder.Default
    private ObjectiveLevel level = ObjectiveLevel.INDIVIDUAL;

    @Enumerated(EnumType.STRING)
    @Column(length = 30)
    @Builder.Default
    private ObjectiveStatus status = ObjectiveStatus.DRAFT;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "end_date", nullable = false)
    private LocalDate endDate;

    @Column(name = "progress_percentage", precision = 5, scale = 2)
    @Builder.Default
    private BigDecimal progressPercentage = BigDecimal.ZERO;

    @Column
    @Builder.Default
    private Integer weight = 100;

    @Column(name = "is_stretch_goal")
    @Builder.Default
    private Boolean isStretchGoal = false;

    @Column(name = "aligned_to_company_objective")
    private UUID alignedToCompanyObjective;

    @Column(name = "department_id")
    private UUID departmentId;

    @Column(name = "team_id")
    private UUID teamId;

    @Column(name = "visibility", length = 20)
    @Builder.Default
    private String visibility = "TEAM"; // PUBLIC, TEAM, PRIVATE

    @Column(name = "approved_by")
    private UUID approvedBy;

    @Column(name = "check_in_frequency", length = 20)
    @Builder.Default
    private String checkInFrequency = "WEEKLY"; // DAILY, WEEKLY, BIWEEKLY, MONTHLY

    @Column(name = "last_check_in_date")
    private LocalDate lastCheckInDate;

    // KeyResults use UUID reference pattern (objectiveId field) instead of JPA relationship
    // Loaded via KeyResultRepository.findByObjectiveIdOrderByMilestoneOrderAsc()
    @Transient
    @Builder.Default
    private List<KeyResult> keyResults = new ArrayList<>();

    public enum ObjectiveLevel {
        COMPANY,
        DEPARTMENT,
        TEAM,
        INDIVIDUAL
    }

    public enum ObjectiveStatus {
        DRAFT,
        PENDING_APPROVAL,
        ACTIVE,
        ON_TRACK,
        AT_RISK,
        BEHIND,
        COMPLETED,
        CANCELLED
    }

    public void calculateProgress() {
        if (keyResults == null || keyResults.isEmpty()) {
            this.progressPercentage = BigDecimal.ZERO;
            return;
        }

        BigDecimal totalWeight = BigDecimal.ZERO;
        BigDecimal weightedProgress = BigDecimal.ZERO;

        for (KeyResult kr : keyResults) {
            BigDecimal krWeight = BigDecimal.valueOf(kr.getWeight() != null ? kr.getWeight() : 100);
            totalWeight = totalWeight.add(krWeight);
            weightedProgress = weightedProgress.add(
                kr.getProgressPercentage().multiply(krWeight)
            );
        }

        if (totalWeight.compareTo(BigDecimal.ZERO) > 0) {
            this.progressPercentage = weightedProgress.divide(totalWeight, 2, java.math.RoundingMode.HALF_UP);
        }

        updateStatus();
    }

    private void updateStatus() {
        if (this.status == ObjectiveStatus.COMPLETED || this.status == ObjectiveStatus.CANCELLED) {
            return;
        }

        if (this.progressPercentage.compareTo(BigDecimal.valueOf(100)) >= 0) {
            this.status = ObjectiveStatus.COMPLETED;
        } else if (this.progressPercentage.compareTo(BigDecimal.valueOf(70)) >= 0) {
            this.status = ObjectiveStatus.ON_TRACK;
        } else if (this.progressPercentage.compareTo(BigDecimal.valueOf(40)) >= 0) {
            this.status = ObjectiveStatus.AT_RISK;
        } else if (this.status == ObjectiveStatus.ACTIVE) {
            // Check if we're past midpoint
            LocalDate today = LocalDate.now();
            if (today.isAfter(startDate.plusDays(
                    java.time.temporal.ChronoUnit.DAYS.between(startDate, endDate) / 2))) {
                this.status = ObjectiveStatus.BEHIND;
            }
        }
    }
}
