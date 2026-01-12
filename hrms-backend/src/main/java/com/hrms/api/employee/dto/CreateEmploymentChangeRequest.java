package com.hrms.api.employee.dto;

import com.hrms.domain.employee.Employee;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.UUID;

/**
 * Request DTO for creating an employment change request.
 * At least one of the "new" fields must be different from current values.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateEmploymentChangeRequest {

    @NotNull(message = "Employee ID is required")
    private UUID employeeId;

    // New values (only include fields that are being changed)
    private String newDesignation;
    private Employee.EmployeeLevel newLevel;
    private Employee.JobRole newJobRole;
    private UUID newDepartmentId;
    private UUID newManagerId;
    private Employee.EmploymentType newEmploymentType;
    private LocalDate newConfirmationDate;
    private Employee.EmployeeStatus newEmployeeStatus;

    // Metadata
    private String reason;
    private LocalDate effectiveDate;
}
