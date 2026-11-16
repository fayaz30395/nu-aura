-- subject for the legacy-permission-alias escalation test (NUAURA_TEST_, EMPLOYEE only)
INSERT INTO users (id, tenant_id, email, first_name, last_name, password_hash, status, password_changed_at, failed_login_attempts, mfa_enabled, auth_provider, password_change_required, is_deleted, version)
SELECT gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'nuaura_test_rbac_esc@nulogic.io', 'NUAURA_TEST_RbacEsc', 'User', :'pwhash', 'ACTIVE', now(), 0, false, 'LOCAL', false, false, 0
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email='nuaura_test_rbac_esc@nulogic.io');
INSERT INTO user_roles (user_id, role_id, tenant_id, is_deleted)
SELECT u.id, r.id, u.tenant_id, false FROM users u JOIN roles r ON r.tenant_id=u.tenant_id AND r.code='EMPLOYEE'
WHERE u.email='nuaura_test_rbac_esc@nulogic.io' AND NOT EXISTS (SELECT 1 FROM user_roles x WHERE x.user_id=u.id AND x.role_id=r.id);
