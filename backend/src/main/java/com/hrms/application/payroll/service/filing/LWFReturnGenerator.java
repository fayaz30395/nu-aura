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
import java.util.*;

/**
 * Generates Labour Welfare Fund (LWF) return data in CSV format.
 *
 * <p>LWF is a state-level contribution applicable in certain states.
 * Contribution rates vary by state (e.g., Maharashtra: employee ₹6/half-year,
 * employer ₹18/half-year). This generator creates a CSV with employee details
 * and LWF contribution amounts for the reporting period.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class LWFReturnGenerator implements FilingFormatGenerator {

    private final PayslipRepository payslipRepository;
    private final ObjectMapper objectMapper;

    // Default LWF rates (Maharashtra) — these should ideally be configurable per tenant/state
    private static final BigDecimal LWF_EMPLOYEE_AMOUNT = new BigDecimal("6.00");
    private static final BigDecimal LWF_EMPLOYER_AMOUNT = new BigDecimal("18.00");

    @Override
    public FilingType getFilingType() {
        return FilingType.LWF_RETURN;
    }

    @Override
    public FilingGenerationResult generate(UUID tenantId, int month, int year) {
        // LWF is typically semi-annual (June and December)
        List<Payslip> payslips = payslipRepository.findByTenantIdAndPayPeriodMonthAndPayPeriodYear(
                tenantId, month, year);

        // Deduplicate by employeeId (one record per employee)
        Map<UUID, Payslip> uniqueEmployees = new LinkedHashMap<>();
        for (Payslip p : payslips) {
            uniqueEmployees.putIfAbsent(p.getEmployeeId(), p);
        }

        StringBuilder csv = new StringBuilder();
        csv.append("S.No,Employee ID,Employee Name,Employee Contribution,Employer Contribution,Total\n");

        int sno = 1;
        BigDecimal totalEmp = BigDecimal.ZERO;
        BigDecimal totalEmplr = BigDecimal.ZERO;

        for (Map.Entry<UUID, Payslip> entry : uniqueEmployees.entrySet()) {
            BigDecimal total = LWF_EMPLOYEE_AMOUNT.add(LWF_EMPLOYER_AMOUNT);
            csv.append(sno++).append(",")
               .append(entry.getKey()).append(",")
               .append("Employee-").append(entry.getKey()).append(",")
               .append(LWF_EMPLOYEE_AMOUNT).append(",")
               .append(LWF_EMPLOYER_AMOUNT).append(",")
               .append(total).append("\n");
            totalEmp = totalEmp.add(LWF_EMPLOYEE_AMOUNT);
            totalEmplr = totalEmplr.add(LWF_EMPLOYER_AMOUNT);
        }

        csv.append("\n");
        csv.append("TOTAL,,," + totalEmp + "," + totalEmplr + "," + totalEmp.add(totalEmplr) + "\n");

        byte[] fileBytes = csv.toString().getBytes(StandardCharsets.UTF_8);
        String fileName = String.format("LWF_Return_%d_%02d.csv", year, month);

        log.info("Generated LWF Return for tenant {} period {}/{}: {} employees",
                tenantId, month, year, uniqueEmployees.size());

        return new FilingGenerationResult(fileBytes, fileName, "text/csv", uniqueEmployees.size());
    }

    @Override
    public String validate(UUID tenantId, int month, int year) {
        List<Payslip> payslips = payslipRepository.findByTenantIdAndPayPeriodMonthAndPayPeriodYear(
                tenantId, month, year);

        List<Map<String, Object>> errors = new ArrayList<>();

        if (payslips.isEmpty()) {
            errors.add(Map.of(
                    "type", "ERROR",
                    "message", "No payslip data found for the selected period"
            ));
        }

        // LWF is typically filed semi-annually (June and December)
        if (month != 6 && month != 12) {
            errors.add(Map.of(
                    "type", "WARNING",
                    "message", "LWF is typically filed semi-annually (June and December)"
            ));
        }

        try {
            return objectMapper.writeValueAsString(errors);
        } catch (JsonProcessingException e) {
            return "[]";
        }
    }
}
