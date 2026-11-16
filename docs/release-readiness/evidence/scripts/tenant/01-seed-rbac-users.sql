-- NU-AURA release-readiness (agent: tenant) -- synthetic RBAC test users in the NuLogic dev tenant. LOCAL DEV DB ONLY.
-- No demo account holds PAYROLL_ADMIN, and role-change tests must not touch real demo accounts.
-- :pwhash = bcrypt of a random test password (~/.config/nu-aura/tenant-test.env, not in repo).
BEGIN;
INSERT INTO users (id, tenant_id, email, first_name, last_name, password_hash, status, password_changed_at,
                   failed_login_attempts, mfa_enabled, auth_provider, password_change_required, is_deleted, version)
SELECT gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', u.email, u.fn, 'User', :'pwhash', 'ACTIVE', now(), 0, false, 'LOCAL', false, false, 0
FROM (VALUES
  ('nuaura_test_rbac_payadmin@nulogic.io','NUAURA_TEST_RbacPayAdmin'),
  ('nuaura_test_rbac_chg@nulogic.io','NUAURA_TEST_RbacChange')
) AS u(email, fn)
WHERE NOT EXISTS (SELECT 1 FROM users x WHERE x.email = u.email AND x.tenant_id='660e8400-e29b-41d4-a716-446655440001');

INSERT INTO user_roles (user_id, role_id, tenant_id, is_deleted)
SELECT us.id, r.id, us.tenant_id, false
FROM users us JOIN roles r ON r.tenant_id = us.tenant_id
WHERE us.tenant_id='660e8400-e29b-41d4-a716-446655440001'
  AND ((us.email='nuaura_test_rbac_payadmin@nulogic.io' AND r.code='PAYROLL_ADMIN')
    OR (us.email='nuaura_test_rbac_chg@nulogic.io' AND r.code='EMPLOYEE'))
  AND NOT EXISTS (SELECT 1 FROM user_roles x WHERE x.user_id = us.id AND x.role_id = r.id);
COMMIT;
