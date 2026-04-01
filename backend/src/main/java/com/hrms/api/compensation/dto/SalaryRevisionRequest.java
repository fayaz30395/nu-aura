package com.hrms.api.compensation.dto;

import com.hrms.domain.compensation.SalaryRevision.RevisionType;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SalaryRevisionRequest {

    @NotNull(message = "Employee ID is required")
    private UUID employeeId;

    private UUID reviewCycleId;

    @NotNull(message = "Revision type is required")
    private RevisionType revisionType;

    @NotNull(message = "New salary is required")
    @DecimalMin(value = "0.01", message = "Salary must be positive")
    private BigDecimal newSalary;

    private String newDesignation;

    private String newLevel;

    @NotNull(message = "Effective date is required")
    private LocalDate effectiveDate;

    private String justification;

    private Double performanceRating;
}
