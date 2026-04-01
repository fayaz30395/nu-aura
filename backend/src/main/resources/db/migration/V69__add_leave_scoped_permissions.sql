-- V69: Add scoped leave permissions and assign to roles
-- Fixes: Employee role getting 403 on GET /leave-requests/employee/{id}
-- Root cause: LEAVE:VIEW_SELF, LEAVE:VIEW_TEAM, LEAVE:VIEW_ALL were never seeded
-- Note: permissions table has NO tenant_id column (global scope). role_permissions DOES have tenant_id.

-- ============================================================================
-- STEP 1: Insert missing scoped leave permissions (idempotent)
-- permissions table: globally unique code, no tenant_id column
-- ============================================================================
INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES
  (gen_random_uuid(), 'LEAVE:VIEW_ALL', 'View All Leave', 'View all employee leave requests', 'LEAVE', 'VIEW_ALL', NOW(), NOW(), 0, false),
  (gen_random_uuid(), 'LEAVE:VIEW_TEAM', 'View Team Leave', 'View team leave requests', 'LEAVE', 'VIEW_TEAM', NOW(), NOW(), 0, false),
  (gen_random_uuid(), 'LEAVE:VIEW_SELF', 'View Own Leave', 'View own leave requests', 'LEAVE', 'VIEW_SELF', NOW(), NOW(), 0, false),
  (gen_random_uuid(), 'LEAVE:CANCEL', 'Cancel Leave', 'Cancel leave requests', 'LEAVE', 'CANCEL', NOW(), NOW(), 0, false),
  (gen_random_uuid(), 'LEAVE:REJECT', 'Reject Leave', 'Reject leave requests', 'LEAVE', 'REJECT', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

-- ============================================================================
-- STEP 2: Assign LEAVE:VIEW_SELF to EMPLOYEE role (SELF scope)
-- ============================================================================
INSERT INTO role_permissions (id, tenant_id, role_id, permission_id, scope, created_at, updated_at, version, is_deleted)
SELECT gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440023', p.id, 'SELF', NOW(), NOW(), 0, false
FROM permissions p
WHERE p.code IN ('LEAVE:VIEW_SELF', 'LEAVE:CANCEL')
AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp
    WHERE rp.role_id = '550e8400-e29b-41d4-a716-446655440023'
    AND rp.permission_id = p.id
    AND rp.tenant_id = '660e8400-e29b-41d4-a716-446655440001'
);

-- ============================================================================
-- STEP 3: Assign LEAVE:VIEW_TEAM to TEAM_LEAD role (TEAM scope)
-- ============================================================================
INSERT INTO role_permissions (id, tenant_id, role_id, permission_id, scope, created_at, updated_at, version, is_deleted)
SELECT gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', '48000000-0e01-0000-0000-000000000001', p.id, 'TEAM', NOW(), NOW(), 0, false
FROM permissions p
WHERE p.code IN ('LEAVE:VIEW_TEAM', 'LEAVE:REJECT')
AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp
    WHERE rp.role_id = '48000000-0e01-0000-0000-000000000001'
    AND rp.permission_id = p.id
    AND rp.tenant_id = '660e8400-e29b-41d4-a716-446655440001'
);

-- ============================================================================
-- STEP 4: Assign LEAVE:VIEW_TEAM to MANAGER role (TEAM scope)
-- ============================================================================
INSERT INTO role_permissions (id, tenant_id, role_id, permission_id, scope, created_at, updated_at, version, is_deleted)
SELECT gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440022', p.id, 'TEAM', NOW(), NOW(), 0, false
FROM permissions p
WHERE p.code IN ('LEAVE:VIEW_TEAM', 'LEAVE:REJECT')
AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp
    WHERE rp.role_id = '550e8400-e29b-41d4-a716-446655440022'
    AND rp.permission_id = p.id
    AND rp.tenant_id = '660e8400-e29b-41d4-a716-446655440001'
);

-- ============================================================================
-- STEP 5: Assign LEAVE:VIEW_ALL to HR_MANAGER role (ALL scope)
-- ============================================================================
INSERT INTO role_permissions (id, tenant_id, role_id, permission_id, scope, created_at, updated_at, version, is_deleted)
SELECT gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440021', p.id, 'ALL', NOW(), NOW(), 0, false
FROM permissions p
WHERE p.code IN ('LEAVE:VIEW_ALL', 'LEAVE:REJECT', 'LEAVE:CANCEL')
AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp
    WHERE rp.role_id = '550e8400-e29b-41d4-a716-446655440021'
    AND rp.permission_id = p.id
    AND rp.tenant_id = '660e8400-e29b-41d4-a716-446655440001'
);
