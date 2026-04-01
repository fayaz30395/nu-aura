package com.hrms.application.exit.dto;

import com.hrms.domain.exit.FullAndFinalSettlement;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Data
@Builder
public class FnFCalculationResponse {

    private UUID id;
    private UUID exitProcessId;
    private UUID employeeId;
    private String employeeName;

    // Earnings
    private BigDecimal pendingSalary;
    private BigDecimal leaveEncashment;
    private BigDecimal bonusAmount;
    private BigDecimal gratuityAmount;
    private BigDecimal noticePeriodRecovery;
    private BigDecimal reimbursements;
    private BigDecimal otherEarnings;

    // Deductions
    private BigDecimal noticeBuyout;
    private BigDecimal loanRecovery;
    private BigDecimal advanceRecovery;
    private BigDecimal assetDamageDeduction;
    private BigDecimal taxDeduction;
    private BigDecimal otherDeductions;

    // Totals
    private BigDecimal totalEarnings;
    private BigDecimal totalDeductions;
    private BigDecimal netPayable;

    // Gratuity info
    private BigDecimal yearsOfService;
    private Boolean isGratuityEligible;
    private BigDecimal lastDrawnSalary;

    // Settlement info
    private FullAndFinalSettlement.SettlementStatus status;
    private FullAndFinalSettlement.PaymentMode paymentMode;
    private String paymentReference;
    private LocalDate paymentDate;
    private String remarks;
    private LocalDate approvalDate;
}
