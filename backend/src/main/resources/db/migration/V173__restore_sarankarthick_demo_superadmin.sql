-- ============================================================================
-- V173: Restore Sarankarthick Demo SuperAdmin
--
-- The frontend/e2e demo fixtures include Sarankarthick Maran as a second
-- SUPER_ADMIN, but some shared dev databases no longer contain that row. Keep
-- the seed idempotent so existing environments are normalized and new ones get
-- the missing login, employee profile, and role mapping.
-- Password: Welcome@123
-- ============================================================================

INSERT INTO users (id, tenant_id, email, first_name, last_name, password_hash, status,
                   failed_login_attempts, mfa_enabled, auth_provider, password_changed_at,
                   created_at, updated_at, version, is_deleted)
VALUES ('550e8400-e29b-41d4-a716-446655440032',
        '660e8400-e29b-41d4-a716-446655440001',
        'sarankarthick.maran@nulogic.io',
        'Sarankarthick',
        'Maran',
        '$2a$10$Yz2jagooVRjNy0jIkBH65uLechlFdTUIRtz44XSrXEtcPAnWObR/e',
        'ACTIVE',
        0,
        false,
        'LOCAL',
        NOW(),
        NOW(),
        NOW(),
        0,
        false)
ON CONFLICT (email, tenant_id) WHERE (is_deleted = false) DO UPDATE
SET first_name            = EXCLUDED.first_name,
    last_name             = EXCLUDED.last_name,
    password_hash         = EXCLUDED.password_hash,
    status                = 'ACTIVE',
    failed_login_attempts = 0,
    locked_until          = NULL,
    auth_provider         = 'LOCAL',
    password_changed_at   = NOW(),
    updated_at            = NOW(),
    is_deleted            = false;

INSERT INTO employees (id, tenant_id, employee_code, user_id, first_name, last_name, personal_email,
                       joining_date, designation, level, job_role, employment_type, status,
                       created_at, updated_at, version, is_deleted)
SELECT '550e8400-e29b-41d4-a716-446655440042',
       u.tenant_id,
       'EMP-0001B',
       u.id,
       'Sarankarthick',
       'Maran',
       'sarankarthick.maran@nulogic.io',
       CURRENT_DATE,
       'System Administrator',
       'CXO',
       'EXECUTIVE',
       'FULL_TIME',
       'ACTIVE',
       NOW(),
       NOW(),
       0,
       false
FROM users u
WHERE u.email = 'sarankarthick.maran@nulogic.io'
  AND u.tenant_id = '660e8400-e29b-41d4-a716-446655440001'
ON CONFLICT (employee_code, tenant_id) WHERE (is_deleted = false) DO UPDATE
SET user_id        = EXCLUDED.user_id,
    first_name     = EXCLUDED.first_name,
    last_name      = EXCLUDED.last_name,
    personal_email = EXCLUDED.personal_email,
    designation    = EXCLUDED.designation,
    level          = EXCLUDED.level,
    job_role       = EXCLUDED.job_role,
    employment_type = EXCLUDED.employment_type,
    status         = 'ACTIVE',
    updated_at     = NOW(),
    is_deleted     = false;

INSERT INTO user_roles (user_id, role_id, tenant_id, is_deleted)
SELECT u.id, r.id, u.tenant_id, false
FROM users u
JOIN roles r
  ON r.tenant_id = u.tenant_id
 AND r.code = 'SUPER_ADMIN'
 AND r.is_deleted = false
WHERE u.email = 'sarankarthick.maran@nulogic.io'
  AND u.tenant_id = '660e8400-e29b-41d4-a716-446655440001'
ON CONFLICT (role_id, user_id) DO NOTHING;
