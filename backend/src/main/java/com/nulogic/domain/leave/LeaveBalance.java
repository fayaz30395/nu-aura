package com.nulogic.domain.leave;

import com.nulogic.common.entity.TenantAware;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.SQLRestriction;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Objects;
import java.util.UUID;

// R2-001 FIX: @Version enables JPA optimistic locking — concurrent deductions
// now cause an ObjectOptimisticLockingFailureException instead of a silent
// last-write-wins race that can over-spend leave balances.

@SQLRestriction("is_deleted = false")
@Entity
@Table(name = "leave_balances", indexes = {
        @Index(name = "idx_leave_balances_tenant_id", columnList = "tenantId"),
        @Index(name = "idx_leave_balances_employee_id", columnList = "employeeId"),
        @Index(name = "idx_leave_balances_year", columnList = "year")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class LeaveBalance extends TenantAware {

    @Column(name = "employee_id", nullable = false)
    private UUID employeeId;

    @Column(name = "leave_type_id", nullable = false)
    private UUID leaveTypeId;

    @Column(nullable = false)
    private Integer year;

    @Column(name = "opening_balance", precision = 5, scale = 2)
    @Builder.Default
    private BigDecimal openingBalance = BigDecimal.ZERO;

    @Column(precision = 5, scale = 2)
    @Builder.Default
    private BigDecimal accrued = BigDecimal.ZERO;

    @Column(precision = 5, scale = 2)
    @Builder.Default
    private BigDecimal used = BigDecimal.ZERO;

    @Column(precision = 5, scale = 2)
    @Builder.Default
    private BigDecimal pending = BigDecimal.ZERO;

    @Column(precision = 5, scale = 2)
    @Builder.Default
    private BigDecimal available = BigDecimal.ZERO;

    @Column(name = "carried_forward", precision = 5, scale = 2)
    @Builder.Default
    private BigDecimal carriedForward = BigDecimal.ZERO;

    @Column(precision = 5, scale = 2)
    @Builder.Default
    private BigDecimal encashed = BigDecimal.ZERO;

    @Column(precision = 5, scale = 2)
    @Builder.Default
    private BigDecimal lapsed = BigDecimal.ZERO;

    @Column(name = "last_accrual_date")
    private LocalDate lastAccrualDate;

    public void calculateAvailable() {
        this.available = openingBalance
                .add(accrued)
                .add(carriedForward)
                .subtract(used)
                .subtract(pending)
                .subtract(encashed)
                .subtract(lapsed);
    }

    /**
     * DATA-1 FIX: sign guard for all balance mutations. A negative (or zero) day
     * count must never reach the arithmetic below — e.g. an inverted date range
     * producing negative totalDays would otherwise REDUCE pending/used and inflate
     * the available balance (a self-service balance-inflation exploit).
     */
    private static void requirePositive(BigDecimal days) {
        if (days == null || days.signum() <= 0) {
            throw new IllegalArgumentException("Leave day amount must be a positive number, got: " + days);
        }
    }

    public void deduct(BigDecimal days) {
        requirePositive(days);
        this.used = this.used.add(days);
        calculateAvailable();
        if (this.available.compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalStateException("Insufficient leave balance");
        }
    }

    public void credit(BigDecimal days) {
        requirePositive(days);
        this.used = this.used.subtract(days);
        if (this.used.compareTo(BigDecimal.ZERO) < 0) {
            this.used = BigDecimal.ZERO;
        }
        calculateAvailable();
    }

    public void addPending(BigDecimal days) {
        requirePositive(days);
        this.pending = this.pending.add(days);
        calculateAvailable();
    }

    public void removePending(BigDecimal days) {
        requirePositive(days);
        this.pending = this.pending.subtract(days);
        if (this.pending.compareTo(BigDecimal.ZERO) < 0) {
            this.pending = BigDecimal.ZERO;
        }
        calculateAvailable();
    }

    public void accrueLeave(BigDecimal days, LocalDate today) {
        this.accrued = this.accrued.add(days);
        this.lastAccrualDate = today;
        calculateAvailable();
    }

    /**
     * F2.3: Legacy single-arg overload retained for backward compatibility — delegates
     * to the cap-enforcing form with a {@code null} cap (no policy enforcement).
     */
    public void encashLeave(BigDecimal days) {
        encashLeave(days, null);
    }

    /**
     * F2.3: Encashes {@code days} from this balance and enforces an optional per-year
     * encashment cap supplied by the leave-type policy.
     *
     * <ul>
     *   <li>Throws when {@code days} would push the running encashed total over
     *       {@code maxAllowed}, regardless of available balance.</li>
     *   <li>Also throws on a single oversized request (defensive — covers the
     *       "first encashment of the year is itself > cap" case).</li>
     * </ul>
     */
    public void encashLeave(BigDecimal days, BigDecimal maxAllowed) {
        Objects.requireNonNull(days, "days required");
        if (this.available.compareTo(days) < 0) {
            throw new IllegalStateException("Insufficient leave balance for encashment");
        }
        if (maxAllowed != null && days.compareTo(maxAllowed) > 0) {
            throw new IllegalStateException("Encashment exceeds policy maximum: " + maxAllowed);
        }
        BigDecimal newEncashed = this.encashed.add(days);
        if (maxAllowed != null && newEncashed.compareTo(maxAllowed) > 0) {
            throw new IllegalStateException("Cumulative encashment would exceed annual cap");
        }
        this.encashed = newEncashed;
        calculateAvailable();
    }

    public void lapseLeave(BigDecimal days) {
        this.lapsed = this.lapsed.add(days);
        calculateAvailable();
    }
}
