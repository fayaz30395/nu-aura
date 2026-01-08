package com.hrms.api.onboarding.dto;

import com.hrms.domain.onboarding.OnboardingChecklistTemplate;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OnboardingChecklistTemplateRequest {
    @NotBlank
    private String name;
    private String description;
    private OnboardingChecklistTemplate.ApplicableFor applicableFor;
    private UUID departmentId;
    private String jobLevel;
    private Boolean isActive;
    private Boolean isDefault;
    private Integer estimatedDays;
}
