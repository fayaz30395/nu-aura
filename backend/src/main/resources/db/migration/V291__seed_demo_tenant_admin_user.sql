-- =============================================================================
-- V291: Seed demo TENANT_ADMIN user for NuLogic tenant
-- =============================================================================
-- Creates tenant.admin@nulogic.io with TENANT_ADMIN role so that:
--   1. Playwright E2E tests can authenticate as TENANT_ADMIN (demoUsers.tenantAdmin)
--   2. The RBAC permission fix in V289/V290 is observable end-to-end in demo
--
-- Password: Welcome@123  (bcrypt $2a$10 hash — same hash as all other demo users)
-- Tenant:   NuLogic (660e8400-e29b-41d4-a716-446655440001)
--
-- SAFETY: All inserts use ON CONFLICT DO NOTHING — safe to re-run.
-- =============================================================================

SELECT set_config('app.current_tenant_id', '660e8400-e29b-41d4-a716-446655440001', true);

-- ── User record ──────────────────────────────────────────────────────────────
INSERT INTO users (
    id, tenant_id, email, first_name, last_name, password_hash,
    status, failed_login_attempts, mfa_enabled,
    created_at, updated_at, version, is_deleted
)
VALUES (
    '550e8400-e29b-41d4-a716-446655440055',
    '660e8400-e29b-41d4-a716-446655440001',
    'tenant.admin@nulogic.io',
    'Tenant',
    'Admin',
    '$2a$10$Yz2jagooVRjNy0jIkBH65uLechlFdTUIRtz44XSrXEtcPAnWObR/e',
    'ACTIVE',
    0,
    false,
    NOW(), NOW(), 0, false
) ON CONFLICT DO NOTHING;

-- ── Employee record (required for permission evaluation context) ───────────────
INSERT INTO employees (
    id, tenant_id, employee_code, user_id,
    first_name, last_name, personal_email,
    joining_date, designation, level, job_role,
    employment_type, status,
    created_at, updated_at, version, is_deleted
)
VALUES (
    '550e8400-e29b-41d4-a716-446655440056',
    '660e8400-e29b-41d4-a716-446655440001',
    'EMP-ADMIN',
    '550e8400-e29b-41d4-a716-446655440055',
    'Tenant',
    'Admin',
    'tenant.admin@nulogic.io',
    CURRENT_DATE,
    'Tenant Administrator',
    'MANAGER',
    'ADMIN',
    'FULL_TIME',
    'ACTIVE',
    NOW(), NOW(), 0, false
) ON CONFLICT DO NOTHING;

-- ── Role assignment (TENANT_ADMIN role, created by V290 or TenantProvisioningService) ──
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
ON CONFLICT (user_id, role_id) DO UPDATE
    SET tenant_id = EXCLUDED.tenant_id,
        is_deleted = false,
        deleted_at = NULL;
