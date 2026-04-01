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
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Generates Professional Tax (PT) challan data in CSV format.
 *
 * <p>PT is a state-level tax on employment. This generator creates a CSV file
 * listing each employee's salary and PT deduction for the given month,
 * along with a summary total for the challan submission.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class PTChallanGenerator implements FilingFormatGenerator {

    private final PayslipRepository payslipRepository;
    private final ObjectMapper objectMapper;

    @Override
    public FilingType getFilingType() {
        return FilingType.PT_CHALLAN;
    }

    @Override
    public FilingGenerationResult generate(UUID tenantId, int month, int year) {
        List<Payslip> payslips = payslipRepository.findByTenantIdAndPayPeriodMonthAndPayPeriodYear(
                tenantId, month, year);

        StringBuilder csv = new StringBuilder();
        csv.append("Employee ID,Employee Name,Gross Salary,Professional Tax,Period\n");

        BigDecimal totalPT = BigDecimal.ZERO;
        int count = 0;

        for (Payslip payslip : payslips) {
            BigDecimal pt = payslip.getProfessionalTax() != null
                    ? payslip.getProfessionalTax() : BigDecimal.ZERO;

            if (pt.compareTo(BigDecimal.ZERO) > 0) {
                csv.append(payslip.getEmployeeId()).append(",")
                   .append("Employee-").append(payslip.getEmployeeId()).append(",")
                   .append(payslip.getGrossSalary() != null ? payslip.getGrossSalary() : "0").append(",")
                   .append(pt).append(",")
                   .append(String.format("%02d/%d", month, year)).append("\n");
                totalPT = totalPT.add(pt);
                count++;
            }
        }

        csv.append("\n");
        csv.append("TOTAL,,," + totalPT + ",\n");
        csv.append("Total Employees:," + count + ",,,\n");

        byte[] fileBytes = csv.toString().getBytes(StandardCharsets.UTF_8);
        String fileName = String.format("PT_Challan_%d_%02d.csv", year, month);

        log.info("Generated PT Challan for tenant {} period {}/{}: {} records, total PT: {}",
                tenantId, month, year, count, totalPT);

        return new FilingGenerationResult(fileBytes, fileName, "text/csv", count);
    }

    @Override
    public String validate(UUID tenantId, int month, int year) {
        List<Payslip> payslips = payslipRepository.findByTenantIdAndPayPeriodMonthAndPayPeriodYear(
                tenantId, month, year);

        List<Map<String, Object>> errors = new ArrayList<>();

        long ptCount = payslips.stream()
                .filter(p -> p.getProfessionalTax() != null && p.getProfessionalTax().compareTo(BigDecimal.ZERO) > 0)
                .count();

        if (ptCount == 0) {
            errors.add(Map.of(
                    "type", "WARNING",
                    "message", "No employees have professional tax deductions for this period"
            ));
        }

        try {
            return objectMapper.writeValueAsString(errors);
        } catch (JsonProcessingException e) {
            return "[]";
        }
    }
}
