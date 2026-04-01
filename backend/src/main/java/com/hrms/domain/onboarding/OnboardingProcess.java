package com.hrms.domain.onboarding;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "onboarding_processes")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class OnboardingProcess {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    @Column(name = "tenant_id", nullable = false)
    private UUID tenantId;
    @Column(name = "employee_id", nullable = false)
    private UUID employeeId;
    @Enumerated(EnumType.STRING)
    @Column(name = "process_type", length = 20)
    private ProcessType processType;
    @Column(name = "start_date")
    private LocalDate startDate;
    @Column(name = "expected_completion_date")
    private LocalDate expectedCompletionDate;
    @Column(name = "actual_completion_date")
    private LocalDate actualCompletionDate;
    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 20)
    private ProcessStatus status = ProcessStatus.NOT_STARTED;
    @Column(name = "assigned_buddy_id")
    private UUID assignedBuddyId;
    @Builder.Default
    @Column(name = "completion_percentage")
    private Integer completionPercentage = 0;
    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;
    @CreationTimestamp
    @Column(name = "created_at")
    private LocalDateTime createdAt;
    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
    @Version
    private Long version;

    public enum ProcessType {
        ONBOARDING, OFFBOARDING
    }

    public enum ProcessStatus {
        NOT_STARTED, IN_PROGRESS, COMPLETED, CANCELLED
    }
}
