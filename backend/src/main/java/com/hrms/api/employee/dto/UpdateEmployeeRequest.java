package com.hrms.api.employee.dto;

import com.hrms.domain.employee.Employee;
import jakarta.validation.constraints.Email;
import lombok.Data;

import java.time.LocalDate;
import java.util.UUID;

@Data
public class UpdateEmployeeRequest {

    private String employeeCode;

    private String firstName;

    private String middleName;

    private String lastName;

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

    private LocalDate confirmationDate;

    private UUID departmentId;

    private String designation;

    private Employee.EmployeeLevel level;

    private Employee.JobRole jobRole;

    private UUID managerId;

    private Employee.EmploymentType employmentType;

    private Employee.EmployeeStatus status;

    private String bankAccountNumber;

    private String bankName;

    private String bankIfscCode;

    private String taxId;
}
