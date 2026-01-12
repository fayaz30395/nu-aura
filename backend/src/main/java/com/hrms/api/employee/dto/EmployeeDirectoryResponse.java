package com.hrms.api.employee.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EmployeeDirectoryResponse {

    private UUID id;
    private String employeeCode;
    private String fullName;
    private String personalEmail;
    private String workEmail;
    private String phoneNumber;

    // Department info
    private UUID departmentId;
    private String departmentName;

    // Job info
    private String designation;
    private String jobRole;
    private String level;
    private String employmentType;

    // Manager info
    private UUID managerId;
    private String managerName;

    // Employment dates
    private LocalDate joiningDate;
    private LocalDate exitDate;

    // Status
    private String status;

    // Profile
    private String profileImageUrl;
}
