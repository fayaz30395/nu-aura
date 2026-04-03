-- ============================================================================
-- V115: Seed missing permissions that V96 forgot to include
-- ============================================================================
-- ROOT CAUSE: V96's canonical reseed only created GOAL:CREATE and GOAL:APPROVE
-- but never created GOAL:VIEW, GOAL:UPDATE, GOAL:DELETE, or OKR:DELETE.
-- V114's role_permission INSERTs for these codes matched zero rows because
-- the permission rows don't exist. This migration creates them, then assigns
-- them to the appropriate roles.
--
-- NOTE: The permissions table has a PARTIAL unique index:
--   idx_permission_code ON permissions (code) WHERE is_deleted = false
-- So ON CONFLICT must include the WHERE clause to match the partial index.
-- ============================================================================

-- ============================================================================
-- Step 1: Create missing permissions in the permissions table
-- ============================================================================
INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'GOAL:VIEW', 'Goal View', 'View goals', 'goal', 'view', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'GOAL:UPDATE', 'Goal Update', 'Update goals', 'goal', 'update', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'GOAL:DELETE', 'Goal Delete', 'Delete goals', 'goal', 'delete', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'OKR:DELETE', 'OKR Delete', 'Delete OKR', 'okr', 'delete', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

-- NOTIFICATIONS:VIEW (plural) — V113 Step 1 may have already added this
INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'NOTIFICATIONS:VIEW', 'View Notifications', 'View notifications', 'notifications', 'view', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

-- ============================================================================
-- Step 2: Assign newly-created permissions to roles
-- Now that the permission rows exist, we can create role_permission entries.
-- role_permissions uses gen_random_uuid() for id, so no PK conflict possible.
-- ============================================================================

-- ROLE UUIDs:
--   HR_MANAGER:        48000000-0e01-0000-0000-000000000002
--   HR_ADMIN:          550e8400-e29b-41d4-a716-446655440021
--   RECRUITMENT_ADMIN: 48000000-0e01-0000-0000-000000000003
--   MANAGER:           550e8400-e29b-41d4-a716-446655440022
--   TEAM_LEAD:         48000000-0e01-0000-0000-000000000001
--   EMPLOYEE:          550e8400-e29b-41d4-a716-446655440023

-- HR_MANAGER: Goal CRUD + OKR:DELETE + NOTIFICATIONS:VIEW
INSERT INTO role_permissions (id, tenant_id, role_id, permission_id, scope, created_at, updated_at, version, is_deleted)
SELECT gen_random_uuid(),
       '660e8400-e29b-41d4-a716-446655440001',
       '48000000-0e01-0000-0000-000000000002',
       p.id,
       'ALL',
       NOW(), NOW(), 0, false
FROM permissions p
WHERE p.code IN ('GOAL:VIEW', 'GOAL:UPDATE', 'GOAL:DELETE', 'OKR:DELETE', 'NOTIFICATIONS:VIEW')
  AND p.is_deleted = false
  AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp
    WHERE rp.role_id = '48000000-0e01-0000-0000-000000000002'
      AND rp.permission_id = p.id
      AND rp.tenant_id = '660e8400-e29b-41d4-a716-446655440001'
  );

-- HR_ADMIN: Same permissions
INSERT INTO role_permissions (id, tenant_id, role_id, permission_id, scope, created_at, updated_at, version, is_deleted)
SELECT gen_random_uuid(),
       '660e8400-e29b-41d4-a716-446655440001',
       '550e8400-e29b-41d4-a716-446655440021',
       p.id,
       'ALL',
       NOW(), NOW(), 0, false
FROM permissions p
WHERE p.code IN ('GOAL:VIEW', 'GOAL:UPDATE', 'GOAL:DELETE', 'OKR:DELETE', 'NOTIFICATIONS:VIEW')
  AND p.is_deleted = false
  AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp
    WHERE rp.role_id = '550e8400-e29b-41d4-a716-446655440021'
      AND rp.permission_id = p.id
      AND rp.tenant_id = '660e8400-e29b-41d4-a716-446655440001'
  );

-- MANAGER: Goal view/update (team scope)
INSERT INTO role_permissions (id, tenant_id, role_id, permission_id, scope, created_at, updated_at, version, is_deleted)
SELECT gen_random_uuid(),
       '660e8400-e29b-41d4-a716-446655440001',
       '550e8400-e29b-41d4-a716-446655440022',
       p.id,
       'TEAM',
       NOW(), NOW(), 0, false
FROM permissions p
WHERE p.code IN ('GOAL:VIEW', 'GOAL:UPDATE', 'NOTIFICATIONS:VIEW')
  AND p.is_deleted = false
  AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp
    WHERE rp.role_id = '550e8400-e29b-41d4-a716-446655440022'
      AND rp.permission_id = p.id
      AND rp.tenant_id = '660e8400-e29b-41d4-a716-446655440001'
  );

-- TEAM_LEAD: Goal view/update (team scope)
INSERT INTO role_permissions (id, tenant_id, role_id, permission_id, scope, created_at, updated_at, version, is_deleted)
SELECT gen_random_uuid(),
       '660e8400-e29b-41d4-a716-446655440001',
       '48000000-0e01-0000-0000-000000000001',
       p.id,
       'TEAM',
       NOW(), NOW(), 0, false
FROM permissions p
WHERE p.code IN ('GOAL:VIEW', 'GOAL:UPDATE', 'NOTIFICATIONS:VIEW')
  AND p.is_deleted = false
  AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp
    WHERE rp.role_id = '48000000-0e01-0000-0000-000000000001'
      AND rp.permission_id = p.id
      AND rp.tenant_id = '660e8400-e29b-41d4-a716-446655440001'
  );

-- EMPLOYEE: Goal view (self scope)
INSERT INTO role_permissions (id, tenant_id, role_id, permission_id, scope, created_at, updated_at, version, is_deleted)
SELECT gen_random_uuid(),
       '660e8400-e29b-41d4-a716-446655440001',
       '550e8400-e29b-41d4-a716-446655440023',
       p.id,
       'SELF',
       NOW(), NOW(), 0, false
FROM permissions p
WHERE p.code IN ('GOAL:VIEW', 'NOTIFICATIONS:VIEW')
  AND p.is_deleted = false
  AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp
    WHERE rp.role_id = '550e8400-e29b-41d4-a716-446655440023'
      AND rp.permission_id = p.id
      AND rp.tenant_id = '660e8400-e29b-41d4-a716-446655440001'
  );
