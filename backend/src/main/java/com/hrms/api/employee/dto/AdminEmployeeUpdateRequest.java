package com.hrms.api.employee.dto;

import com.hrms.domain.employee.Employee;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.UUID;

/**
 * DTO for admin-only updates to an employee record.
 *
 * <p>Split from {@link UpdateEmployeeRequest} so that the self-service PUT endpoint
 * cannot be used to escalate role/manager/compensation fields (privilege escalation
 * via mass-assignment). Only fields that require HR / admin authority belong here.
 * Personal contact fields stay on {@link UpdateEmployeeRequest}.
 *
 * <p>All fields remain optional (PATCH semantics) — only supplied fields are applied.
 * Validation annotations mirror the originals from {@link UpdateEmployeeRequest}.
 */
@Data
public class AdminEmployeeUpdateRequest {

    @Size(max = 20, message = "Employee code must not exceed 20 characters")
    @Pattern(regexp = "^[A-Za-z0-9\\-_]*$", message = "Employee code must be alphanumeric (hyphens and underscores allowed)")
    private String employeeCode;

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
