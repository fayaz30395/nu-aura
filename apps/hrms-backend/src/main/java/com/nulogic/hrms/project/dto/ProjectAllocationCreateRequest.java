package com.nulogic.hrms.project.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;
import lombok.Data;

@Data
public class ProjectAllocationCreateRequest {
    @NotNull(message = "Employee is required")
    private UUID employeeId;

    @NotNull(message = "Start date is required")
    private LocalDate startDate;

    @NotNull(message = "End date is required")
    private LocalDate endDate;

    @NotNull(message = "Allocation percent is required")
    @DecimalMin(value = "0.01", message = "Allocation percent must be greater than 0")
    @DecimalMax(value = "100.00", message = "Allocation percent must be 100 or less")
    private BigDecimal allocationPercent;
}
