package com.hrms.domain.analytics;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "dashboard_widgets")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DashboardWidget {
    @Id
    private UUID id;

    @Column(name = "tenant_id", nullable = false)
    private UUID tenantId;

    @Column(name = "dashboard_id", nullable = false)
    private UUID dashboardId;

    @Column(name = "widget_name", nullable = false, length = 200)
    private String widgetName;

    @Column(name = "widget_type", nullable = false, length = 30)
    @Enumerated(EnumType.STRING)
    private WidgetType widgetType;

    @Column(name = "data_source", columnDefinition = "TEXT")
    private String dataSource; // Query or API endpoint

    @Column(name = "configuration", columnDefinition = "TEXT")
    private String configuration; // Widget-specific config in JSON

    @Column(name = "position_x")
    private Integer positionX;

    @Column(name = "position_y")
    private Integer positionY;

    @Column(name = "width")
    private Integer width;

    @Column(name = "height")
    private Integer height;

    @Column(name = "refresh_interval")
    private Integer refreshInterval; // In seconds

    @Column(name = "is_visible", nullable = false)
    private Boolean isVisible;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public enum WidgetType {
        LINE_CHART,
        BAR_CHART,
        PIE_CHART,
        TABLE,
        KPI_CARD,
        GAUGE,
        HEATMAP,
        FUNNEL,
        TIMELINE,
        CUSTOM
    }
}
