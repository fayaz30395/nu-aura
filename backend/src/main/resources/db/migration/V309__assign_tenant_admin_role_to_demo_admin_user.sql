-- =============================================================================
-- V309: Assign TENANT_ADMIN role to the demo tenant.admin user (post-V307)
-- =============================================================================
-- CONTEXT (Green-Flag R4, 2026-06-21):
--   V291 seeded tenant.admin@nulogic.io and tried to assign the TENANT_ADMIN role
--   via INSERT...SELECT FROM roles WHERE code='TENANT_ADMIN'. But the demo tenant
--   had no TENANT_ADMIN role row at that time (V290 found no ADMIN row to rename),
--   so the SELECT matched zero rows and the user got NO role assignment.
--
--   V307 finally created the missing TENANT_ADMIN role row for every tenant, but
--   nothing re-ran V291's user→role assignment. Result observed live: the
--   tenant.admin user logs in with roles:[] and is 403 on every module.
--
--   This migration re-runs the assignment now that the role exists. Idempotent.
--
-- SAFETY:
--   - INSERT...SELECT guarded by NOT EXISTS + ON CONFLICT DO NOTHING.
--   - Only touches the seeded demo user (550e8400-...-440055) in the NuLogic tenant.
--   - Does NOT alter the password/neutralization posture — prod lockdown of the
--     known-weak Welcome@123 hash is handled separately (see green-flag report).
-- =============================================================================

SELECT set_config('app.current_tenant_id', '660e8400-e29b-41d4-a716-446655440001', true);

INSERT INTO user_roles (user_id, role_id, tenant_id, is_deleted, deleted_at)
SELECT
    '550e8400-e29b-41d4-a716-446655440055',
    r.id,
    '660e8400-e29b-41d4-a716-446655440001',
    false,
    NULL
FROM roles r
WHERE r.tenant_id = '660e8400-e29b-41d4-a716-446655440001'
  AND r.code = 'TENANT_ADMIN'
  AND (r.is_deleted = false OR r.is_deleted IS NULL)
  AND EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = '550e8400-e29b-41d4-a716-446655440055'
        AND u.tenant_id = '660e8400-e29b-41d4-a716-446655440001'
  )
ON CONFLICT (user_id, role_id) DO UPDATE
    SET tenant_id  = EXCLUDED.tenant_id,
        is_deleted = false,
        deleted_at = NULL;
