package com.hrms.application.payroll.service.filing;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.domain.payroll.Payslip;
import com.hrms.domain.payroll.StatutoryFilingTemplate.FilingType;
import com.hrms.infrastructure.payroll.repository.PayslipRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Component;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.util.*;

/**
 * Generates Form 24Q (Quarterly TDS Return) data in Excel format.
 *
 * <p>Form 24Q is filed quarterly with the Income Tax department, declaring
 * the TDS deducted and deposited for all employees. This generates the
 * employee-wise annexure data required for e-filing.
 *
 * <p>Quarter mapping: Q1 = Apr-Jun, Q2 = Jul-Sep, Q3 = Oct-Dec, Q4 = Jan-Mar.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class Form24QGenerator implements FilingFormatGenerator {

    private final PayslipRepository payslipRepository;
    private final ObjectMapper objectMapper;

    @Override
    public FilingType getFilingType() {
        return FilingType.FORM_24Q;
    }

    @Override
    public FilingGenerationResult generate(UUID tenantId, int month, int year) {
        // Determine quarter from month parameter
        int quarter = getQuarter(month);
        int[][] monthsInQuarter = getMonthsForQuarter(quarter, year);

        List<Payslip> quarterPayslips = new ArrayList<>();
        for (int[] my : monthsInQuarter) {
            quarterPayslips.addAll(payslipRepository.findByTenantIdAndPayPeriodMonthAndPayPeriodYear(
                    tenantId, my[0], my[1]));
        }

        // Group by employee
        Map<UUID, List<Payslip>> byEmployee = new LinkedHashMap<>();
        for (Payslip p : quarterPayslips) {
            byEmployee.computeIfAbsent(p.getEmployeeId(), k -> new ArrayList<>()).add(p);
        }

        try (XSSFWorkbook workbook = new XSSFWorkbook()) {
            Sheet sheet = workbook.createSheet("Form 24Q - Q" + quarter);

            CellStyle headerStyle = workbook.createCellStyle();
            Font headerFont = workbook.createFont();
            headerFont.setBold(true);
            headerStyle.setFont(headerFont);

            Row headerRow = sheet.createRow(0);
            String[] headers = {
                "S.No", "Employee Code", "Employee Name", "PAN",
                "Gross Salary (Quarter)", "Total Deductions",
                "Taxable Income (Quarter)", "TDS Deducted (Quarter)",
                "TDS Deposited", "Date of Payment"
            };

            for (int i = 0; i < headers.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers[i]);
                cell.setCellStyle(headerStyle);
            }

            int rowNum = 1;
            int sno = 1;
            for (Map.Entry<UUID, List<Payslip>> entry : byEmployee.entrySet()) {
                Row row = sheet.createRow(rowNum++);
                List<Payslip> empPayslips = entry.getValue();

                BigDecimal qtrGross = BigDecimal.ZERO;
                BigDecimal qtrDeductions = BigDecimal.ZERO;
                BigDecimal qtrTds = BigDecimal.ZERO;

                for (Payslip p : empPayslips) {
                    if (p.getGrossSalary() != null) qtrGross = qtrGross.add(p.getGrossSalary());
                    if (p.getTotalDeductions() != null) qtrDeductions = qtrDeductions.add(p.getTotalDeductions());
                    if (p.getIncomeTax() != null) qtrTds = qtrTds.add(p.getIncomeTax());
                }

                BigDecimal taxableIncome = qtrGross.subtract(qtrDeductions);

                row.createCell(0).setCellValue(sno++);
                row.createCell(1).setCellValue(entry.getKey().toString().substring(0, 8));
                row.createCell(2).setCellValue("Employee-" + entry.getKey());
                row.createCell(3).setCellValue("PLACEHOLDER");
                row.createCell(4).setCellValue(qtrGross.doubleValue());
                row.createCell(5).setCellValue(qtrDeductions.doubleValue());
                row.createCell(6).setCellValue(taxableIncome.doubleValue());
                row.createCell(7).setCellValue(qtrTds.doubleValue());
                row.createCell(8).setCellValue(qtrTds.doubleValue());
                row.createCell(9).setCellValue("End of quarter");
            }

            for (int i = 0; i < headers.length; i++) {
                sheet.autoSizeColumn(i);
            }

            ByteArrayOutputStream bos = new ByteArrayOutputStream();
            workbook.write(bos);

            int fyStart = (quarter <= 3) ? year - 1 : year;
            String fileName = String.format("Form24Q_FY%d-%d_Q%d.xlsx", fyStart, fyStart + 1, quarter);
            log.info("Generated Form 24Q for tenant {} Q{} FY {}-{}: {} employees",
                    tenantId, quarter, fyStart, fyStart + 1, byEmployee.size());

            return new FilingGenerationResult(
                    bos.toByteArray(), fileName,
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    byEmployee.size()
            );
        } catch (IOException e) {
            log.error("Failed to generate Form 24Q for tenant {}", tenantId, e);
            throw new RuntimeException("Failed to generate Form 24Q: " + e.getMessage(), e);
        }
    }

    @Override
    public String validate(UUID tenantId, int month, int year) {
        int quarter = getQuarter(month);
        int[][] monthsInQuarter = getMonthsForQuarter(quarter, year);

        List<Payslip> quarterPayslips = new ArrayList<>();
        for (int[] my : monthsInQuarter) {
            quarterPayslips.addAll(payslipRepository.findByTenantIdAndPayPeriodMonthAndPayPeriodYear(
                    tenantId, my[0], my[1]));
        }

        List<Map<String, Object>> errors = new ArrayList<>();

        if (quarterPayslips.isEmpty()) {
            errors.add(Map.of(
                    "type", "ERROR",
                    "message", "No payslip data found for Q" + quarter
            ));
        }

        // Check for PAN numbers
        errors.add(Map.of(
                "type", "WARNING",
                "message", "PAN numbers are placeholders — verify employee PAN data before filing"
        ));

        try {
            return objectMapper.writeValueAsString(errors);
        } catch (JsonProcessingException e) {
            return "[]";
        }
    }

    /**
     * Get the financial year quarter (1-4) from a calendar month (1-12).
     * Q1=Apr-Jun (months 4-6), Q2=Jul-Sep (7-9), Q3=Oct-Dec (10-12), Q4=Jan-Mar (1-3).
     */
    private int getQuarter(int month) {
        if (month >= 4 && month <= 6) return 1;
        if (month >= 7 && month <= 9) return 2;
        if (month >= 10 && month <= 12) return 3;
        return 4; // Jan-Mar
    }

    /**
     * Returns [month, year] pairs for the given quarter.
     */
    private int[][] getMonthsForQuarter(int quarter, int year) {
        return switch (quarter) {
            case 1 -> new int[][]{{4, year}, {5, year}, {6, year}};
            case 2 -> new int[][]{{7, year}, {8, year}, {9, year}};
            case 3 -> new int[][]{{10, year}, {11, year}, {12, year}};
            case 4 -> new int[][]{{1, year + 1}, {2, year + 1}, {3, year + 1}};
            default -> new int[][]{};
        };
    }
}
