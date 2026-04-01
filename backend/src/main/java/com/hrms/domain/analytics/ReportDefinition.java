package com.hrms.domain.analytics;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "report_definitions")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReportDefinition {
    @Id
    private UUID id;

    @Column(name = "tenant_id", nullable = false)
    private UUID tenantId;

    @Column(name = "report_code", nullable = false, length = 50, unique = true)
    private String reportCode;

    @Column(name = "report_name", nullable = false, length = 200)
    private String reportName;

    @Column(name = "category", nullable = false, length = 50)
    @Enumerated(EnumType.STRING)
    private ReportCategory category;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "query_template", columnDefinition = "TEXT")
    private String queryTemplate; // SQL or query DSL

    @Column(name = "parameters", columnDefinition = "TEXT")
    private String parameters; // JSON format for dynamic parameters

    @Column(name = "output_format", length = 20)
    @Enumerated(EnumType.STRING)
    private OutputFormat outputFormat;

    @Column(name = "is_system_report")
    private Boolean isSystemReport; // System vs custom reports

    @Column(name = "is_active", nullable = false)
    private Boolean isActive;

    @Column(name = "access_level", length = 30)
    @Enumerated(EnumType.STRING)
    private AccessLevel accessLevel;

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

    public enum ReportCategory {
        HEADCOUNT,
        ATTENDANCE,
        LEAVE,
        PAYROLL,
        PERFORMANCE,
        RECRUITMENT,
        TRAINING,
        TURNOVER,
        COMPLIANCE,
        CUSTOM
    }

    public enum OutputFormat {
        PDF,
        EXCEL,
        CSV,
        JSON,
        HTML
    }

    public enum AccessLevel {
        ADMIN_ONLY,
        MANAGER,
        HR,
        EMPLOYEE,
        PUBLIC
    }
}
