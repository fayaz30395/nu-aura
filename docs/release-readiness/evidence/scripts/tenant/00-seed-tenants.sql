-- NU-AURA release-readiness (agent: tenant) -- synthetic tenant seed. Run as local superuser, LOCAL DEV DB ONLY.
-- Mirrors TenantProvisioningService (tenant, admin user, TENANT_ADMIN role+perms, user_roles w/ tenant_id).
-- The app provisioning endpoint POST /api/v1/tenants/register needs TENANT:MANAGE which only SUPER_ADMIN holds
-- (real-owner accounts only; forbidden by audit rules) -> SQL seed used instead. Idempotent.
-- :pwhash is passed via psql -v (bcrypt of a random test password kept in ~/.config/nu-aura/tenant-test.env).
BEGIN;
INSERT INTO tenants (id, code, name, status, description, contact_email, country, timezone, is_deleted, version)
SELECT v.id, v.code, v.name, 'ACTIVE', 'NUAURA_TEST synthetic tenant', v.mail, 'IN', 'Asia/Kolkata', false, 0
FROM (VALUES
  ('a1fa0000-0000-4000-8000-00000000a1fa'::uuid, 'nuaura-test-alpha', 'NUAURA_TEST_Alpha', 'nuaura_test_alpha_admin@nuaura-test.example'),
  ('be7a0000-0000-4000-8000-0000000be7a0'::uuid, 'nuaura-test-beta',  'NUAURA_TEST_Beta',  'nuaura_test_beta_admin@nuaura-test.example')
) AS v(id, code, name, mail)
WHERE NOT EXISTS (SELECT 1 FROM tenants t WHERE t.code = v.code);

-- roles: copy NuLogic's 9 non-SUPER_ADMIN roles into each test tenant
INSERT INTO roles (id, tenant_id, code, name, description, is_system_role, is_deleted, version)
SELECT gen_random_uuid(), t.id, r.code, r.name, r.description, r.is_system_role, false, 0
FROM tenants t CROSS JOIN roles r
WHERE t.code IN ('nuaura-test-alpha','nuaura-test-beta')
  AND r.tenant_id = '660e8400-e29b-41d4-a716-446655440001' AND r.code <> 'SUPER_ADMIN' AND NOT r.is_deleted
  AND NOT EXISTS (SELECT 1 FROM roles x WHERE x.tenant_id = t.id AND x.code = r.code);

INSERT INTO role_permissions (id, tenant_id, role_id, permission_id, scope, is_deleted, version)
SELECT gen_random_uuid(), nr.tenant_id, nr.id, rp.permission_id, rp.scope, false, 0
FROM roles nr
JOIN tenants t ON t.id = nr.tenant_id AND t.code IN ('nuaura-test-alpha','nuaura-test-beta')
JOIN roles src ON src.tenant_id = '660e8400-e29b-41d4-a716-446655440001' AND src.code = nr.code
JOIN role_permissions rp ON rp.role_id = src.id AND NOT rp.is_deleted
WHERE NOT EXISTS (SELECT 1 FROM role_permissions x WHERE x.role_id = nr.id AND x.permission_id = rp.permission_id);

-- users: one admin + one employee per tenant
INSERT INTO users (id, tenant_id, email, first_name, last_name, password_hash, status, password_changed_at,
                   failed_login_attempts, mfa_enabled, auth_provider, password_change_required, is_deleted, version)
SELECT gen_random_uuid(), t.id, u.email, u.fn, u.ln, :'pwhash', 'ACTIVE', now(), 0, false, 'LOCAL', false, false, 0
FROM (VALUES
  ('nuaura-test-alpha','nuaura_test_alpha_admin@nuaura-test.example','NUAURA_TEST_AlphaAdmin','User'),
  ('nuaura-test-alpha','nuaura_test_alpha_emp@nuaura-test.example','NUAURA_TEST_AlphaEmp','User'),
  ('nuaura-test-beta','nuaura_test_beta_admin@nuaura-test.example','NUAURA_TEST_BetaAdmin','User'),
  ('nuaura-test-beta','nuaura_test_beta_emp@nuaura-test.example','NUAURA_TEST_BetaEmp','User')
) AS u(tc, email, fn, ln)
JOIN tenants t ON t.code = u.tc
WHERE NOT EXISTS (SELECT 1 FROM users x WHERE x.email = u.email AND x.tenant_id = t.id);

INSERT INTO user_roles (user_id, role_id, tenant_id, is_deleted)
SELECT us.id, r.id, us.tenant_id, false
FROM users us JOIN roles r ON r.tenant_id = us.tenant_id
WHERE us.email LIKE 'nuaura\_test\_%@nuaura-test.example'
  AND ((us.email LIKE '%\_admin@%' AND r.code = 'TENANT_ADMIN') OR (us.email LIKE '%\_emp@%' AND r.code = 'EMPLOYEE'))
  AND NOT EXISTS (SELECT 1 FROM user_roles x WHERE x.user_id = us.id AND x.role_id = r.id);
COMMIT;
