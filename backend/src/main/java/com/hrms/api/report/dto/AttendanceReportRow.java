package com.hrms.api.report.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AttendanceReportRow {
    private UUID employeeId;
    private String employeeCode;
    private String employeeName;
    private String department;
    private LocalDate date;
    private String status; // PRESENT, ABSENT, LATE, HALF_DAY, etc.
    private LocalTime checkInTime;
    private LocalTime checkOutTime;
    private Double hoursWorked;
    private String shift;
    private String remarks;
}
