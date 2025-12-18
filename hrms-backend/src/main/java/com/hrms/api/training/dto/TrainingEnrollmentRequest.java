package com.hrms.api.training.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;
import java.util.UUID;

@Data
public class TrainingEnrollmentRequest {

    @NotNull(message = "Program ID is required")
    private UUID programId;

    @NotNull(message = "Employee ID is required")
    private UUID employeeId;

    private LocalDate enrollmentDate;

    private String notes;
}
