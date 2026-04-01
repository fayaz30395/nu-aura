package com.hrms.domain.onboarding;

import com.hrms.common.entity.TenantAware;
import jakarta.persistence.*;
import org.hibernate.annotations.Where;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.util.UUID;

@Where(clause = "is_deleted = false")
@Entity
@Table(name = "onboarding_template_tasks")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class OnboardingTemplateTask extends TenantAware {

    @Column(name = "template_id", nullable = false)
    private UUID templateId;

    @Column(name = "task_name", nullable = false)
    private String taskName;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "category")
    private OnboardingTask.TaskCategory category;

    @Column(name = "is_mandatory")
    @Builder.Default
    private Boolean isMandatory = true;

    @Column(name = "order_sequence")
    private Integer orderSequence;

    @Enumerated(EnumType.STRING)
    @Column(name = "priority")
    @Builder.Default
    private OnboardingTask.TaskPriority priority = OnboardingTask.TaskPriority.MEDIUM;

    @Column(name = "estimated_days_from_start")
    private Integer estimatedDaysFromStart;
}
