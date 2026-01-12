package com.hrms.application.report.service;

import com.hrms.api.report.dto.*;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
@Slf4j
public class ExcelExportService {

    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd");
    private static final DateTimeFormatter TIME_FORMATTER = DateTimeFormatter.ofPattern("HH:mm");

    public byte[] exportEmployeeDirectoryToExcel(List<EmployeeDirectoryReportRow> data) throws IOException {
        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("Employee Directory");

            // Create header style
            CellStyle headerStyle = createHeaderStyle(workbook);
            CellStyle dateStyle = createDateStyle(workbook);

            // Create header row
            Row headerRow = sheet.createRow(0);
            String[] headers = {"Employee Code", "Full Name", "Email", "Phone", "Department",
                               "Designation", "Job Role", "Level", "Employment Type",
                               "Joining Date", "Status", "Work Location", "Reporting Manager"};

            for (int i = 0; i < headers.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers[i]);
                cell.setCellStyle(headerStyle);
            }

            // Populate data rows
            int rowNum = 1;
            for (EmployeeDirectoryReportRow row : data) {
                Row dataRow = sheet.createRow(rowNum++);

                dataRow.createCell(0).setCellValue(row.getEmployeeCode());
                dataRow.createCell(1).setCellValue(row.getFullName());
                dataRow.createCell(2).setCellValue(row.getEmail());
                dataRow.createCell(3).setCellValue(row.getPhoneNumber());
                dataRow.createCell(4).setCellValue(row.getDepartment());
                dataRow.createCell(5).setCellValue(row.getDesignation());
                dataRow.createCell(6).setCellValue(row.getJobRole());
                dataRow.createCell(7).setCellValue(row.getLevel());
                dataRow.createCell(8).setCellValue(row.getEmploymentType());

                Cell dateCell = dataRow.createCell(9);
                if (row.getJoiningDate() != null) {
                    dateCell.setCellValue(row.getJoiningDate().format(DATE_FORMATTER));
                    dateCell.setCellStyle(dateStyle);
                }

                dataRow.createCell(10).setCellValue(row.getStatus());
                dataRow.createCell(11).setCellValue(row.getWorkLocation());
                dataRow.createCell(12).setCellValue(row.getReportingManager());
            }

            // Auto-size columns
            for (int i = 0; i < headers.length; i++) {
                sheet.autoSizeColumn(i);
            }

            workbook.write(out);
            return out.toByteArray();
        }
    }

    public byte[] exportAttendanceToExcel(List<AttendanceReportRow> data) throws IOException {
        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("Attendance Report");

            CellStyle headerStyle = createHeaderStyle(workbook);
            CellStyle dateStyle = createDateStyle(workbook);

            Row headerRow = sheet.createRow(0);
            String[] headers = {"Employee Code", "Employee Name", "Department", "Date", "Status",
                               "Check In", "Check Out", "Hours Worked", "Shift", "Remarks"};

            for (int i = 0; i < headers.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers[i]);
                cell.setCellStyle(headerStyle);
            }

            int rowNum = 1;
            for (AttendanceReportRow row : data) {
                Row dataRow = sheet.createRow(rowNum++);

                dataRow.createCell(0).setCellValue(row.getEmployeeCode());
                dataRow.createCell(1).setCellValue(row.getEmployeeName());
                dataRow.createCell(2).setCellValue(row.getDepartment());

                Cell dateCell = dataRow.createCell(3);
                if (row.getDate() != null) {
                    dateCell.setCellValue(row.getDate().format(DATE_FORMATTER));
                    dateCell.setCellStyle(dateStyle);
                }

                dataRow.createCell(4).setCellValue(row.getStatus());
                dataRow.createCell(5).setCellValue(row.getCheckInTime() != null ?
                    row.getCheckInTime().format(TIME_FORMATTER) : "");
                dataRow.createCell(6).setCellValue(row.getCheckOutTime() != null ?
                    row.getCheckOutTime().format(TIME_FORMATTER) : "");
                dataRow.createCell(7).setCellValue(row.getHoursWorked() != null ?
                    row.getHoursWorked() : 0.0);
                dataRow.createCell(8).setCellValue(row.getShift());
                dataRow.createCell(9).setCellValue(row.getRemarks());
            }

            for (int i = 0; i < headers.length; i++) {
                sheet.autoSizeColumn(i);
            }

            workbook.write(out);
            return out.toByteArray();
        }
    }

    public byte[] exportLeaveToExcel(List<LeaveReportRow> data) throws IOException {
        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("Leave Report");

            CellStyle headerStyle = createHeaderStyle(workbook);
            CellStyle dateStyle = createDateStyle(workbook);

            Row headerRow = sheet.createRow(0);
            String[] headers = {"Employee Code", "Employee Name", "Department", "Leave Type",
                               "Start Date", "End Date", "Days", "Status", "Reason",
                               "Approved By", "Approved On"};

            for (int i = 0; i < headers.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers[i]);
                cell.setCellStyle(headerStyle);
            }

            int rowNum = 1;
            for (LeaveReportRow row : data) {
                Row dataRow = sheet.createRow(rowNum++);

                dataRow.createCell(0).setCellValue(row.getEmployeeCode());
                dataRow.createCell(1).setCellValue(row.getEmployeeName());
                dataRow.createCell(2).setCellValue(row.getDepartment());
                dataRow.createCell(3).setCellValue(row.getLeaveType());

                Cell startDateCell = dataRow.createCell(4);
                if (row.getStartDate() != null) {
                    startDateCell.setCellValue(row.getStartDate().format(DATE_FORMATTER));
                    startDateCell.setCellStyle(dateStyle);
                }

                Cell endDateCell = dataRow.createCell(5);
                if (row.getEndDate() != null) {
                    endDateCell.setCellValue(row.getEndDate().format(DATE_FORMATTER));
                    endDateCell.setCellStyle(dateStyle);
                }

                dataRow.createCell(6).setCellValue(row.getDays() != null ? row.getDays() : 0.0);
                dataRow.createCell(7).setCellValue(row.getStatus());
                dataRow.createCell(8).setCellValue(row.getReason());
                dataRow.createCell(9).setCellValue(row.getApprovedBy());

                Cell approvedDateCell = dataRow.createCell(10);
                if (row.getApprovedOn() != null) {
                    approvedDateCell.setCellValue(row.getApprovedOn().format(DATE_FORMATTER));
                    approvedDateCell.setCellStyle(dateStyle);
                }
            }

            for (int i = 0; i < headers.length; i++) {
                sheet.autoSizeColumn(i);
            }

            workbook.write(out);
            return out.toByteArray();
        }
    }

    public byte[] exportPayrollToExcel(List<PayrollReportRow> data) throws IOException {
        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("Payroll Report");

            CellStyle headerStyle = createHeaderStyle(workbook);
            CellStyle dateStyle = createDateStyle(workbook);
            CellStyle currencyStyle = createCurrencyStyle(workbook);

            Row headerRow = sheet.createRow(0);
            String[] headers = {"Employee Code", "Employee Name", "Department", "Designation",
                               "Payroll Month", "Basic Salary", "Allowances", "Deductions",
                               "Net Salary", "Payment Status", "Payment Date"};

            for (int i = 0; i < headers.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers[i]);
                cell.setCellStyle(headerStyle);
            }

            int rowNum = 1;
            for (PayrollReportRow row : data) {
                Row dataRow = sheet.createRow(rowNum++);

                dataRow.createCell(0).setCellValue(row.getEmployeeCode());
                dataRow.createCell(1).setCellValue(row.getEmployeeName());
                dataRow.createCell(2).setCellValue(row.getDepartment());
                dataRow.createCell(3).setCellValue(row.getDesignation());

                Cell monthCell = dataRow.createCell(4);
                if (row.getPayrollMonth() != null) {
                    monthCell.setCellValue(row.getPayrollMonth().format(DATE_FORMATTER));
                    monthCell.setCellStyle(dateStyle);
                }

                Cell basicCell = dataRow.createCell(5);
                basicCell.setCellValue(row.getBasicSalary() != null ? row.getBasicSalary().doubleValue() : 0.0);
                basicCell.setCellStyle(currencyStyle);

                Cell allowancesCell = dataRow.createCell(6);
                allowancesCell.setCellValue(row.getAllowances() != null ? row.getAllowances().doubleValue() : 0.0);
                allowancesCell.setCellStyle(currencyStyle);

                Cell deductionsCell = dataRow.createCell(7);
                deductionsCell.setCellValue(row.getDeductions() != null ? row.getDeductions().doubleValue() : 0.0);
                deductionsCell.setCellStyle(currencyStyle);

                Cell netCell = dataRow.createCell(8);
                netCell.setCellValue(row.getNetSalary() != null ? row.getNetSalary().doubleValue() : 0.0);
                netCell.setCellStyle(currencyStyle);

                dataRow.createCell(9).setCellValue(row.getPaymentStatus());

                Cell paymentDateCell = dataRow.createCell(10);
                if (row.getPaymentDate() != null) {
                    paymentDateCell.setCellValue(row.getPaymentDate().format(DATE_FORMATTER));
                    paymentDateCell.setCellStyle(dateStyle);
                }
            }

            for (int i = 0; i < headers.length; i++) {
                sheet.autoSizeColumn(i);
            }

            workbook.write(out);
            return out.toByteArray();
        }
    }

    public byte[] exportDepartmentHeadcountToExcel(List<DepartmentHeadcountReportRow> data) throws IOException {
        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("Department Headcount");

            CellStyle headerStyle = createHeaderStyle(workbook);

            Row headerRow = sheet.createRow(0);
            String[] headers = {"Department Code", "Department Name", "Total Employees",
                               "Active", "Inactive", "On Leave", "New Hires", "Terminations",
                               "Department Head"};

            for (int i = 0; i < headers.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers[i]);
                cell.setCellStyle(headerStyle);
            }

            int rowNum = 1;
            for (DepartmentHeadcountReportRow row : data) {
                Row dataRow = sheet.createRow(rowNum++);

                dataRow.createCell(0).setCellValue(row.getDepartmentCode());
                dataRow.createCell(1).setCellValue(row.getDepartmentName());
                dataRow.createCell(2).setCellValue(row.getTotalEmployees() != null ? row.getTotalEmployees() : 0);
                dataRow.createCell(3).setCellValue(row.getActiveEmployees() != null ? row.getActiveEmployees() : 0);
                dataRow.createCell(4).setCellValue(row.getInactiveEmployees() != null ? row.getInactiveEmployees() : 0);
                dataRow.createCell(5).setCellValue(row.getOnLeave() != null ? row.getOnLeave() : 0);
                dataRow.createCell(6).setCellValue(row.getNewHires() != null ? row.getNewHires() : 0);
                dataRow.createCell(7).setCellValue(row.getTerminations() != null ? row.getTerminations() : 0);
                dataRow.createCell(8).setCellValue(row.getDepartmentHead());
            }

            for (int i = 0; i < headers.length; i++) {
                sheet.autoSizeColumn(i);
            }

            workbook.write(out);
            return out.toByteArray();
        }
    }

    public byte[] exportPerformanceToExcel(List<PerformanceReportRow> data) throws IOException {
        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("Performance Report");

            CellStyle headerStyle = createHeaderStyle(workbook);
            CellStyle dateStyle = createDateStyle(workbook);

            Row headerRow = sheet.createRow(0);
            String[] headers = {"Employee Code", "Employee Name", "Department", "Designation",
                               "Review Cycle", "Review Date", "Reviewer", "Overall Rating",
                               "Performance Level", "Goals Completed", "Total Goals", "Comments"};

            for (int i = 0; i < headers.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers[i]);
                cell.setCellStyle(headerStyle);
            }

            int rowNum = 1;
            for (PerformanceReportRow row : data) {
                Row dataRow = sheet.createRow(rowNum++);

                dataRow.createCell(0).setCellValue(row.getEmployeeCode());
                dataRow.createCell(1).setCellValue(row.getEmployeeName());
                dataRow.createCell(2).setCellValue(row.getDepartment());
                dataRow.createCell(3).setCellValue(row.getDesignation());
                dataRow.createCell(4).setCellValue(row.getReviewCycle());

                Cell dateCell = dataRow.createCell(5);
                if (row.getReviewDate() != null) {
                    dateCell.setCellValue(row.getReviewDate().format(DATE_FORMATTER));
                    dateCell.setCellStyle(dateStyle);
                }

                dataRow.createCell(6).setCellValue(row.getReviewer());
                dataRow.createCell(7).setCellValue(row.getOverallRating() != null ? row.getOverallRating() : 0.0);
                dataRow.createCell(8).setCellValue(row.getPerformanceLevel());
                dataRow.createCell(9).setCellValue(row.getGoalsCompleted() != null ? row.getGoalsCompleted() : 0);
                dataRow.createCell(10).setCellValue(row.getTotalGoals() != null ? row.getTotalGoals() : 0);
                dataRow.createCell(11).setCellValue(row.getComments());
            }

            for (int i = 0; i < headers.length; i++) {
                sheet.autoSizeColumn(i);
            }

            workbook.write(out);
            return out.toByteArray();
        }
    }

    private CellStyle createHeaderStyle(Workbook workbook) {
        CellStyle style = workbook.createCellStyle();
        Font font = workbook.createFont();
        font.setBold(true);
        font.setFontHeightInPoints((short) 11);
        style.setFont(font);
        style.setFillForegroundColor(IndexedColors.GREY_25_PERCENT.getIndex());
        style.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        style.setBorderBottom(BorderStyle.THIN);
        style.setBorderTop(BorderStyle.THIN);
        style.setBorderLeft(BorderStyle.THIN);
        style.setBorderRight(BorderStyle.THIN);
        return style;
    }

    private CellStyle createDateStyle(Workbook workbook) {
        CellStyle style = workbook.createCellStyle();
        style.setDataFormat(workbook.createDataFormat().getFormat("yyyy-mm-dd"));
        return style;
    }

    private CellStyle createCurrencyStyle(Workbook workbook) {
        CellStyle style = workbook.createCellStyle();
        style.setDataFormat(workbook.createDataFormat().getFormat("$#,##0.00"));
        return style;
    }
}
