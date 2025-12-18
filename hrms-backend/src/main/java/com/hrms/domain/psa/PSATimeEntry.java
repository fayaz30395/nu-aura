package com.hrms.domain.psa;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "psa_time_entries")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PSATimeEntry {
    @Id
    private UUID id;

    @Column(name = "tenant_id", nullable = false)
    private UUID tenantId;

    @Column(name = "timesheet_id", nullable = false)
    private UUID timesheetId;

    @Column(name = "employee_id", nullable = false)
    private UUID employeeId;

    @Column(name = "project_id", nullable = false)
    private UUID projectId;

    @Column(name = "task_id")
    private UUID taskId; // Optional: specific task within project

    @Column(name = "entry_date", nullable = false)
    private LocalDate entryDate;

    @Column(name = "hours", nullable = false)
    private Double hours;

    @Column(name = "is_billable", nullable = false)
    private Boolean isBillable;

    @Column(name = "work_description", columnDefinition = "TEXT")
    private String workDescription;

    @Column(name = "activity_type", length = 50)
    @Enumerated(EnumType.STRING)
    private ActivityType activityType;

    @Column(name = "is_overtime")
    private Boolean isOvertime;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public enum ActivityType {
        DEVELOPMENT,
        TESTING,
        DESIGN,
        DOCUMENTATION,
        MEETING,
        CODE_REVIEW,
        PLANNING,
        SUPPORT,
        RESEARCH,
        OTHER
    }
}
