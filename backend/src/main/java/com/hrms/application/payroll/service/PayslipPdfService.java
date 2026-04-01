package com.hrms.application.payroll.service;

import com.hrms.common.security.TenantContext;
import com.hrms.domain.employee.Employee;
import com.hrms.domain.payroll.Payslip;
import com.hrms.infrastructure.employee.repository.EmployeeRepository;
import com.hrms.infrastructure.payroll.repository.PayslipRepository;
import com.lowagie.text.*;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.Month;
import java.time.format.DateTimeFormatter;
import java.time.format.TextStyle;
import java.util.Locale;
import java.util.UUID;
import org.springframework.transaction.annotation.Transactional;

/**
 * Service for generating individual payslip PDFs
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class PayslipPdfService {

    private final PayslipRepository payslipRepository;
    private final EmployeeRepository employeeRepository;

    private static final Font TITLE_FONT = new Font(Font.HELVETICA, 20, Font.BOLD, new Color(33, 37, 41));
    private static final Font HEADER_FONT = new Font(Font.HELVETICA, 12, Font.BOLD, new Color(33, 37, 41));
    private static final Font SUBHEADER_FONT = new Font(Font.HELVETICA, 10, Font.BOLD, new Color(73, 80, 87));
    private static final Font LABEL_FONT = new Font(Font.HELVETICA, 10, Font.NORMAL, new Color(108, 117, 125));
    private static final Font VALUE_FONT = new Font(Font.HELVETICA, 10, Font.NORMAL, new Color(33, 37, 41));
    private static final Font AMOUNT_FONT = new Font(Font.HELVETICA, 10, Font.BOLD, new Color(33, 37, 41));
    private static final Color PRIMARY_COLOR = new Color(63, 81, 181);
    private static final Color BORDER_COLOR = new Color(222, 226, 230);

    /**
     * Generate PDF for a specific payslip
     */
    @Transactional(readOnly = true)
    public byte[] generatePayslipPdf(UUID payslipId) throws DocumentException {
        UUID tenantId = TenantContext.getCurrentTenant();

        Payslip payslip = payslipRepository.findById(payslipId)
                .filter(p -> p.getTenantId().equals(tenantId))
                .orElseThrow(() -> new IllegalArgumentException("Payslip not found"));

        Employee employee = employeeRepository.findByIdAndTenantId(payslip.getEmployeeId(), tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Employee not found"));

        return generatePdf(payslip, employee);
    }

    /**
     * Generate PDF for an employee's payslip for a specific month/year
     */
    @Transactional(readOnly = true)
    public byte[] generatePayslipPdf(UUID employeeId, int year, int month) throws DocumentException {
        UUID tenantId = TenantContext.getCurrentTenant();

        Payslip payslip = payslipRepository.findByEmployeeIdAndPayPeriodYearAndPayPeriodMonthAndTenantId(
                employeeId, year, month, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Payslip not found for the specified period"));

        Employee employee = employeeRepository.findByIdAndTenantId(employeeId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Employee not found"));

        return generatePdf(payslip, employee);
    }

    private byte[] generatePdf(Payslip payslip, Employee employee) throws DocumentException {
        Document document = new Document(PageSize.A4);
        ByteArrayOutputStream out = new ByteArrayOutputStream();

        try {
            PdfWriter.getInstance(document, out);
            document.open();

            // Add company header
            addCompanyHeader(document);

            // Add payslip title
            addPayslipTitle(document, payslip);

            // Add employee details section
            addEmployeeDetails(document, employee, payslip);

            // Add salary breakdown
            addSalaryBreakdown(document, payslip);

            // Add attendance summary
            addAttendanceSummary(document, payslip);

            // Add net pay section
            addNetPaySection(document, payslip);

            // Add footer
            addFooter(document);

            return out.toByteArray();
        } catch (RuntimeException e) {
            log.error("Error generating payslip PDF: {}", e.getMessage(), e);
            throw new DocumentException("Failed to generate payslip PDF: " + e.getMessage());
        } finally {
            if (document.isOpen()) document.close();
        }
    }

    private void addCompanyHeader(Document document) throws DocumentException {
        PdfPTable headerTable = new PdfPTable(1);
        headerTable.setWidthPercentage(100);

        PdfPCell companyCell = new PdfPCell();
        companyCell.setBorder(Rectangle.NO_BORDER);
        companyCell.setPadding(15f);
        companyCell.setBackgroundColor(PRIMARY_COLOR);

        Paragraph companyName = new Paragraph("COMPANY NAME", new Font(Font.HELVETICA, 18, Font.BOLD, Color.WHITE));
        companyName.setAlignment(Element.ALIGN_CENTER);
        companyCell.addElement(companyName);

        Paragraph companyAddress = new Paragraph("123 Business Street, City, State - 123456",
                new Font(Font.HELVETICA, 10, Font.NORMAL, Color.WHITE));
        companyAddress.setAlignment(Element.ALIGN_CENTER);
        companyCell.addElement(companyAddress);

        headerTable.addCell(companyCell);
        document.add(headerTable);
        document.add(new Paragraph(" "));
    }

    private void addPayslipTitle(Document document, Payslip payslip) throws DocumentException {
        String monthName = Month.of(payslip.getPayPeriodMonth()).getDisplayName(TextStyle.FULL, Locale.ENGLISH);
        Paragraph title = new Paragraph("PAYSLIP FOR " + monthName.toUpperCase() + " " + payslip.getPayPeriodYear(),
                TITLE_FONT);
        title.setAlignment(Element.ALIGN_CENTER);
        title.setSpacingAfter(20f);
        document.add(title);
    }

    private void addEmployeeDetails(Document document, Employee employee, Payslip payslip) throws DocumentException {
        PdfPTable table = new PdfPTable(4);
        table.setWidthPercentage(100);
        table.setSpacingAfter(20f);

        // Row 1
        addLabelValueCell(table, "Employee Code", employee.getEmployeeCode());
        addLabelValueCell(table, "Employee Name", getFullName(employee));

        // Row 2
        addLabelValueCell(table, "Designation", employee.getDesignation() != null ? employee.getDesignation() : "N/A");
        addLabelValueCell(table, "Department", "N/A"); // Would need to fetch department name

        // Row 3
        addLabelValueCell(table, "Date of Joining",
                employee.getJoiningDate() != null
                        ? employee.getJoiningDate().format(DateTimeFormatter.ofPattern("dd MMM yyyy"))
                        : "N/A");
        addLabelValueCell(table, "Pay Date",
                payslip.getPayDate() != null ? payslip.getPayDate().format(DateTimeFormatter.ofPattern("dd MMM yyyy"))
                        : "N/A");

        // Row 4
        addLabelValueCell(table, "Bank Account", maskBankAccount(employee.getBankAccountNumber()));
        addLabelValueCell(table, "PAN", employee.getTaxId() != null ? maskPan(employee.getTaxId()) : "N/A");

        document.add(table);
    }

    private void addSalaryBreakdown(Document document, Payslip payslip) throws DocumentException {
        PdfPTable mainTable = new PdfPTable(2);
        mainTable.setWidthPercentage(100);
        mainTable.setSpacingAfter(15f);

        // Earnings column
        PdfPCell earningsCell = new PdfPCell();
        earningsCell.setBorder(Rectangle.BOX);
        earningsCell.setBorderColor(BORDER_COLOR);
        earningsCell.setPadding(10f);

        Paragraph earningsTitle = new Paragraph("EARNINGS", HEADER_FONT);
        earningsTitle.setSpacingAfter(10f);
        earningsCell.addElement(earningsTitle);

        PdfPTable earningsTable = new PdfPTable(2);
        earningsTable.setWidthPercentage(100);

        addEarningRow(earningsTable, "Basic Salary", payslip.getBasicSalary());
        addEarningRow(earningsTable, "House Rent Allowance", payslip.getHra());
        addEarningRow(earningsTable, "Conveyance Allowance", payslip.getConveyanceAllowance());
        addEarningRow(earningsTable, "Medical Allowance", payslip.getMedicalAllowance());
        addEarningRow(earningsTable, "Special Allowance", payslip.getSpecialAllowance());
        addEarningRow(earningsTable, "Other Allowances", payslip.getOtherAllowances());

        // Gross total
        addTotalRow(earningsTable, "Gross Earnings", payslip.getGrossSalary());

        earningsCell.addElement(earningsTable);
        mainTable.addCell(earningsCell);

        // Deductions column
        PdfPCell deductionsCell = new PdfPCell();
        deductionsCell.setBorder(Rectangle.BOX);
        deductionsCell.setBorderColor(BORDER_COLOR);
        deductionsCell.setPadding(10f);

        Paragraph deductionsTitle = new Paragraph("DEDUCTIONS", HEADER_FONT);
        deductionsTitle.setSpacingAfter(10f);
        deductionsCell.addElement(deductionsTitle);

        PdfPTable deductionsTable = new PdfPTable(2);
        deductionsTable.setWidthPercentage(100);

        addEarningRow(deductionsTable, "Provident Fund", payslip.getProvidentFund());
        addEarningRow(deductionsTable, "Professional Tax", payslip.getProfessionalTax());
        addEarningRow(deductionsTable, "Income Tax (TDS)", payslip.getIncomeTax());
        addEarningRow(deductionsTable, "Other Deductions", payslip.getOtherDeductions());

        // Add empty rows for alignment
        addEarningRow(deductionsTable, "", null);
        addEarningRow(deductionsTable, "", null);

        // Total deductions
        addTotalRow(deductionsTable, "Total Deductions", payslip.getTotalDeductions());

        deductionsCell.addElement(deductionsTable);
        mainTable.addCell(deductionsCell);

        document.add(mainTable);
    }

    private void addAttendanceSummary(Document document, Payslip payslip) throws DocumentException {
        PdfPTable table = new PdfPTable(3);
        table.setWidthPercentage(100);
        table.setSpacingAfter(15f);

        PdfPCell headerCell = new PdfPCell(new Phrase("ATTENDANCE SUMMARY", SUBHEADER_FONT));
        headerCell.setColspan(3);
        headerCell.setBorder(Rectangle.BOTTOM);
        headerCell.setBorderColor(BORDER_COLOR);
        headerCell.setPaddingBottom(10f);
        table.addCell(headerCell);

        addAttendanceCell(table, "Working Days", payslip.getWorkingDays());
        addAttendanceCell(table, "Days Present", payslip.getPresentDays());
        addAttendanceCell(table, "Leave Days", payslip.getLeaveDays());

        document.add(table);
    }

    private void addNetPaySection(Document document, Payslip payslip) throws DocumentException {
        PdfPTable table = new PdfPTable(2);
        table.setWidthPercentage(100);
        table.setSpacingAfter(20f);

        PdfPCell labelCell = new PdfPCell(new Phrase("NET PAY", new Font(Font.HELVETICA, 14, Font.BOLD, Color.WHITE)));
        labelCell.setBackgroundColor(new Color(40, 167, 69));
        labelCell.setPadding(15f);
        labelCell.setHorizontalAlignment(Element.ALIGN_LEFT);
        table.addCell(labelCell);

        String netPayFormatted = formatCurrency(payslip.getNetSalary());
        PdfPCell valueCell = new PdfPCell(
                new Phrase(netPayFormatted, new Font(Font.HELVETICA, 14, Font.BOLD, Color.WHITE)));
        valueCell.setBackgroundColor(new Color(40, 167, 69));
        valueCell.setPadding(15f);
        valueCell.setHorizontalAlignment(Element.ALIGN_RIGHT);
        table.addCell(valueCell);

        document.add(table);

        // Add amount in words
        Paragraph inWords = new Paragraph("Amount in words: " + convertToWords(payslip.getNetSalary()), LABEL_FONT);
        inWords.setAlignment(Element.ALIGN_CENTER);
        inWords.setSpacingAfter(20f);
        document.add(inWords);
    }

    private void addFooter(Document document) throws DocumentException {
        Paragraph footer = new Paragraph("This is a computer-generated document. No signature is required.",
                new Font(Font.HELVETICA, 8, Font.ITALIC, new Color(108, 117, 125)));
        footer.setAlignment(Element.ALIGN_CENTER);
        footer.setSpacingBefore(30f);
        document.add(footer);

        Paragraph generated = new Paragraph(
                "Generated on: " + LocalDate.now().format(DateTimeFormatter.ofPattern("dd MMM yyyy")),
                new Font(Font.HELVETICA, 8, Font.NORMAL, new Color(108, 117, 125)));
        generated.setAlignment(Element.ALIGN_CENTER);
        document.add(generated);
    }

    // Helper methods
    private void addLabelValueCell(PdfPTable table, String label, String value) {
        PdfPCell labelCell = new PdfPCell(new Phrase(label, LABEL_FONT));
        labelCell.setBorder(Rectangle.NO_BORDER);
        labelCell.setPaddingBottom(5f);
        table.addCell(labelCell);

        PdfPCell valueCell = new PdfPCell(new Phrase(value != null ? value : "N/A", VALUE_FONT));
        valueCell.setBorder(Rectangle.NO_BORDER);
        valueCell.setPaddingBottom(5f);
        table.addCell(valueCell);
    }

    private void addEarningRow(PdfPTable table, String label, BigDecimal amount) {
        PdfPCell labelCell = new PdfPCell(new Phrase(label, LABEL_FONT));
        labelCell.setBorder(Rectangle.NO_BORDER);
        labelCell.setPaddingBottom(5f);
        table.addCell(labelCell);

        String amountStr = amount != null && amount.compareTo(BigDecimal.ZERO) > 0 ? formatCurrency(amount) : "-";
        PdfPCell valueCell = new PdfPCell(new Phrase(amountStr, AMOUNT_FONT));
        valueCell.setBorder(Rectangle.NO_BORDER);
        valueCell.setPaddingBottom(5f);
        valueCell.setHorizontalAlignment(Element.ALIGN_RIGHT);
        table.addCell(valueCell);
    }

    private void addTotalRow(PdfPTable table, String label, BigDecimal amount) {
        PdfPCell labelCell = new PdfPCell(new Phrase(label, new Font(Font.HELVETICA, 11, Font.BOLD, Color.WHITE)));
        labelCell.setBackgroundColor(PRIMARY_COLOR);
        labelCell.setPadding(8f);
        table.addCell(labelCell);

        PdfPCell valueCell = new PdfPCell(
                new Phrase(formatCurrency(amount), new Font(Font.HELVETICA, 11, Font.BOLD, Color.WHITE)));
        valueCell.setBackgroundColor(PRIMARY_COLOR);
        valueCell.setPadding(8f);
        valueCell.setHorizontalAlignment(Element.ALIGN_RIGHT);
        table.addCell(valueCell);
    }

    private void addAttendanceCell(PdfPTable table, String label, Integer value) {
        PdfPCell cell = new PdfPCell();
        cell.setBorder(Rectangle.NO_BORDER);
        cell.setPadding(10f);
        cell.setHorizontalAlignment(Element.ALIGN_CENTER);

        Paragraph labelPara = new Paragraph(label, LABEL_FONT);
        labelPara.setAlignment(Element.ALIGN_CENTER);
        cell.addElement(labelPara);

        Paragraph valuePara = new Paragraph(value != null ? String.valueOf(value) : "0",
                new Font(Font.HELVETICA, 16, Font.BOLD, PRIMARY_COLOR));
        valuePara.setAlignment(Element.ALIGN_CENTER);
        cell.addElement(valuePara);

        table.addCell(cell);
    }

    private String getFullName(Employee employee) {
        StringBuilder name = new StringBuilder(employee.getFirstName());
        if (employee.getMiddleName() != null && !employee.getMiddleName().isEmpty()) {
            name.append(" ").append(employee.getMiddleName());
        }
        if (employee.getLastName() != null && !employee.getLastName().isEmpty()) {
            name.append(" ").append(employee.getLastName());
        }
        return name.toString();
    }

    private String formatCurrency(BigDecimal amount) {
        if (amount == null)
            return "₹0.00";
        return String.format("₹%,.2f", amount);
    }

    private String maskBankAccount(String accountNumber) {
        if (accountNumber == null || accountNumber.length() < 4)
            return "N/A";
        return "XXXX" + accountNumber.substring(accountNumber.length() - 4);
    }

    private String maskPan(String pan) {
        if (pan == null || pan.length() < 4)
            return "N/A";
        return "XXXXXX" + pan.substring(pan.length() - 4);
    }

    private String convertToWords(BigDecimal amount) {
        if (amount == null)
            return "Zero Rupees Only";

        long rupees = amount.longValue();
        int paise = amount.remainder(BigDecimal.ONE).multiply(BigDecimal.valueOf(100)).intValue();

        String rupeesInWords = numberToWords(rupees);
        if (paise > 0) {
            return rupeesInWords + " Rupees and " + numberToWords(paise) + " Paise Only";
        }
        return rupeesInWords + " Rupees Only";
    }

    private String numberToWords(long number) {
        if (number == 0)
            return "Zero";

        String[] ones = { "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
                "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen" };
        String[] tens = { "", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety" };

        if (number < 20)
            return ones[(int) number];
        if (number < 100)
            return tens[(int) (number / 10)] + (number % 10 != 0 ? " " + ones[(int) (number % 10)] : "");
        if (number < 1000)
            return ones[(int) (number / 100)] + " Hundred"
                    + (number % 100 != 0 ? " " + numberToWords(number % 100) : "");
        if (number < 100000)
            return numberToWords(number / 1000) + " Thousand"
                    + (number % 1000 != 0 ? " " + numberToWords(number % 1000) : "");
        if (number < 10000000)
            return numberToWords(number / 100000) + " Lakh"
                    + (number % 100000 != 0 ? " " + numberToWords(number % 100000) : "");
        return numberToWords(number / 10000000) + " Crore"
                + (number % 10000000 != 0 ? " " + numberToWords(number % 10000000) : "");
    }
}
