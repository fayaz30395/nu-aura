package com.hrms.api.employee.dto;

import com.hrms.domain.employee.Employee;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;
import java.util.UUID;

@Data
public class CreateEmployeeRequest {

    @NotBlank(message = "Employee code is required")
    private String employeeCode;

    @NotBlank(message = "First name is required")
    private String firstName;

    private String middleName;

    private String lastName;

    @NotBlank(message = "Email is required")
    @Email(message = "Email should be valid")
    private String workEmail;

    @Email(message = "Personal email should be valid")
    private String personalEmail;

    private String phoneNumber;

    private String emergencyContactNumber;

    private LocalDate dateOfBirth;

    private Employee.Gender gender;

    private String address;

    private String city;

    private String state;

    private String postalCode;

    private String country;

    @NotNull(message = "Joining date is required")
    private LocalDate joiningDate;

    private LocalDate confirmationDate;

    private UUID departmentId;

    @NotBlank(message = "Designation is required")
    private String designation;

    private UUID managerId;

    private UUID dottedLineManager1Id;

    private UUID dottedLineManager2Id;

    private Boolean selfManaged;

    @NotNull(message = "Employment type is required")
    private Employee.EmploymentType employmentType;

    private String bankAccountNumber;

    private String bankName;

    private String bankIfscCode;

    private String taxId;

    @NotBlank(message = "Password is required")
    private String password;
}
