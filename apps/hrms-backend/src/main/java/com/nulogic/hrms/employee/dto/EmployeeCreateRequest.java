package com.nulogic.hrms.employee.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
import java.util.UUID;
import lombok.Data;

@Data
public class EmployeeCreateRequest {
    @NotBlank(message = "Employee code is required")
    private String employeeCode;

    @Email
    @NotBlank(message = "Official email is required")
    private String officialEmail;

    @NotBlank(message = "First name is required")
    private String firstName;

    @NotBlank(message = "Last name is required")
    private String lastName;

    private String phone;

    private UUID managerId;

    private UUID departmentId;

    private UUID designationId;

    private UUID locationId;

    @NotNull(message = "Join date is required")
    private LocalDate joinDate;
}
