package com.hrms.domain.analytics;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "analytics_metrics")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AnalyticsMetric {
    @Id
    private UUID id;

    @Column(name = "tenant_id", nullable = false)
    private UUID tenantId;

    @Column(name = "metric_name", nullable = false, length = 100)
    private String metricName;

    @Column(name = "metric_category", nullable = false, length = 50)
    @Enumerated(EnumType.STRING)
    private MetricCategory metricCategory;

    @Column(name = "metric_date", nullable = false)
    private LocalDate metricDate;

    @Column(name = "metric_value", nullable = false, precision = 15, scale = 2)
    private BigDecimal metricValue;

    @Column(name = "dimension1") // e.g., Department, Location
    private String dimension1;

    @Column(name = "dimension2")
    private String dimension2;

    @Column(name = "dimension3")
    private String dimension3;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public enum MetricCategory {
        HEADCOUNT,
        ATTRITION,
        RECRUITMENT,
        ATTENDANCE,
        LEAVE,
        PERFORMANCE,
        TRAINING,
        ENGAGEMENT,
        COST,
        PRODUCTIVITY
    }
}
