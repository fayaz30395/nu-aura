package com.hrms.api.payment.dto;

import com.hrms.domain.payment.PaymentTransaction;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PaymentTransactionDto {

    private UUID id;
    private String transactionRef;
    private String externalRef;
    private PaymentTransaction.PaymentType type;
    private BigDecimal amount;
    private String currency;
    private PaymentTransaction.PaymentStatus status;
    private UUID employeeId;
    private UUID payrollRunId;
    private UUID expenseClaimId;
    private String recipientName;
    private String recipientAccountNumber;
    private String recipientIfsc;
    private PaymentTransaction.PaymentProvider provider;
    private String failedReason;
    private LocalDateTime initiatedAt;
    private LocalDateTime completedAt;
    private LocalDateTime refundedAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static PaymentTransactionDto fromEntity(PaymentTransaction entity) {
        return builder()
                .id(entity.getId())
                .transactionRef(entity.getTransactionRef())
                .externalRef(entity.getExternalRef())
                .type(entity.getType())
                .amount(entity.getAmount())
                .currency(entity.getCurrency())
                .status(entity.getStatus())
                .employeeId(entity.getEmployeeId())
                .payrollRunId(entity.getPayrollRunId())
                .expenseClaimId(entity.getExpenseClaimId())
                .recipientName(entity.getRecipientName())
                .recipientAccountNumber(entity.getRecipientAccountNumber())
                .recipientIfsc(entity.getRecipientIfsc())
                .provider(entity.getProvider())
                .failedReason(entity.getFailedReason())
                .initiatedAt(entity.getInitiatedAt())
                .completedAt(entity.getCompletedAt())
                .refundedAt(entity.getRefundedAt())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }

    public PaymentTransaction toEntity() {
        return PaymentTransaction.builder()
                .id(id)
                .transactionRef(transactionRef)
                .externalRef(externalRef)
                .type(type)
                .amount(amount)
                .currency(currency)
                .status(status)
                .employeeId(employeeId)
                .payrollRunId(payrollRunId)
                .expenseClaimId(expenseClaimId)
                .recipientName(recipientName)
                .recipientAccountNumber(recipientAccountNumber)
                .recipientIfsc(recipientIfsc)
                .provider(provider)
                .failedReason(failedReason)
                .initiatedAt(initiatedAt)
                .completedAt(completedAt)
                .refundedAt(refundedAt)
                .createdAt(createdAt)
                .updatedAt(updatedAt)
                .build();
    }
}
