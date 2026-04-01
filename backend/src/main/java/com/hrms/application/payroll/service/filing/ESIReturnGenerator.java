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
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Generates ESI (Employee State Insurance) return file in Excel format.
 *
 * <p>The ESIC portal accepts an Excel file with employee-wise contribution details.
 * Columns: IP Number, IP Name, No of Days, Total Wages, Employee Contribution (0.75%),
 * Employer Contribution (3.25%), Total Contribution.
 *
 * <p>ESI is applicable only when gross salary <= ₹21,000/month.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class ESIReturnGenerator implements FilingFormatGenerator {

    private final PayslipRepository payslipRepository;
    private final ObjectMapper objectMapper;

    private static final BigDecimal ESI_GROSS_CEILING = new BigDecimal("21000");
    private static final BigDecimal ESI_EMPLOYEE_RATE = new BigDecimal("0.0075");
    private static final BigDecimal ESI_EMPLOYER_RATE = new BigDecimal("0.0325");

    @Override
    public FilingType getFilingType() {
        return FilingType.ESI_RETURN;
    }

    @Override
    public FilingGenerationResult generate(UUID tenantId, int month, int year) {
        List<Payslip> payslips = payslipRepository.findByTenantIdAndPayPeriodMonthAndPayPeriodYear(
                tenantId, month, year);

        // Filter to ESI-eligible employees (gross <= ceiling)
        List<Payslip> esiEligible = payslips.stream()
                .filter(p -> p.getGrossSalary() != null
                        && p.getGrossSalary().compareTo(ESI_GROSS_CEILING) <= 0)
                .toList();

        try (XSSFWorkbook workbook = new XSSFWorkbook()) {
            Sheet sheet = workbook.createSheet("ESI Return");

            // Header row
            CellStyle headerStyle = workbook.createCellStyle();
            Font headerFont = workbook.createFont();
            headerFont.setBold(true);
            headerStyle.setFont(headerFont);

            Row headerRow = sheet.createRow(0);
            String[] headers = {
                "IP Number", "IP Name", "No of Days Worked",
                "Total Wages (INR)", "Employee Contribution (0.75%)",
                "Employer Contribution (3.25%)", "Total Contribution"
            };
            for (int i = 0; i < headers.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers[i]);
                cell.setCellStyle(headerStyle);
            }

            // Data rows
            int rowNum = 1;
            for (Payslip payslip : esiEligible) {
                Row row = sheet.createRow(rowNum++);
                BigDecimal grossWages = payslip.getGrossSalary();
                BigDecimal empContrib = grossWages.multiply(ESI_EMPLOYEE_RATE)
                        .setScale(2, RoundingMode.HALF_UP);
                BigDecimal emplerContrib = grossWages.multiply(ESI_EMPLOYER_RATE)
                        .setScale(2, RoundingMode.HALF_UP);
                BigDecimal totalContrib = empContrib.add(emplerContrib);
                int daysWorked = payslip.getPresentDays() != null ? payslip.getPresentDays() : 0;

                row.createCell(0).setCellValue(payslip.getEmployeeId().toString().substring(0, 10));
                row.createCell(1).setCellValue("Employee-" + payslip.getEmployeeId());
                row.createCell(2).setCellValue(daysWorked);
                row.createCell(3).setCellValue(grossWages.doubleValue());
                row.createCell(4).setCellValue(empContrib.doubleValue());
                row.createCell(5).setCellValue(emplerContrib.doubleValue());
                row.createCell(6).setCellValue(totalContrib.doubleValue());
            }

            // Auto-size columns
            for (int i = 0; i < headers.length; i++) {
                sheet.autoSizeColumn(i);
            }

            ByteArrayOutputStream bos = new ByteArrayOutputStream();
            workbook.write(bos);

            String fileName = String.format("ESI_Return_%d_%02d.xlsx", year, month);
            log.info("Generated ESI Return for tenant {} period {}/{}: {} records",
                    tenantId, month, year, esiEligible.size());

            return new FilingGenerationResult(
                    bos.toByteArray(), fileName,
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    esiEligible.size()
            );
        } catch (IOException e) {
            log.error("Failed to generate ESI return for tenant {}", tenantId, e);
            throw new RuntimeException("Failed to generate ESI return: " + e.getMessage(), e);
        }
    }

    @Override
    public String validate(UUID tenantId, int month, int year) {
        List<Payslip> payslips = payslipRepository.findByTenantIdAndPayPeriodMonthAndPayPeriodYear(
                tenantId, month, year);

        List<Map<String, Object>> errors = new ArrayList<>();

        List<Payslip> esiEligible = payslips.stream()
                .filter(p -> p.getGrossSalary() != null
                        && p.getGrossSalary().compareTo(ESI_GROSS_CEILING) <= 0)
                .toList();

        if (esiEligible.isEmpty()) {
            errors.add(Map.of(
                    "type", "WARNING",
                    "message", "No ESI-eligible employees found (all gross > ₹21,000)"
            ));
        }

        for (int i = 0; i < esiEligible.size(); i++) {
            Payslip payslip = esiEligible.get(i);
            if (payslip.getPresentDays() == null || payslip.getPresentDays() == 0) {
                errors.add(Map.of(
                        "type", "WARNING",
                        "row", i + 1,
                        "field", "presentDays",
                        "employeeId", payslip.getEmployeeId().toString(),
                        "message", "Days worked is missing or zero"
                ));
            }
        }

        try {
            return objectMapper.writeValueAsString(errors);
        } catch (JsonProcessingException e) {
            return "[]";
        }
    }
}
