package com.hrms.api.exit.dto;

import com.hrms.domain.exit.FullAndFinalSettlement;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FullAndFinalSettlementRequest {
    @NotNull(message = "Exit process ID is required")
    private UUID exitProcessId;

    @NotNull(message = "Employee ID is required")
    private UUID employeeId;

    // Earnings
    @Min(value = 0, message = "Pending salary must be non-negative")
    private BigDecimal pendingSalary;
    @Min(value = 0, message = "Leave encashment must be non-negative")
    private BigDecimal leaveEncashment;
    @Min(value = 0, message = "Bonus amount must be non-negative")
    private BigDecimal bonusAmount;
    @Min(value = 0, message = "Gratuity amount must be non-negative")
    private BigDecimal gratuityAmount;
    @Min(value = 0, message = "Notice period recovery must be non-negative")
    private BigDecimal noticePeriodRecovery;
    @Min(value = 0, message = "Reimbursements must be non-negative")
    private BigDecimal reimbursements;
    @Min(value = 0, message = "Other earnings must be non-negative")
    private BigDecimal otherEarnings;

    // Deductions
    @Min(value = 0, message = "Notice buyout must be non-negative")
    private BigDecimal noticeBuyout;
    @Min(value = 0, message = "Loan recovery must be non-negative")
    private BigDecimal loanRecovery;
    @Min(value = 0, message = "Advance recovery must be non-negative")
    private BigDecimal advanceRecovery;
    @Min(value = 0, message = "Asset damage deduction must be non-negative")
    private BigDecimal assetDamageDeduction;
    @Min(value = 0, message = "Tax deduction must be non-negative")
    private BigDecimal taxDeduction;
    @Min(value = 0, message = "Other deductions must be non-negative")
    private BigDecimal otherDeductions;

    // Settlement details
    private FullAndFinalSettlement.SettlementStatus status;
    private FullAndFinalSettlement.PaymentMode paymentMode;

    @Size(max = 200, message = "Payment reference must not exceed 200 characters")
    private String paymentReference;
    private LocalDate paymentDate;

    @Size(max = 2000, message = "Remarks must not exceed 2000 characters")
    private String remarks;

    // Gratuity calculation
    @Min(value = 0, message = "Years of service must be non-negative")
    private BigDecimal yearsOfService;
    @Min(value = 0, message = "Last drawn salary must be non-negative")
    private BigDecimal lastDrawnSalary;
}
