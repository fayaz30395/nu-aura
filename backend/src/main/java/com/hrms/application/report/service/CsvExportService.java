package com.hrms.application.report.service;

import com.hrms.api.report.dto.*;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.PrintWriter;
import java.time.format.DateTimeFormatter;
import java.util.List;
import org.springframework.transaction.annotation.Transactional;

@Service
@Slf4j
public class CsvExportService {

    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd");
    private static final DateTimeFormatter TIME_FORMATTER = DateTimeFormatter.ofPattern("HH:mm");
    private static final String SEPARATOR = ",";
    private static final String NEW_LINE = "\n";

    @Transactional(readOnly = true)
    public byte[] exportEmployeeDirectoryToCsv(List<EmployeeDirectoryReportRow> data) throws IOException {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        try (PrintWriter writer = new PrintWriter(out)) {
            // Write header
            writer.write(String.join(SEPARATOR,
                "Employee Code", "Full Name", "Email", "Phone", "Department",
                "Designation", "Job Role", "Level", "Employment Type",
                "Joining Date", "Status", "Work Location", "Reporting Manager"
            ));
            writer.write(NEW_LINE);

            // Write data
            for (EmployeeDirectoryReportRow row : data) {
                writer.write(String.join(SEPARATOR,
                    escapeCsv(row.getEmployeeCode()),
                    escapeCsv(row.getFullName()),
                    escapeCsv(row.getEmail()),
                    escapeCsv(row.getPhoneNumber()),
                    escapeCsv(row.getDepartment()),
                    escapeCsv(row.getDesignation()),
                    escapeCsv(row.getJobRole()),
                    escapeCsv(row.getLevel()),
                    escapeCsv(row.getEmploymentType()),
                    row.getJoiningDate() != null ? row.getJoiningDate().format(DATE_FORMATTER) : "",
                    escapeCsv(row.getStatus()),
                    escapeCsv(row.getWorkLocation()),
                    escapeCsv(row.getReportingManager())
                ));
                writer.write(NEW_LINE);
            }

            writer.flush();
            return out.toByteArray();
        }
    }

    @Transactional(readOnly = true)
    public byte[] exportAttendanceToCsv(List<AttendanceReportRow> data) throws IOException {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        try (PrintWriter writer = new PrintWriter(out)) {
            // Write header
            writer.write(String.join(SEPARATOR,
                "Employee Code", "Employee Name", "Department", "Date", "Status",
                "Check In", "Check Out", "Hours Worked", "Shift", "Remarks"
            ));
            writer.write(NEW_LINE);

            // Write data
            for (AttendanceReportRow row : data) {
                writer.write(String.join(SEPARATOR,
                    escapeCsv(row.getEmployeeCode()),
                    escapeCsv(row.getEmployeeName()),
                    escapeCsv(row.getDepartment()),
                    row.getDate() != null ? row.getDate().format(DATE_FORMATTER) : "",
                    escapeCsv(row.getStatus()),
                    row.getCheckInTime() != null ? row.getCheckInTime().format(TIME_FORMATTER) : "",
                    row.getCheckOutTime() != null ? row.getCheckOutTime().format(TIME_FORMATTER) : "",
                    row.getHoursWorked() != null ? String.format("%.2f", row.getHoursWorked()) : "0.00",
                    escapeCsv(row.getShift()),
                    escapeCsv(row.getRemarks())
                ));
                writer.write(NEW_LINE);
            }

            writer.flush();
            return out.toByteArray();
        }
    }

    @Transactional(readOnly = true)
    public byte[] exportLeaveToCsv(List<LeaveReportRow> data) throws IOException {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        try (PrintWriter writer = new PrintWriter(out)) {
            // Write header
            writer.write(String.join(SEPARATOR,
                "Employee Code", "Employee Name", "Department", "Leave Type",
                "Start Date", "End Date", "Days", "Status", "Reason",
                "Approved By", "Approved On"
            ));
            writer.write(NEW_LINE);

            // Write data
            for (LeaveReportRow row : data) {
                writer.write(String.join(SEPARATOR,
                    escapeCsv(row.getEmployeeCode()),
                    escapeCsv(row.getEmployeeName()),
                    escapeCsv(row.getDepartment()),
                    escapeCsv(row.getLeaveType()),
                    row.getStartDate() != null ? row.getStartDate().format(DATE_FORMATTER) : "",
                    row.getEndDate() != null ? row.getEndDate().format(DATE_FORMATTER) : "",
                    row.getDays() != null ? String.format("%.1f", row.getDays()) : "0.0",
                    escapeCsv(row.getStatus()),
                    escapeCsv(row.getReason()),
                    escapeCsv(row.getApprovedBy()),
                    row.getApprovedOn() != null ? row.getApprovedOn().format(DATE_FORMATTER) : ""
                ));
                writer.write(NEW_LINE);
            }

            writer.flush();
            return out.toByteArray();
        }
    }

    @Transactional(readOnly = true)
    public byte[] exportPayrollToCsv(List<PayrollReportRow> data) throws IOException {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        try (PrintWriter writer = new PrintWriter(out)) {
            // Write header
            writer.write(String.join(SEPARATOR,
                "Employee Code", "Employee Name", "Department", "Designation",
                "Payroll Month", "Basic Salary", "Allowances", "Deductions",
                "Net Salary", "Payment Status", "Payment Date"
            ));
            writer.write(NEW_LINE);

            // Write data
            for (PayrollReportRow row : data) {
                writer.write(String.join(SEPARATOR,
                    escapeCsv(row.getEmployeeCode()),
                    escapeCsv(row.getEmployeeName()),
                    escapeCsv(row.getDepartment()),
                    escapeCsv(row.getDesignation()),
                    row.getPayrollMonth() != null ? row.getPayrollMonth().format(DATE_FORMATTER) : "",
                    row.getBasicSalary() != null ? row.getBasicSalary().toString() : "0.00",
                    row.getAllowances() != null ? row.getAllowances().toString() : "0.00",
                    row.getDeductions() != null ? row.getDeductions().toString() : "0.00",
                    row.getNetSalary() != null ? row.getNetSalary().toString() : "0.00",
                    escapeCsv(row.getPaymentStatus()),
                    row.getPaymentDate() != null ? row.getPaymentDate().format(DATE_FORMATTER) : ""
                ));
                writer.write(NEW_LINE);
            }

            writer.flush();
            return out.toByteArray();
        }
    }

    @Transactional(readOnly = true)
    public byte[] exportDepartmentHeadcountToCsv(List<DepartmentHeadcountReportRow> data) throws IOException {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        try (PrintWriter writer = new PrintWriter(out)) {
            // Write header
            writer.write(String.join(SEPARATOR,
                "Department Code", "Department Name", "Total Employees",
                "Active", "Inactive", "On Leave", "New Hires", "Terminations",
                "Department Head"
            ));
            writer.write(NEW_LINE);

            // Write data
            for (DepartmentHeadcountReportRow row : data) {
                writer.write(String.join(SEPARATOR,
                    escapeCsv(row.getDepartmentCode()),
                    escapeCsv(row.getDepartmentName()),
                    String.valueOf(row.getTotalEmployees() != null ? row.getTotalEmployees() : 0),
                    String.valueOf(row.getActiveEmployees() != null ? row.getActiveEmployees() : 0),
                    String.valueOf(row.getInactiveEmployees() != null ? row.getInactiveEmployees() : 0),
                    String.valueOf(row.getOnLeave() != null ? row.getOnLeave() : 0),
                    String.valueOf(row.getNewHires() != null ? row.getNewHires() : 0),
                    String.valueOf(row.getTerminations() != null ? row.getTerminations() : 0),
                    escapeCsv(row.getDepartmentHead())
                ));
                writer.write(NEW_LINE);
            }

            writer.flush();
            return out.toByteArray();
        }
    }

    @Transactional(readOnly = true)
    public byte[] exportPerformanceToCsv(List<PerformanceReportRow> data) throws IOException {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        try (PrintWriter writer = new PrintWriter(out)) {
            // Write header
            writer.write(String.join(SEPARATOR,
                "Employee Code", "Employee Name", "Department", "Designation",
                "Review Cycle", "Review Date", "Reviewer", "Overall Rating",
                "Performance Level", "Goals Completed", "Total Goals", "Comments"
            ));
            writer.write(NEW_LINE);

            // Write data
            for (PerformanceReportRow row : data) {
                writer.write(String.join(SEPARATOR,
                    escapeCsv(row.getEmployeeCode()),
                    escapeCsv(row.getEmployeeName()),
                    escapeCsv(row.getDepartment()),
                    escapeCsv(row.getDesignation()),
                    escapeCsv(row.getReviewCycle()),
                    row.getReviewDate() != null ? row.getReviewDate().format(DATE_FORMATTER) : "",
                    escapeCsv(row.getReviewer()),
                    row.getOverallRating() != null ? String.format("%.2f", row.getOverallRating()) : "0.00",
                    escapeCsv(row.getPerformanceLevel()),
                    String.valueOf(row.getGoalsCompleted() != null ? row.getGoalsCompleted() : 0),
                    String.valueOf(row.getTotalGoals() != null ? row.getTotalGoals() : 0),
                    escapeCsv(row.getComments())
                ));
                writer.write(NEW_LINE);
            }

            writer.flush();
            return out.toByteArray();
        }
    }

    private String escapeCsv(String value) {
        if (value == null) {
            return "";
        }

        // If the value contains comma, newline, or quotes, wrap it in quotes
        if (value.contains(",") || value.contains("\n") || value.contains("\"")) {
            // Escape existing quotes by doubling them
            value = value.replace("\"", "\"\"");
            return "\"" + value + "\"";
        }

        return value;
    }
}
