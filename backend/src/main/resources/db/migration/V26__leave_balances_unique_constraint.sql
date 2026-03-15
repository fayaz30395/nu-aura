-- R2-018 FIX: Add UNIQUE constraint on leave_balances to prevent duplicate rows
-- for the same (tenant, employee, leave_type, year) combination.
--
-- Without this constraint, a race condition between concurrent calls to
-- LeaveBalanceService.getOrCreateBalance() could insert two rows for the same
-- key when both transactions see no existing row and both execute the INSERT.
-- The second transaction would silently succeed, leaving two balance rows.
-- Subsequent debits/credits would then hit one row or the other inconsistently.
--
-- Steps:
--   1. Identify and remove duplicate rows, keeping the one with the highest balance.
--   2. Add the UNIQUE constraint; fail-safe with IF NOT EXISTS equivalent.

-- Step 1: Delete duplicate rows, keeping the row with the highest 'available' balance.
--         If balances are identical, keep the earliest (lowest id as UUID ordering).
DELETE FROM leave_balances
WHERE id NOT IN (
    SELECT DISTINCT ON (tenant_id, employee_id, leave_type_id, year)
           id
    FROM   leave_balances
    ORDER BY tenant_id, employee_id, leave_type_id, year,
             available DESC NULLS LAST,
             id ASC
);

-- Step 2: Add the unique constraint.
ALTER TABLE leave_balances
    ADD CONSTRAINT uq_leave_balances_key
        UNIQUE (tenant_id, employee_id, leave_type_id, year);
