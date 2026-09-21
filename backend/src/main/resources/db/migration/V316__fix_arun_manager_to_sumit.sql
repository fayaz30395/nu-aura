-- V316: Fix Arun's manager_id to Sumit (Engineering Manager)
-- Root cause: Arun (Engineering) was seeded with Suresh (RECRUITMENT_ADMIN) as manager
-- in V49. RECRUITMENT_ADMIN lacks LEAVE:APPROVE, making Arun's leave requests stuck.
-- Sumit (MANAGER, Engineering) is the correct manager for this cross-team employee.
-- This also aligns with the UI display: Arun shown as "Engineering · Employee" and
-- Sumit shown as "Engineering · Manager" in the demo login panel.

-- Guard on the manager existing: on a fresh provision the demo org chart (V49)
-- may not have seeded Sumit yet, and an unconditional UPDATE would violate
-- fk_employees_manager and abort the whole migration (no backend boot). Applying
-- only when Sumit's employee row is present makes this a safe no-op otherwise.

-- RLS: fail-closed rls_ctx_required_* policies block this UPDATE without a tenant GUC set.
SELECT set_config('app.current_tenant_id', '660e8400-e29b-41d4-a716-446655440001', true);

-- Also fixes a second bug found while validating against dev: the manager id below was
-- Sumit's USER id (48000000-0e02-...), not his EMPLOYEE id (48000000-e001-...0001, per
-- V49). That mismatch meant the EXISTS guard always failed and this migration silently
-- no-op'd everywhere it ran (including prod), independent of the RLS issue above.

UPDATE employees
SET manager_id = '48000000-e001-0000-0000-000000000001'  -- Sumit Kumar (Engineering Manager)
WHERE id = '48000000-e001-0000-0000-000000000009'         -- Arun T (Employee)
  AND tenant_id = '660e8400-e29b-41d4-a716-446655440001'  -- nulogic.io tenant guard
  AND EXISTS (
    SELECT 1 FROM employees m
    WHERE m.id = '48000000-e001-0000-0000-000000000001'
      AND m.tenant_id = '660e8400-e29b-41d4-a716-446655440001'
  );
