package com.hrms.api.onboarding.dto;

import com.hrms.domain.onboarding.OnboardingTask;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OnboardingTemplateTaskResponse {
    private UUID id;
    private UUID templateId;
    private String taskName;
    private String description;
    private OnboardingTask.TaskCategory category;
    private Boolean isMandatory;
    private Integer orderSequence;
    private OnboardingTask.TaskPriority priority;
    private Integer estimatedDaysFromStart;
}
