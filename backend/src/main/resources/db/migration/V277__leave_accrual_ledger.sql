-- =============================================================================
-- V277 - Leave accrual ledger (Wave-10 P0-4 idempotency)
-- =============================================================================
--
-- ShedLock (@SchedulerLock on LeaveAccrualScheduler#accrueMonthlyLeave) prevents
-- the common cross-pod double-fire, but a lock-expiry mid-run, a manual re-run,
-- or a pod-clock skew could still execute the accrual twice for the same period.
-- LeaveBalance.accrueLeave() is an unconditional "+= days", so a double-fire
-- double-credits every employee's balance.
--
-- This ledger makes the accrual itself idempotent at the database level:
-- at most ONE accrual row may exist per (tenant, employee, leave type, period).
-- LeaveBalanceService#accrueLeavePeriodic inserts the ledger row in the SAME
-- transaction as the balance mutation — a duplicate fire hits the unique
-- constraint, the transaction rolls back, and the balance is untouched.
--
-- accrual_period is the ISO year-month key ('YYYY-MM', e.g. '2026-06'). Both
-- MONTHLY and QUARTERLY accruals are keyed by the month in which they fire
-- (quarterly types only fire in Jan/Apr/Jul/Oct), so one column shape covers both.
-- =============================================================================

CREATE TABLE IF NOT EXISTS leave_accrual_ledger
(
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID,
  updated_by UUID,
  version BIGINT DEFAULT 0,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  employee_id UUID NOT NULL,
  leave_type_id UUID NOT NULL,
  accrual_period VARCHAR(7) NOT NULL,
  amount NUMERIC(5, 2) NOT NULL,
  CONSTRAINT chk_leave_accrual_ledger_period_format
    CHECK (accrual_period ~ '^[0-9]{4}-(0[1-9]|1[0-2])$')
);

-- The idempotency guarantee. Intentionally NOT a partial index on is_deleted:
-- a soft-deleted ledger row must still block re-accrual for that period —
-- the ledger is an append-only audit fact, not user-managed data.
ALTER TABLE leave_accrual_ledger
  ADD CONSTRAINT uq_leave_accrual_ledger_period
    UNIQUE (tenant_id, employee_id, leave_type_id, accrual_period);

CREATE INDEX IF NOT EXISTS idx_leave_accrual_ledger_tenant
  ON leave_accrual_ledger (tenant_id);
CREATE INDEX IF NOT EXISTS idx_leave_accrual_ledger_employee
  ON leave_accrual_ledger (tenant_id, employee_id);

-- ---------------------------------------------------------------------------
-- Fail-closed RLS — same policy shape as the V262 catalog sweep so the startup
-- canary recognises this table. (V262 ran before this table existed, so the
-- policies must be created here explicitly.)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
    tenant_policy_name TEXT := 'rls_tenant_match_' || substr(md5('public.leave_accrual_ledger'), 1, 16);
    policy_name TEXT := 'rls_ctx_required_' || substr(md5('public.leave_accrual_ledger'), 1, 16);
BEGIN
    EXECUTE 'ALTER TABLE public.leave_accrual_ledger ENABLE ROW LEVEL SECURITY';

    EXECUTE format('DROP POLICY IF EXISTS %I ON public.leave_accrual_ledger', tenant_policy_name);
    EXECUTE format($policy$
        CREATE POLICY %I ON public.leave_accrual_ledger
            AS PERMISSIVE FOR ALL
            USING (
                tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
            )
            WITH CHECK (
                tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
            )
    $policy$, tenant_policy_name);

    EXECUTE format('DROP POLICY IF EXISTS %I ON public.leave_accrual_ledger', policy_name);
    EXECUTE format($policy$
        CREATE POLICY %I ON public.leave_accrual_ledger
            AS RESTRICTIVE FOR ALL
            USING (
                NULLIF(current_setting('app.current_tenant_id', true), '') IS NOT NULL
                AND tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
            )
            WITH CHECK (
                NULLIF(current_setting('app.current_tenant_id', true), '') IS NOT NULL
                AND tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
            )
    $policy$, policy_name);

    EXECUTE 'ALTER TABLE public.leave_accrual_ledger FORCE ROW LEVEL SECURITY';
END $$;
