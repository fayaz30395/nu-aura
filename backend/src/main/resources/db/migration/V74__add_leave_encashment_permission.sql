-- ============================================================================
-- V74: Add LEAVE_BALANCE:ENCASH permission and grant to HR_MANAGER, HR_ADMIN
--
-- Fixes: Leave encashment endpoint requires LEAVE_BALANCE:ENCASH permission
-- but demo roles don't have it, causing 403 for HR users.
--
-- Role IDs (from V19 + V49):
--   SUPER_ADMIN:      550e8400-e29b-41d4-a716-446655440020 (bypasses all checks)
--   HR_ADMIN:         550e8400-e29b-41d4-a716-446655440021
--   HR_MANAGER:       48000000-0e01-0000-0000-000000000002
--
-- Tenant: NuLogic (660e8400-e29b-41d4-a716-446655440001)
-- Idempotent: uses ON CONFLICT DO NOTHING
-- ============================================================================

-- ============================================================================
-- STEP 1: Insert LEAVE_BALANCE:ENCASH permission if not exists
-- permissions table: globally unique code, no tenant_id column
-- ============================================================================
INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'LEAVE_BALANCE:ENCASH', 'Encash Leave Balance', 'Process leave balance encashment for employees', 'LEAVE_BALANCE', 'ENCASH', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

-- ============================================================================
-- STEP 2: Grant LEAVE_BALANCE:ENCASH to HR_ADMIN (scope: ALL)
-- ============================================================================
INSERT INTO role_permissions (id, tenant_id, role_id, permission_id, scope, created_at, updated_at, version, is_deleted)
SELECT gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440021', p.id, 'ALL', NOW(), NOW(), 0, false
FROM permissions p
WHERE p.code = 'LEAVE_BALANCE:ENCASH'
AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp
    WHERE rp.role_id = '550e8400-e29b-41d4-a716-446655440021'
    AND rp.permission_id = p.id
    AND rp.tenant_id = '660e8400-e29b-41d4-a716-446655440001'
);

-- ============================================================================
-- STEP 3: Grant LEAVE_BALANCE:ENCASH to HR_MANAGER (scope: ALL)
-- ============================================================================
INSERT INTO role_permissions (id, tenant_id, role_id, permission_id, scope, created_at, updated_at, version, is_deleted)
SELECT gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', '48000000-0e01-0000-0000-000000000002', p.id, 'ALL', NOW(), NOW(), 0, false
FROM permissions p
WHERE p.code = 'LEAVE_BALANCE:ENCASH'
AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp
    WHERE rp.role_id = '48000000-0e01-0000-0000-000000000002'
    AND rp.permission_id = p.id
    AND rp.tenant_id = '660e8400-e29b-41d4-a716-446655440001'
);

-- ============================================================================
-- STEP 4: Also seed the companion permissions if missing
-- LEAVE_BALANCE:VIEW, LEAVE_BALANCE:VIEW_ALL, LEAVE_BALANCE:MANAGE
-- ============================================================================
INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES
  (gen_random_uuid(), 'LEAVE_BALANCE:VIEW', 'View Leave Balance', 'View own leave balance', 'LEAVE_BALANCE', 'VIEW', NOW(), NOW(), 0, false),
  (gen_random_uuid(), 'LEAVE_BALANCE:VIEW_ALL', 'View All Leave Balances', 'View all employee leave balances', 'LEAVE_BALANCE', 'VIEW_ALL', NOW(), NOW(), 0, false),
  (gen_random_uuid(), 'LEAVE_BALANCE:MANAGE', 'Manage Leave Balances', 'Create and adjust leave balances', 'LEAVE_BALANCE', 'MANAGE', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

-- Grant LEAVE_BALANCE:VIEW to EMPLOYEE (SELF scope)
INSERT INTO role_permissions (id, tenant_id, role_id, permission_id, scope, created_at, updated_at, version, is_deleted)
SELECT gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440023', p.id, 'SELF', NOW(), NOW(), 0, false
FROM permissions p
WHERE p.code = 'LEAVE_BALANCE:VIEW'
AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp
    WHERE rp.role_id = '550e8400-e29b-41d4-a716-446655440023'
    AND rp.permission_id = p.id
    AND rp.tenant_id = '660e8400-e29b-41d4-a716-446655440001'
);

-- Grant LEAVE_BALANCE:VIEW_ALL + MANAGE to HR_ADMIN (ALL scope)
INSERT INTO role_permissions (id, tenant_id, role_id, permission_id, scope, created_at, updated_at, version, is_deleted)
SELECT gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440021', p.id, 'ALL', NOW(), NOW(), 0, false
FROM permissions p
WHERE p.code IN ('LEAVE_BALANCE:VIEW_ALL', 'LEAVE_BALANCE:MANAGE')
AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp
    WHERE rp.role_id = '550e8400-e29b-41d4-a716-446655440021'
    AND rp.permission_id = p.id
    AND rp.tenant_id = '660e8400-e29b-41d4-a716-446655440001'
);

-- Grant LEAVE_BALANCE:VIEW_ALL + MANAGE to HR_MANAGER (ALL scope)
INSERT INTO role_permissions (id, tenant_id, role_id, permission_id, scope, created_at, updated_at, version, is_deleted)
SELECT gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', '48000000-0e01-0000-0000-000000000002', p.id, 'ALL', NOW(), NOW(), 0, false
FROM permissions p
WHERE p.code IN ('LEAVE_BALANCE:VIEW_ALL', 'LEAVE_BALANCE:MANAGE')
AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp
    WHERE rp.role_id = '48000000-0e01-0000-0000-000000000002'
    AND rp.permission_id = p.id
    AND rp.tenant_id = '660e8400-e29b-41d4-a716-446655440001'
);

-- ============================================================================
-- DONE — LEAVE_BALANCE permissions seeded for demo roles
-- ============================================================================
