package com.hrms.api.onboarding.dto;

import com.hrms.domain.onboarding.OnboardingProcess;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;
import java.util.UUID;

@Data
public class OnboardingProcessRequest {

    @NotNull(message = "Employee ID is required")
    private UUID employeeId;

    @NotNull(message = "Process type is required")
    private OnboardingProcess.ProcessType processType;

    private LocalDate startDate;

    private LocalDate expectedCompletionDate;

    private UUID assignedBuddyId;

    private String notes;
}
