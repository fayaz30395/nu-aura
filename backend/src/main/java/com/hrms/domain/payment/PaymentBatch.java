package com.hrms.domain.payment;

import com.hrms.common.entity.TenantAware;
import jakarta.persistence.*;
import org.hibernate.annotations.Where;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Where(clause = "is_deleted = false")
@Entity
@Table(name = "payment_batches", indexes = {
    @Index(name = "idx_payment_batch_tenant", columnList = "tenantId"),
    @Index(name = "idx_payment_batch_ref", columnList = "tenantId,batchRef", unique = true),
    @Index(name = "idx_payment_batch_type", columnList = "tenantId,type"),
    @Index(name = "idx_payment_batch_status", columnList = "tenantId,status"),
    @Index(name = "idx_payment_batch_payroll", columnList = "payrollRunId")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class PaymentBatch extends TenantAware {

    @Column(nullable = false, length = 100)
    private String batchRef;

    @Column(nullable = false, length = 50)
    @Enumerated(EnumType.STRING)
    private PaymentType type;

    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal totalAmount;

    @Builder.Default
    @Column(nullable = false)
    private Integer transactionCount = 0;

    @Builder.Default
    @Column(nullable = false, length = 50)
    @Enumerated(EnumType.STRING)
    private BatchStatus status = BatchStatus.INITIATED;

    @Column
    private UUID payrollRunId;

    @Column(nullable = false)
    private UUID initiatedBy;

    @Column
    private UUID completedBy;

    @Column
    private LocalDateTime completedAt;

    @Builder.Default
    @Column
    private Integer failedCount = 0;

    @Builder.Default
    @Column
    private Integer successCount = 0;

    @Column(columnDefinition = "JSONB")
    private String metadata;

    public enum PaymentType {
        PAYROLL,
        EXPENSE_REIMBURSEMENT,
        LOAN,
        BENEFIT_PAYMENT
    }

    public enum BatchStatus {
        INITIATED,
        PROCESSING,
        COMPLETED,
        PARTIAL_SUCCESS,
        FAILED,
        CANCELLED
    }
}
