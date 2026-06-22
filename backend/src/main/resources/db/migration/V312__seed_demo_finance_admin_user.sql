-- =============================================================================
-- V312: Seed demo FINANCE_ADMIN user (Fiona Nance) for NuLogic tenant
-- =============================================================================
-- The login screen's one-click demo panel advertises a FINANCE ADMIN card
-- (Fiona Nance, finance@nulogic.io) but no such account was ever seeded — the
-- card failed with "Authentication Failed / Bad credentials". This seeds the
-- account so the demo card works end-to-end, mirroring V291 (demo TENANT_ADMIN).
--
-- Password: Welcome@123  (same bcrypt $2a$10 hash as all other demo users)
-- Tenant:   NuLogic (660e8400-e29b-41d4-a716-446655440001)
-- Role:     FINANCE_ADMIN (seeded by V286)
--
-- SAFETY: All inserts use ON CONFLICT DO NOTHING / DO UPDATE — safe to re-run.
-- =============================================================================

SELECT set_config('app.current_tenant_id', '660e8400-e29b-41d4-a716-446655440001', true);

-- ── User record ──────────────────────────────────────────────────────────────
INSERT INTO users (
    id, tenant_id, email, first_name, last_name, password_hash,
    status, failed_login_attempts, mfa_enabled,
    created_at, updated_at, version, is_deleted
)
VALUES (
    '550e8400-e29b-41d4-a716-446655440057',
    '660e8400-e29b-41d4-a716-446655440001',
    'finance@nulogic.io',
    'Fiona',
    'Nance',
    '$2a$10$Yz2jagooVRjNy0jIkBH65uLechlFdTUIRtz44XSrXEtcPAnWObR/e',
    'ACTIVE',
    0,
    false,
    NOW(), NOW(), 0, false
) ON CONFLICT DO NOTHING;

-- ── Employee record (required for permission evaluation + self-service pages) ──
INSERT INTO employees (
    id, tenant_id, employee_code, user_id,
    first_name, last_name, personal_email,
    joining_date, designation, level, job_role,
    employment_type, status,
    created_at, updated_at, version, is_deleted
)
VALUES (
    '550e8400-e29b-41d4-a716-446655440058',
    '660e8400-e29b-41d4-a716-446655440001',
    'EMP-FIN',
    '550e8400-e29b-41d4-a716-446655440057',
    'Fiona',
    'Nance',
    'finance@nulogic.io',
    CURRENT_DATE,
    'Finance Administrator',
    'MANAGER',
    'ADMIN',
    'FULL_TIME',
    'ACTIVE',
    NOW(), NOW(), 0, false
) ON CONFLICT DO NOTHING;

-- ── Role assignment (FINANCE_ADMIN role, created by V286) ──────────────────────
INSERT INTO user_roles (user_id, role_id, tenant_id, is_deleted, deleted_at)
SELECT
    '550e8400-e29b-41d4-a716-446655440057',
    r.id,
    '660e8400-e29b-41d4-a716-446655440001',
    false,
    NULL
FROM roles r
WHERE r.tenant_id = '660e8400-e29b-41d4-a716-446655440001'
  AND r.code = 'FINANCE_ADMIN'
  AND (r.is_deleted = false OR r.is_deleted IS NULL)
ON CONFLICT (user_id, role_id) DO UPDATE
    SET tenant_id = EXCLUDED.tenant_id,
        is_deleted = false,
        deleted_at = NULL;
