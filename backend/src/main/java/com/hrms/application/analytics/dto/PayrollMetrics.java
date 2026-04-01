package com.hrms.application.analytics.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

/**
 * Payroll-related metrics DTO.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PayrollMetrics {
    private int year;
    private int month;
    private BigDecimal totalGrossSalary;
    private BigDecimal totalNetSalary;
    private BigDecimal totalDeductions;
    private long employeesPaid;
    private List<MonthlyPayroll> monthlyTrend;
}

record MonthlyPayroll(int year, int month, BigDecimal gross, BigDecimal net) {}
