package com.nulogic.infrastructure.leave.repository;

import com.nulogic.domain.leave.LeaveAccrualLedger;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

/**
 * Repository for the leave-accrual idempotency ledger (Wave-10 P0-4, V277).
 */
@Repository
public interface LeaveAccrualLedgerRepository extends JpaRepository<LeaveAccrualLedger, UUID> {

    /**
     * Fast-path duplicate check before attempting the insert. The unique constraint
     * {@code uq_leave_accrual_ledger_period} remains the authoritative guard for the
     * race window between this check and the commit.
     */
    boolean existsByTenantIdAndEmployeeIdAndLeaveTypeIdAndAccrualPeriod(
            UUID tenantId, UUID employeeId, UUID leaveTypeId, String accrualPeriod);
}
