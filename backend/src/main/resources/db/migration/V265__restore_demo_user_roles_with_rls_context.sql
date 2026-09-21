-- Restore NuLogic demo user role assignments under strict runtime RLS.
-- V264 was intentionally idempotent but can no-op when Flyway uses the
-- application RLS role without an app.current_tenant_id session setting.
-- INSERT ... ON CONFLICT DO UPDATE fails under the restrictive
-- rls_ctx_required_* policy on this connection (a plain UPDATE on the same
-- row succeeds, but the combined upsert statement does not) so this is
-- split into an explicit update-existing / insert-missing pair instead.

SELECT set_config('app.current_tenant_id', '660e8400-e29b-41d4-a716-446655440001', true);

CREATE TEMP TABLE tmp_demo_user_roles ON COMMIT DROP AS
SELECT u.id AS user_id, r.id AS role_id, u.tenant_id AS tenant_id
FROM (VALUES
    ('fayaz.m@nulogic.io', 'SUPER_ADMIN'),
    ('sarankarthick.maran@nulogic.io', 'SUPER_ADMIN'),
    ('sumit@nulogic.io', 'MANAGER'),
    ('saran@nulogic.io', 'EMPLOYEE'),
    ('mani@nulogic.io', 'TEAM_LEAD'),
    ('raj@nulogic.io', 'EMPLOYEE'),
    ('gokul@nulogic.io', 'TEAM_LEAD'),
    ('anshuman@nulogic.io', 'EMPLOYEE'),
    ('jagadeesh@nulogic.io', 'HR_MANAGER'),
    ('suresh@nulogic.io', 'RECRUITMENT_ADMIN'),
    ('arun@nulogic.io', 'EMPLOYEE'),
    ('bharath@nulogic.io', 'EMPLOYEE'),
    ('dhanush@nulogic.io', 'TEAM_LEAD'),
    ('chitra@nulogic.io', 'EMPLOYEE'),
    ('deepak@nulogic.io', 'EMPLOYEE')
) AS mapping(email, role_code)
JOIN users u
  ON lower(u.email) = mapping.email
 AND u.tenant_id = '660e8400-e29b-41d4-a716-446655440001'
 AND u.is_deleted = false
JOIN roles r
  ON r.tenant_id = u.tenant_id
 AND r.code = mapping.role_code
 AND r.is_deleted = false;

UPDATE user_roles ur
SET tenant_id = t.tenant_id,
    is_deleted = false,
    deleted_at = NULL
FROM tmp_demo_user_roles t
WHERE ur.user_id = t.user_id
  AND ur.role_id = t.role_id;

INSERT INTO user_roles (user_id, role_id, tenant_id, is_deleted, deleted_at)
SELECT t.user_id, t.role_id, t.tenant_id, false, NULL
FROM tmp_demo_user_roles t
WHERE NOT EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = t.user_id AND ur.role_id = t.role_id
);
