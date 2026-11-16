-- NU-AURA release-readiness (agent: tenant). LOCAL DEV DB, NUAURA_TEST tenants only.
-- Why: permission catalog rows are all stamped tenant_id=NuLogic (NOT NULL column) and hidden by RLS from other tenants,
-- so a role_permissions row in any other tenant makes login fail ("Unable to find Permission"). Provisioning-realistic
-- state for a new tenant is therefore 0 permissions. SUPER_ADMIN bypasses PermissionAspect by role (no catalog needed).
BEGIN;
DELETE FROM role_permissions WHERE tenant_id IN (SELECT id FROM tenants WHERE code IN ('nuaura-test-alpha','nuaura-test-beta'));
INSERT INTO roles (id, tenant_id, code, name, description, is_system_role, is_deleted, version)
SELECT gen_random_uuid(), t.id, 'SUPER_ADMIN', 'Super Administrator', 'NUAURA_TEST synthetic', true, false, 0
FROM tenants t WHERE t.code IN ('nuaura-test-alpha','nuaura-test-beta')
  AND NOT EXISTS (SELECT 1 FROM roles x WHERE x.tenant_id=t.id AND x.code='SUPER_ADMIN');
INSERT INTO users (id, tenant_id, email, first_name, last_name, password_hash, status, password_changed_at,
                   failed_login_attempts, mfa_enabled, auth_provider, password_change_required, is_deleted, version)
SELECT gen_random_uuid(), t.id, u.email, u.fn, 'User', :'pwhash', 'ACTIVE', now(), 0, false, 'LOCAL', false, false, 0
FROM (VALUES ('nuaura-test-alpha','nuaura_test_alpha_sa@nuaura-test.example','NUAURA_TEST_AlphaSA'),
             ('nuaura-test-beta','nuaura_test_beta_sa@nuaura-test.example','NUAURA_TEST_BetaSA')) u(tc,email,fn)
JOIN tenants t ON t.code=u.tc
WHERE NOT EXISTS (SELECT 1 FROM users x WHERE x.email=u.email AND x.tenant_id=t.id);
INSERT INTO user_roles (user_id, role_id, tenant_id, is_deleted)
SELECT us.id, r.id, us.tenant_id, false FROM users us JOIN roles r ON r.tenant_id=us.tenant_id AND r.code='SUPER_ADMIN'
WHERE us.email LIKE 'nuaura\_test\_%\_sa@nuaura-test.example'
  AND NOT EXISTS (SELECT 1 FROM user_roles x WHERE x.user_id=us.id AND x.role_id=r.id);
COMMIT;
