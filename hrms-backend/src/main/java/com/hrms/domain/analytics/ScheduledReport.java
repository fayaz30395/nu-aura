package com.hrms.domain.analytics;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.UUID;

@Entity
@Table(name = "scheduled_reports")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ScheduledReport {
    @Id
    private UUID id;

    @Column(name = "tenant_id", nullable = false)
    private UUID tenantId;

    @Column(name = "report_definition_id", nullable = false)
    private UUID reportDefinitionId;

    @Column(name = "schedule_name", nullable = false, length = 200)
    private String scheduleName;

    @Column(name = "frequency", nullable = false, length = 20)
    @Enumerated(EnumType.STRING)
    private Frequency frequency;

    @Column(name = "day_of_week") // For WEEKLY
    private Integer dayOfWeek; // 1-7 (Monday-Sunday)

    @Column(name = "day_of_month") // For MONTHLY
    private Integer dayOfMonth; // 1-31

    @Column(name = "time_of_day")
    private LocalTime timeOfDay;

    @Column(name = "recipients", columnDefinition = "TEXT")
    private String recipients; // JSON array of email addresses

    @Column(name = "parameters", columnDefinition = "TEXT")
    private String parameters; // Report parameters in JSON

    @Column(name = "is_active", nullable = false)
    private Boolean isActive;

    @Column(name = "last_run_at")
    private LocalDateTime lastRunAt;

    @Column(name = "next_run_at")
    private LocalDateTime nextRunAt;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "created_by")
    private UUID createdBy;

    @Column(name = "updated_by")
    private UUID updatedBy;

    public enum Frequency {
        DAILY,
        WEEKLY,
        MONTHLY,
        QUARTERLY,
        YEARLY
    }
}
