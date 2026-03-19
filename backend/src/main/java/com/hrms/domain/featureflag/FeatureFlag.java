package com.hrms.domain.featureflag;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Feature Flag entity for tenant-level feature toggles.
 *
 * Playbook Reference: Prompt 34 - Feature flags (tenant-level)
 */
@Entity
@Table(name = "feature_flags", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"tenant_id", "feature_key"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FeatureFlag {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "tenant_id", nullable = false)
    private UUID tenantId;

    @Column(name = "feature_key", nullable = false, length = 100)
    private String featureKey;

    @Column(name = "feature_name", nullable = false, length = 200)
    private String featureName;

    @Column(name = "description", length = 500)
    private String description;

    @Column(name = "enabled", nullable = false)
    @Builder.Default
    private boolean enabled = false;

    @Column(name = "percentage_rollout")
    private Integer percentageRollout; // 0-100 for gradual rollout

    @Column(name = "metadata", columnDefinition = "TEXT")
    private String metadata; // JSON string for additional config

    @Column(name = "category", length = 50)
    private String category; // e.g., "HRMS", "PROJECTS", "INTEGRATION"

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

    // Common feature flag keys as constants
    public static final String ENABLE_PROJECTS = "enable_projects";
    public static final String ENABLE_TIMESHEETS = "enable_timesheets";
    public static final String ENABLE_DOCUMENTS = "enable_documents";
    public static final String ENABLE_GOOGLE_DRIVE = "enable_google_drive";
    public static final String ENABLE_AI_RECRUITMENT = "enable_ai_recruitment";
    public static final String ENABLE_WELLNESS = "enable_wellness";
    public static final String ENABLE_LMS = "enable_lms";
    public static final String ENABLE_PAYROLL = "enable_payroll";
    public static final String ENABLE_PERFORMANCE = "enable_performance";
    public static final String ENABLE_HELPDESK = "enable_helpdesk";
    public static final String ENABLE_PAYMENTS = "enable_payments";
}
