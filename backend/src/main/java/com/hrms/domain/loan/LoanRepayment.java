package com.hrms.domain.loan;

import com.hrms.common.entity.TenantAware;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "loan_repayments")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class LoanRepayment extends TenantAware {


    @Column(name = "loan_id", nullable = false)
    private UUID loanId;

    @Column(name = "employee_id", nullable = false)
    private UUID employeeId;

    @Column(name = "installment_number")
    private Integer installmentNumber;

    @Column(name = "due_date")
    private LocalDate dueDate;

    @Column(name = "payment_date")
    private LocalDate paymentDate;

    @Column(name = "principal_amount", precision = 12, scale = 2)
    private BigDecimal principalAmount;

    @Column(name = "interest_amount", precision = 12, scale = 2)
    private BigDecimal interestAmount;

    @Column(name = "total_amount", precision = 12, scale = 2)
    private BigDecimal totalAmount;

    @Column(name = "paid_amount", precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal paidAmount = BigDecimal.ZERO;

    @Column(name = "outstanding_after_payment", precision = 12, scale = 2)
    private BigDecimal outstandingAfterPayment;

    @Enumerated(EnumType.STRING)
    @Column(name = "status")
    @Builder.Default
    private RepaymentStatus status = RepaymentStatus.PENDING;

    @Enumerated(EnumType.STRING)
    @Column(name = "payment_mode")
    private PaymentMode paymentMode;

    @Column(name = "payment_reference")
    private String paymentReference;

    @Column(name = "payroll_run_id")
    private UUID payrollRunId;

    @Column(name = "is_prepayment")
    @Builder.Default
    private Boolean isPrepayment = false;

    @Column(name = "late_fee", precision = 10, scale = 2)
    @Builder.Default
    private BigDecimal lateFee = BigDecimal.ZERO;

    @Column(name = "remarks")
    private String remarks;

    public enum RepaymentStatus {
        PENDING,
        PAID,
        PARTIAL,
        OVERDUE,
        WAIVED
    }

    public enum PaymentMode {
        SALARY_DEDUCTION,
        BANK_TRANSFER,
        CASH,
        CHEQUE
    }
}
