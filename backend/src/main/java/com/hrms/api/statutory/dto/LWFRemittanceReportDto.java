package com.hrms.api.statutory.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

/**
 * DTO for LWF remittance summary report.
 * Groups deductions by state for government filing.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LWFRemittanceReportDto {

    private Integer month;
    private Integer year;
    private BigDecimal totalEmployeeContribution;
    private BigDecimal totalEmployerContribution;
    private BigDecimal grandTotal;
    private Integer totalEmployees;
    private List<StateWiseSummary> stateWiseSummary;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class StateWiseSummary {
        private String stateCode;
        private String stateName;
        private BigDecimal employeeTotal;
        private BigDecimal employerTotal;
        private BigDecimal total;
        private Integer employeeCount;
    }
}
