package com.hrms.domain.analytics;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "report_executions")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReportExecution {
    @Id
    private UUID id;

    @Column(name = "tenant_id", nullable = false)
    private UUID tenantId;

    @Column(name = "report_definition_id", nullable = false)
    private UUID reportDefinitionId;

    @Column(name = "scheduled_report_id")
    private UUID scheduledReportId; // Null for ad-hoc reports

    @Column(name = "executed_by")
    private UUID executedBy;

    @Column(name = "execution_type", nullable = false, length = 20)
    @Enumerated(EnumType.STRING)
    private ExecutionType executionType;

    @Column(name = "parameters", columnDefinition = "TEXT")
    private String parameters;

    @Column(name = "status", nullable = false, length = 20)
    @Enumerated(EnumType.STRING)
    private ExecutionStatus status;

    @Column(name = "file_path")
    private String filePath; // Path to generated report file

    @Column(name = "file_size")
    private Long fileSize; // In bytes

    @Column(name = "row_count")
    private Integer rowCount;

    @Column(name = "execution_time_ms")
    private Long executionTimeMs;

    @Column(name = "error_message", columnDefinition = "TEXT")
    private String errorMessage;

    @CreationTimestamp
    @Column(name = "started_at", nullable = false, updatable = false)
    private LocalDateTime startedAt;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    public enum ExecutionType {
        AD_HOC,
        SCHEDULED,
        API
    }

    public enum ExecutionStatus {
        RUNNING,
        COMPLETED,
        FAILED,
        CANCELLED
    }
}
