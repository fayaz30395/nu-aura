package com.hrms.api.onboarding.dto;

import com.hrms.domain.onboarding.OnboardingTask;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OnboardingTemplateTaskRequest {
    @NotBlank
    private String taskName;
    private String description;
    private OnboardingTask.TaskCategory category;
    private Boolean isMandatory;
    private Integer orderSequence;
    private OnboardingTask.TaskPriority priority;
    private Integer estimatedDaysFromStart;
}
