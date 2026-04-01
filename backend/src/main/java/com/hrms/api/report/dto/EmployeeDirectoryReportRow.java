package com.hrms.api.report.dto;

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
public class EmployeeDirectoryReportRow {
    private UUID employeeId;
    private String employeeCode;
    private String fullName;
    private String email;
    private String phoneNumber;
    private String department;
    private String designation;
    private String jobRole;
    private String level;
    private String employmentType;
    private LocalDate joiningDate;
    private String status;
    private String workLocation;
    private String reportingManager;
}
