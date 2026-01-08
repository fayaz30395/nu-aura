package com.hrms.api.onboarding.dto;

import com.hrms.domain.onboarding.OnboardingTask;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OnboardingTaskResponse {
    private UUID id;
    private UUID processId;
    private UUID employeeId;
    private String taskName;
    private String description;
    private OnboardingTask.TaskCategory category;
    private UUID assignedTo;
    private String assignedToName;
    private LocalDate dueDate;
    private LocalDate completedDate;
    private OnboardingTask.TaskStatus status;
    private OnboardingTask.TaskPriority priority;
    private Boolean isMandatory;
    private Integer orderSequence;
    private String remarks;
}
