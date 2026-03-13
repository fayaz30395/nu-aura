package com.hrms.domain.onboarding;

import com.hrms.common.entity.TenantAware;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.util.UUID;

@Entity
@Table(name = "onboarding_checklist_templates")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class OnboardingChecklistTemplate extends TenantAware {


    @Column(name = "name", nullable = false)
    private String name;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "applicable_for")
    private ApplicableFor applicableFor;

    @Column(name = "department_id")
    private UUID departmentId;

    @Column(name = "job_level")
    private String jobLevel;

    @Column(name = "is_active")
    @Builder.Default
    private Boolean isActive = true;

    @Column(name = "is_default")
    @Builder.Default
    private Boolean isDefault = false;

    @Column(name = "estimated_days")
    private Integer estimatedDays;

    public enum ApplicableFor {
        ALL,
        DEPARTMENT_SPECIFIC,
        ROLE_SPECIFIC,
        LEVEL_SPECIFIC
    }
}
