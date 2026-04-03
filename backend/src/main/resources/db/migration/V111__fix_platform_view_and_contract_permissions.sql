-- ============================================================================
-- V111: Fix PLATFORM:VIEW permission assignment + contract/selfservice gaps
-- ============================================================================
-- Fixes BUG-QA2-005: GET /api/v1/platform/applications returns 500 for
-- all users because PLATFORM:VIEW was never assigned to any role in V107.
--
-- Also adds SELF_SERVICE:UPDATE permission so employees can call
-- POST /api/v1/self-service/profile-updates (BUG-QA2-012 partial fix).
--
-- TENANT: NuLogic Internal — 660e8400-e29b-41d4-a716-446655440001
-- ============================================================================

-- ============================================================================
-- Step 1: Ensure PLATFORM:VIEW and PLATFORM:MANAGE exist in permissions table
-- (V96 seeds them but guard with ON CONFLICT just in case)
-- ============================================================================
INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'PLATFORM:VIEW', 'Platform View', 'View platform applications and context', 'platform',
        'view', NOW(), NOW(), 0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'PLATFORM:MANAGE', 'Platform Manage', 'Manage platform configuration', 'platform', 'manage',
        NOW(), NOW(), 0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'SELF_SERVICE:UPDATE', 'Self Service Update', 'Submit self-service profile update requests',
        'self_service', 'update', NOW(), NOW(), 0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'CONTRACT:VIEW', 'Contract View', 'View employment contracts', 'contract', 'view', NOW(),
        NOW(), 0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

-- ============================================================================
-- Step 2: Assign PLATFORM:VIEW to ALL roles
-- (All authenticated users need to see the app switcher in their waffle grid)
-- ============================================================================

-- EMPLOYEE role
INSERT INTO role_permissions (id, tenant_id, role_id, permission_id, scope, created_at, updated_at, version, is_deleted)
SELECT gen_random_uuid(),
       '660e8400-e29b-41d4-a716-446655440001',
       '550e8400-e29b-41d4-a716-446655440023',
       p.id,
       'SELF',
       NOW(),
       NOW(),
       0,
       false
FROM permissions p
WHERE p.code IN ('PLATFORM:VIEW', 'SELF_SERVICE:UPDATE', 'CONTRACT:VIEW')
  AND p.is_deleted = false ON CONFLICT DO NOTHING;

-- MANAGER role
INSERT INTO role_permissions (id, tenant_id, role_id, permission_id, scope, created_at, updated_at, version, is_deleted)
SELECT gen_random_uuid(),
       '660e8400-e29b-41d4-a716-446655440001',
       '550e8400-e29b-41d4-a716-446655440022',
       p.id,
       'TEAM',
       NOW(),
       NOW(),
       0,
       false
FROM permissions p
WHERE p.code IN ('PLATFORM:VIEW', 'CONTRACT:VIEW')
  AND p.is_deleted = false ON CONFLICT DO NOTHING;

-- HR_ADMIN role
INSERT INTO role_permissions (id, tenant_id, role_id, permission_id, scope, created_at, updated_at, version, is_deleted)
SELECT gen_random_uuid(),
       '660e8400-e29b-41d4-a716-446655440001',
       '550e8400-e29b-41d4-a716-446655440021',
       p.id,
       'ALL',
       NOW(),
       NOW(),
       0,
       false
FROM permissions p
WHERE p.code IN ('PLATFORM:VIEW', 'PLATFORM:MANAGE', 'CONTRACT:VIEW')
  AND p.is_deleted = false ON CONFLICT DO NOTHING;

-- HR_MANAGER role
INSERT INTO role_permissions (id, tenant_id, role_id, permission_id, scope, created_at, updated_at, version, is_deleted)
SELECT gen_random_uuid(),
       '660e8400-e29b-41d4-a716-446655440001',
       '48000000-0e01-0000-0000-000000000002',
       p.id,
       'ALL',
       NOW(),
       NOW(),
       0,
       false
FROM permissions p
WHERE p.code IN ('PLATFORM:VIEW', 'CONTRACT:VIEW')
  AND p.is_deleted = false ON CONFLICT DO NOTHING;

-- TEAM_LEAD role
INSERT INTO role_permissions (id, tenant_id, role_id, permission_id, scope, created_at, updated_at, version, is_deleted)
SELECT gen_random_uuid(),
       '660e8400-e29b-41d4-a716-446655440001',
       '48000000-0e01-0000-0000-000000000001',
       p.id,
       'TEAM',
       NOW(),
       NOW(),
       0,
       false
FROM permissions p
WHERE p.code IN ('PLATFORM:VIEW')
  AND p.is_deleted = false ON CONFLICT DO NOTHING;

-- RECRUITMENT_ADMIN role
INSERT INTO role_permissions (id, tenant_id, role_id, permission_id, scope, created_at, updated_at, version, is_deleted)
SELECT gen_random_uuid(),
       '660e8400-e29b-41d4-a716-446655440001',
       '48000000-0e01-0000-0000-000000000003',
       p.id,
       'ALL',
       NOW(),
       NOW(),
       0,
       false
FROM permissions p
WHERE p.code IN ('PLATFORM:VIEW')
  AND p.is_deleted = false ON CONFLICT DO NOTHING;

-- SUPER_ADMIN role (already bypasses, but add for completeness)
INSERT INTO role_permissions (id, tenant_id, role_id, permission_id, scope, created_at, updated_at, version, is_deleted)
SELECT gen_random_uuid(),
       '660e8400-e29b-41d4-a716-446655440001',
       '550e8400-e29b-41d4-a716-446655440020',
       p.id,
       'ALL',
       NOW(),
       NOW(),
       0,
       false
FROM permissions p
WHERE p.code IN ('PLATFORM:VIEW', 'PLATFORM:MANAGE')
  AND p.is_deleted = false ON CONFLICT DO NOTHING;

-- ============================================================================
-- Step 3: Seed the HRMS application into nu_applications table if missing.
-- This is required for GET /api/v1/platform/applications to return data.
-- HrmsPermissionInitializer registers on startup, but if the DB is fresh
-- the app switcher endpoint returns empty (not 500).
-- ============================================================================
INSERT INTO nu_applications (id, code, name, description, base_url, api_base_path, is_system_app,
                             status, display_order, icon_url,
                             created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(),
        'HRMS',
        'NU-HRMS',
        'Human Resource Management System - Complete HR operations platform',
        'http://localhost:3000',
        '/api/v1',
        false,
        'ACTIVE',
        1,
        '/icons/hrms.svg',
        NOW(), NOW(), 0, false) ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

INSERT INTO nu_applications (id, code, name, description, base_url, api_base_path, is_system_app,
                             status, display_order, icon_url,
                             created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(),
        'HIRE',
        'NU-Hire',
        'Recruitment & Onboarding - End-to-end talent acquisition platform',
        'http://localhost:3000',
        '/api/v1',
        false,
        'ACTIVE',
        2,
        '/icons/hire.svg',
        NOW(), NOW(), 0, false) ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

INSERT INTO nu_applications (id, code, name, description, base_url, api_base_path, is_system_app,
                             status, display_order, icon_url,
                             created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(),
        'GROW',
        'NU-Grow',
        'Performance & Learning - Reviews, goals, feedback, and LMS',
        'http://localhost:3000',
        '/api/v1',
        false,
        'ACTIVE',
        3,
        '/icons/grow.svg',
        NOW(), NOW(), 0, false) ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

INSERT INTO nu_applications (id, code, name, description, base_url, api_base_path, is_system_app,
                             status, display_order, icon_url,
                             created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(),
        'FLUENCE',
        'NU-Fluence',
        'Knowledge Management - Wiki, blogs, and Drive integration',
        'http://localhost:3000',
        '/api/v1',
        false,
        'ACTIVE',
        4,
        '/icons/fluence.svg',
        NOW(), NOW(), 0, false) ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;
