package com.hrms.api.employee.dto;

import com.hrms.domain.employee.Employee;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EmployeeResponse {

    private UUID id;
    private String employeeCode;
    private String firstName;
    private String middleName;
    private String lastName;
    private String fullName;
    private String workEmail;
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
    private LocalDate joiningDate;
    private LocalDate confirmationDate;
    private LocalDate exitDate;
    private UUID departmentId;
    private String designation;
    private UUID managerId;
    private String managerName;
    private Employee.EmploymentType employmentType;
    private Employee.EmployeeStatus status;
    private String bankAccountNumber;
    private String bankName;
    private String bankIfscCode;
    private String taxId;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private List<EmployeeResponse> subordinates;

    public static EmployeeResponse fromEmployee(Employee employee) {
        return EmployeeResponse.builder()
                .id(employee.getId())
                .employeeCode(employee.getEmployeeCode())
                .firstName(employee.getFirstName())
                .middleName(employee.getMiddleName())
                .lastName(employee.getLastName())
                .fullName(employee.getFullName())
                .workEmail(employee.getUser() != null ? employee.getUser().getEmail() : null)
                .personalEmail(employee.getPersonalEmail())
                .phoneNumber(employee.getPhoneNumber())
                .emergencyContactNumber(employee.getEmergencyContactNumber())
                .dateOfBirth(employee.getDateOfBirth())
                .gender(employee.getGender())
                .address(employee.getAddress())
                .city(employee.getCity())
                .state(employee.getState())
                .postalCode(employee.getPostalCode())
                .country(employee.getCountry())
                .joiningDate(employee.getJoiningDate())
                .confirmationDate(employee.getConfirmationDate())
                .exitDate(employee.getExitDate())
                .departmentId(employee.getDepartmentId())
                .designation(employee.getDesignation())
                .managerId(employee.getManagerId())
                .employmentType(employee.getEmploymentType())
                .status(employee.getStatus())
                .bankAccountNumber(employee.getBankAccountNumber())
                .bankName(employee.getBankName())
                .bankIfscCode(employee.getBankIfscCode())
                .taxId(employee.getTaxId())
                .createdAt(employee.getCreatedAt())
                .updatedAt(employee.getUpdatedAt())
                .build();
    }
}
