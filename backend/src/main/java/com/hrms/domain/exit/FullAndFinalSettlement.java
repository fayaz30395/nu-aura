package com.hrms.domain.exit;

import com.hrms.common.entity.TenantAware;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "full_and_final_settlements")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class FullAndFinalSettlement extends TenantAware {


    @Column(name = "exit_process_id", nullable = false)
    private UUID exitProcessId;

    @Column(name = "employee_id", nullable = false)
    private UUID employeeId;

    // Earnings
    @Column(name = "pending_salary", precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal pendingSalary = BigDecimal.ZERO;

    @Column(name = "leave_encashment", precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal leaveEncashment = BigDecimal.ZERO;

    @Column(name = "bonus_amount", precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal bonusAmount = BigDecimal.ZERO;

    @Column(name = "gratuity_amount", precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal gratuityAmount = BigDecimal.ZERO;

    @Column(name = "notice_period_recovery", precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal noticePeriodRecovery = BigDecimal.ZERO;

    @Column(name = "reimbursements", precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal reimbursements = BigDecimal.ZERO;

    @Column(name = "other_earnings", precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal otherEarnings = BigDecimal.ZERO;

    // Deductions
    @Column(name = "notice_buyout", precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal noticeBuyout = BigDecimal.ZERO;

    @Column(name = "loan_recovery", precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal loanRecovery = BigDecimal.ZERO;

    @Column(name = "advance_recovery", precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal advanceRecovery = BigDecimal.ZERO;

    @Column(name = "asset_damage_deduction", precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal assetDamageDeduction = BigDecimal.ZERO;

    @Column(name = "tax_deduction", precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal taxDeduction = BigDecimal.ZERO;

    @Column(name = "other_deductions", precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal otherDeductions = BigDecimal.ZERO;

    // Totals
    @Column(name = "total_earnings", precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal totalEarnings = BigDecimal.ZERO;

    @Column(name = "total_deductions", precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal totalDeductions = BigDecimal.ZERO;

    @Column(name = "net_payable", precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal netPayable = BigDecimal.ZERO;

    // Settlement details
    @Enumerated(EnumType.STRING)
    @Column(name = "status")
    @Builder.Default
    private SettlementStatus status = SettlementStatus.DRAFT;

    @Enumerated(EnumType.STRING)
    @Column(name = "payment_mode")
    private PaymentMode paymentMode;

    @Column(name = "payment_reference")
    private String paymentReference;

    @Column(name = "payment_date")
    private LocalDate paymentDate;

    @Column(name = "prepared_by")
    private UUID preparedBy;

    @Column(name = "approved_by")
    private UUID approvedBy;

    @Column(name = "approval_date")
    private LocalDate approvalDate;

    @Column(name = "remarks", columnDefinition = "TEXT")
    private String remarks;

    // Gratuity calculation fields
    @Column(name = "years_of_service", precision = 5, scale = 2)
    private BigDecimal yearsOfService;

    @Column(name = "is_gratuity_eligible")
    @Builder.Default
    private Boolean isGratuityEligible = false;

    @Column(name = "last_drawn_salary", precision = 12, scale = 2)
    private BigDecimal lastDrawnSalary;

    public enum SettlementStatus {
        DRAFT,
        PENDING_APPROVAL,
        APPROVED,
        PROCESSING,
        PAID,
        CANCELLED
    }

    public enum PaymentMode {
        BANK_TRANSFER,
        CHEQUE,
        CASH,
        DEMAND_DRAFT
    }

    public void calculateTotals() {
        this.totalEarnings = pendingSalary
                .add(leaveEncashment)
                .add(bonusAmount)
                .add(gratuityAmount)
                .add(noticePeriodRecovery)
                .add(reimbursements)
                .add(otherEarnings);

        this.totalDeductions = noticeBuyout
                .add(loanRecovery)
                .add(advanceRecovery)
                .add(assetDamageDeduction)
                .add(taxDeduction)
                .add(otherDeductions);

        this.netPayable = totalEarnings.subtract(totalDeductions);
    }

    public void calculateGratuity() {
        // India: Gratuity eligible after 5 years (240 days rule)
        if (yearsOfService != null && yearsOfService.compareTo(new BigDecimal("5")) >= 0) {
            this.isGratuityEligible = true;
            // Gratuity = (Last Drawn Salary × 15/26) × Years of Service
            if (lastDrawnSalary != null) {
                this.gratuityAmount = lastDrawnSalary
                        .multiply(new BigDecimal("15"))
                        .divide(new BigDecimal("26"), 2, java.math.RoundingMode.HALF_UP)
                        .multiply(yearsOfService)
                        .setScale(2, java.math.RoundingMode.HALF_UP);
            }
        }
    }
}
