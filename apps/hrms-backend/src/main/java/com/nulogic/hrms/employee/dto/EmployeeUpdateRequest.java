package com.nulogic.hrms.employee.dto;

import jakarta.validation.constraints.NotBlank;
import java.time.LocalDate;
import java.util.UUID;
import lombok.Data;

@Data
public class EmployeeUpdateRequest {
    @NotBlank(message = "First name is required")
    private String firstName;

    @NotBlank(message = "Last name is required")
    private String lastName;

    private String phone;

    private UUID managerId;

    private UUID departmentId;

    private UUID designationId;

    private UUID locationId;

    private LocalDate joinDate;
}
