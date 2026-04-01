package com.hrms.domain.travel;

import com.hrms.common.entity.TenantAware;
import jakarta.persistence.*;
import org.hibernate.annotations.Where;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Where(clause = "is_deleted = false")
@Entity
@Table(name = "travel_expenses")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class TravelExpense extends TenantAware {


    @Column(name = "travel_request_id", nullable = false)
    private UUID travelRequestId;

    @Column(name = "employee_id", nullable = false)
    private UUID employeeId;

    @Enumerated(EnumType.STRING)
    @Column(name = "expense_type", nullable = false)
    private ExpenseType expenseType;

    @Column(name = "description")
    private String description;

    @Column(name = "expense_date")
    private LocalDate expenseDate;

    @Column(name = "amount", precision = 12, scale = 2, nullable = false)
    private BigDecimal amount;

    @Column(name = "currency")
    @Builder.Default
    private String currency = "INR";

    @Column(name = "exchange_rate", precision = 10, scale = 4)
    @Builder.Default
    private BigDecimal exchangeRate = BigDecimal.ONE;

    @Column(name = "amount_in_base_currency", precision = 12, scale = 2)
    private BigDecimal amountInBaseCurrency;

    @Column(name = "receipt_path")
    private String receiptPath;

    @Column(name = "receipt_number")
    private String receiptNumber;

    @Enumerated(EnumType.STRING)
    @Column(name = "status")
    @Builder.Default
    private ExpenseStatus status = ExpenseStatus.PENDING;

    @Column(name = "approved_amount", precision = 12, scale = 2)
    private BigDecimal approvedAmount;

    @Column(name = "approved_by")
    private UUID approvedBy;

    @Column(name = "approved_date")
    private LocalDate approvedDate;

    @Column(name = "rejection_reason")
    private String rejectionReason;

    @Column(name = "remarks")
    private String remarks;

    public enum ExpenseType {
        AIRFARE,
        TRAIN_FARE,
        BUS_FARE,
        CAB_TAXI,
        HOTEL,
        MEALS,
        LOCAL_TRANSPORT,
        VISA_FEE,
        TRAVEL_INSURANCE,
        COMMUNICATION,
        MISCELLANEOUS
    }

    public enum ExpenseStatus {
        PENDING,
        SUBMITTED,
        APPROVED,
        PARTIALLY_APPROVED,
        REJECTED,
        REIMBURSED
    }

    @PrePersist
    @PreUpdate
    public void calculateBaseCurrency() {
        if (amount != null && exchangeRate != null) {
            this.amountInBaseCurrency = amount.multiply(exchangeRate);
        }
    }
}
