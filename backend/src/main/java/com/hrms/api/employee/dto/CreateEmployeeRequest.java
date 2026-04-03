package com.hrms.api.employee.dto;

import com.hrms.domain.employee.Employee;
import jakarta.validation.constraints.*;
import lombok.Data;

import java.time.LocalDate;
import java.util.UUID;

/**
 * DTO for creating a new employee.
 * Includes comprehensive validation for all required fields.
 */
@Data
public class CreateEmployeeRequest {

    @NotBlank(message = "Employee code is required")
    @Size(min = 2, max = 50, message = "Employee code must be between 2 and 50 characters")
    @Pattern(regexp = "^[A-Za-z0-9_-]+$", message = "Employee code can only contain letters, numbers, underscore and hyphen")
    private String employeeCode;

    @NotBlank(message = "First name is required")
    @Size(min = 1, max = 100, message = "First name must be between 1 and 100 characters")
    private String firstName;

    @Size(max = 100, message = "Middle name cannot exceed 100 characters")
    private String middleName;

    @Size(max = 100, message = "Last name cannot exceed 100 characters")
    private String lastName;

    @NotBlank(message = "Email is required")
    @Email(message = "Email should be valid")
    @Size(max = 255, message = "Email cannot exceed 255 characters")
    private String workEmail;

    @Email(message = "Personal email should be valid")
    @Size(max = 255, message = "Personal email cannot exceed 255 characters")
    private String personalEmail;

    @Pattern(regexp = "^[+]?[0-9\\s-]{7,20}$", message = "Phone number format is invalid")
    private String phoneNumber;

    @Pattern(regexp = "^[+]?[0-9\\s-]{7,20}$", message = "Emergency contact number format is invalid")
    private String emergencyContactNumber;

    @Past(message = "Date of birth must be in the past")
    private LocalDate dateOfBirth;

    private Employee.Gender gender;

    @Size(max = 500, message = "Address cannot exceed 500 characters")
    private String address;

    private String city;

    private String state;

    private String postalCode;

    private String country;

    @NotNull(message = "Joining date is required")
    @PastOrPresent(message = "Joining date cannot be in the future")
    private LocalDate joiningDate;

    @FutureOrPresent(message = "Confirmation date must be in the present or future")
    private LocalDate confirmationDate;

    private UUID departmentId;

    @NotBlank(message = "Designation is required")
    private String designation;

    private UUID managerId;

    private UUID dottedLineManager1Id;

    private UUID dottedLineManager2Id;

    private Boolean selfManaged;

    private Employee.EmployeeLevel level;

    private Employee.JobRole jobRole;

    @NotNull(message = "Employment type is required")
    private Employee.EmploymentType employmentType;

    @Size(max = 30, message = "Bank account number must not exceed 30 characters")
    @Pattern(regexp = "^[A-Za-z0-9]*$", message = "Bank account number must be alphanumeric")
    private String bankAccountNumber;

    @Size(max = 100, message = "Bank name must not exceed 100 characters")
    private String bankName;

    @Size(max = 11, message = "IFSC code must not exceed 11 characters")
    @Pattern(regexp = "^[A-Z]{4}0[A-Z0-9]{6}$", message = "IFSC code format is invalid (expected: XXXX0XXXXXX)")
    private String bankIfscCode;

    @Size(max = 20, message = "Tax ID must not exceed 20 characters")
    @Pattern(regexp = "^[A-Z]{5}[0-9]{4}[A-Z]{1}$", message = "Tax ID (PAN) must be in the format AAAAA9999A")
    private String taxId;

    @NotBlank(message = "Password is required")
    private String password;
}
