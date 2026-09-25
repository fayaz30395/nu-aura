-- ============================================================================
-- V332: Re-apply the Arun -> Sumit manager_id correction (2026-09-25)
--
-- Why a NEW migration and not `flyway repair`:
--   V316 shipped to prod on 2026-06-25 (flyway_schema_history: version 316,
--   success = true, checksum 921701256) in a form that pointed manager_id at
--   Sumit's USER id instead of his EMPLOYEE id, so its EXISTS guard never
--   matched and the UPDATE silently affected 0 rows. V316 was later rewritten
--   in-repo (commit e9730957) to use the employee id and to set the RLS tenant
--   GUC. `flyway repair` realigns the recorded checksum but never re-executes an
--   already-recorded migration, so prod's data stays wrong after a repair.
--   This forward migration is the only thing that actually corrects the row.
--
-- Idempotent: on any database where V316's rewritten form already applied
-- (dev/CI, which migrate from scratch) the UPDATE matches 0 rows and this is a
-- no-op. Guarded on Sumit's employee row existing so a fresh provision that has
-- not run V49's org chart cannot violate fk_employees_manager.
-- ============================================================================

-- RLS: fail-closed rls_ctx_required_* policies block this UPDATE without a tenant GUC.
SELECT set_config('app.current_tenant_id', '660e8400-e29b-41d4-a716-446655440001', true);

UPDATE employees
SET manager_id = '48000000-e001-0000-0000-000000000001',  -- Sumit Kumar (Engineering Manager) EMPLOYEE id
    updated_at = NOW()
WHERE id = '48000000-e001-0000-0000-000000000009'          -- Arun T (Employee)
  AND tenant_id = '660e8400-e29b-41d4-a716-446655440001'   -- nulogic.io tenant guard
  AND manager_id IS DISTINCT FROM '48000000-e001-0000-0000-000000000001'
  AND EXISTS (
    SELECT 1 FROM employees m
    WHERE m.id = '48000000-e001-0000-0000-000000000001'
      AND m.tenant_id = '660e8400-e29b-41d4-a716-446655440001'
  );
