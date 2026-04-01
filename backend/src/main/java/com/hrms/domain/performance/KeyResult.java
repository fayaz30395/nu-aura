package com.hrms.domain.performance;

import com.hrms.common.entity.TenantAware;
import jakarta.persistence.*;
import org.hibernate.annotations.Where;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Where(clause = "is_deleted = false")
@Entity
@Table(name = "key_results", indexes = {
    @Index(name = "idx_kr_tenant", columnList = "tenantId"),
    @Index(name = "idx_kr_objective", columnList = "objectiveId"),
    @Index(name = "idx_kr_owner", columnList = "ownerId")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class KeyResult extends TenantAware {

    @Column(name = "objective_id", nullable = false)
    private UUID objectiveId;

    @Column(name = "owner_id", nullable = false)
    private UUID ownerId;

    @Column(nullable = false, length = 500)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "measurement_type", length = 30)
    @Builder.Default
    private MeasurementType measurementType = MeasurementType.PERCENTAGE;

    @Column(name = "start_value", precision = 19, scale = 2)
    @Builder.Default
    private BigDecimal startValue = BigDecimal.ZERO;

    @Column(name = "current_value", precision = 19, scale = 2)
    @Builder.Default
    private BigDecimal currentValue = BigDecimal.ZERO;

    @Column(name = "target_value", precision = 19, scale = 2, nullable = false)
    private BigDecimal targetValue;

    @Column(name = "measurement_unit", length = 50)
    private String measurementUnit;

    @Enumerated(EnumType.STRING)
    @Column(length = 30)
    @Builder.Default
    private KeyResultStatus status = KeyResultStatus.NOT_STARTED;

    @Column(name = "progress_percentage", precision = 5, scale = 2)
    @Builder.Default
    private BigDecimal progressPercentage = BigDecimal.ZERO;

    @Column
    @Builder.Default
    private Integer weight = 100;

    @Column(name = "due_date")
    private LocalDate dueDate;

    @Column(name = "is_milestone")
    @Builder.Default
    private Boolean isMilestone = false;

    @Column(name = "milestone_order")
    private Integer milestoneOrder;

    @Column(name = "confidence_level")
    @Builder.Default
    private Integer confidenceLevel = 50; // 0-100

    @Column(name = "last_updated_notes", columnDefinition = "TEXT")
    private String lastUpdatedNotes;

    public enum MeasurementType {
        PERCENTAGE,      // 0-100%
        NUMBER,          // Count of something
        CURRENCY,        // Money value
        BINARY,          // Yes/No (complete or not)
        MILESTONE        // Progress through steps
    }

    public enum KeyResultStatus {
        NOT_STARTED,
        IN_PROGRESS,
        ON_TRACK,
        AT_RISK,
        COMPLETED,
        CANCELLED
    }

    public void updateProgress() {
        if (targetValue == null || targetValue.compareTo(BigDecimal.ZERO) == 0) {
            this.progressPercentage = BigDecimal.ZERO;
            return;
        }

        if (measurementType == MeasurementType.BINARY) {
            this.progressPercentage = currentValue.compareTo(BigDecimal.ONE) >= 0
                    ? BigDecimal.valueOf(100)
                    : BigDecimal.ZERO;
        } else {
            BigDecimal progress = currentValue.subtract(startValue)
                    .divide(targetValue.subtract(startValue), 4, java.math.RoundingMode.HALF_UP)
                    .multiply(BigDecimal.valueOf(100));
            this.progressPercentage = progress.max(BigDecimal.ZERO).min(BigDecimal.valueOf(100));
        }

        updateStatus();
    }

    private void updateStatus() {
        if (this.status == KeyResultStatus.CANCELLED) {
            return;
        }

        if (this.progressPercentage.compareTo(BigDecimal.valueOf(100)) >= 0) {
            this.status = KeyResultStatus.COMPLETED;
        } else if (this.progressPercentage.compareTo(BigDecimal.valueOf(70)) >= 0) {
            this.status = KeyResultStatus.ON_TRACK;
        } else if (this.progressPercentage.compareTo(BigDecimal.valueOf(30)) >= 0) {
            this.status = KeyResultStatus.IN_PROGRESS;
        } else if (this.progressPercentage.compareTo(BigDecimal.ZERO) > 0) {
            this.status = KeyResultStatus.AT_RISK;
        } else {
            this.status = KeyResultStatus.NOT_STARTED;
        }
    }

    public void setValue(BigDecimal newValue, String notes) {
        this.currentValue = newValue;
        this.lastUpdatedNotes = notes;
        updateProgress();
    }
}
