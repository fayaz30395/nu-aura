package com.nulogic.domain.leave;

import com.nulogic.common.entity.TenantAware;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.SQLRestriction;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * Append-only idempotency ledger for periodic leave accruals (Wave-10 P0-4).
 *
 * <p>One row per (tenant, employee, leave type, accrual period). The unique
 * constraint {@code uq_leave_accrual_ledger_period} (V277) is the database-level
 * guarantee that a scheduler double-fire — ShedLock expiry mid-run, manual re-run,
 * pod clock skew — cannot credit the same period twice: the duplicate insert
 * violates the constraint and rolls back the whole accrual transaction, leaving
 * the {@link LeaveBalance} untouched.</p>
 *
 * <p>{@code accrualPeriod} is the ISO year-month key ({@code YYYY-MM}, e.g.
 * {@code 2026-06}). Quarterly accruals fire only in quarter-start months, so the
 * month key covers both MONTHLY and QUARTERLY cadences.</p>
 *
 * @see com.nulogic.application.leave.service.LeaveBalanceService#accrueLeavePeriodic
 */
@SQLRestriction("is_deleted = false")
@Entity
@Table(name = "leave_accrual_ledger",
        indexes = {
                @Index(name = "idx_leave_accrual_ledger_tenant", columnList = "tenantId"),
                @Index(name = "idx_leave_accrual_ledger_employee", columnList = "tenantId,employeeId")
        },
        uniqueConstraints = {
                @UniqueConstraint(name = "uq_leave_accrual_ledger_period",
                        columnNames = {"tenantId", "employeeId", "leaveTypeId", "accrualPeriod"})
        })
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class LeaveAccrualLedger extends TenantAware {

    @Column(name = "employee_id", nullable = false)
    private UUID employeeId;

    @Column(name = "leave_type_id", nullable = false)
    private UUID leaveTypeId;

    /**
     * ISO year-month period key, e.g. {@code 2026-06} ({@link java.time.YearMonth#toString()}).
     */
    @Column(name = "accrual_period", nullable = false, length = 7)
    private String accrualPeriod;

    /**
     * Days credited for this period (post-proration).
     */
    @Column(nullable = false, precision = 5, scale = 2)
    private BigDecimal amount;
}
