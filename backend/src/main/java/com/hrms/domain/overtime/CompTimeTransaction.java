package com.hrms.domain.overtime;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Individual comp time transactions (accrual, usage, expiry).
 */
@Entity
@Table(name = "comp_time_transactions")
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

    @PrePersist
    protected void onCreate() {
        if (transactionDate == null) {
            transactionDate = LocalDate.now();
        }
        processedAt = LocalDateTime.now();
    }
}
