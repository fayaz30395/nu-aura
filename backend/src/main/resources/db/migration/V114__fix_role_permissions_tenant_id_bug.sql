-- ============================================================================
-- V114: Fix role_permissions gaps — correct V113 tenant_id JOIN bug
-- ============================================================================
-- ROOT CAUSE: V113 filtered permissions table by tenant_id, but V96's
-- canonical reseed inserted permissions WITHOUT tenant_id (the column is
-- NULL for all rows). So V113's JOINs matched zero rows and silently
-- inserted nothing.
--
-- This migration uses V107's pattern (no tenant_id filter on permissions
-- table) to correctly add the missing permission assignments.
--
-- ROLE UUIDs:
--   HR_MANAGER:       48000000-0e01-0000-0000-000000000002
--   HR_ADMIN:         550e8400-e29b-41d4-a716-446655440021
--   RECRUITMENT_ADMIN: 48000000-0e01-0000-0000-000000000003
--   MANAGER:          550e8400-e29b-41d4-a716-446655440022
--   TEAM_LEAD:        48000000-0e01-0000-0000-000000000001
--   EMPLOYEE:         550e8400-e29b-41d4-a716-446655440023
-- ============================================================================

-- ============================================================================
-- HR_MANAGER: Add OKR, Feedback360, Notifications, Workflow, Payroll permissions
-- ============================================================================
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
  -- Payroll: process and approve payroll
                 'PAYROLL:PROCESS',
                 'PAYROLL:VIEW_ALL',
                 'PAYROLL:APPROVE',

  -- Goals: view, update, delete (CREATE and APPROVE already in V107)
                 'GOAL:VIEW',
                 'GOAL:UPDATE',
                 'GOAL:DELETE',

  -- OKR: full access for HR_MANAGER
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

  -- Notifications: both naming variants used by controllers
                 'NOTIFICATIONS:VIEW',
                 'NOTIFICATION:VIEW',

  -- Workflow inbox
                 'WORKFLOW:VIEW',
                 'WORKFLOW:EXECUTE'
  )
  AND p.is_deleted = false ON CONFLICT DO NOTHING;

-- ============================================================================
-- HR_ADMIN: Same permissions (should have everything HR_MANAGER has)
-- ============================================================================
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
  AND p.is_deleted = false ON CONFLICT DO NOTHING;

-- ============================================================================
-- RECRUITMENT_ADMIN: Add notification and workflow permissions
-- ============================================================================
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
  AND p.is_deleted = false ON CONFLICT DO NOTHING;

-- ============================================================================
-- MANAGER: Add OKR, Feedback, Notifications, Workflow for team leads
-- ============================================================================
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
WHERE p.code IN (
                 'OKR:VIEW', 'OKR:CREATE', 'OKR:UPDATE',
                 'FEEDBACK_360:VIEW', 'FEEDBACK_360:CREATE', 'FEEDBACK_360:SUBMIT',
                 'NOTIFICATIONS:VIEW', 'NOTIFICATION:VIEW',
                 'WORKFLOW:VIEW', 'WORKFLOW:EXECUTE'
  )
  AND p.is_deleted = false ON CONFLICT DO NOTHING;

-- ============================================================================
-- TEAM_LEAD: Add OKR, Feedback, Notifications, Workflow for team leads
-- ============================================================================
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
WHERE p.code IN (
                 'OKR:VIEW', 'OKR:CREATE', 'OKR:UPDATE',
                 'FEEDBACK_360:VIEW', 'FEEDBACK_360:CREATE', 'FEEDBACK_360:SUBMIT',
                 'GOAL:VIEW', 'GOAL:CREATE', 'GOAL:UPDATE',
                 'NOTIFICATIONS:VIEW', 'NOTIFICATION:VIEW',
                 'WORKFLOW:VIEW', 'WORKFLOW:EXECUTE'
  )
  AND p.is_deleted = false ON CONFLICT DO NOTHING;

-- ============================================================================
-- EMPLOYEE: Add basic notification and goal view permissions
-- ============================================================================
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
WHERE p.code IN (
                 'GOAL:VIEW',
                 'OKR:VIEW',
                 'FEEDBACK_360:VIEW', 'FEEDBACK_360:SUBMIT',
                 'NOTIFICATIONS:VIEW', 'NOTIFICATION:VIEW',
                 'WORKFLOW:VIEW'
  )
  AND p.is_deleted = false ON CONFLICT DO NOTHING;
