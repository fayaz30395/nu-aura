package com.hrms.api.onboarding.dto;

import com.hrms.domain.onboarding.OnboardingProcess;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
public class OnboardingProcessResponse {

    private UUID id;
    private UUID tenantId;
    private UUID employeeId;
    private String employeeName;
    private OnboardingProcess.ProcessType processType;
    private LocalDate startDate;
    private LocalDate expectedCompletionDate;
    private LocalDate actualCompletionDate;
    private OnboardingProcess.ProcessStatus status;
    private UUID assignedBuddyId;
    private String assignedBuddyName;
    private Integer completionPercentage;
    private String notes;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
