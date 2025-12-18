package com.hrms.api.exit.dto;

import com.hrms.domain.exit.FullAndFinalSettlement;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FullAndFinalSettlementResponse {
    private UUID id;
    private UUID tenantId;
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

    // Settlement details
    private FullAndFinalSettlement.SettlementStatus status;
    private FullAndFinalSettlement.PaymentMode paymentMode;
    private String paymentReference;
    private LocalDate paymentDate;
    private UUID preparedBy;
    private String preparedByName;
    private UUID approvedBy;
    private String approvedByName;
    private LocalDate approvalDate;
    private String remarks;

    // Gratuity
    private BigDecimal yearsOfService;
    private Boolean isGratuityEligible;
    private BigDecimal lastDrawnSalary;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
