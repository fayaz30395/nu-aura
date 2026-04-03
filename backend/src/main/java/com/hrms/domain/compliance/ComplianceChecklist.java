package com.hrms.domain.compliance;

import com.hrms.common.entity.TenantAware;
import jakarta.persistence.*;
import org.hibernate.annotations.Where;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.time.LocalDate;
import java.util.UUID;

@Where(clause = "is_deleted = false")
@Entity
@Table(name = "compliance_checklists")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class ComplianceChecklist extends TenantAware {


    @Column(nullable = false)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ChecklistCategory category;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private ChecklistFrequency frequency = ChecklistFrequency.ANNUAL;

    private LocalDate nextDueDate;
    private LocalDate lastCompletedDate;

    @Builder.Default
    private Integer totalItems = 0;

    @Builder.Default
    private Integer completedItems = 0;

    private UUID assignedTo;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private ChecklistStatus status = ChecklistStatus.NOT_STARTED;

    @Builder.Default
    private Boolean isActive = true;

    public double getCompletionPercentage() {
        if (totalItems == 0) return 0;
        return (completedItems * 100.0) / totalItems;
    }

    public void markItemCompleted() {
        if (completedItems < totalItems) {
            completedItems++;
            if (completedItems.equals(totalItems)) {
                status = ChecklistStatus.COMPLETED;
                lastCompletedDate = LocalDate.now();
            } else {
                status = ChecklistStatus.IN_PROGRESS;
            }
        }
    }

    public enum ChecklistCategory {
        ONBOARDING,
        OFFBOARDING,
        QUARTERLY_REVIEW,
        ANNUAL_AUDIT,
        SAFETY,
        DATA_PRIVACY,
        TRAINING,
        DOCUMENTATION,
        REGULATORY,
        CUSTOM
    }

    public enum ChecklistFrequency {
        ONE_TIME,
        WEEKLY,
        MONTHLY,
        QUARTERLY,
        SEMI_ANNUAL,
        ANNUAL
    }

    public enum ChecklistStatus {
        NOT_STARTED,
        IN_PROGRESS,
        COMPLETED,
        OVERDUE,
        CANCELLED
    }
}
