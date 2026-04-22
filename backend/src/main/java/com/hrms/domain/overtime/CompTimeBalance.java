package com.hrms.domain.overtime;

import com.hrms.common.entity.TenantAware;
import jakarta.persistence.*;
import org.hibernate.annotations.Where;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Compensatory Time Balance for employees who opt for comp time instead of OT pay.
 */
@Where(clause = "is_deleted = false")
@Entity
@Table(name = "comp_time_balances")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class CompTimeBalance extends TenantAware {


    @Column(nullable = false)
    private UUID employeeId;

    @Column(nullable = false)
    private int fiscalYear;

    // Balances
    @Column(nullable = false)
    private BigDecimal totalAccrued;

    @Column(nullable = false)
    private BigDecimal totalUsed;

    @Column(nullable = false)
    private BigDecimal totalExpired;

    @Column(nullable = false)
    private BigDecimal totalForfeited;

    @Column(nullable = false)
    private BigDecimal currentBalance;

    // Caps
    private BigDecimal maxBalance;
    private boolean atMaxBalance;

    @OneToMany(mappedBy = "balance", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<CompTimeTransaction> transactions = new ArrayList<>();

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        if (totalAccrued == null) totalAccrued = BigDecimal.ZERO;
        if (totalUsed == null) totalUsed = BigDecimal.ZERO;
        if (totalExpired == null) totalExpired = BigDecimal.ZERO;
        if (totalForfeited == null) totalForfeited = BigDecimal.ZERO;
        if (currentBalance == null) currentBalance = BigDecimal.ZERO;
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public void accrue(BigDecimal hours) {
        if (maxBalance != null && currentBalance.add(hours).compareTo(maxBalance) > 0) {
            BigDecimal allowedAccrual = maxBalance.subtract(currentBalance);
            totalAccrued = totalAccrued.add(allowedAccrual);
            currentBalance = maxBalance;
            atMaxBalance = true;
        } else {
            totalAccrued = totalAccrued.add(hours);
            currentBalance = currentBalance.add(hours);
        }
    }

    public void use(BigDecimal hours) {
        if (hours.compareTo(currentBalance) > 0) {
            throw new IllegalStateException("Insufficient comp time balance");
        }
        totalUsed = totalUsed.add(hours);
        currentBalance = currentBalance.subtract(hours);
        atMaxBalance = false;
    }

    public void expire(BigDecimal hours) {
        totalExpired = totalExpired.add(hours);
        currentBalance = currentBalance.subtract(hours);
        atMaxBalance = false;
    }

    public void forfeit(BigDecimal hours) {
        totalForfeited = totalForfeited.add(hours);
        currentBalance = currentBalance.subtract(hours);
        atMaxBalance = false;
    }

    public boolean hasAvailableBalance(BigDecimal hours) {
        return currentBalance.compareTo(hours) >= 0;
    }

    public void addTransaction(CompTimeTransaction transaction) {
        transactions.add(transaction);
        transaction.setBalance(this);
    }
}
