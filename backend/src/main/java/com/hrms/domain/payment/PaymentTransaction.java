package com.hrms.domain.payment;

import com.hrms.common.converter.EncryptedStringConverter;
import com.hrms.common.entity.TenantAware;
import jakarta.persistence.*;
import org.hibernate.annotations.Where;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.EnumMap;
import java.util.EnumSet;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Where(clause = "is_deleted = false")
@Entity
@Table(name = "payment_transactions", indexes = {
        @Index(name = "idx_payment_transaction_tenant", columnList = "tenantId"),
        @Index(name = "idx_payment_transaction_ref", columnList = "tenantId,transactionRef", unique = true),
        @Index(name = "idx_payment_transaction_external_ref", columnList = "externalRef"),
        @Index(name = "idx_payment_transaction_type", columnList = "tenantId,type"),
        @Index(name = "idx_payment_transaction_status", columnList = "tenantId,status"),
        @Index(name = "idx_payment_transaction_employee", columnList = "tenantId,employeeId"),
        @Index(name = "idx_payment_transaction_payroll", columnList = "payrollRunId")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class PaymentTransaction extends TenantAware {

    @Column(nullable = false, length = 100)
    private String transactionRef;

    @Column(length = 255)
    private String externalRef;

    @Column(nullable = false, length = 50)
    @Enumerated(EnumType.STRING)
    private PaymentType type;

    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal amount;

    @Builder.Default
    @Column(nullable = false, length = 3)
    private String currency = "INR";

    @Builder.Default
    @Column(nullable = false, length = 50)
    @Enumerated(EnumType.STRING)
    private PaymentStatus status = PaymentStatus.INITIATED;

    @Column
    private UUID employeeId;

    @Column
    private UUID payrollRunId;

    @Column
    private UUID expenseClaimId;

    @Column
    private UUID loanId;

    @Column(nullable = false, length = 50)
    @Enumerated(EnumType.STRING)
    private PaymentProvider provider;

    @Convert(converter = EncryptedStringConverter.class)
    @Column(length = 255)
    private String recipientAccountNumber;

    @Convert(converter = EncryptedStringConverter.class)
    @Column(length = 11)
    private String recipientIfsc;

    @Column(length = 255)
    private String recipientName;

    @Column(columnDefinition = "JSONB")
    private String metadata;

    @Column(columnDefinition = "TEXT")
    private String failedReason;

    @Column(nullable = false)
    private LocalDateTime initiatedAt;

    @Column
    private LocalDateTime completedAt;

    @Column
    private LocalDateTime refundedAt;

    public enum PaymentType {
        PAYROLL,
        EXPENSE_REIMBURSEMENT,
        LOAN,
        BENEFIT_PAYMENT,
        OTHER
    }

    public enum PaymentStatus {
        INITIATED,
        PROCESSING,
        COMPLETED,
        FAILED,
        REFUNDED,
        PARTIAL_REFUND,
        REVERSED;

        /**
         * Valid state transitions for the payment state machine.
         * Prevents invalid transitions (e.g., FAILED → COMPLETED).
         */
        private static final Map<PaymentStatus, Set<PaymentStatus>> VALID_TRANSITIONS;

        static {
            VALID_TRANSITIONS = new EnumMap<>(PaymentStatus.class);
            VALID_TRANSITIONS.put(INITIATED, EnumSet.of(PROCESSING, FAILED));
            VALID_TRANSITIONS.put(PROCESSING, EnumSet.of(COMPLETED, FAILED));
            VALID_TRANSITIONS.put(COMPLETED, EnumSet.of(REFUNDED, PARTIAL_REFUND, REVERSED));
            VALID_TRANSITIONS.put(FAILED, EnumSet.noneOf(PaymentStatus.class)); // terminal
            VALID_TRANSITIONS.put(REFUNDED, EnumSet.noneOf(PaymentStatus.class)); // terminal
            VALID_TRANSITIONS.put(PARTIAL_REFUND, EnumSet.of(REFUNDED)); // can fully refund later
            VALID_TRANSITIONS.put(REVERSED, EnumSet.noneOf(PaymentStatus.class)); // terminal
        }

        /**
         * Check whether transitioning from this status to the target is valid.
         */
        public boolean canTransitionTo(PaymentStatus target) {
            Set<PaymentStatus> allowed = VALID_TRANSITIONS.get(this);
            return allowed != null && allowed.contains(target);
        }
    }

    public enum PaymentProvider {
        RAZORPAY,
        STRIPE,
        BANK_TRANSFER,
        PAYPAL
    }
}
