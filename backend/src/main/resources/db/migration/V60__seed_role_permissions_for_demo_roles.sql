-- ============================================================================
-- V56: Seed role_permissions for non-SuperAdmin roles
-- Fixes NEW-003: Non-SuperAdmin roles (MANAGER, EMPLOYEE, TEAM_LEAD,
-- HR_MANAGER, RECRUITMENT_ADMIN, HR_ADMIN) had 0 permissions attached,
-- making all permission-gated UI features invisible.
--
-- Role IDs (from V19 + V49):
--   SUPER_ADMIN:      550e8400-e29b-41d4-a716-446655440020 (already has ALL perms)
--   HR_ADMIN:         550e8400-e29b-41d4-a716-446655440021
--   MANAGER:          550e8400-e29b-41d4-a716-446655440022
--   EMPLOYEE:         550e8400-e29b-41d4-a716-446655440023
--   TEAM_LEAD:        48000000-0e01-0000-0000-000000000001
--   HR_MANAGER:       48000000-0e01-0000-0000-000000000002
--   RECRUITMENT_ADMIN:48000000-0e01-0000-0000-000000000003
--
-- Tenant: NuLogic (660e8400-e29b-41d4-a716-446655440001)
-- Idempotent: uses NOT EXISTS guard.
-- ============================================================================

-- Helper: insert role_permission only if not exists
-- Using individual inserts with ON CONFLICT DO NOTHING for max idempotency

-- ============================================================================
-- HR_ADMIN — Full HR module access (scope: ALL)
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
                 'employee.read', 'employee.create', 'employee.update', 'employee.delete',
                 'department.read', 'department.create', 'department.update', 'department.delete',
                 'attendance.read', 'attendance.manage',
                 'leave.read', 'leave.request', 'leave.approve', 'leave.manage',
                 'payroll.read', 'payroll.manage',
                 'performance.read', 'performance.manage',
                 'recruitment.read', 'recruitment.manage',
                 'report.view', 'report.manage',
                 'settings.read',
                 'role.read',
                 'user.read', 'user.manage',
                 'announcement.read', 'announcement.manage',
                 'knowledge.wiki.read', 'knowledge.blog.read',
                 'contract.read', 'contract.manage'
  )
  AND NOT EXISTS (SELECT 1
                  FROM role_permissions rp
                  WHERE rp.role_id = '550e8400-e29b-41d4-a716-446655440021'
                    AND rp.permission_id = p.id);

-- ============================================================================
-- MANAGER — Team management (scope: TEAM)
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
                 'employee.read', 'employee.update',
                 'department.read',
                 'attendance.read',
                 'leave.read', 'leave.request', 'leave.approve',
                 'performance.read', 'performance.manage',
                 'report.view',
                 'announcement.read',
                 'knowledge.wiki.read', 'knowledge.blog.read'
  )
  AND NOT EXISTS (SELECT 1
                  FROM role_permissions rp
                  WHERE rp.role_id = '550e8400-e29b-41d4-a716-446655440022'
                    AND rp.permission_id = p.id);

-- Manager also needs payroll.read with SELF scope (to see own payslips)
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
WHERE p.code IN ('payroll.read')
  AND NOT EXISTS (SELECT 1
                  FROM role_permissions rp
                  WHERE rp.role_id = '550e8400-e29b-41d4-a716-446655440022'
                    AND rp.permission_id = p.id);

-- ============================================================================
-- EMPLOYEE — Self-service only (scope: SELF)
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
                 'employee.read',
                 'department.read',
                 'attendance.read',
                 'leave.read', 'leave.request',
                 'payroll.read',
                 'performance.read',
                 'announcement.read',
                 'knowledge.wiki.read', 'knowledge.blog.read'
  )
  AND NOT EXISTS (SELECT 1
                  FROM role_permissions rp
                  WHERE rp.role_id = '550e8400-e29b-41d4-a716-446655440023'
                    AND rp.permission_id = p.id);

-- ============================================================================
-- TEAM_LEAD — Team leadership (scope: TEAM)
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
                 'employee.read', 'employee.update',
                 'department.read',
                 'attendance.read',
                 'leave.read', 'leave.request', 'leave.approve',
                 'performance.read', 'performance.manage',
                 'report.view',
                 'announcement.read',
                 'knowledge.wiki.read', 'knowledge.blog.read'
  )
  AND NOT EXISTS (SELECT 1
                  FROM role_permissions rp
                  WHERE rp.role_id = '48000000-0e01-0000-0000-000000000001'
                    AND rp.permission_id = p.id);

-- TEAM_LEAD: payroll.read with SELF
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
WHERE p.code IN ('payroll.read')
  AND NOT EXISTS (SELECT 1
                  FROM role_permissions rp
                  WHERE rp.role_id = '48000000-0e01-0000-0000-000000000001'
                    AND rp.permission_id = p.id);

-- ============================================================================
-- HR_MANAGER — HR department management (scope: ALL for HR ops, DEPARTMENT for others)
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
                 'employee.read', 'employee.create', 'employee.update',
                 'department.read', 'department.create', 'department.update',
                 'attendance.read', 'attendance.manage',
                 'leave.read', 'leave.request', 'leave.approve', 'leave.manage',
                 'payroll.read',
                 'performance.read', 'performance.manage',
                 'recruitment.read',
                 'report.view', 'report.manage',
                 'announcement.read', 'announcement.manage',
                 'knowledge.wiki.read', 'knowledge.wiki.manage', 'knowledge.blog.read', 'knowledge.blog.manage',
                 'contract.read'
  )
  AND NOT EXISTS (SELECT 1
                  FROM role_permissions rp
                  WHERE rp.role_id = '48000000-0e01-0000-0000-000000000002'
                    AND rp.permission_id = p.id);

-- ============================================================================
-- RECRUITMENT_ADMIN — Recruitment focus (scope: ALL for recruitment, SELF for others)
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
                 'recruitment.read', 'recruitment.manage',
                 'employee.read',
                 'department.read'
  )
  AND NOT EXISTS (SELECT 1
                  FROM role_permissions rp
                  WHERE rp.role_id = '48000000-0e01-0000-0000-000000000003'
                    AND rp.permission_id = p.id);

INSERT INTO role_permissions (id, tenant_id, role_id, permission_id, scope, created_at, updated_at, version, is_deleted)
SELECT gen_random_uuid(),
       '660e8400-e29b-41d4-a716-446655440001',
       '48000000-0e01-0000-0000-000000000003',
       p.id,
       'SELF',
       NOW(),
       NOW(),
       0,
       false
FROM permissions p
WHERE p.code IN (
                 'attendance.read',
                 'leave.read', 'leave.request',
                 'payroll.read',
                 'performance.read',
                 'report.view',
                 'announcement.read',
                 'knowledge.wiki.read', 'knowledge.blog.read'
  )
  AND NOT EXISTS (SELECT 1
                  FROM role_permissions rp
                  WHERE rp.role_id = '48000000-0e01-0000-0000-000000000003'
                    AND rp.permission_id = p.id);

-- ============================================================================
-- DONE — All demo roles now have permissions seeded
-- ============================================================================
