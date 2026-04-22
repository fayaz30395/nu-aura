package com.hrms.application.payroll.service.filing;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.domain.payroll.Payslip;
import com.hrms.domain.payroll.StatutoryFilingTemplate.FilingType;
import com.hrms.infrastructure.payroll.repository.PayslipRepository;
import com.lowagie.text.Document;
import com.lowagie.text.DocumentException;
import com.lowagie.text.Element;
import com.lowagie.text.Font;
import com.lowagie.text.PageSize;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Phrase;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/**
 * Generates Form 16 (Annual TDS Certificate) as a PDF using OpenPDF.
 *
 * <p>Form 16 is issued by employers to employees as proof of TDS deducted
 * and deposited with the government. It is required for filing income tax returns.
 *
 * <p>This generates a summary PDF showing Part A (TDS details) and Part B
 * (income and deductions summary) for the financial year.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class Form16Generator implements FilingFormatGenerator {

    private static final Font TITLE_FONT = new Font(Font.HELVETICA, 16, Font.BOLD, Color.DARK_GRAY);
    private static final Font HEADER_FONT = new Font(Font.HELVETICA, 11, Font.BOLD, Color.WHITE);
    private static final Font SECTION_FONT = new Font(Font.HELVETICA, 12, Font.BOLD, Color.DARK_GRAY);
    private static final Font NORMAL_FONT = new Font(Font.HELVETICA, 10, Font.NORMAL, Color.BLACK);
    private static final Font SMALL_FONT = new Font(Font.HELVETICA, 8, Font.NORMAL, Color.GRAY);
    private static final Color PRIMARY_COLOR = new Color(41, 128, 185);
    private static final Color LIGHT_BG = new Color(245, 245, 245);
    private final PayslipRepository payslipRepository;
    private final ObjectMapper objectMapper;

    @Override
    public FilingType getFilingType() {
        return FilingType.FORM_16;
    }

    @Override
    public FilingGenerationResult generate(UUID tenantId, int month, int year) {
        // Form 16 is annual — month parameter is ignored; year = financial year start
        // Fetch all payslips for the financial year (April of year to March of year+1)
        List<Payslip> allPayslips = new ArrayList<>();
        for (int m = 4; m <= 12; m++) {
            allPayslips.addAll(payslipRepository.findByTenantIdAndPayPeriodMonthAndPayPeriodYear(
                    tenantId, m, year));
        }
        for (int m = 1; m <= 3; m++) {
            allPayslips.addAll(payslipRepository.findByTenantIdAndPayPeriodMonthAndPayPeriodYear(
                    tenantId, m, year + 1));
        }

        // Group by employee
        Map<UUID, List<Payslip>> byEmployee = new LinkedHashMap<>();
        for (Payslip p : allPayslips) {
            byEmployee.computeIfAbsent(p.getEmployeeId(), k -> new ArrayList<>()).add(p);
        }

        try {
            ByteArrayOutputStream bos = new ByteArrayOutputStream();
            Document document = new Document(PageSize.A4, 50, 50, 50, 50);
            PdfWriter.getInstance(document, bos);
            document.open();

            boolean first = true;
            for (Map.Entry<UUID, List<Payslip>> entry : byEmployee.entrySet()) {
                if (!first) {
                    document.newPage();
                }
                first = false;
                generateForm16ForEmployee(document, entry.getKey(), entry.getValue(), year);
            }

            document.close();

            String fileName = String.format("Form16_FY%d-%d.pdf", year, year + 1);
            log.info("Generated Form 16 for tenant {} FY {}-{}: {} employees",
                    tenantId, year, year + 1, byEmployee.size());

            return new FilingGenerationResult(
                    bos.toByteArray(), fileName, "application/pdf", byEmployee.size());

        } catch (DocumentException e) {
            log.error("Failed to generate Form 16 for tenant {}", tenantId, e);
            throw new RuntimeException("Failed to generate Form 16: " + e.getMessage(), e);
        }
    }

    private void generateForm16ForEmployee(Document document, UUID employeeId,
                                           List<Payslip> payslips, int year)
            throws DocumentException {

        // Title
        Paragraph title = new Paragraph("FORM No. 16", TITLE_FONT);
        title.setAlignment(Element.ALIGN_CENTER);
        document.add(title);

        Paragraph subtitle = new Paragraph(
                "[See rule 31(1)(a) of the Income-tax Rules, 1962]", SMALL_FONT);
        subtitle.setAlignment(Element.ALIGN_CENTER);
        document.add(subtitle);

        Paragraph fyLabel = new Paragraph(
                String.format("Financial Year: %d-%d  |  Assessment Year: %d-%d",
                        year, year + 1, year + 1, year + 2), NORMAL_FONT);
        fyLabel.setAlignment(Element.ALIGN_CENTER);
        fyLabel.setSpacingAfter(15f);
        document.add(fyLabel);

        // Part A — TDS Summary
        Paragraph partA = new Paragraph("Part A - Details of Tax Deducted and Deposited", SECTION_FONT);
        partA.setSpacingBefore(10f);
        partA.setSpacingAfter(5f);
        document.add(partA);

        PdfPTable tdsTable = new PdfPTable(4);
        tdsTable.setWidthPercentage(100);
        addHeaderCell(tdsTable, "Quarter");
        addHeaderCell(tdsTable, "Receipt No.");
        addHeaderCell(tdsTable, "Amount Deposited");
        addHeaderCell(tdsTable, "Date of Deposit");

        BigDecimal totalTds = BigDecimal.ZERO;
        // Summarize by quarter
        String[][] quarters = {
                {"Q1 (Apr-Jun)", "4", "5", "6"},
                {"Q2 (Jul-Sep)", "7", "8", "9"},
                {"Q3 (Oct-Dec)", "10", "11", "12"},
                {"Q4 (Jan-Mar)", "1", "2", "3"}
        };

        for (String[] q : quarters) {
            BigDecimal qtrTds = BigDecimal.ZERO;
            for (int i = 1; i < q.length; i++) {
                int m = Integer.parseInt(q[i]);
                for (Payslip p : payslips) {
                    if (p.getPayPeriodMonth() == m) {
                        BigDecimal tds = p.getIncomeTax() != null ? p.getIncomeTax() : BigDecimal.ZERO;
                        qtrTds = qtrTds.add(tds);
                    }
                }
            }
            totalTds = totalTds.add(qtrTds);
            addDataCell(tdsTable, q[0]);
            addDataCell(tdsTable, "Auto-generated");
            addDataCell(tdsTable, formatAmount(qtrTds));
            addDataCell(tdsTable, "End of quarter");
        }

        document.add(tdsTable);

        // Part B — Income Summary
        Paragraph partB = new Paragraph(
                "Part B - Details of Salary Paid and Tax Deducted", SECTION_FONT);
        partB.setSpacingBefore(15f);
        partB.setSpacingAfter(5f);
        document.add(partB);

        BigDecimal totalGross = BigDecimal.ZERO;
        BigDecimal totalPF = BigDecimal.ZERO;
        BigDecimal totalPT = BigDecimal.ZERO;

        for (Payslip p : payslips) {
            if (p.getGrossSalary() != null) totalGross = totalGross.add(p.getGrossSalary());
            if (p.getProvidentFund() != null) totalPF = totalPF.add(p.getProvidentFund());
            if (p.getProfessionalTax() != null) totalPT = totalPT.add(p.getProfessionalTax());
        }

        PdfPTable incomeTable = new PdfPTable(2);
        incomeTable.setWidthPercentage(100);
        incomeTable.setWidths(new float[]{3, 1});

        addIncomeRow(incomeTable, "1. Gross Salary", formatAmount(totalGross));
        addIncomeRow(incomeTable, "2. Less: Deduction u/s 80C (PF)", formatAmount(totalPF));
        addIncomeRow(incomeTable, "3. Less: Professional Tax u/s 16(iii)", formatAmount(totalPT));
        BigDecimal netTaxable = totalGross.subtract(totalPF).subtract(totalPT);
        addIncomeRow(incomeTable, "4. Net Taxable Income", formatAmount(netTaxable));
        addIncomeRow(incomeTable, "5. Tax Deducted at Source (TDS)", formatAmount(totalTds));

        document.add(incomeTable);

        // Footer
        Paragraph footer = new Paragraph(
                "\nThis is a system-generated Form 16. Please verify with actual TDS certificates.",
                SMALL_FONT);
        footer.setAlignment(Element.ALIGN_CENTER);
        footer.setSpacingBefore(20f);
        document.add(footer);
    }

    private void addHeaderCell(PdfPTable table, String text) {
        PdfPCell cell = new PdfPCell(new Phrase(text, HEADER_FONT));
        cell.setBackgroundColor(PRIMARY_COLOR);
        cell.setPadding(6);
        cell.setHorizontalAlignment(Element.ALIGN_CENTER);
        table.addCell(cell);
    }

    private void addDataCell(PdfPTable table, String text) {
        PdfPCell cell = new PdfPCell(new Phrase(text, NORMAL_FONT));
        cell.setPadding(5);
        cell.setHorizontalAlignment(Element.ALIGN_CENTER);
        table.addCell(cell);
    }

    private void addIncomeRow(PdfPTable table, String label, String amount) {
        PdfPCell labelCell = new PdfPCell(new Phrase(label, NORMAL_FONT));
        labelCell.setPadding(6);
        labelCell.setBackgroundColor(LIGHT_BG);
        table.addCell(labelCell);

        PdfPCell amountCell = new PdfPCell(new Phrase(amount, NORMAL_FONT));
        amountCell.setPadding(6);
        amountCell.setHorizontalAlignment(Element.ALIGN_RIGHT);
        table.addCell(amountCell);
    }

    private String formatAmount(BigDecimal amount) {
        if (amount == null) return "0.00";
        return String.format("%,.2f", amount);
    }

    @Override
    public String validate(UUID tenantId, int month, int year) {
        List<Payslip> allPayslips = new ArrayList<>();
        for (int m = 4; m <= 12; m++) {
            allPayslips.addAll(payslipRepository.findByTenantIdAndPayPeriodMonthAndPayPeriodYear(
                    tenantId, m, year));
        }
        for (int m = 1; m <= 3; m++) {
            allPayslips.addAll(payslipRepository.findByTenantIdAndPayPeriodMonthAndPayPeriodYear(
                    tenantId, m, year + 1));
        }

        List<Map<String, Object>> errors = new ArrayList<>();

        if (allPayslips.isEmpty()) {
            errors.add(Map.of(
                    "type", "ERROR",
                    "message", String.format("No payslips found for FY %d-%d", year, year + 1)
            ));
        }

        // Check for incomplete financial year
        Set<Integer> monthsCovered = new HashSet<>();
        for (Payslip p : allPayslips) {
            monthsCovered.add(p.getPayPeriodMonth());
        }

        if (monthsCovered.size() < 12) {
            errors.add(Map.of(
                    "type", "WARNING",
                    "message", String.format("Only %d months of payroll data found (expected 12)",
                            monthsCovered.size())
            ));
        }

        try {
            return objectMapper.writeValueAsString(errors);
        } catch (JsonProcessingException e) {
            return "[]";
        }
    }
}
