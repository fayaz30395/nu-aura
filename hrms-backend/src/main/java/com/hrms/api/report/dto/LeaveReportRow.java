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
public class LeaveReportRow {
    private UUID employeeId;
    private String employeeCode;
    private String employeeName;
    private String department;
    private String leaveType;
    private LocalDate startDate;
    private LocalDate endDate;
    private Double days;
    private String status; // PENDING, APPROVED, REJECTED
    private String reason;
    private String approvedBy;
    private LocalDate approvedOn;
}
