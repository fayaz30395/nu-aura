-- ============================================================================
-- V315: Release-Gate Blocker Fixes (2026-06-24)
--
-- Fixes three independent blockers from the Release Gate Assessment:
--
-- FIX-1 (CRITICAL — RG-01/RG-04): admin@nulogic.io does not exist as a user.
--   The account was referenced in QA test plans but was never seeded in any
--   migration (V19/V252 only use it as a tenant contact_email, not a user row).
--   Creates the user with HR_ADMIN role and a linked employee record so the
--   account is accessible. When DEMO_CREDENTIALS_ENABLED=false this migration
--   re-applies the same credential-neutralization logic as V314, so the account
--   is immediately SUSPENDED pending a proper admin password reset.
--
-- FIX-2 (HIGH — RG-13): HR_MANAGER gets 403 on GET /self-service/dashboard
--   (requires EMPLOYEE:VIEW_SELF) and GET /roles (requires ROLE_READ).
--   EMPLOYEE:VIEW_SELF is present in RoleHierarchy.getHRManagerPermissions()
--   but may be absent in role_permissions on the live DB if:
--     a. V96 (canonical_permission_reseed) wiped all role_permissions, and
--     b. HrmsRoleInitializer re-seeded for DEFAULT tenant only (not NuLogic),
--        leaving the NuLogic HR_MANAGER with a partial permission set.
--   This migration ensures EMPLOYEE:VIEW_SELF is present for every HR_MANAGER
--   role row across all tenants (idempotent, ON CONFLICT DO NOTHING).
--   ROLE_READ is also guaranteed so the GET /roles list endpoint works for HR.
--
-- FIX-3 (SECURITY — applied to FIX-1): Re-neutralize admin@nulogic.io when
--   DEMO_CREDENTIALS_ENABLED=false. Mirrors V314 logic for the newly seeded
--   account so a fresh prod/render deploy with the flag set false immediately
--   suspends it (preventing a Welcome@123 backdoor). V314 already ran before
--   this migration existed, so it could not have covered this new account.
--
-- SAFETY:
--   - All INSERTs are idempotent via ON CONFLICT DO NOTHING / DO UPDATE guards.
--   - Uses code-based role lookup (WHERE r.code = 'HR_MANAGER') — no hardcoded
--     UUIDs for the permission grant — covers all tenants including multi-tenant
--     scenarios.
--   - The admin@nulogic.io user INSERT uses a fixed UUID so repeated runs are safe.
-- ============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- FIX-1: Seed admin@nulogic.io in the NuLogic tenant
-- ─────────────────────────────────────────────────────────────────────────────
-- User row (UUID chosen to not collide with any existing V49/V291 UUIDs)
INSERT INTO users (
    id,
    tenant_id,
    email,
    first_name,
    last_name,
    password_hash,
    status,
    failed_login_attempts,
    mfa_enabled,
    created_at,
    updated_at,
    version,
    is_deleted
)
VALUES (
    '48000000-0e02-0000-0000-000000000099',
    '660e8400-e29b-41d4-a716-446655440001',
    'admin@nulogic.io',
    'Admin',
    'NuLogic',
    -- Welcome@123 (same hash used by V122/V173/V291/V312 demo accounts)
    '$2a$10$Yz2jagooVRjNy0jIkBH65uLechlFdTUIRtz44XSrXEtcPAnWObR/e',
    'ACTIVE',
    0,
    false,
    NOW(),
    NOW(),
    0,
    false
)
ON CONFLICT (id) DO NOTHING;

-- Employee record (required for self-service pages + permission evaluation)
INSERT INTO employees (
    id,
    tenant_id,
    employee_code,
    user_id,
    first_name,
    last_name,
    personal_email,
    joining_date,
    designation,
    level,
    job_role,
    employment_type,
    status,
    created_at,
    updated_at,
    version,
    is_deleted
)
VALUES (
    '48000000-de00-0000-0000-000000000099',
    '660e8400-e29b-41d4-a716-446655440001',
    'SYS-ADMIN-01',
    '48000000-0e02-0000-0000-000000000099',
    'Admin',
    'NuLogic',
    'admin@nulogic.io',
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
)
ON CONFLICT (id) DO NOTHING;

-- Assign HR_ADMIN role to the admin user
SELECT set_config('app.current_tenant_id', '660e8400-e29b-41d4-a716-446655440001', true);

INSERT INTO user_roles (user_id, role_id, tenant_id, is_deleted, deleted_at)
SELECT
    '48000000-0e02-0000-0000-000000000099',
    r.id,
    '660e8400-e29b-41d4-a716-446655440001',
    false,
    NULL
FROM roles r
WHERE r.tenant_id = '660e8400-e29b-41d4-a716-446655440001'
  AND r.code = 'HR_ADMIN'
  AND (r.is_deleted = false OR r.is_deleted IS NULL)
ON CONFLICT (user_id, role_id) DO UPDATE
    SET is_deleted = false,
        deleted_at = NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- FIX-2a: Ensure EMPLOYEE:VIEW_SELF is in role_permissions for every HR_MANAGER
-- (uses code-based lookup — safe across all tenants)
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO role_permissions (id, tenant_id, role_id, permission_id, scope, created_at, updated_at, version, is_deleted)
SELECT
    gen_random_uuid(),
    r.tenant_id,
    r.id,
    p.id,
    'ALL',
    NOW(),
    NOW(),
    0,
    false
FROM roles r
CROSS JOIN permissions p
WHERE r.code = 'HR_MANAGER'
  AND (r.is_deleted = false OR r.is_deleted IS NULL)
  AND p.code = 'EMPLOYEE:VIEW_SELF'
  AND (p.is_deleted = false OR p.is_deleted IS NULL)
ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- FIX-2b: Ensure ROLE:READ is in role_permissions for every HR_MANAGER
-- (allows GET /roles list and GET /roles/{id} read endpoints)
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO role_permissions (id, tenant_id, role_id, permission_id, scope, created_at, updated_at, version, is_deleted)
SELECT
    gen_random_uuid(),
    r.tenant_id,
    r.id,
    p.id,
    'ALL',
    NOW(),
    NOW(),
    0,
    false
FROM roles r
CROSS JOIN permissions p
WHERE r.code = 'HR_MANAGER'
  AND (r.is_deleted = false OR r.is_deleted IS NULL)
  AND p.code = 'ROLE:READ'
  AND (p.is_deleted = false OR p.is_deleted IS NULL)
ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- FIX-3: Re-neutralize admin@nulogic.io when DEMO_CREDENTIALS_ENABLED=false
-- Mirrors V314 logic — same hash-based check, same sentinel, same status.
-- V314 already ran (no-op with true) and cannot be re-run by Flyway.
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
    affected INTEGER;
BEGIN
    IF lower('${demoCredentialsEnabled}') = 'true' THEN
        RAISE NOTICE 'V315: demoCredentialsEnabled=true — leaving admin@nulogic.io active (demo environment).';
        RETURN;
    END IF;

    UPDATE users
       SET password_hash         = 'LOCKED_DEMO_CREDENTIAL_' || gen_random_uuid(),
           status                = 'SUSPENDED',
           failed_login_attempts = 0,
           locked_until          = NULL,
           updated_at            = NOW()
     WHERE email = 'admin@nulogic.io'
       AND tenant_id = '660e8400-e29b-41d4-a716-446655440001'
       AND password_hash IN (
            '$2a$10$D7mb1w2eljWfrBF3i8iZCu5A/H4mUXe8.3rHyWvgYy2j8eC3ghqD2',
            '$2a$10$Yz2jagooVRjNy0jIkBH65uLechlFdTUIRtz44XSrXEtcPAnWObR/e',
            '$2a$12$XMYaVk5yNVtCKiuFM5m3rOpR.73IKHFykmuvWP3OWYi8cqRbK0VHG'
        );

    GET DIAGNOSTICS affected = ROW_COUNT;
    RAISE NOTICE 'V315: neutralized % admin@nulogic.io account(s) for production deploy.', affected;
END $$;
