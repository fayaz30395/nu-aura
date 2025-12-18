package com.hrms.api.report.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PayrollReportRow {
    private UUID employeeId;
    private String employeeCode;
    private String employeeName;
    private String department;
    private String designation;
    private LocalDate payrollMonth;
    private BigDecimal basicSalary;
    private BigDecimal allowances;
    private BigDecimal deductions;
    private BigDecimal netSalary;
    private String paymentStatus;
    private LocalDate paymentDate;
}
