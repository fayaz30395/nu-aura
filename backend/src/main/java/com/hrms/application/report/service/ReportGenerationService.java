package com.hrms.application.report.service;

import com.hrms.application.document.service.FileStorageService;
import com.hrms.common.exception.BusinessException;
import com.hrms.common.security.TenantContext;
import com.lowagie.text.*;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.awt.Color;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import org.springframework.transaction.annotation.Transactional;

/**
 * Service for generating PDF reports using OpenPDF.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ReportGenerationService {

    private final FileStorageService fileStorageService;

    private static final Font TITLE_FONT = new Font(Font.HELVETICA, 18, Font.BOLD, Color.DARK_GRAY);
    private static final Font HEADER_FONT = new Font(Font.HELVETICA, 12, Font.BOLD, Color.WHITE);
    private static final Font SUBHEADER_FONT = new Font(Font.HELVETICA, 12, Font.BOLD, Color.DARK_GRAY);
    private static final Font NORMAL_FONT = new Font(Font.HELVETICA, 10, Font.NORMAL, Color.BLACK);
    private static final Font SMALL_FONT = new Font(Font.HELVETICA, 8, Font.NORMAL, Color.GRAY);
    private static final Color PRIMARY_COLOR = new Color(41, 128, 185);
    private static final Color LIGHT_GRAY = new Color(245, 245, 245);

    /**
     * Generate a payslip PDF for an employee.
     */
    @Transactional(readOnly = true)
    public ReportResult generatePayslip(UUID employeeId, int year, int month,
                                         Map<String, Object> payslipData) {
        String filename = String.format("payslip_%s_%d_%02d.pdf", employeeId, year, month);
        String monthName = LocalDate.of(year, month, 1).getMonth().toString();

        try {
            ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
            Document document = new Document(PageSize.A4, 50, 50, 50, 50);
            PdfWriter.getInstance(document, outputStream);
            document.open();

            // Header
            addHeader(document, "PAYSLIP", monthName + " " + year);

            // Employee Info
            addEmployeeInfo(document, payslipData);

            document.add(Chunk.NEWLINE);

            // Earnings Table
            addSectionTitle(document, "Earnings");
            PdfPTable earningsTable = createEarningsTable(payslipData);
            document.add(earningsTable);

            document.add(Chunk.NEWLINE);

            // Deductions Table
            addSectionTitle(document, "Deductions");
            PdfPTable deductionsTable = createDeductionsTable(payslipData);
            document.add(deductionsTable);

            document.add(Chunk.NEWLINE);

            // Net Pay
            addNetPaySection(document, payslipData);

            // Footer
            addFooter(document);

            document.close();

            byte[] pdfBytes = outputStream.toByteArray();

            FileStorageService.FileUploadResult uploadResult = fileStorageService.uploadFile(
                    new ByteArrayInputStream(pdfBytes),
                    filename,
                    "application/pdf",
                    pdfBytes.length,
                    FileStorageService.CATEGORY_PAYSLIPS,
                    employeeId
            );

            log.info("Generated payslip for employee {} for {}/{}", employeeId, month, year);

            return ReportResult.builder()
                    .reportType("PAYSLIP")
                    .filename(filename)
                    .objectName(uploadResult.getObjectName())
                    .downloadUrl(fileStorageService.getDownloadUrl(uploadResult.getObjectName()))
                    .size(pdfBytes.length)
                    .generatedAt(LocalDateTime.now())
                    .build();

        } catch (DocumentException e) {
            log.error("Failed to generate payslip for employee {}", employeeId, e);
            throw new BusinessException("Failed to generate payslip: " + e.getMessage());
        }
    }

    /**
     * Generate an attendance report for an employee or department.
     */
    @Transactional(readOnly = true)
    public ReportResult generateAttendanceReport(UUID entityId, LocalDate startDate, LocalDate endDate,
                                                  Map<String, Object> attendanceData, String reportType) {
        String filename = String.format("attendance_report_%s_%s_to_%s.pdf",
                entityId,
                startDate.format(DateTimeFormatter.ISO_DATE),
                endDate.format(DateTimeFormatter.ISO_DATE));

        try {
            ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
            Document document = new Document(PageSize.A4.rotate(), 50, 50, 50, 50);
            PdfWriter.getInstance(document, outputStream);
            document.open();

            // Header
            addHeader(document, "ATTENDANCE REPORT",
                    startDate.format(DateTimeFormatter.ofPattern("MMM dd, yyyy")) + " - " +
                    endDate.format(DateTimeFormatter.ofPattern("MMM dd, yyyy")));

            // Summary
            addAttendanceSummary(document, attendanceData);

            document.add(Chunk.NEWLINE);

            // Attendance Records Table
            addSectionTitle(document, "Attendance Records");
            PdfPTable attendanceTable = createAttendanceTable(attendanceData);
            document.add(attendanceTable);

            // Footer
            addFooter(document);

            document.close();

            byte[] pdfBytes = outputStream.toByteArray();

            FileStorageService.FileUploadResult uploadResult = fileStorageService.uploadFile(
                    new ByteArrayInputStream(pdfBytes),
                    filename,
                    "application/pdf",
                    pdfBytes.length,
                    FileStorageService.CATEGORY_REPORTS,
                    entityId
            );

            log.info("Generated attendance report for {} from {} to {}", entityId, startDate, endDate);

            return ReportResult.builder()
                    .reportType("ATTENDANCE")
                    .filename(filename)
                    .objectName(uploadResult.getObjectName())
                    .downloadUrl(fileStorageService.getDownloadUrl(uploadResult.getObjectName()))
                    .size(pdfBytes.length)
                    .generatedAt(LocalDateTime.now())
                    .build();

        } catch (DocumentException e) {
            log.error("Failed to generate attendance report for {}", entityId, e);
            throw new BusinessException("Failed to generate attendance report: " + e.getMessage());
        }
    }

    /**
     * Generate a leave summary report.
     */
    @Transactional(readOnly = true)
    public ReportResult generateLeaveReport(UUID entityId, int year, Map<String, Object> leaveData) {
        String filename = String.format("leave_report_%s_%d.pdf", entityId, year);

        try {
            ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
            Document document = new Document(PageSize.A4, 50, 50, 50, 50);
            PdfWriter.getInstance(document, outputStream);
            document.open();

            // Header
            addHeader(document, "LEAVE SUMMARY REPORT", "Year: " + year);

            // Leave Balance Summary
            addSectionTitle(document, "Leave Balances");
            PdfPTable balanceTable = createLeaveBalanceTable(leaveData);
            document.add(balanceTable);

            document.add(Chunk.NEWLINE);

            // Leave History
            addSectionTitle(document, "Leave History");
            PdfPTable historyTable = createLeaveHistoryTable(leaveData);
            document.add(historyTable);

            // Footer
            addFooter(document);

            document.close();

            byte[] pdfBytes = outputStream.toByteArray();

            FileStorageService.FileUploadResult uploadResult = fileStorageService.uploadFile(
                    new ByteArrayInputStream(pdfBytes),
                    filename,
                    "application/pdf",
                    pdfBytes.length,
                    FileStorageService.CATEGORY_REPORTS,
                    entityId
            );

            log.info("Generated leave report for {} for year {}", entityId, year);

            return ReportResult.builder()
                    .reportType("LEAVE_SUMMARY")
                    .filename(filename)
                    .objectName(uploadResult.getObjectName())
                    .downloadUrl(fileStorageService.getDownloadUrl(uploadResult.getObjectName()))
                    .size(pdfBytes.length)
                    .generatedAt(LocalDateTime.now())
                    .build();

        } catch (DocumentException e) {
            log.error("Failed to generate leave report for {}", entityId, e);
            throw new BusinessException("Failed to generate leave report: " + e.getMessage());
        }
    }

    /**
     * Generate an employee letter (offer, confirmation, experience, etc.).
     */
    @Transactional(readOnly = true)
    public ReportResult generateLetter(UUID employeeId, String letterType, Map<String, Object> letterData) {
        String filename = String.format("%s_letter_%s_%s.pdf",
                letterType.toLowerCase(),
                employeeId,
                LocalDate.now().format(DateTimeFormatter.ISO_DATE));

        try {
            ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
            Document document = new Document(PageSize.A4, 72, 72, 72, 72);
            PdfWriter.getInstance(document, outputStream);
            document.open();

            // Company Letterhead
            addLetterhead(document, letterData);

            // Date
            Paragraph datePara = new Paragraph(
                    LocalDate.now().format(DateTimeFormatter.ofPattern("MMMM dd, yyyy")),
                    NORMAL_FONT
            );
            datePara.setAlignment(Element.ALIGN_RIGHT);
            document.add(datePara);
            document.add(Chunk.NEWLINE);

            // Recipient
            String employeeName = getStringValue(letterData, "employeeName", "Employee");
            Paragraph toPara = new Paragraph("To,\n" + employeeName, NORMAL_FONT);
            document.add(toPara);
            document.add(Chunk.NEWLINE);

            // Subject
            Paragraph subjectPara = new Paragraph("Subject: " + formatLetterType(letterType), SUBHEADER_FONT);
            document.add(subjectPara);
            document.add(Chunk.NEWLINE);

            // Body
            String letterBody = getLetterBody(letterType, letterData);
            Paragraph bodyPara = new Paragraph(letterBody, NORMAL_FONT);
            bodyPara.setAlignment(Element.ALIGN_JUSTIFIED);
            bodyPara.setLeading(18f);
            document.add(bodyPara);

            document.add(Chunk.NEWLINE);
            document.add(Chunk.NEWLINE);

            // Signature
            addSignature(document, letterData);

            document.close();

            byte[] pdfBytes = outputStream.toByteArray();

            FileStorageService.FileUploadResult uploadResult = fileStorageService.uploadFile(
                    new ByteArrayInputStream(pdfBytes),
                    filename,
                    "application/pdf",
                    pdfBytes.length,
                    FileStorageService.CATEGORY_LETTERS,
                    employeeId
            );

            log.info("Generated {} letter for employee {}", letterType, employeeId);

            return ReportResult.builder()
                    .reportType(letterType)
                    .filename(filename)
                    .objectName(uploadResult.getObjectName())
                    .downloadUrl(fileStorageService.getDownloadUrl(uploadResult.getObjectName()))
                    .size(pdfBytes.length)
                    .generatedAt(LocalDateTime.now())
                    .build();

        } catch (DocumentException e) {
            log.error("Failed to generate {} letter for employee {}", letterType, employeeId, e);
            throw new BusinessException("Failed to generate letter: " + e.getMessage());
        }
    }

    /**
     * Generate an HR analytics report.
     */
    @Transactional(readOnly = true)
    public ReportResult generateAnalyticsReport(Map<String, Object> analyticsData, String reportPeriod) {
        UUID tenantId = TenantContext.getCurrentTenant();
        String filename = String.format("hr_analytics_%s_%s.pdf",
                reportPeriod,
                LocalDate.now().format(DateTimeFormatter.ISO_DATE));

        try {
            ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
            Document document = new Document(PageSize.A4, 50, 50, 50, 50);
            PdfWriter.getInstance(document, outputStream);
            document.open();

            // Header
            addHeader(document, "HR ANALYTICS REPORT", "Period: " + reportPeriod);

            // Executive Summary
            addSectionTitle(document, "Executive Summary");
            addAnalyticsSummary(document, analyticsData);

            document.add(Chunk.NEWLINE);

            // Headcount Metrics
            addSectionTitle(document, "Headcount Metrics");
            PdfPTable headcountTable = createMetricsTable(analyticsData, "headcount");
            document.add(headcountTable);

            document.add(Chunk.NEWLINE);

            // Attendance Metrics
            addSectionTitle(document, "Attendance Metrics");
            PdfPTable attendanceMetricsTable = createMetricsTable(analyticsData, "attendance");
            document.add(attendanceMetricsTable);

            document.add(Chunk.NEWLINE);

            // Leave Metrics
            addSectionTitle(document, "Leave Metrics");
            PdfPTable leaveMetricsTable = createMetricsTable(analyticsData, "leave");
            document.add(leaveMetricsTable);

            // Footer
            addFooter(document);

            document.close();

            byte[] pdfBytes = outputStream.toByteArray();

            FileStorageService.FileUploadResult uploadResult = fileStorageService.uploadFile(
                    new ByteArrayInputStream(pdfBytes),
                    filename,
                    "application/pdf",
                    pdfBytes.length,
                    FileStorageService.CATEGORY_REPORTS,
                    tenantId
            );

            log.info("Generated analytics report for period: {}", reportPeriod);

            return ReportResult.builder()
                    .reportType("ANALYTICS")
                    .filename(filename)
                    .objectName(uploadResult.getObjectName())
                    .downloadUrl(fileStorageService.getDownloadUrl(uploadResult.getObjectName()))
                    .size(pdfBytes.length)
                    .generatedAt(LocalDateTime.now())
                    .build();

        } catch (DocumentException e) {
            log.error("Failed to generate analytics report", e);
            throw new BusinessException("Failed to generate analytics report: " + e.getMessage());
        }
    }

    /**
     * Async version for batch report generation.
     */
    @Async
    @Transactional(readOnly = true)
    public CompletableFuture<ReportResult> generateReportAsync(String reportType, Map<String, Object> data) {
        try {
            ReportResult result = switch (reportType.toUpperCase()) {
                case "PAYSLIP" -> generatePayslip(
                        (UUID) data.get("employeeId"),
                        (Integer) data.get("year"),
                        (Integer) data.get("month"),
                        data
                );
                case "ANALYTICS" -> generateAnalyticsReport(data, (String) data.get("period"));
                default -> throw new BusinessException("Unknown report type: " + reportType);
            };
            return CompletableFuture.completedFuture(result);
        } catch (Exception e) {
            return CompletableFuture.failedFuture(e);
        }
    }

    // ========== Helper Methods ==========

    private void addHeader(Document document, String title, String subtitle) throws DocumentException {
        Paragraph titlePara = new Paragraph(title, TITLE_FONT);
        titlePara.setAlignment(Element.ALIGN_CENTER);
        document.add(titlePara);

        if (subtitle != null && !subtitle.isEmpty()) {
            Paragraph subtitlePara = new Paragraph(subtitle, SUBHEADER_FONT);
            subtitlePara.setAlignment(Element.ALIGN_CENTER);
            document.add(subtitlePara);
        }

        document.add(Chunk.NEWLINE);
    }

    private void addSectionTitle(Document document, String title) throws DocumentException {
        Paragraph sectionTitle = new Paragraph(title, SUBHEADER_FONT);
        sectionTitle.setSpacingBefore(10f);
        sectionTitle.setSpacingAfter(5f);
        document.add(sectionTitle);
    }

    private void addEmployeeInfo(Document document, Map<String, Object> data) throws DocumentException {
        PdfPTable infoTable = new PdfPTable(4);
        infoTable.setWidthPercentage(100);

        addInfoCell(infoTable, "Employee ID:", getStringValue(data, "employeeCode", "N/A"));
        addInfoCell(infoTable, "Name:", getStringValue(data, "employeeName", "N/A"));
        addInfoCell(infoTable, "Department:", getStringValue(data, "department", "N/A"));
        addInfoCell(infoTable, "Designation:", getStringValue(data, "designation", "N/A"));

        document.add(infoTable);
    }

    private void addInfoCell(PdfPTable table, String label, String value) {
        PdfPCell labelCell = new PdfPCell(new Phrase(label, SMALL_FONT));
        labelCell.setBorder(Rectangle.NO_BORDER);
        labelCell.setBackgroundColor(LIGHT_GRAY);
        labelCell.setPadding(5);
        table.addCell(labelCell);

        PdfPCell valueCell = new PdfPCell(new Phrase(value, NORMAL_FONT));
        valueCell.setBorder(Rectangle.NO_BORDER);
        valueCell.setPadding(5);
        table.addCell(valueCell);
    }

    private PdfPTable createEarningsTable(Map<String, Object> data) throws DocumentException {
        PdfPTable table = new PdfPTable(2);
        table.setWidthPercentage(100);
        table.setWidths(new float[]{3, 1});

        addTableHeader(table, "Description", "Amount");

        addTableRow(table, "Basic Salary", getFormattedAmount(data, "basicSalary"));
        addTableRow(table, "House Rent Allowance", getFormattedAmount(data, "hra"));
        addTableRow(table, "Transport Allowance", getFormattedAmount(data, "transportAllowance"));
        addTableRow(table, "Medical Allowance", getFormattedAmount(data, "medicalAllowance"));
        addTableRow(table, "Other Allowances", getFormattedAmount(data, "otherAllowances"));

        addTableTotal(table, "Total Earnings", getFormattedAmount(data, "grossSalary"));

        return table;
    }

    private PdfPTable createDeductionsTable(Map<String, Object> data) throws DocumentException {
        PdfPTable table = new PdfPTable(2);
        table.setWidthPercentage(100);
        table.setWidths(new float[]{3, 1});

        addTableHeader(table, "Description", "Amount");

        addTableRow(table, "Provident Fund", getFormattedAmount(data, "providentFund"));
        addTableRow(table, "Professional Tax", getFormattedAmount(data, "professionalTax"));
        addTableRow(table, "Income Tax (TDS)", getFormattedAmount(data, "incomeTax"));
        addTableRow(table, "Other Deductions", getFormattedAmount(data, "otherDeductions"));

        addTableTotal(table, "Total Deductions", getFormattedAmount(data, "totalDeductions"));

        return table;
    }

    private void addNetPaySection(Document document, Map<String, Object> data) throws DocumentException {
        PdfPTable table = new PdfPTable(2);
        table.setWidthPercentage(100);
        table.setWidths(new float[]{3, 1});

        PdfPCell labelCell = new PdfPCell(new Phrase("NET PAY", new Font(Font.HELVETICA, 14, Font.BOLD, Color.WHITE)));
        labelCell.setBackgroundColor(PRIMARY_COLOR);
        labelCell.setPadding(10);
        table.addCell(labelCell);

        PdfPCell valueCell = new PdfPCell(new Phrase(getFormattedAmount(data, "netSalary"),
                new Font(Font.HELVETICA, 14, Font.BOLD, Color.WHITE)));
        valueCell.setBackgroundColor(PRIMARY_COLOR);
        valueCell.setPadding(10);
        valueCell.setHorizontalAlignment(Element.ALIGN_RIGHT);
        table.addCell(valueCell);

        document.add(table);
    }

    private void addTableHeader(PdfPTable table, String... headers) {
        for (String header : headers) {
            PdfPCell cell = new PdfPCell(new Phrase(header, HEADER_FONT));
            cell.setBackgroundColor(PRIMARY_COLOR);
            cell.setPadding(8);
            cell.setHorizontalAlignment(Element.ALIGN_CENTER);
            table.addCell(cell);
        }
    }

    private void addTableRow(PdfPTable table, String description, String amount) {
        PdfPCell descCell = new PdfPCell(new Phrase(description, NORMAL_FONT));
        descCell.setPadding(5);
        table.addCell(descCell);

        PdfPCell amountCell = new PdfPCell(new Phrase(amount, NORMAL_FONT));
        amountCell.setPadding(5);
        amountCell.setHorizontalAlignment(Element.ALIGN_RIGHT);
        table.addCell(amountCell);
    }

    private void addTableTotal(PdfPTable table, String label, String amount) {
        PdfPCell labelCell = new PdfPCell(new Phrase(label, SUBHEADER_FONT));
        labelCell.setBackgroundColor(LIGHT_GRAY);
        labelCell.setPadding(8);
        table.addCell(labelCell);

        PdfPCell amountCell = new PdfPCell(new Phrase(amount, SUBHEADER_FONT));
        amountCell.setBackgroundColor(LIGHT_GRAY);
        amountCell.setPadding(8);
        amountCell.setHorizontalAlignment(Element.ALIGN_RIGHT);
        table.addCell(amountCell);
    }

    private PdfPTable createAttendanceTable(Map<String, Object> data) throws DocumentException {
        PdfPTable table = new PdfPTable(5);
        table.setWidthPercentage(100);
        table.setWidths(new float[]{2, 2, 2, 2, 2});

        addTableHeader(table, "Date", "Check In", "Check Out", "Hours", "Status");

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> records = (List<Map<String, Object>>) data.get("records");
        if (records != null) {
            for (Map<String, Object> record : records) {
                addTableRow5Col(table,
                        getStringValue(record, "date", ""),
                        getStringValue(record, "checkIn", "-"),
                        getStringValue(record, "checkOut", "-"),
                        getStringValue(record, "hoursWorked", "-"),
                        getStringValue(record, "status", "")
                );
            }
        }

        return table;
    }

    private void addTableRow5Col(PdfPTable table, String... values) {
        for (String value : values) {
            PdfPCell cell = new PdfPCell(new Phrase(value, NORMAL_FONT));
            cell.setPadding(5);
            cell.setHorizontalAlignment(Element.ALIGN_CENTER);
            table.addCell(cell);
        }
    }

    private void addAttendanceSummary(Document document, Map<String, Object> data) throws DocumentException {
        PdfPTable summaryTable = new PdfPTable(4);
        summaryTable.setWidthPercentage(100);

        addSummaryCell(summaryTable, "Present Days", getStringValue(data, "presentDays", "0"));
        addSummaryCell(summaryTable, "Absent Days", getStringValue(data, "absentDays", "0"));
        addSummaryCell(summaryTable, "Late Days", getStringValue(data, "lateDays", "0"));
        addSummaryCell(summaryTable, "Total Hours", getStringValue(data, "totalHours", "0"));

        document.add(summaryTable);
    }

    private void addSummaryCell(PdfPTable table, String label, String value) {
        PdfPCell cell = new PdfPCell();
        cell.setBorder(Rectangle.BOX);
        cell.setPadding(10);
        cell.setBackgroundColor(LIGHT_GRAY);

        Paragraph labelPara = new Paragraph(label, SMALL_FONT);
        labelPara.setAlignment(Element.ALIGN_CENTER);
        cell.addElement(labelPara);

        Paragraph valuePara = new Paragraph(value, new Font(Font.HELVETICA, 16, Font.BOLD, PRIMARY_COLOR));
        valuePara.setAlignment(Element.ALIGN_CENTER);
        cell.addElement(valuePara);

        table.addCell(cell);
    }

    private PdfPTable createLeaveBalanceTable(Map<String, Object> data) throws DocumentException {
        PdfPTable table = new PdfPTable(4);
        table.setWidthPercentage(100);

        addTableHeader(table, "Leave Type", "Entitled", "Used", "Balance");

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> balances = (List<Map<String, Object>>) data.get("balances");
        if (balances != null) {
            for (Map<String, Object> balance : balances) {
                addTableRow5Col(table,
                        getStringValue(balance, "leaveType", ""),
                        getStringValue(balance, "entitled", "0"),
                        getStringValue(balance, "used", "0"),
                        getStringValue(balance, "balance", "0")
                );
            }
        }

        return table;
    }

    private PdfPTable createLeaveHistoryTable(Map<String, Object> data) throws DocumentException {
        PdfPTable table = new PdfPTable(5);
        table.setWidthPercentage(100);

        addTableHeader(table, "Type", "From", "To", "Days", "Status");

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> history = (List<Map<String, Object>>) data.get("history");
        if (history != null) {
            for (Map<String, Object> leave : history) {
                addTableRow5Col(table,
                        getStringValue(leave, "leaveType", ""),
                        getStringValue(leave, "fromDate", ""),
                        getStringValue(leave, "toDate", ""),
                        getStringValue(leave, "days", "0"),
                        getStringValue(leave, "status", "")
                );
            }
        }

        return table;
    }

    private void addLetterhead(Document document, Map<String, Object> data) throws DocumentException {
        String companyName = getStringValue(data, "companyName", "Company Name");
        String companyAddress = getStringValue(data, "companyAddress", "");

        Paragraph header = new Paragraph(companyName, TITLE_FONT);
        header.setAlignment(Element.ALIGN_CENTER);
        document.add(header);

        if (!companyAddress.isEmpty()) {
            Paragraph address = new Paragraph(companyAddress, SMALL_FONT);
            address.setAlignment(Element.ALIGN_CENTER);
            document.add(address);
        }

        document.add(Chunk.NEWLINE);
        document.add(new Paragraph("________________________________________________________________________"));
        document.add(Chunk.NEWLINE);
    }

    private void addSignature(Document document, Map<String, Object> data) throws DocumentException {
        Paragraph signature = new Paragraph("Yours sincerely,\n\n\n", NORMAL_FONT);
        document.add(signature);

        String signatoryName = getStringValue(data, "signatoryName", "HR Manager");
        String signatoryTitle = getStringValue(data, "signatoryTitle", "Human Resources");

        document.add(new Paragraph(signatoryName, SUBHEADER_FONT));
        document.add(new Paragraph(signatoryTitle, NORMAL_FONT));
    }

    private String getLetterBody(String letterType, Map<String, Object> data) {
        String employeeName = getStringValue(data, "employeeName", "Employee");
        String designation = getStringValue(data, "designation", "");
        String department = getStringValue(data, "department", "");
        String joiningDate = getStringValue(data, "joiningDate", "");
        String salary = getStringValue(data, "salary", "");

        return switch (letterType.toUpperCase()) {
            case "OFFER" -> String.format(
                    "Dear %s,\n\n" +
                    "We are pleased to offer you the position of %s in our %s department. " +
                    "Your employment will commence on %s.\n\n" +
                    "Your starting salary will be %s per annum, subject to statutory deductions.\n\n" +
                    "Please sign and return a copy of this letter as acceptance of this offer.\n\n" +
                    "We look forward to welcoming you to our team.",
                    employeeName, designation, department, joiningDate, salary
            );
            case "CONFIRMATION" -> String.format(
                    "Dear %s,\n\n" +
                    "We are pleased to confirm your employment with our organization as %s " +
                    "in the %s department, effective from %s.\n\n" +
                    "You have successfully completed your probation period and demonstrated " +
                    "excellent performance. We look forward to your continued contribution to the organization.\n\n" +
                    "Congratulations!",
                    employeeName, designation, department, joiningDate
            );
            case "EXPERIENCE" -> String.format(
                    "TO WHOM IT MAY CONCERN\n\n" +
                    "This is to certify that %s was employed with our organization as %s " +
                    "in the %s department from %s to %s.\n\n" +
                    "During their tenure, they demonstrated professionalism, dedication, and excellent work ethics. " +
                    "We wish them the very best in their future endeavors.",
                    employeeName, designation, department, joiningDate,
                    getStringValue(data, "lastWorkingDate", LocalDate.now().format(DateTimeFormatter.ISO_DATE))
            );
            case "RELIEVING" -> String.format(
                    "Dear %s,\n\n" +
                    "This is to confirm that you have been relieved from your duties as %s " +
                    "in the %s department, effective %s.\n\n" +
                    "All dues have been settled and you have completed the handover process. " +
                    "We thank you for your contributions and wish you success in your future endeavors.",
                    employeeName, designation, department,
                    getStringValue(data, "lastWorkingDate", LocalDate.now().format(DateTimeFormatter.ISO_DATE))
            );
            default -> getStringValue(data, "letterBody", "");
        };
    }

    private String formatLetterType(String letterType) {
        return switch (letterType.toUpperCase()) {
            case "OFFER" -> "Offer of Employment";
            case "CONFIRMATION" -> "Confirmation of Employment";
            case "EXPERIENCE" -> "Experience Certificate";
            case "RELIEVING" -> "Relieving Letter";
            case "SALARY_REVISION" -> "Salary Revision";
            case "PROMOTION" -> "Promotion Letter";
            default -> letterType.replace("_", " ");
        };
    }

    private void addAnalyticsSummary(Document document, Map<String, Object> data) throws DocumentException {
        String summary = getStringValue(data, "executiveSummary",
                "This report provides an overview of HR metrics for the specified period.");
        Paragraph summaryPara = new Paragraph(summary, NORMAL_FONT);
        summaryPara.setAlignment(Element.ALIGN_JUSTIFIED);
        document.add(summaryPara);
    }

    private PdfPTable createMetricsTable(Map<String, Object> data, String metricType) throws DocumentException {
        PdfPTable table = new PdfPTable(2);
        table.setWidthPercentage(100);

        addTableHeader(table, "Metric", "Value");

        @SuppressWarnings("unchecked")
        Map<String, Object> metrics = (Map<String, Object>) data.get(metricType + "Metrics");
        if (metrics != null) {
            for (Map.Entry<String, Object> entry : metrics.entrySet()) {
                addTableRow(table, formatMetricName(entry.getKey()), String.valueOf(entry.getValue()));
            }
        }

        return table;
    }

    private String formatMetricName(String name) {
        return name.replaceAll("([a-z])([A-Z])", "$1 $2")
                   .replaceAll("_", " ")
                   .substring(0, 1).toUpperCase() +
               name.replaceAll("([a-z])([A-Z])", "$1 $2")
                   .replaceAll("_", " ")
                   .substring(1);
    }

    private void addFooter(Document document) throws DocumentException {
        document.add(Chunk.NEWLINE);
        Paragraph footer = new Paragraph(
                "Generated on " + LocalDateTime.now().format(DateTimeFormatter.ofPattern("MMM dd, yyyy HH:mm")),
                SMALL_FONT
        );
        footer.setAlignment(Element.ALIGN_CENTER);
        document.add(footer);

        Paragraph disclaimer = new Paragraph(
                "This is a system-generated document. For queries, please contact HR.",
                SMALL_FONT
        );
        disclaimer.setAlignment(Element.ALIGN_CENTER);
        document.add(disclaimer);
    }

    private String getStringValue(Map<String, Object> data, String key, String defaultValue) {
        Object value = data.get(key);
        return value != null ? value.toString() : defaultValue;
    }

    private String getFormattedAmount(Map<String, Object> data, String key) {
        Object value = data.get(key);
        if (value == null) return "0.00";
        if (value instanceof Number) {
            return String.format("%.2f", ((Number) value).doubleValue());
        }
        return value.toString();
    }

    /**
     * Result of report generation.
     */
    @lombok.Builder
    @lombok.Data
    public static class ReportResult {
        private String reportType;
        private String filename;
        private String objectName;
        private String downloadUrl;
        private long size;
        private LocalDateTime generatedAt;
    }
}
