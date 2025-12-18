package com.hrms.api.exit.dto;

import com.hrms.domain.exit.FullAndFinalSettlement;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FullAndFinalSettlementRequest {
    private UUID exitProcessId;
    private UUID employeeId;

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

    // Settlement details
    private FullAndFinalSettlement.SettlementStatus status;
    private FullAndFinalSettlement.PaymentMode paymentMode;
    private String paymentReference;
    private LocalDate paymentDate;
    private String remarks;

    // Gratuity calculation
    private BigDecimal yearsOfService;
    private BigDecimal lastDrawnSalary;
}
