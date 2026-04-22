package com.hrms.domain.payment;

import com.hrms.common.entity.TenantAware;
import jakarta.persistence.*;
import org.hibernate.annotations.SQLRestriction;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@SQLRestriction("is_deleted = false")
@Entity
@Table(name = "payment_refunds", indexes = {
        @Index(name = "idx_payment_refund_tenant", columnList = "tenantId"),
        @Index(name = "idx_payment_refund_transaction", columnList = "transactionId"),
        @Index(name = "idx_payment_refund_status", columnList = "tenantId,status")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class PaymentRefund extends TenantAware {

    @Column(nullable = false)
    private UUID transactionId;

    @Column(nullable = false, length = 100)
    private String refundRef;

    @Column(length = 255)
    private String externalRefundId;

    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal amount;

    @Builder.Default
    @Column(nullable = false, length = 50)
    @Enumerated(EnumType.STRING)
    private RefundStatus status = RefundStatus.INITIATED;

    @Column(columnDefinition = "TEXT")
    private String reason;

    @Column(nullable = false)
    private UUID initiatedBy;

    @Column
    private LocalDateTime completedAt;

    @Column(columnDefinition = "JSONB")
    private String metadata;

    public enum RefundStatus {
        INITIATED,
        PROCESSING,
        COMPLETED,
        FAILED,
        CANCELLED
    }
}
