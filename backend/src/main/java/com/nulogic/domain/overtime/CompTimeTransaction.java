package com.nulogic.domain.overtime;

import com.nulogic.common.util.TenantTimestamp;
import com.nulogic.common.util.TimeAuditingEntityListener;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Individual comp time transactions (accrual, usage, expiry).
 *
 * <p>{@code transactionDate} and {@code processedAt} are stamped by
 * {@link TimeAuditingEntityListener} via {@link TenantTimestamp} to close the
 * unzoned-{@code LocalDate(Time).now()} gap from
 * {@code backend/docs/audit/prepersist-now-audit.md} rows 10–11. This entity is not
 * {@code TenantAware}; the listener resolves {@code tenantId = null} via
 * {@code TenantTimeService}'s default-zone fallback.</p>
 */
@Entity
@Table(name = "comp_time_transactions")
@EntityListeners(TimeAuditingEntityListener.class)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CompTimeTransaction {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "balance_id", nullable = false)
    private CompTimeBalance balance;

    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    private TransactionType transactionType;

    @Column(nullable = false)
    private BigDecimal hours;

    private BigDecimal balanceAfter;

    @TenantTimestamp
    @Column(nullable = false)
    private LocalDate transactionDate;

    // For accruals
    private UUID overtimeRequestId;
    private LocalDate overtimeDate;

    // For usage
    private UUID leaveRequestId;
    private LocalDate usageDate;

    // For expiry
    private LocalDate originalAccrualDate;
    private LocalDate expiryDate;

    private String description;
    private UUID processedBy;

    @TenantTimestamp
    private LocalDateTime processedAt;

    public enum TransactionType {
        ACCRUAL,
        USAGE,
        EXPIRY,
        FORFEITURE,
        ADJUSTMENT,
        CARRYOVER,
        PAYOUT          // Converted to cash
    }
}
