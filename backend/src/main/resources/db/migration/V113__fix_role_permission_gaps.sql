-- ============================================================================
-- V113: Fix RBAC permission gaps found during QA testing
-- Fixes:
--   1. HR_MANAGER missing payroll permissions (PAYROLL:PROCESS, PAYROLL:VIEW_ALL)
--   2. HR_MANAGER missing goal view/update permissions
--   3. HR_MANAGER missing OKR permissions
--   4. HR_MANAGER missing 360 Feedback permissions
--   5. HR_MANAGER missing notification permission (NOTIFICATIONS:VIEW)
--   6. HR_MANAGER missing workflow permission (WORKFLOW:VIEW)
--   7. Ensure NOTIFICATIONS:VIEW permission exists in permissions table
-- ============================================================================

-- Tenant: NuLogic
-- HR_MANAGER role ID: 48000000-0e01-0000-0000-000000000002
-- RECRUITMENT_ADMIN role ID: 48000000-0e01-0000-0000-000000000003

-- Step 1: Ensure all required permissions exist in the permissions table
-- Some permissions may not have been seeded in V96
INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'NOTIFICATIONS:VIEW', 'View Notifications', 'View notifications', 'notifications', 'view', NOW(), NOW(), 0, false)
ON CONFLICT DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'WORKFLOW:VIEW', 'View Workflow', 'View workflow inbox', 'workflow', 'view', NOW(), NOW(), 0, false)
ON CONFLICT DO NOTHING;

-- Step 2: Add missing permissions to HR_MANAGER role
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
WHERE p.code IN (
    -- Payroll: allow HR_MANAGER to view all payroll data and process payroll
    'PAYROLL:PROCESS',
    'PAYROLL:VIEW_ALL',
    'PAYROLL:APPROVE',

    -- Goals: allow viewing and updating goals (CREATE and APPROVE already granted)
    'GOAL:VIEW',
    'GOAL:UPDATE',
    'GOAL:DELETE',

    -- OKR: full OKR access for HR_MANAGER
    'OKR:VIEW',
    'OKR:VIEW_ALL',
    'OKR:CREATE',
    'OKR:UPDATE',
    'OKR:APPROVE',
    'OKR:DELETE',

    -- 360 Feedback: view, create, submit, and manage
    'FEEDBACK_360:VIEW',
    'FEEDBACK_360:CREATE',
    'FEEDBACK_360:SUBMIT',
    'FEEDBACK_360:MANAGE',

    -- Feedback (general): create and manage
    'FEEDBACK:CREATE',
    'FEEDBACK:UPDATE',

    -- Notifications: fix naming mismatch (controller uses NOTIFICATIONS:VIEW)
    'NOTIFICATIONS:VIEW',
    'NOTIFICATION:VIEW',

    -- Workflow inbox
    'WORKFLOW:VIEW',
    'WORKFLOW:EXECUTE'
)
  AND p.is_deleted = false
  AND NOT EXISTS (
      SELECT 1 FROM role_permissions rp
      WHERE rp.role_id = '48000000-0e01-0000-0000-000000000002'
        AND rp.permission_id = p.id
        AND rp.tenant_id = '660e8400-e29b-41d4-a716-446655440001'
        AND rp.is_deleted = false
  );

-- Step 3: Add same critical permissions to HR_ADMIN role
-- HR_ADMIN (550e8400-e29b-41d4-a716-446655440021) should have everything HR_MANAGER has
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
WHERE p.code IN (
    'PAYROLL:PROCESS', 'PAYROLL:VIEW_ALL', 'PAYROLL:APPROVE',
    'GOAL:VIEW', 'GOAL:UPDATE', 'GOAL:DELETE',
    'OKR:VIEW', 'OKR:VIEW_ALL', 'OKR:CREATE', 'OKR:UPDATE', 'OKR:APPROVE', 'OKR:DELETE',
    'FEEDBACK_360:VIEW', 'FEEDBACK_360:CREATE', 'FEEDBACK_360:SUBMIT', 'FEEDBACK_360:MANAGE',
    'FEEDBACK:CREATE', 'FEEDBACK:UPDATE',
    'NOTIFICATIONS:VIEW', 'NOTIFICATION:VIEW',
    'WORKFLOW:VIEW', 'WORKFLOW:EXECUTE'
)
  AND p.is_deleted = false
  AND NOT EXISTS (
      SELECT 1 FROM role_permissions rp
      WHERE rp.role_id = '550e8400-e29b-41d4-a716-446655440021'
        AND rp.permission_id = p.id
        AND rp.tenant_id = '660e8400-e29b-41d4-a716-446655440001'
        AND rp.is_deleted = false
  );

-- Step 4: Fix RECRUITMENT_ADMIN — add notification and workflow permissions
-- so the dashboard and common features work
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
WHERE p.code IN (
    'NOTIFICATIONS:VIEW',
    'NOTIFICATION:VIEW',
    'WORKFLOW:VIEW',
    'WORKFLOW:EXECUTE'
)
  AND p.is_deleted = false
  AND NOT EXISTS (
      SELECT 1 FROM role_permissions rp
      WHERE rp.role_id = '48000000-0e01-0000-0000-000000000003'
        AND rp.permission_id = p.id
        AND rp.tenant_id = '660e8400-e29b-41d4-a716-446655440001'
        AND rp.is_deleted = false
  );
