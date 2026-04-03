package com.hrms.api.employee.dto;

import com.hrms.domain.employee.Employee;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.PastOrPresent;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.time.LocalDate;
import java.util.UUID;

/**
 * DTO for updating employee data.
 *
 * <p>All fields are optional (PATCH semantics) — only supplied fields are updated.
 * Validation annotations enforce format and length constraints on PII fields (SEC-B09).
 */
@Data
public class UpdateEmployeeRequest {

    @Size(max = 20, message = "Employee code must not exceed 20 characters")
    @Pattern(regexp = "^[A-Za-z0-9\\-_]*$", message = "Employee code must be alphanumeric (hyphens and underscores allowed)")
    private String employeeCode;

    @Size(min = 1, max = 50, message = "First name must be between 1 and 50 characters")
    private String firstName;

    @Size(max = 50, message = "Middle name must not exceed 50 characters")
    private String middleName;

    @Size(max = 50, message = "Last name must not exceed 50 characters")
    private String lastName;

    @Email(message = "Personal email should be valid")
    private String personalEmail;

    @Size(max = 20, message = "Phone number must not exceed 20 characters")
    @Pattern(regexp = "^[+]?[0-9\\-\\s()]*$", message = "Phone number format is invalid")
    private String phoneNumber;

    @Size(max = 20, message = "Emergency contact number must not exceed 20 characters")
    @Pattern(regexp = "^[+]?[0-9\\-\\s()]*$", message = "Emergency contact number format is invalid")
    private String emergencyContactNumber;

    @PastOrPresent(message = "Date of birth cannot be in the future")
    private LocalDate dateOfBirth;

    private Employee.Gender gender;

    @Size(max = 200, message = "Address must not exceed 200 characters")
    private String address;

    @Size(max = 50, message = "City must not exceed 50 characters")
    private String city;

    @Size(max = 50, message = "State must not exceed 50 characters")
    private String state;

    @Size(max = 20, message = "Postal code must not exceed 20 characters")
    @Pattern(regexp = "^[A-Za-z0-9\\-\\s]*$", message = "Postal code format is invalid")
    private String postalCode;

    @Size(max = 100, message = "Country must not exceed 100 characters")
    private String country;

    @PastOrPresent(message = "Confirmation date cannot be in the future")
    private LocalDate confirmationDate;

    private UUID departmentId;

    @Size(max = 100, message = "Designation must not exceed 100 characters")
    private String designation;

    private Employee.EmployeeLevel level;

    private Employee.JobRole jobRole;

    private UUID managerId;

    private UUID dottedLineManager1Id;

    private UUID dottedLineManager2Id;

    private Employee.EmploymentType employmentType;

    private Employee.EmployeeStatus status;

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
}
