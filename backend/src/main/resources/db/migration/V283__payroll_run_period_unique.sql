-- V283__payroll_run_period_unique.sql
--
-- DATA-6: the PayrollRun entity declares a UNIQUE index on
-- (tenantId, payPeriodMonth, payPeriodYear), but no Flyway migration ever created
-- it — V92 created idx_payroll_runs_tenant_period NON-unique. With
-- ddl-auto=validate (prod) the unique guarantee never materialises, so duplicate
-- runs for the same (tenant, period) are possible via the update path or any code
-- path that bypasses createPayrollRun's advisory lock.
--
-- This migration:
--   1. Defensively deduplicates existing rows: among non-deleted duplicates for
--      the same (tenant_id, pay_period_year, pay_period_month), the survivor is
--      chosen by furthest lifecycle progress (LOCKED > APPROVED > PROCESSED >
--      PROCESSING > DRAFT), then earliest created_at; the rest are SOFT-DELETED
--      (not dropped) so payslips/audit rows that reference them stay intact.
--   2. Replaces the V92 non-unique index with a partial UNIQUE index scoped to
--      is_deleted = false (V48 soft-delete-aware pattern), so a deleted run's
--      period can be re-created.
--
-- Companion application-side guard: PayrollRunService.updatePayrollRun now runs
-- the same advisory-lock + existence check as createPayrollRun when the period
-- changes.

-- ============================================================================
-- 1. Deduplicate existing non-deleted duplicate-period runs (soft delete)
-- ============================================================================
WITH ranked AS (
    SELECT id,
           ROW_NUMBER() OVER (
               PARTITION BY tenant_id, pay_period_year, pay_period_month
               ORDER BY CASE status
                            WHEN 'LOCKED' THEN 0
                            WHEN 'APPROVED' THEN 1
                            WHEN 'PROCESSED' THEN 2
                            WHEN 'PROCESSING' THEN 3
                            ELSE 4
                        END,
                        created_at ASC NULLS LAST,
                        id ASC
           ) AS rn
    FROM payroll_runs
    WHERE is_deleted = false
)
UPDATE payroll_runs pr
SET is_deleted = true,
    deleted_at = NOW(),
    updated_at = NOW()
FROM ranked r
WHERE pr.id = r.id
  AND r.rn > 1;

-- ============================================================================
-- 2. Drop the V92 non-unique index and any Hibernate-generated (non-partial)
--    variant from ddl-auto=update environments
-- ============================================================================
DROP INDEX IF EXISTS idx_payroll_runs_tenant_period;
ALTER TABLE payroll_runs DROP CONSTRAINT IF EXISTS idx_payroll_tenant_period;
DROP INDEX IF EXISTS idx_payroll_tenant_period;

-- ============================================================================
-- 3. Partial UNIQUE index — one active run per (tenant, year, month)
-- ============================================================================
CREATE UNIQUE INDEX IF NOT EXISTS uq_payroll_runs_tenant_period
    ON payroll_runs (tenant_id, pay_period_year, pay_period_month)
    WHERE is_deleted = false;
