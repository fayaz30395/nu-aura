package com.nulogic.application.exit.dto;

import com.nulogic.domain.exit.FullAndFinalSettlement;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class FnFAdjustmentRequest {

    private BigDecimal noticeBuyout;
    private BigDecimal loanRecovery;
    private BigDecimal advanceRecovery;
    private BigDecimal assetDamageDeduction;
    private BigDecimal taxDeduction;
    private BigDecimal otherDeductions;
    private BigDecimal otherEarnings;
    private BigDecimal reimbursements;
    private String remarks;
    private FullAndFinalSettlement.PaymentMode paymentMode;
}
