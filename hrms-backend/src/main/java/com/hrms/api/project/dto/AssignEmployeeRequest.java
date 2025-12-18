package com.hrms.api.project.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;
import java.util.UUID;

@Data
public class AssignEmployeeRequest {

    @NotNull(message = "Employee ID is required")
    private UUID employeeId;

    private String role;

    @Min(value = 1, message = "Allocation percentage must be at least 1")
    @Max(value = 100, message = "Allocation percentage cannot exceed 100")
    private Integer allocationPercentage;

    @NotNull(message = "Start date is required")
    private LocalDate startDate;

    private LocalDate endDate;
}
