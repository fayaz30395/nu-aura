-- ============================================================================
-- V67: Fix RBAC Permission Gaps Round 2
-- ============================================================================
-- OBJECTIVE: Add missing UPPERCASE permission codes for core HR modules:
-- ATTENDANCE, LEAVE, BENEFITS, CALENDAR, DASHBOARD, PERFORMANCE/REVIEW
--
-- Then assign REVIEW:VIEW, REVIEW:READ, GOAL:VIEW, GOAL:READ permissions
-- to TEAM_LEAD, MANAGER, and HR_MANAGER roles.
--
-- ROOT CAUSE: Controllers check permissions like REVIEW:VIEW, GOAL:VIEW, etc.
-- in UPPERCASE:COLON format, but database is missing these permissions.
--
-- SOLUTION: Insert all missing permissions with ON CONFLICT DO NOTHING
-- for idempotency. Then assign to roles via role_permissions table.
--
-- ROLE UUIDs (Tenant: NuLogic 660e8400-e29b-41d4-a716-446655440001):
--   TEAM_LEAD:      48000000-0e01-0000-0000-000000000001
--   MANAGER:        550e8400-e29b-41d4-a716-446655440022
--   EMPLOYEE:       550e8400-e29b-41d4-a716-446655440023
--   HR_MANAGER:     48000000-0e01-0000-0000-000000000002
--   HR_ADMIN:       550e8400-e29b-41d4-a716-446655440021
--   RECRUITMENT_ADMIN: 48000000-0e01-0000-0000-000000000003
--
-- ============================================================================

-- ============================================================================
-- SECTION A: INSERT MISSING PERMISSION CODES (UPPERCASE:COLON FORMAT)
-- ============================================================================

-- ============================================================================
-- Attendance Module Permissions
-- ============================================================================
INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'ATTENDANCE:VIEW', 'View Attendance', 'View attendance records', 'attendance', 'view', NOW(),
        NOW(), 0, false) ON CONFLICT DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'ATTENDANCE:VIEW_ALL', 'View All Attendance', 'View attendance records for all employees',
        'attendance', 'view_all', NOW(), NOW(), 0, false) ON CONFLICT DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'ATTENDANCE:VIEW_TEAM', 'View Team Attendance', 'View attendance records for team members',
        'attendance', 'view_team', NOW(), NOW(), 0, false) ON CONFLICT DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'ATTENDANCE:VIEW_SELF', 'View Own Attendance', 'View own attendance records', 'attendance',
        'view_self', NOW(), NOW(), 0, false) ON CONFLICT DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'ATTENDANCE:MANAGE', 'Manage Attendance', 'Manage attendance records and corrections',
        'attendance', 'manage', NOW(), NOW(), 0, false) ON CONFLICT DO NOTHING;

-- ============================================================================
-- Leave Module Permissions
-- ============================================================================
INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'LEAVE:VIEW', 'View Leave', 'View leave requests and balances', 'leave', 'view', NOW(),
        NOW(), 0, false) ON CONFLICT DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'LEAVE:VIEW_ALL', 'View All Leave', 'View all leave requests in organization', 'leave',
        'view_all', NOW(), NOW(), 0, false) ON CONFLICT DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'LEAVE:VIEW_TEAM', 'View Team Leave', 'View leave requests for team members', 'leave',
        'view_team', NOW(), NOW(), 0, false) ON CONFLICT DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'LEAVE:VIEW_SELF', 'View Own Leave', 'View own leave requests and balance', 'leave',
        'view_self', NOW(), NOW(), 0, false) ON CONFLICT DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'LEAVE:CREATE', 'Create Leave', 'Create new leave requests', 'leave', 'create', NOW(), NOW(),
        0, false) ON CONFLICT DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'LEAVE:APPROVE', 'Approve Leave', 'Approve or reject leave requests', 'leave', 'approve',
        NOW(), NOW(), 0, false) ON CONFLICT DO NOTHING;

-- ============================================================================
-- Benefits Module Permissions
-- ============================================================================
INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'BENEFIT:VIEW', 'View Benefits', 'View benefits information', 'benefit', 'view', NOW(),
        NOW(), 0, false) ON CONFLICT DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'BENEFIT:VIEW_ALL', 'View All Benefits', 'View all organization benefits', 'benefit',
        'view_all', NOW(), NOW(), 0, false) ON CONFLICT DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'BENEFIT:VIEW_SELF', 'View Own Benefits', 'View own benefits enrollment', 'benefit',
        'view_self', NOW(), NOW(), 0, false) ON CONFLICT DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'BENEFIT:MANAGE', 'Manage Benefits', 'Manage benefits enrollment and administration',
        'benefit', 'manage', NOW(), NOW(), 0, false) ON CONFLICT DO NOTHING;

-- ============================================================================
-- Calendar Module Permissions
-- ============================================================================
INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'CALENDAR:VIEW', 'View Calendar', 'View team and organization calendar', 'calendar', 'view',
        NOW(), NOW(), 0, false) ON CONFLICT DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'CALENDAR:MANAGE', 'Manage Calendar', 'Create and manage calendar events', 'calendar',
        'manage', NOW(), NOW(), 0, false) ON CONFLICT DO NOTHING;

-- ============================================================================
-- Dashboard Module Permissions
-- ============================================================================
INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'DASHBOARD:VIEW', 'View Dashboard', 'View personal dashboard', 'dashboard', 'view', NOW(),
        NOW(), 0, false) ON CONFLICT DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'DASHBOARD:MANAGE', 'Manage Dashboard', 'Customize and manage dashboard widgets',
        'dashboard', 'manage', NOW(), NOW(), 0, false) ON CONFLICT DO NOTHING;

-- ============================================================================
-- Performance & Review Module Permissions (KEY ADDITION FOR V67)
-- ============================================================================
INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'REVIEW:VIEW', 'View Reviews', 'View performance reviews', 'review', 'view', NOW(), NOW(), 0,
        false) ON CONFLICT DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'REVIEW:READ', 'Read Reviews', 'Read and view review details', 'review', 'read', NOW(),
        NOW(), 0, false) ON CONFLICT DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'REVIEW:CREATE', 'Create Reviews', 'Create new performance reviews', 'review', 'create',
        NOW(), NOW(), 0, false) ON CONFLICT DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'REVIEW:UPDATE', 'Update Reviews', 'Update performance reviews', 'review', 'update', NOW(),
        NOW(), 0, false) ON CONFLICT DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'REVIEW:SUBMIT', 'Submit Reviews', 'Submit performance reviews', 'review', 'submit', NOW(),
        NOW(), 0, false) ON CONFLICT DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'REVIEW:APPROVE', 'Approve Reviews', 'Approve performance reviews', 'review', 'approve',
        NOW(), NOW(), 0, false) ON CONFLICT DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'REVIEW:MANAGE', 'Manage Reviews', 'Full management of performance reviews', 'review',
        'manage', NOW(), NOW(), 0, false) ON CONFLICT DO NOTHING;

-- ============================================================================
-- Goal & OKR Module Permissions (ADDITIONAL FOR V67)
-- ============================================================================
INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'GOAL:VIEW', 'View Goals', 'View goals and objectives', 'goal', 'view', NOW(), NOW(), 0,
        false) ON CONFLICT DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'GOAL:READ', 'Read Goals', 'Read goal details', 'goal', 'read', NOW(), NOW(), 0,
        false) ON CONFLICT DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'GOAL:CREATE', 'Create Goals', 'Create new goals', 'goal', 'create', NOW(), NOW(), 0,
        false) ON CONFLICT DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'GOAL:UPDATE', 'Update Goals', 'Update goals', 'goal', 'update', NOW(), NOW(), 0,
        false) ON CONFLICT DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'GOAL:APPROVE', 'Approve Goals', 'Approve goal submissions', 'goal', 'approve', NOW(), NOW(),
        0, false) ON CONFLICT DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'GOAL:MANAGE', 'Manage Goals', 'Full management of goals', 'goal', 'manage', NOW(), NOW(), 0,
        false) ON CONFLICT DO NOTHING;

-- ============================================================================
-- SECTION B: ASSIGN PERMISSIONS TO ROLES
-- ============================================================================

-- ============================================================================
-- TEAM_LEAD Role (ID: 48000000-0e01-0000-0000-000000000001)
-- Scope: TEAM (can view/manage team members' data)
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
WHERE p.code IN ('ATTENDANCE:VIEW', 'ATTENDANCE:VIEW_TEAM', 'LEAVE:VIEW', 'LEAVE:VIEW_TEAM', 'BENEFIT:VIEW')
  AND NOT EXISTS (SELECT 1
                  FROM role_permissions rp
                  WHERE rp.role_id = '48000000-0e01-0000-0000-000000000001'
                    AND rp.permission_id = p.id
                    AND rp.scope = 'TEAM');

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
WHERE p.code IN ('REVIEW:VIEW', 'REVIEW:READ', 'GOAL:VIEW', 'GOAL:READ')
  AND NOT EXISTS (SELECT 1
                  FROM role_permissions rp
                  WHERE rp.role_id = '48000000-0e01-0000-0000-000000000001'
                    AND rp.permission_id = p.id
                    AND rp.scope = 'TEAM');

INSERT INTO role_permissions (id, tenant_id, role_id, permission_id, scope, created_at, updated_at, version, is_deleted)
SELECT gen_random_uuid(),
       '660e8400-e29b-41d4-a716-446655440001',
       '48000000-0e01-0000-0000-000000000001',
       p.id,
       'SELF',
       NOW(),
       NOW(),
       0,
       false
FROM permissions p
WHERE p.code IN ('ATTENDANCE:VIEW_SELF', 'LEAVE:VIEW_SELF', 'BENEFIT:VIEW_SELF', 'CALENDAR:VIEW', 'DASHBOARD:VIEW')
  AND NOT EXISTS (SELECT 1
                  FROM role_permissions rp
                  WHERE rp.role_id = '48000000-0e01-0000-0000-000000000001'
                    AND rp.permission_id = p.id
                    AND rp.scope = 'SELF');

-- ============================================================================
-- MANAGER Role (ID: 550e8400-e29b-41d4-a716-446655440022)
-- Scope: TEAM (can view/manage team members' data)
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
WHERE p.code IN
      ('ATTENDANCE:VIEW', 'ATTENDANCE:VIEW_TEAM', 'LEAVE:VIEW', 'LEAVE:VIEW_TEAM', 'LEAVE:APPROVE', 'BENEFIT:VIEW')
  AND NOT EXISTS (SELECT 1
                  FROM role_permissions rp
                  WHERE rp.role_id = '550e8400-e29b-41d4-a716-446655440022'
                    AND rp.permission_id = p.id
                    AND rp.scope = 'TEAM');

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
WHERE
  p.code IN ('REVIEW:VIEW', 'REVIEW:READ', 'REVIEW:SUBMIT', 'REVIEW:APPROVE', 'GOAL:VIEW', 'GOAL:READ', 'GOAL:APPROVE')
  AND NOT EXISTS (SELECT 1
                  FROM role_permissions rp
                  WHERE rp.role_id = '550e8400-e29b-41d4-a716-446655440022'
                    AND rp.permission_id = p.id
                    AND rp.scope = 'TEAM');

INSERT INTO role_permissions (id, tenant_id, role_id, permission_id, scope, created_at, updated_at, version, is_deleted)
SELECT gen_random_uuid(),
       '660e8400-e29b-41d4-a716-446655440001',
       '550e8400-e29b-41d4-a716-446655440022',
       p.id,
       'SELF',
       NOW(),
       NOW(),
       0,
       false
FROM permissions p
WHERE p.code IN ('ATTENDANCE:VIEW_SELF', 'LEAVE:VIEW_SELF', 'LEAVE:CREATE', 'BENEFIT:VIEW_SELF', 'CALENDAR:VIEW',
                 'DASHBOARD:VIEW')
  AND NOT EXISTS (SELECT 1
                  FROM role_permissions rp
                  WHERE rp.role_id = '550e8400-e29b-41d4-a716-446655440022'
                    AND rp.permission_id = p.id
                    AND rp.scope = 'SELF');

-- ============================================================================
-- EMPLOYEE Role (ID: 550e8400-e29b-41d4-a716-446655440023)
-- Scope: SELF (can only view/manage own data)
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
WHERE p.code IN ('ATTENDANCE:VIEW_SELF', 'LEAVE:VIEW_SELF', 'LEAVE:CREATE', 'BENEFIT:VIEW_SELF', 'CALENDAR:VIEW',
                 'DASHBOARD:VIEW')
  AND NOT EXISTS (SELECT 1
                  FROM role_permissions rp
                  WHERE rp.role_id = '550e8400-e29b-41d4-a716-446655440023'
                    AND rp.permission_id = p.id
                    AND rp.scope = 'SELF');

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
WHERE p.code IN ('REVIEW:VIEW', 'REVIEW:READ', 'REVIEW:SUBMIT', 'GOAL:VIEW', 'GOAL:READ', 'GOAL:CREATE', 'GOAL:UPDATE')
  AND NOT EXISTS (SELECT 1
                  FROM role_permissions rp
                  WHERE rp.role_id = '550e8400-e29b-41d4-a716-446655440023'
                    AND rp.permission_id = p.id
                    AND rp.scope = 'SELF');

-- ============================================================================
-- HR_MANAGER Role (ID: 48000000-0e01-0000-0000-000000000002)
-- Scope: ALL (full HR operations)
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
                 'ATTENDANCE:VIEW', 'ATTENDANCE:VIEW_ALL', 'ATTENDANCE:MANAGE',
                 'LEAVE:VIEW', 'LEAVE:VIEW_ALL', 'LEAVE:APPROVE', 'LEAVE:MANAGE',
                 'BENEFIT:VIEW', 'BENEFIT:VIEW_ALL', 'BENEFIT:MANAGE',
                 'CALENDAR:VIEW', 'CALENDAR:MANAGE',
                 'DASHBOARD:VIEW', 'DASHBOARD:MANAGE',
                 'REVIEW:VIEW', 'REVIEW:READ', 'REVIEW:CREATE', 'REVIEW:SUBMIT', 'REVIEW:APPROVE',
                 'GOAL:VIEW', 'GOAL:READ', 'GOAL:CREATE', 'GOAL:APPROVE'
  )
  AND NOT EXISTS (SELECT 1
                  FROM role_permissions rp
                  WHERE rp.role_id = '48000000-0e01-0000-0000-000000000002'
                    AND rp.permission_id = p.id
                    AND rp.scope = 'ALL');

-- ============================================================================
-- HR_ADMIN Role (ID: 550e8400-e29b-41d4-a716-446655440021)
-- Scope: ALL (full system management)
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
                 'ATTENDANCE:VIEW', 'ATTENDANCE:VIEW_ALL', 'ATTENDANCE:MANAGE',
                 'LEAVE:VIEW', 'LEAVE:VIEW_ALL', 'LEAVE:APPROVE', 'LEAVE:MANAGE',
                 'BENEFIT:VIEW', 'BENEFIT:VIEW_ALL', 'BENEFIT:MANAGE',
                 'CALENDAR:VIEW', 'CALENDAR:MANAGE',
                 'DASHBOARD:VIEW', 'DASHBOARD:MANAGE',
                 'REVIEW:VIEW', 'REVIEW:READ', 'REVIEW:CREATE', 'REVIEW:UPDATE', 'REVIEW:SUBMIT', 'REVIEW:APPROVE',
                 'REVIEW:MANAGE',
                 'GOAL:VIEW', 'GOAL:READ', 'GOAL:CREATE', 'GOAL:UPDATE', 'GOAL:APPROVE', 'GOAL:MANAGE'
  )
  AND NOT EXISTS (SELECT 1
                  FROM role_permissions rp
                  WHERE rp.role_id = '550e8400-e29b-41d4-a716-446655440021'
                    AND rp.permission_id = p.id
                    AND rp.scope = 'ALL');

-- =============================================================================
-- SECTION C: COMPLETION MARKER
-- =============================================================================
-- Migration complete: All missing core HR module permissions inserted and
-- assigned to TEAM_LEAD, MANAGER, EMPLOYEE, HR_MANAGER, and HR_ADMIN roles.
-- This migration is idempotent and safe to re-run.
