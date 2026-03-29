package com.hrms.application.report.service;

import com.hrms.api.report.dto.*;
import com.lowagie.text.*;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
@Slf4j
public class PdfExportService {

    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd");
    private static final DateTimeFormatter TIME_FORMATTER = DateTimeFormatter.ofPattern("HH:mm");

    private static final Font TITLE_FONT = new Font(Font.HELVETICA, 18, Font.BOLD, Color.BLACK);
    private static final Font HEADER_FONT = new Font(Font.HELVETICA, 10, Font.BOLD, Color.WHITE);
    private static final Font CELL_FONT = new Font(Font.HELVETICA, 9, Font.NORMAL, Color.BLACK);

    public byte[] exportEmployeeDirectoryToPdf(List<EmployeeDirectoryReportRow> data) throws DocumentException {
        Document document = new Document(PageSize.A4.rotate());
        ByteArrayOutputStream out = new ByteArrayOutputStream();

        try {
            PdfWriter.getInstance(document, out);
            document.open();

            // Add title
            addTitle(document, "Employee Directory Report");
            addMetadata(document);

            // Create table
            PdfPTable table = new PdfPTable(10);
            table.setWidthPercentage(100);
            table.setSpacingBefore(10f);

            // Add headers
            addTableHeader(table, "Code", "Name", "Email", "Phone", "Department",
                          "Designation", "Job Role", "Level", "Joining Date", "Status");

            // Add data
            for (EmployeeDirectoryReportRow row : data) {
                addTableCell(table, row.getEmployeeCode());
                addTableCell(table, row.getFullName());
                addTableCell(table, row.getEmail());
                addTableCell(table, row.getPhoneNumber());
                addTableCell(table, row.getDepartment());
                addTableCell(table, row.getDesignation());
                addTableCell(table, row.getJobRole());
                addTableCell(table, row.getLevel());
                addTableCell(table, row.getJoiningDate() != null ?
                    row.getJoiningDate().format(DATE_FORMATTER) : "");
                addTableCell(table, row.getStatus());
            }

            document.add(table);
            return out.toByteArray();
        } catch (Exception e) {
            log.error("Error generating PDF: {}", e.getMessage(), e);
            throw new DocumentException("Failed to generate PDF");
        } finally {
            if (document.isOpen()) document.close();
        }
    }

    public byte[] exportAttendanceToPdf(List<AttendanceReportRow> data) throws DocumentException {
        Document document = new Document(PageSize.A4.rotate());
        ByteArrayOutputStream out = new ByteArrayOutputStream();

        try {
            PdfWriter.getInstance(document, out);
            document.open();

            addTitle(document, "Attendance Report");
            addMetadata(document);

            PdfPTable table = new PdfPTable(9);
            table.setWidthPercentage(100);
            table.setSpacingBefore(10f);

            addTableHeader(table, "Code", "Name", "Department", "Date", "Status",
                          "Check In", "Check Out", "Hours", "Shift");

            for (AttendanceReportRow row : data) {
                addTableCell(table, row.getEmployeeCode());
                addTableCell(table, row.getEmployeeName());
                addTableCell(table, row.getDepartment());
                addTableCell(table, row.getDate() != null ? row.getDate().format(DATE_FORMATTER) : "");
                addTableCell(table, row.getStatus());
                addTableCell(table, row.getCheckInTime() != null ?
                    row.getCheckInTime().format(TIME_FORMATTER) : "");
                addTableCell(table, row.getCheckOutTime() != null ?
                    row.getCheckOutTime().format(TIME_FORMATTER) : "");
                addTableCell(table, row.getHoursWorked() != null ?
                    String.format("%.2f", row.getHoursWorked()) : "0.00");
                addTableCell(table, row.getShift());
            }

            document.add(table);
            return out.toByteArray();
        } catch (Exception e) {
            log.error("Error generating PDF: {}", e.getMessage(), e);
            throw new DocumentException("Failed to generate PDF");
        } finally {
            if (document.isOpen()) document.close();
        }
    }

    public byte[] exportLeaveToPdf(List<LeaveReportRow> data) throws DocumentException {
        Document document = new Document(PageSize.A4.rotate());
        ByteArrayOutputStream out = new ByteArrayOutputStream();

        try {
            PdfWriter.getInstance(document, out);
            document.open();

            addTitle(document, "Leave Report");
            addMetadata(document);

            PdfPTable table = new PdfPTable(9);
            table.setWidthPercentage(100);
            table.setSpacingBefore(10f);

            addTableHeader(table, "Code", "Name", "Department", "Leave Type",
                          "Start Date", "End Date", "Days", "Status", "Approved By");

            for (LeaveReportRow row : data) {
                addTableCell(table, row.getEmployeeCode());
                addTableCell(table, row.getEmployeeName());
                addTableCell(table, row.getDepartment());
                addTableCell(table, row.getLeaveType());
                addTableCell(table, row.getStartDate() != null ?
                    row.getStartDate().format(DATE_FORMATTER) : "");
                addTableCell(table, row.getEndDate() != null ?
                    row.getEndDate().format(DATE_FORMATTER) : "");
                addTableCell(table, row.getDays() != null ?
                    String.format("%.1f", row.getDays()) : "0.0");
                addTableCell(table, row.getStatus());
                addTableCell(table, row.getApprovedBy());
            }

            document.add(table);
            return out.toByteArray();
        } catch (Exception e) {
            log.error("Error generating PDF: {}", e.getMessage(), e);
            throw new DocumentException("Failed to generate PDF");
        } finally {
            if (document.isOpen()) document.close();
        }
    }

    public byte[] exportPayrollToPdf(List<PayrollReportRow> data) throws DocumentException {
        Document document = new Document(PageSize.A4.rotate());
        ByteArrayOutputStream out = new ByteArrayOutputStream();

        try {
            PdfWriter.getInstance(document, out);
            document.open();

            addTitle(document, "Payroll Report");
            addMetadata(document);

            PdfPTable table = new PdfPTable(9);
            table.setWidthPercentage(100);
            table.setSpacingBefore(10f);

            addTableHeader(table, "Code", "Name", "Department", "Month",
                          "Basic Salary", "Allowances", "Deductions", "Net Salary", "Status");

            for (PayrollReportRow row : data) {
                addTableCell(table, row.getEmployeeCode());
                addTableCell(table, row.getEmployeeName());
                addTableCell(table, row.getDepartment());
                addTableCell(table, row.getPayrollMonth() != null ?
                    row.getPayrollMonth().format(DATE_FORMATTER) : "");
                addTableCell(table, row.getBasicSalary() != null ?
                    String.format("$%.2f", row.getBasicSalary()) : "$0.00");
                addTableCell(table, row.getAllowances() != null ?
                    String.format("$%.2f", row.getAllowances()) : "$0.00");
                addTableCell(table, row.getDeductions() != null ?
                    String.format("$%.2f", row.getDeductions()) : "$0.00");
                addTableCell(table, row.getNetSalary() != null ?
                    String.format("$%.2f", row.getNetSalary()) : "$0.00");
                addTableCell(table, row.getPaymentStatus());
            }

            document.add(table);
            return out.toByteArray();
        } catch (Exception e) {
            log.error("Error generating PDF: {}", e.getMessage(), e);
            throw new DocumentException("Failed to generate PDF");
        } finally {
            if (document.isOpen()) document.close();
        }
    }

    public byte[] exportDepartmentHeadcountToPdf(List<DepartmentHeadcountReportRow> data) throws DocumentException {
        Document document = new Document(PageSize.A4);
        ByteArrayOutputStream out = new ByteArrayOutputStream();

        try {
            PdfWriter.getInstance(document, out);
            document.open();

            addTitle(document, "Department Headcount Report");
            addMetadata(document);

            PdfPTable table = new PdfPTable(7);
            table.setWidthPercentage(100);
            table.setSpacingBefore(10f);

            addTableHeader(table, "Department", "Total", "Active",
                          "Inactive", "New Hires", "Terminations", "Head");

            for (DepartmentHeadcountReportRow row : data) {
                addTableCell(table, row.getDepartmentName());
                addTableCell(table, String.valueOf(row.getTotalEmployees() != null ? row.getTotalEmployees() : 0));
                addTableCell(table, String.valueOf(row.getActiveEmployees() != null ? row.getActiveEmployees() : 0));
                addTableCell(table, String.valueOf(row.getInactiveEmployees() != null ? row.getInactiveEmployees() : 0));
                addTableCell(table, String.valueOf(row.getNewHires() != null ? row.getNewHires() : 0));
                addTableCell(table, String.valueOf(row.getTerminations() != null ? row.getTerminations() : 0));
                addTableCell(table, row.getDepartmentHead());
            }

            document.add(table);
            return out.toByteArray();
        } catch (Exception e) {
            log.error("Error generating PDF: {}", e.getMessage(), e);
            throw new DocumentException("Failed to generate PDF");
        } finally {
            if (document.isOpen()) document.close();
        }
    }

    public byte[] exportPerformanceToPdf(List<PerformanceReportRow> data) throws DocumentException {
        Document document = new Document(PageSize.A4.rotate());
        ByteArrayOutputStream out = new ByteArrayOutputStream();

        try {
            PdfWriter.getInstance(document, out);
            document.open();

            addTitle(document, "Performance Review Report");
            addMetadata(document);

            PdfPTable table = new PdfPTable(9);
            table.setWidthPercentage(100);
            table.setSpacingBefore(10f);

            addTableHeader(table, "Code", "Name", "Department", "Review Cycle",
                          "Review Date", "Reviewer", "Rating", "Level", "Goals");

            for (PerformanceReportRow row : data) {
                addTableCell(table, row.getEmployeeCode());
                addTableCell(table, row.getEmployeeName());
                addTableCell(table, row.getDepartment());
                addTableCell(table, row.getReviewCycle());
                addTableCell(table, row.getReviewDate() != null ?
                    row.getReviewDate().format(DATE_FORMATTER) : "");
                addTableCell(table, row.getReviewer());
                addTableCell(table, row.getOverallRating() != null ?
                    String.format("%.2f", row.getOverallRating()) : "0.00");
                addTableCell(table, row.getPerformanceLevel());
                addTableCell(table, String.format("%d/%d",
                    row.getGoalsCompleted() != null ? row.getGoalsCompleted() : 0,
                    row.getTotalGoals() != null ? row.getTotalGoals() : 0));
            }

            document.add(table);
            return out.toByteArray();
        } catch (Exception e) {
            log.error("Error generating PDF: {}", e.getMessage(), e);
            throw new DocumentException("Failed to generate PDF");
        } finally {
            if (document.isOpen()) document.close();
        }
    }

    private void addTitle(Document document, String title) throws DocumentException {
        Paragraph titleParagraph = new Paragraph(title, TITLE_FONT);
        titleParagraph.setAlignment(Element.ALIGN_CENTER);
        titleParagraph.setSpacingAfter(10f);
        document.add(titleParagraph);
    }

    private void addMetadata(Document document) throws DocumentException {
        Paragraph metadata = new Paragraph(
            "Generated on: " + LocalDate.now().format(DATE_FORMATTER),
            new Font(Font.HELVETICA, 10, Font.NORMAL, Color.GRAY)
        );
        metadata.setAlignment(Element.ALIGN_CENTER);
        metadata.setSpacingAfter(15f);
        document.add(metadata);
    }

    private void addTableHeader(PdfPTable table, String... headers) {
        for (String header : headers) {
            PdfPCell cell = new PdfPCell(new Phrase(header, HEADER_FONT));
            cell.setBackgroundColor(new Color(63, 81, 181)); // Material blue
            cell.setHorizontalAlignment(Element.ALIGN_CENTER);
            cell.setPadding(8f);
            table.addCell(cell);
        }
    }

    private void addTableCell(PdfPTable table, String value) {
        PdfPCell cell = new PdfPCell(new Phrase(value != null ? value : "", CELL_FONT));
        cell.setPadding(6f);
        table.addCell(cell);
    }
}
