package com.nulogic.api.employee.dto;

import com.nulogic.domain.employee.Employee;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.PastOrPresent;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.time.LocalDate;

/**
 * DTO for self-service updates to an employee's own profile.
 *
 * <p>SECURITY: This DTO must only contain fields that an employee is allowed
 * to modify on their own record. Admin-only fields (department, manager,
 * status, level, compensation, bank, tax ID, employee code) are intentionally
 * NOT exposed here — they live on {@link AdminEmployeeUpdateRequest} and are
 * mutated through a separate, permission-gated endpoint.
 *
 * <p>All fields remain optional (PATCH semantics) — only supplied fields are
 * applied. Validation annotations enforce format and length constraints on
 * PII fields (SEC-B09).
 */
@Data
public class UpdateEmployeeRequest {

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
}
