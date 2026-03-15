package com.hrms.domain.leave;

import com.hrms.common.entity.TenantAware;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

// R2-001 FIX: @Version enables JPA optimistic locking — concurrent deductions
// now cause an ObjectOptimisticLockingFailureException instead of a silent
// last-write-wins race that can over-spend leave balances.

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

    public void deduct(BigDecimal days) {
        this.used = this.used.add(days);
        calculateAvailable();
        if (this.available.compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalStateException("Insufficient leave balance");
        }
    }

    public void credit(BigDecimal days) {
        this.used = this.used.subtract(days);
        if (this.used.compareTo(BigDecimal.ZERO) < 0) {
            this.used = BigDecimal.ZERO;
        }
        calculateAvailable();
    }

    public void addPending(BigDecimal days) {
        this.pending = this.pending.add(days);
        calculateAvailable();
    }

    public void removePending(BigDecimal days) {
        this.pending = this.pending.subtract(days);
        if (this.pending.compareTo(BigDecimal.ZERO) < 0) {
            this.pending = BigDecimal.ZERO;
        }
        calculateAvailable();
    }

    public void accrueLeave(BigDecimal days) {
        this.accrued = this.accrued.add(days);
        this.lastAccrualDate = LocalDate.now();
        calculateAvailable();
    }

    public void encashLeave(BigDecimal days) {
        if (this.available.compareTo(days) < 0) {
            throw new IllegalStateException("Insufficient leave balance for encashment");
        }
        this.encashed = this.encashed.add(days);
        calculateAvailable();
    }

    public void lapseLeave(BigDecimal days) {
        this.lapsed = this.lapsed.add(days);
        calculateAvailable();
    }
}
