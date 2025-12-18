package com.hrms.application.analytics.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

/**
 * Comprehensive dashboard metrics DTO.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DashboardMetrics {
    private EmployeeMetrics employeeMetrics;
    private AttendanceMetrics attendanceMetrics;
    private LeaveMetrics leaveMetrics;
    private PayrollMetrics payrollMetrics;
    private LocalDate generatedAt;
}
