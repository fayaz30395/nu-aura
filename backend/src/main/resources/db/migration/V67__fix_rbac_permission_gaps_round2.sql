-- V67: Fix RBAC permission gaps round 2
-- Adds missing permission codes that controllers require but V60+V66 didn't include.
-- Key gaps: REVIEW:VIEW, REVIEW:CREATE, GOAL:CREATE, LEAVE:VIEW_SELF/TEAM/ALL,
-- ATTENDANCE:VIEW_SELF/TEAM/ALL, CALENDAR:VIEW, DASHBOARD:VIEW, BENEFIT:VIEW_SELF,
-- PAYROLL:VIEW_SELF, ANALYTICS:VIEW

-- Tenant and role IDs (from V60):
--   tenant:           660e8400-e29b-41d4-a716-446655440001
--   SUPER_ADMIN:      550e8400-e29b-41d4-a716-446655440020 (bypasses everything)
--   HR_ADMIN:         550e8400-e29b-41d4-a716-446655440021
--   MANAGER:          550e8400-e29b-41d4-a716-446655440022
--   EMPLOYEE:         550e8400-e29b-41d4-a716-446655440023
--   TEAM_LEAD:        48000000-0e01-0000-0000-000000000001
--   HR_MANAGER:       48000000-0e01-0000-0000-000000000002
--   RECRUITMENT_ADMIN:48000000-0e01-0000-0000-000000000003

-- =====================================================
-- STEP 1: Insert missing permission codes into permissions table
-- =====================================================
INSERT INTO permissions (id, tenant_id, code, module, action, description, created_at, updated_at, version, is_deleted)
VALUES
  -- Review/Performance permissions
  (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'REVIEW:VIEW', 'REVIEW', 'VIEW', 'View performance reviews and goals', NOW(), NOW(), 0, false),
  (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'REVIEW:CREATE', 'REVIEW', 'CREATE', 'Create performance reviews', NOW(), NOW(), 0, false),
  (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'REVIEW:SUBMIT', 'REVIEW', 'SUBMIT', 'Submit performance reviews', NOW(), NOW(), 0, false),
  (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'REVIEW:APPROVE', 'REVIEW', 'APPROVE', 'Approve performance reviews', NOW(), NOW(), 0, false),
  (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'GOAL:CREATE', 'GOAL', 'CREATE', 'Create goals', NOW(), NOW(), 0, false),
  (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'GOAL:APPROVE', 'GOAL', 'APPROVE', 'Approve goals', NOW(), NOW(), 0, false),

  -- Scoped leave permissions
  (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'LEAVE:VIEW_ALL', 'LEAVE', 'VIEW_ALL', 'View all employee leave requests', NOW(), NOW(), 0, false),
  (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'LEAVE:VIEW_TEAM', 'LEAVE', 'VIEW_TEAM', 'View team leave requests', NOW(), NOW(), 0, false),
  (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'LEAVE:VIEW_SELF', 'LEAVE', 'VIEW_SELF', 'View own leave requests', NOW(), NOW(), 0, false),
  (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'LEAVE:CANCEL', 'LEAVE', 'CANCEL', 'Cancel leave requests', NOW(), NOW(), 0, false),
  (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'LEAVE:REJECT', 'LEAVE', 'REJECT', 'Reject leave requests', NOW(), NOW(), 0, false),

  -- Scoped attendance permissions
  (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'ATTENDANCE:VIEW_ALL', 'ATTENDANCE', 'VIEW_ALL', 'View all attendance records', NOW(), NOW(), 0, false),
  (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'ATTENDANCE:VIEW_TEAM', 'ATTENDANCE', 'VIEW_TEAM', 'View team attendance records', NOW(), NOW(), 0, false),
  (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'ATTENDANCE:VIEW_SELF', 'ATTENDANCE', 'VIEW_SELF', 'View own attendance records', NOW(), NOW(), 0, false),
  (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'ATTENDANCE:MARK', 'ATTENDANCE', 'MARK', 'Mark attendance', NOW(), NOW(), 0, false),
  (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'ATTENDANCE:APPROVE', 'ATTENDANCE', 'APPROVE', 'Approve attendance regularizations', NOW(), NOW(), 0, false),

  -- Calendar
  (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'CALENDAR:VIEW', 'CALENDAR', 'VIEW', 'View calendar', NOW(), NOW(), 0, false),
  (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'CALENDAR:CREATE', 'CALENDAR', 'CREATE', 'Create calendar events', NOW(), NOW(), 0, false),
  (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'CALENDAR:MANAGE', 'CALENDAR', 'MANAGE', 'Manage calendar settings', NOW(), NOW(), 0, false),

  -- Analytics & Dashboard
  (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'ANALYTICS:VIEW', 'ANALYTICS', 'VIEW', 'View analytics dashboards', NOW(), NOW(), 0, false),
  (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'ANALYTICS:EXPORT', 'ANALYTICS', 'EXPORT', 'Export analytics reports', NOW(), NOW(), 0, false),
  (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'DASHBOARD:VIEW', 'DASHBOARD', 'VIEW', 'View dashboards', NOW(), NOW(), 0, false),
  (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'DASHBOARD:EXECUTIVE', 'DASHBOARD', 'EXECUTIVE', 'View executive dashboard', NOW(), NOW(), 0, false),
  (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'DASHBOARD:MANAGER', 'DASHBOARD', 'MANAGER', 'View manager dashboard', NOW(), NOW(), 0, false),
  (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'DASHBOARD:EMPLOYEE', 'DASHBOARD', 'EMPLOYEE', 'View employee dashboard', NOW(), NOW(), 0, false),

  -- Benefits
  (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'BENEFIT:VIEW', 'BENEFIT', 'VIEW', 'View all benefits', NOW(), NOW(), 0, false),
  (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'BENEFIT:VIEW_SELF', 'BENEFIT', 'VIEW_SELF', 'View own benefits', NOW(), NOW(), 0, false),
  (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'BENEFIT:ENROLL', 'BENEFIT', 'ENROLL', 'Enroll in benefits', NOW(), NOW(), 0, false),
  (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'BENEFIT:MANAGE', 'BENEFIT', 'MANAGE', 'Manage benefit plans', NOW(), NOW(), 0, false),

  -- Payroll scoped
  (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'PAYROLL:VIEW', 'PAYROLL', 'VIEW', 'View all payroll', NOW(), NOW(), 0, false),
  (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'PAYROLL:VIEW_SELF', 'PAYROLL', 'VIEW_SELF', 'View own payslips', NOW(), NOW(), 0, false),
  (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'PAYROLL:PROCESS', 'PAYROLL', 'PROCESS', 'Process payroll runs', NOW(), NOW(), 0, false),
  (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'PAYROLL:APPROVE', 'PAYROLL', 'APPROVE', 'Approve payroll', NOW(), NOW(), 0, false),

  -- Expense
  (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'EXPENSE:VIEW_ALL', 'EXPENSE', 'VIEW_ALL', 'View all expenses', NOW(), NOW(), 0, false),
  (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'EXPENSE:VIEW_SELF', 'EXPENSE', 'VIEW_SELF', 'View own expenses', NOW(), NOW(), 0, false),
  (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'EXPENSE:CREATE', 'EXPENSE', 'CREATE', 'Create expense claims', NOW(), NOW(), 0, false),
  (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'EXPENSE:APPROVE', 'EXPENSE', 'APPROVE', 'Approve expense claims', NOW(), NOW(), 0, false),

  -- Review cycle specific
  (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'REVIEW_CYCLE:VIEW', 'REVIEW_CYCLE', 'VIEW', 'View review cycles', NOW(), NOW(), 0, false),
  (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'REVIEW_CYCLE:CREATE', 'REVIEW_CYCLE', 'CREATE', 'Create review cycles', NOW(), NOW(), 0, false),
  (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'REVIEW_CYCLE:MANAGE', 'REVIEW_CYCLE', 'MANAGE', 'Manage review cycles', NOW(), NOW(), 0, false)

ON CONFLICT (code, tenant_id) DO NOTHING;

-- =====================================================
-- STEP 2: Assign permissions to roles
-- =====================================================

-- EMPLOYEE role: self-service permissions
INSERT INTO role_permissions (id, tenant_id, role_id, permission_id, scope, created_at, updated_at, version, is_deleted)
SELECT gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440023', p.id, 'SELF', NOW(), NOW(), 0, false
FROM permissions p
WHERE p.tenant_id = '660e8400-e29b-41d4-a716-446655440001'
  AND p.code IN (
    'REVIEW:VIEW', 'REVIEW:SUBMIT', 'GOAL:CREATE',
    'LEAVE:VIEW_SELF', 'LEAVE:CANCEL',
    'ATTENDANCE:VIEW_SELF', 'ATTENDANCE:MARK',
    'CALENDAR:VIEW', 'CALENDAR:CREATE',
    'DASHBOARD:VIEW', 'DASHBOARD:EMPLOYEE',
    'BENEFIT:VIEW_SELF', 'BENEFIT:ENROLL',
    'PAYROLL:VIEW_SELF',
    'EXPENSE:VIEW_SELF', 'EXPENSE:CREATE',
    'REVIEW_CYCLE:VIEW'
  )
  AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp
    WHERE rp.role_id = '550e8400-e29b-41d4-a716-446655440023'
      AND rp.permission_id = p.id
      AND rp.tenant_id = '660e8400-e29b-41d4-a716-446655440001'
  );

-- TEAM_LEAD role: team-level permissions
INSERT INTO role_permissions (id, tenant_id, role_id, permission_id, scope, created_at, updated_at, version, is_deleted)
SELECT gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', '48000000-0e01-0000-0000-000000000001', p.id, 'TEAM', NOW(), NOW(), 0, false
FROM permissions p
WHERE p.tenant_id = '660e8400-e29b-41d4-a716-446655440001'
  AND p.code IN (
    'REVIEW:VIEW', 'REVIEW:CREATE', 'REVIEW:SUBMIT', 'REVIEW:APPROVE',
    'GOAL:CREATE', 'GOAL:APPROVE',
    'LEAVE:VIEW_TEAM', 'LEAVE:VIEW_SELF', 'LEAVE:CANCEL', 'LEAVE:REJECT',
    'ATTENDANCE:VIEW_TEAM', 'ATTENDANCE:VIEW_SELF', 'ATTENDANCE:MARK', 'ATTENDANCE:APPROVE',
    'CALENDAR:VIEW', 'CALENDAR:CREATE', 'CALENDAR:MANAGE',
    'ANALYTICS:VIEW',
    'DASHBOARD:VIEW', 'DASHBOARD:MANAGER',
    'BENEFIT:VIEW_SELF', 'BENEFIT:ENROLL',
    'PAYROLL:VIEW_SELF',
    'EXPENSE:VIEW_SELF', 'EXPENSE:CREATE', 'EXPENSE:APPROVE',
    'REVIEW_CYCLE:VIEW'
  )
  AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp
    WHERE rp.role_id = '48000000-0e01-0000-0000-000000000001'
      AND rp.permission_id = p.id
      AND rp.tenant_id = '660e8400-e29b-41d4-a716-446655440001'
  );

-- MANAGER role: team-level permissions (same as team lead + extras)
INSERT INTO role_permissions (id, tenant_id, role_id, permission_id, scope, created_at, updated_at, version, is_deleted)
SELECT gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440022', p.id, 'TEAM', NOW(), NOW(), 0, false
FROM permissions p
WHERE p.tenant_id = '660e8400-e29b-41d4-a716-446655440001'
  AND p.code IN (
    'REVIEW:VIEW', 'REVIEW:CREATE', 'REVIEW:SUBMIT', 'REVIEW:APPROVE',
    'GOAL:CREATE', 'GOAL:APPROVE',
    'LEAVE:VIEW_TEAM', 'LEAVE:VIEW_SELF', 'LEAVE:CANCEL', 'LEAVE:REJECT',
    'ATTENDANCE:VIEW_TEAM', 'ATTENDANCE:VIEW_SELF', 'ATTENDANCE:MARK', 'ATTENDANCE:APPROVE',
    'CALENDAR:VIEW', 'CALENDAR:CREATE', 'CALENDAR:MANAGE',
    'ANALYTICS:VIEW', 'ANALYTICS:EXPORT',
    'DASHBOARD:VIEW', 'DASHBOARD:MANAGER', 'DASHBOARD:EXECUTIVE',
    'BENEFIT:VIEW_SELF', 'BENEFIT:ENROLL',
    'PAYROLL:VIEW_SELF',
    'EXPENSE:VIEW_SELF', 'EXPENSE:CREATE', 'EXPENSE:APPROVE',
    'REVIEW_CYCLE:VIEW'
  )
  AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp
    WHERE rp.role_id = '550e8400-e29b-41d4-a716-446655440022'
      AND rp.permission_id = p.id
      AND rp.tenant_id = '660e8400-e29b-41d4-a716-446655440001'
  );

-- HR_MANAGER role: all-level permissions
INSERT INTO role_permissions (id, tenant_id, role_id, permission_id, scope, created_at, updated_at, version, is_deleted)
SELECT gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', '48000000-0e01-0000-0000-000000000002', p.id, 'ALL', NOW(), NOW(), 0, false
FROM permissions p
WHERE p.tenant_id = '660e8400-e29b-41d4-a716-446655440001'
  AND p.code IN (
    'REVIEW:VIEW', 'REVIEW:CREATE', 'REVIEW:SUBMIT', 'REVIEW:APPROVE',
    'GOAL:CREATE', 'GOAL:APPROVE',
    'LEAVE:VIEW_ALL', 'LEAVE:VIEW_TEAM', 'LEAVE:VIEW_SELF', 'LEAVE:CANCEL', 'LEAVE:REJECT',
    'ATTENDANCE:VIEW_ALL', 'ATTENDANCE:VIEW_TEAM', 'ATTENDANCE:VIEW_SELF', 'ATTENDANCE:MARK', 'ATTENDANCE:APPROVE',
    'CALENDAR:VIEW', 'CALENDAR:CREATE', 'CALENDAR:MANAGE',
    'ANALYTICS:VIEW', 'ANALYTICS:EXPORT',
    'DASHBOARD:VIEW', 'DASHBOARD:EXECUTIVE', 'DASHBOARD:MANAGER', 'DASHBOARD:EMPLOYEE',
    'BENEFIT:VIEW', 'BENEFIT:VIEW_SELF', 'BENEFIT:ENROLL', 'BENEFIT:MANAGE',
    'PAYROLL:VIEW', 'PAYROLL:VIEW_SELF', 'PAYROLL:PROCESS',
    'EXPENSE:VIEW_ALL', 'EXPENSE:VIEW_SELF', 'EXPENSE:CREATE', 'EXPENSE:APPROVE',
    'REVIEW_CYCLE:VIEW', 'REVIEW_CYCLE:CREATE', 'REVIEW_CYCLE:MANAGE'
  )
  AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp
    WHERE rp.role_id = '48000000-0e01-0000-0000-000000000002'
      AND rp.permission_id = p.id
      AND rp.tenant_id = '660e8400-e29b-41d4-a716-446655440001'
  );

-- HR_ADMIN role: all-level permissions (superset)
INSERT INTO role_permissions (id, tenant_id, role_id, permission_id, scope, created_at, updated_at, version, is_deleted)
SELECT gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440021', p.id, 'ALL', NOW(), NOW(), 0, false
FROM permissions p
WHERE p.tenant_id = '660e8400-e29b-41d4-a716-446655440001'
  AND p.code IN (
    'REVIEW:VIEW', 'REVIEW:CREATE', 'REVIEW:SUBMIT', 'REVIEW:APPROVE',
    'GOAL:CREATE', 'GOAL:APPROVE',
    'LEAVE:VIEW_ALL', 'LEAVE:VIEW_TEAM', 'LEAVE:VIEW_SELF', 'LEAVE:CANCEL', 'LEAVE:REJECT',
    'ATTENDANCE:VIEW_ALL', 'ATTENDANCE:VIEW_TEAM', 'ATTENDANCE:VIEW_SELF', 'ATTENDANCE:MARK', 'ATTENDANCE:APPROVE',
    'CALENDAR:VIEW', 'CALENDAR:CREATE', 'CALENDAR:MANAGE',
    'ANALYTICS:VIEW', 'ANALYTICS:EXPORT',
    'DASHBOARD:VIEW', 'DASHBOARD:EXECUTIVE', 'DASHBOARD:MANAGER', 'DASHBOARD:EMPLOYEE',
    'BENEFIT:VIEW', 'BENEFIT:VIEW_SELF', 'BENEFIT:ENROLL', 'BENEFIT:MANAGE',
    'PAYROLL:VIEW', 'PAYROLL:VIEW_SELF', 'PAYROLL:PROCESS', 'PAYROLL:APPROVE',
    'EXPENSE:VIEW_ALL', 'EXPENSE:VIEW_SELF', 'EXPENSE:CREATE', 'EXPENSE:APPROVE',
    'REVIEW_CYCLE:VIEW', 'REVIEW_CYCLE:CREATE', 'REVIEW_CYCLE:MANAGE'
  )
  AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp
    WHERE rp.role_id = '550e8400-e29b-41d4-a716-446655440021'
      AND rp.permission_id = p.id
      AND rp.tenant_id = '660e8400-e29b-41d4-a716-446655440001'
  );

-- RECRUITMENT_ADMIN role: self-service permissions
INSERT INTO role_permissions (id, tenant_id, role_id, permission_id, scope, created_at, updated_at, version, is_deleted)
SELECT gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', '48000000-0e01-0000-0000-000000000003', p.id, 'SELF', NOW(), NOW(), 0, false
FROM permissions p
WHERE p.tenant_id = '660e8400-e29b-41d4-a716-446655440001'
  AND p.code IN (
    'REVIEW:VIEW', 'REVIEW:SUBMIT', 'GOAL:CREATE',
    'LEAVE:VIEW_SELF', 'LEAVE:CANCEL',
    'ATTENDANCE:VIEW_SELF', 'ATTENDANCE:MARK',
    'CALENDAR:VIEW', 'CALENDAR:CREATE',
    'DASHBOARD:VIEW', 'DASHBOARD:EMPLOYEE',
    'BENEFIT:VIEW_SELF', 'BENEFIT:ENROLL',
    'PAYROLL:VIEW_SELF',
    'EXPENSE:VIEW_SELF', 'EXPENSE:CREATE',
    'REVIEW_CYCLE:VIEW'
  )
  AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp
    WHERE rp.role_id = '48000000-0e01-0000-0000-000000000003'
      AND rp.permission_id = p.id
      AND rp.tenant_id = '660e8400-e29b-41d4-a716-446655440001'
  );
