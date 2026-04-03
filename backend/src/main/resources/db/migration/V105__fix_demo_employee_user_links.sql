-- V105: Ensure demo user accounts are correctly linked to their employee records.
-- Root cause: V49 uses ON CONFLICT (id) DO NOTHING — if a prior migration had already
-- inserted either the user or the employee row with a different user_id, the link was
-- silently skipped. This migration uses UPDATE so it is always applied correctly.
-- Idempotent: no-op when the link is already correct.

-- Saran V (EMPLOYEE) — saran@nulogic.io
UPDATE employees
SET user_id = '48000000-0e02-0000-0000-000000000002'
WHERE id       = '48000000-e001-0000-0000-000000000002'
  AND tenant_id = '660e8400-e29b-41d4-a716-446655440001'
  AND (user_id IS NULL
       OR user_id != '48000000-0e02-0000-0000-000000000002');

-- Sumit Kumar (MANAGER) — sumit@nulogic.io (precautionary: same pattern)
UPDATE employees
SET user_id = '48000000-0e02-0000-0000-000000000001'
WHERE id       = '48000000-e001-0000-0000-000000000001'
  AND tenant_id = '660e8400-e29b-41d4-a716-446655440001'
  AND (user_id IS NULL
       OR user_id != '48000000-0e02-0000-0000-000000000001');
