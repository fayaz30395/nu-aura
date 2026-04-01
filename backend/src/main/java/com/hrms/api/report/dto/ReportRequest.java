package com.hrms.api.report.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReportRequest {

    private LocalDate startDate;
    private LocalDate endDate;

    // Filters
    private List<UUID> departmentIds;
    private List<UUID> employeeIds;
    private String employeeStatus; // ACTIVE, INACTIVE, etc.

    // Attendance specific
    private String attendanceStatus; // PRESENT, ABSENT, LATE, etc.

    // Leave specific
    private String leaveStatus; // PENDING, APPROVED, REJECTED
    private UUID leaveTypeId;
    private String leaveType; // Leave type name for filtering

    // Payroll specific
    private UUID payrollRunId;

    // Performance specific
    private UUID reviewCycleId;

    // Export format
    private ExportFormat format; // EXCEL, PDF, CSV

    public enum ExportFormat {
        EXCEL,
        PDF,
        CSV
    }
}
