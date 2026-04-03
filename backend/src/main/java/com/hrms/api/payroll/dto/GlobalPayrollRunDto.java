package com.hrms.api.payroll.dto;

import com.hrms.domain.payroll.GlobalPayrollRun;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GlobalPayrollRunDto {

    private UUID id;
    private String runCode;
    private String description;
    private LocalDate payPeriodStart;
    private LocalDate payPeriodEnd;
    private LocalDate paymentDate;
    private String status;

    // Totals in base currency
    private BigDecimal totalGrossBase;
    private BigDecimal totalDeductionsBase;
    private BigDecimal totalNetBase;
    private BigDecimal totalEmployerCostBase;
    private String baseCurrency;

    // Counts
    private Integer employeeCount;
    private Integer locationCount;

    // Processing
    private LocalDateTime processedAt;
    private UUID processedBy;
    private LocalDateTime approvedAt;
    private UUID approvedBy;
    private Integer errorCount;
    private Integer warningCount;
    private String notes;

    // Breakdowns
    private List<CurrencyBreakdown> currencyBreakdowns;
    private List<LocationBreakdown> locationBreakdowns;

    private LocalDateTime createdAt;

    public static GlobalPayrollRunDto fromEntity(GlobalPayrollRun run) {
        return GlobalPayrollRunDto.builder()
                .id(run.getId())
                .runCode(run.getRunCode())
                .description(run.getDescription())
                .payPeriodStart(run.getPayPeriodStart())
                .payPeriodEnd(run.getPayPeriodEnd())
                .paymentDate(run.getPaymentDate())
                .status(run.getStatus() != null ? run.getStatus().name() : null)
                .totalGrossBase(run.getTotalGrossBase())
                .totalDeductionsBase(run.getTotalDeductionsBase())
                .totalNetBase(run.getTotalNetBase())
                .totalEmployerCostBase(run.getTotalEmployerCostBase())
                .baseCurrency(run.getBaseCurrency())
                .employeeCount(run.getEmployeeCount())
                .locationCount(run.getLocationCount())
                .processedAt(run.getProcessedAt())
                .processedBy(run.getProcessedBy())
                .approvedAt(run.getApprovedAt())
                .approvedBy(run.getApprovedBy())
                .errorCount(run.getErrorCount())
                .warningCount(run.getWarningCount())
                .notes(run.getNotes())
                .createdAt(run.getCreatedAt())
                .build();
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CurrencyBreakdown {
        private String currency;
        private BigDecimal grossPay;
        private BigDecimal netPay;
        private BigDecimal employerCost;
        private Integer employeeCount;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class LocationBreakdown {
        private String locationCode;
        private String locationName;
        private String currency;
        private BigDecimal grossPay;
        private BigDecimal netPay;
        private BigDecimal employerCost;
        private Integer employeeCount;
    }
}
