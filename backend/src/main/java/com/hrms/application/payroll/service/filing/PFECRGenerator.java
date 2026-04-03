package com.hrms.application.payroll.service.filing;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.domain.payroll.Payslip;
import com.hrms.domain.payroll.StatutoryFilingTemplate.FilingType;
import com.hrms.infrastructure.payroll.repository.PayslipRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Generates PF ECR (Electronic Challan-cum-Return) file for EPFO portal upload.
 *
 * <p>The EPFO portal expects a pipe-delimited text file with these columns:
 * <ol>
 *   <li>UAN</li>
 *   <li>Member Name</li>
 *   <li>Gross Wages</li>
 *   <li>EPF Wages (capped at ₹15,000)</li>
 *   <li>EPS Wages (capped at ₹15,000)</li>
 *   <li>EDLI Wages (capped at ₹15,000)</li>
 *   <li>EPF Contribution (Employee 12%)</li>
 *   <li>EPS Contribution (Employer 8.33%, from EPF wage)</li>
 *   <li>EPF Contribution Difference (Employer share = 12% - 8.33% = 3.67%)</li>
 *   <li>NCP Days (Non-Contributing Period days)</li>
 *   <li>Refund of Advances</li>
 * </ol>
 *
 * <p>Reference: EPFO Unified Portal ECR file format specification.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class PFECRGenerator implements FilingFormatGenerator {

    private static final BigDecimal PF_WAGE_CEILING = new BigDecimal("15000");
    private static final BigDecimal EPF_RATE = new BigDecimal("0.12");
    private static final BigDecimal EPS_RATE = new BigDecimal("0.0833");
    private static final String PIPE = "#~#";
    private final PayslipRepository payslipRepository;
    private final ObjectMapper objectMapper;

    @Override
    public FilingType getFilingType() {
        return FilingType.PF_ECR;
    }

    @Override
    public FilingGenerationResult generate(UUID tenantId, int month, int year) {
        List<Payslip> payslips = payslipRepository.findByTenantIdAndPayPeriodMonthAndPayPeriodYear(
                tenantId, month, year);

        if (payslips.isEmpty()) {
            log.warn("No payslips found for tenant {} period {}/{}", tenantId, month, year);
            return new FilingGenerationResult(
                    new byte[0],
                    generateFileName(month, year),
                    "text/plain",
                    0
            );
        }

        StringBuilder sb = new StringBuilder();

        for (Payslip payslip : payslips) {
            BigDecimal grossWages = payslip.getGrossSalary() != null
                    ? payslip.getGrossSalary() : BigDecimal.ZERO;
            BigDecimal basicSalary = payslip.getBasicSalary() != null
                    ? payslip.getBasicSalary() : BigDecimal.ZERO;

            // EPF wages capped at ceiling
            BigDecimal epfWages = basicSalary.min(PF_WAGE_CEILING);
            BigDecimal epsWages = epfWages;
            BigDecimal edliWages = epfWages;

            // Employee EPF contribution = 12% of EPF wages
            BigDecimal epfContribution = epfWages.multiply(EPF_RATE)
                    .setScale(0, RoundingMode.HALF_UP);

            // Employer EPS contribution = 8.33% of EPS wages
            BigDecimal epsContribution = epsWages.multiply(EPS_RATE)
                    .setScale(0, RoundingMode.HALF_UP);

            // Employer EPF difference = 12% - 8.33% = 3.67% of EPF wages
            BigDecimal epfDifference = epfWages.multiply(EPF_RATE).subtract(epsContribution)
                    .setScale(0, RoundingMode.HALF_UP);

            // NCP days = working days - present days
            int ncpDays = 0;
            if (payslip.getWorkingDays() != null && payslip.getPresentDays() != null) {
                ncpDays = Math.max(0, payslip.getWorkingDays() - payslip.getPresentDays());
            }

            // UAN placeholder — in production, this comes from Employee statutory details
            String uan = payslip.getEmployeeId().toString().substring(0, 12).replaceAll("-", "");

            sb.append(uan).append(PIPE)                                        // UAN
                    .append("Employee-").append(payslip.getEmployeeId()).append(PIPE) // Member Name
                    .append(grossWages.setScale(0, RoundingMode.HALF_UP)).append(PIPE)    // Gross Wages
                    .append(epfWages.setScale(0, RoundingMode.HALF_UP)).append(PIPE)      // EPF Wages
                    .append(epsWages.setScale(0, RoundingMode.HALF_UP)).append(PIPE)      // EPS Wages
                    .append(edliWages.setScale(0, RoundingMode.HALF_UP)).append(PIPE)     // EDLI Wages
                    .append(epfContribution).append(PIPE)                            // EPF Contribution (Employee)
                    .append(epsContribution).append(PIPE)                            // EPS Contribution (Employer)
                    .append(epfDifference).append(PIPE)                              // EPF Difference (Employer)
                    .append(ncpDays).append(PIPE)                                    // NCP Days
                    .append(0)                                                       // Refund of Advances
                    .append("\n");
        }

        byte[] fileBytes = sb.toString().getBytes(StandardCharsets.UTF_8);
        String fileName = generateFileName(month, year);

        log.info("Generated PF ECR for tenant {} period {}/{}: {} records",
                tenantId, month, year, payslips.size());

        return new FilingGenerationResult(fileBytes, fileName, "text/plain", payslips.size());
    }

    @Override
    public String validate(UUID tenantId, int month, int year) {
        List<Payslip> payslips = payslipRepository.findByTenantIdAndPayPeriodMonthAndPayPeriodYear(
                tenantId, month, year);

        List<Map<String, Object>> errors = new ArrayList<>();

        if (payslips.isEmpty()) {
            errors.add(Map.of(
                    "type", "ERROR",
                    "message", "No payslips found for the selected period"
            ));
        }

        for (int i = 0; i < payslips.size(); i++) {
            Payslip payslip = payslips.get(i);
            int row = i + 1;

            if (payslip.getBasicSalary() == null || payslip.getBasicSalary().compareTo(BigDecimal.ZERO) <= 0) {
                errors.add(Map.of(
                        "type", "ERROR",
                        "row", row,
                        "field", "basicSalary",
                        "employeeId", payslip.getEmployeeId().toString(),
                        "message", "Basic salary is missing or zero"
                ));
            }

            if (payslip.getGrossSalary() == null || payslip.getGrossSalary().compareTo(BigDecimal.ZERO) <= 0) {
                errors.add(Map.of(
                        "type", "ERROR",
                        "row", row,
                        "field", "grossSalary",
                        "employeeId", payslip.getEmployeeId().toString(),
                        "message", "Gross salary is missing or zero"
                ));
            }

            // Warning: UAN placeholder — in a real system this would check the employee's actual UAN
            errors.add(Map.of(
                    "type", "WARNING",
                    "row", row,
                    "field", "uan",
                    "employeeId", payslip.getEmployeeId().toString(),
                    "message", "UAN is auto-generated placeholder — verify against EPFO records"
            ));
        }

        try {
            return objectMapper.writeValueAsString(errors);
        } catch (JsonProcessingException e) {
            log.error("Failed to serialize validation errors", e);
            return "[]";
        }
    }

    private String generateFileName(int month, int year) {
        return String.format("PF_ECR_%d_%02d.txt", year, month);
    }
}
