package com.nulogic.api.employee.dto;

import com.nulogic.domain.employee.Employee;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.List;
import java.util.UUID;

/**
 * Request to change the status of multiple employees in one call
 * (bulk activate/deactivate/terminate from the employee directory).
 */
@Data
public class BatchStatusChangeRequest {

    @NotEmpty(message = "employeeIds must not be empty")
    @Size(max = 200, message = "Cannot update more than 200 employees in a single batch")
    private List<UUID> employeeIds;

    @NotNull(message = "status is required")
    private Employee.EmployeeStatus status;
}
