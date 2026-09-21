-- ============================================================================
-- V96: Canonical Permission Re-Seed — Single Source of Truth
-- ============================================================================
-- This migration replaces the 12+ incremental permission-fix migrations
-- (V60, V63-V70, V74-V80, V82, V93) with a clean, complete re-seed of ALL
-- permission constants from Permission.java and FieldPermission.java.
--
-- DEV-ONLY: No production data exists. Full nuke is safe.
--
-- Total permissions: 338 (Permission.java) + 6 (FieldPermission.java) = 344
--
-- Role assignments (role_permissions) are NOT seeded here — they are
-- handled by HrmsRoleInitializer at application startup.
-- ============================================================================

-- ============================================================================
-- Phase 1: Clear role_permissions (must go first due to FK on permission_id)
-- ============================================================================
DELETE
FROM role_permissions;

-- ============================================================================
-- Phase 2: Clear all permissions
-- ============================================================================
DELETE
FROM permissions;

-- ============================================================================
-- Phase 3: Insert ALL permissions from Permission.java (338 total)
-- ============================================================================

-- Employee Management
INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'EMPLOYEE:READ', 'Employee Read', 'Read employee', 'employee', 'read', NOW(), NOW(), 0,
        false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'EMPLOYEE:CREATE', 'Employee Create', 'Create employee', 'employee', 'create', NOW(), NOW(),
        0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'EMPLOYEE:UPDATE', 'Employee Update', 'Update employee', 'employee', 'update', NOW(), NOW(),
        0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'EMPLOYEE:DELETE', 'Employee Delete', 'Delete employee', 'employee', 'delete', NOW(), NOW(),
        0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'EMPLOYEE:VIEW_ALL', 'Employee View All', 'View all employee', 'employee', 'view_all', NOW(),
        NOW(), 0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'EMPLOYEE:VIEW_DEPARTMENT', 'Employee View Department', 'View department employee',
        'employee', 'view_department', NOW(), NOW(), 0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'EMPLOYEE:VIEW_TEAM', 'Employee View Team', 'View team employee', 'employee', 'view_team',
        NOW(), NOW(), 0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'EMPLOYEE:VIEW_SELF', 'Employee View Self', 'View self employee', 'employee', 'view_self',
        NOW(), NOW(), 0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;


-- Employment Change Requests
INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'EMPLOYMENT_CHANGE:VIEW', 'Employment Change View', 'View employment change',
        'employment_change', 'view', NOW(), NOW(), 0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'EMPLOYMENT_CHANGE:VIEW_ALL', 'Employment Change View All', 'View all employment change',
        'employment_change', 'view_all', NOW(), NOW(), 0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'EMPLOYMENT_CHANGE:CREATE', 'Employment Change Create', 'Create employment change',
        'employment_change', 'create', NOW(), NOW(), 0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'EMPLOYMENT_CHANGE:APPROVE', 'Employment Change Approve', 'Approve employment change',
        'employment_change', 'approve', NOW(), NOW(), 0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'EMPLOYMENT_CHANGE:CANCEL', 'Employment Change Cancel', 'Cancel employment change',
        'employment_change', 'cancel', NOW(), NOW(), 0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;


-- Leave Management
INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'LEAVE:REQUEST', 'Leave Request', 'Request leave', 'leave', 'request', NOW(), NOW(), 0,
        false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'LEAVE:APPROVE', 'Leave Approve', 'Approve leave', 'leave', 'approve', NOW(), NOW(), 0,
        false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'LEAVE:REJECT', 'Leave Reject', 'Reject leave', 'leave', 'reject', NOW(), NOW(), 0,
        false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'LEAVE:CANCEL', 'Leave Cancel', 'Cancel leave', 'leave', 'cancel', NOW(), NOW(), 0,
        false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'LEAVE:VIEW_ALL', 'Leave View All', 'View all leave', 'leave', 'view_all', NOW(), NOW(), 0,
        false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'LEAVE:VIEW_TEAM', 'Leave View Team', 'View team leave', 'leave', 'view_team', NOW(), NOW(),
        0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'LEAVE:VIEW_SELF', 'Leave View Self', 'View self leave', 'leave', 'view_self', NOW(), NOW(),
        0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'LEAVE:MANAGE', 'Leave Manage', 'Manage leave', 'leave', 'manage', NOW(), NOW(), 0,
        false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;


-- Department/Organizational Structure
INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'DEPARTMENT:MANAGE', 'Department Manage', 'Manage department', 'department', 'manage', NOW(),
        NOW(), 0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'DEPARTMENT:VIEW', 'Department View', 'View department', 'department', 'view', NOW(), NOW(),
        0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;


-- Attendance Management
INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'ATTENDANCE:MARK', 'Attendance Mark', 'Mark attendance', 'attendance', 'mark', NOW(), NOW(),
        0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'ATTENDANCE:APPROVE', 'Attendance Approve', 'Approve attendance', 'attendance', 'approve',
        NOW(), NOW(), 0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'ATTENDANCE:VIEW_ALL', 'Attendance View All', 'View all attendance', 'attendance',
        'view_all', NOW(), NOW(), 0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'ATTENDANCE:VIEW_TEAM', 'Attendance View Team', 'View team attendance', 'attendance',
        'view_team', NOW(), NOW(), 0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'ATTENDANCE:VIEW_SELF', 'Attendance View Self', 'View self attendance', 'attendance',
        'view_self', NOW(), NOW(), 0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'ATTENDANCE:REGULARIZE', 'Attendance Regularize', 'Regularize attendance', 'attendance',
        'regularize', NOW(), NOW(), 0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'ATTENDANCE:MANAGE', 'Attendance Manage', 'Manage attendance', 'attendance', 'manage', NOW(),
        NOW(), 0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;


-- Office Location & Geofencing
INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'OFFICE_LOCATION:VIEW', 'Office Location View', 'View office location', 'office_location',
        'view', NOW(), NOW(), 0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'OFFICE_LOCATION:CREATE', 'Office Location Create', 'Create office location',
        'office_location', 'create', NOW(), NOW(), 0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'OFFICE_LOCATION:UPDATE', 'Office Location Update', 'Update office location',
        'office_location', 'update', NOW(), NOW(), 0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'OFFICE_LOCATION:DELETE', 'Office Location Delete', 'Delete office location',
        'office_location', 'delete', NOW(), NOW(), 0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'GEOFENCE:MANAGE', 'Geofence Manage', 'Manage geofence', 'geofence', 'manage', NOW(), NOW(),
        0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'GEOFENCE:BYPASS', 'Geofence Bypass', 'Bypass geofence', 'geofence', 'bypass', NOW(), NOW(),
        0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;


-- Payroll Management
INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'PAYROLL:VIEW', 'Payroll View', 'View payroll', 'payroll', 'view', NOW(), NOW(), 0,
        false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'PAYROLL:VIEW_ALL', 'Payroll View All', 'View all payroll', 'payroll', 'view_all', NOW(),
        NOW(), 0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'PAYROLL:PROCESS', 'Payroll Process', 'Process payroll', 'payroll', 'process', NOW(), NOW(),
        0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'PAYROLL:APPROVE', 'Payroll Approve', 'Approve payroll', 'payroll', 'approve', NOW(), NOW(),
        0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'PAYROLL:VIEW_SELF', 'Payroll View Self', 'View self payroll', 'payroll', 'view_self', NOW(),
        NOW(), 0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;


-- Performance Management
INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'REVIEW:CREATE', 'Review Create', 'Create review', 'review', 'create', NOW(), NOW(), 0,
        false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'REVIEW:VIEW', 'Review View', 'View review', 'review', 'view', NOW(), NOW(), 0,
        false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'REVIEW:UPDATE', 'Review Update', 'Update review', 'review', 'update', NOW(), NOW(), 0,
        false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'REVIEW:DELETE', 'Review Delete', 'Delete review', 'review', 'delete', NOW(), NOW(), 0,
        false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'REVIEW:SUBMIT', 'Review Submit', 'Submit review', 'review', 'submit', NOW(), NOW(), 0,
        false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'REVIEW:APPROVE', 'Review Approve', 'Approve review', 'review', 'approve', NOW(), NOW(), 0,
        false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'GOAL:CREATE', 'Goal Create', 'Create goal', 'goal', 'create', NOW(), NOW(), 0,
        false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'GOAL:APPROVE', 'Goal Approve', 'Approve goal', 'goal', 'approve', NOW(), NOW(), 0,
        false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;


-- Recruitment
INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'RECRUITMENT:VIEW', 'Recruitment View', 'View recruitment', 'recruitment', 'view', NOW(),
        NOW(), 0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'RECRUITMENT:VIEW_ALL', 'Recruitment View All', 'View all recruitment', 'recruitment',
        'view_all', NOW(), NOW(), 0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'RECRUITMENT:VIEW_TEAM', 'Recruitment View Team', 'View team recruitment', 'recruitment',
        'view_team', NOW(), NOW(), 0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'RECRUITMENT:CREATE', 'Recruitment Create', 'Create recruitment', 'recruitment', 'create',
        NOW(), NOW(), 0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'RECRUITMENT:UPDATE', 'Recruitment Update', 'Update recruitment', 'recruitment', 'update',
        NOW(), NOW(), 0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'RECRUITMENT:DELETE', 'Recruitment Delete', 'Delete recruitment', 'recruitment', 'delete',
        NOW(), NOW(), 0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'RECRUITMENT:MANAGE', 'Recruitment Manage', 'Manage recruitment', 'recruitment', 'manage',
        NOW(), NOW(), 0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'CANDIDATE:VIEW', 'Candidate View', 'View candidate', 'candidate', 'view', NOW(), NOW(), 0,
        false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'CANDIDATE:EVALUATE', 'Candidate Evaluate', 'Evaluate candidate', 'candidate', 'evaluate',
        NOW(), NOW(), 0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;


-- Training
INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'TRAINING:VIEW', 'Training View', 'View training', 'training', 'view', NOW(), NOW(), 0,
        false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'TRAINING:CREATE', 'Training Create', 'Create training', 'training', 'create', NOW(), NOW(),
        0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'TRAINING:EDIT', 'Training Edit', 'Edit training', 'training', 'edit', NOW(), NOW(), 0,
        false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'TRAINING:ENROLL', 'Training Enroll', 'Enroll training', 'training', 'enroll', NOW(), NOW(),
        0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'TRAINING:APPROVE', 'Training Approve', 'Approve training', 'training', 'approve', NOW(),
        NOW(), 0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;


-- Learning Management System (LMS)
INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'LMS:COURSE_VIEW', 'Lms Course View', 'Course view lms', 'lms', 'course_view', NOW(), NOW(),
        0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'LMS:COURSE_CREATE', 'Lms Course Create', 'Course create lms', 'lms', 'course_create', NOW(),
        NOW(), 0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'LMS:COURSE_MANAGE', 'Lms Course Manage', 'Course manage lms', 'lms', 'course_manage', NOW(),
        NOW(), 0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'LMS:MODULE_CREATE', 'Lms Module Create', 'Module create lms', 'lms', 'module_create', NOW(),
        NOW(), 0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'LMS:QUIZ_CREATE', 'Lms Quiz Create', 'Quiz create lms', 'lms', 'quiz_create', NOW(), NOW(),
        0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'LMS:ENROLL', 'Lms Enroll', 'Enroll lms', 'lms', 'enroll', NOW(), NOW(), 0,
        false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'LMS:CERTIFICATE_VIEW', 'Lms Certificate View', 'Certificate view lms', 'lms',
        'certificate_view', NOW(), NOW(), 0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;


-- OKR (Objectives & Key Results)
INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'OKR:VIEW', 'Okr View', 'View okr', 'okr', 'view', NOW(), NOW(), 0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'OKR:CREATE', 'Okr Create', 'Create okr', 'okr', 'create', NOW(), NOW(), 0,
        false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'OKR:UPDATE', 'Okr Update', 'Update okr', 'okr', 'update', NOW(), NOW(), 0,
        false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'OKR:APPROVE', 'Okr Approve', 'Approve okr', 'okr', 'approve', NOW(), NOW(), 0,
        false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'OKR:VIEW_ALL', 'Okr View All', 'View all okr', 'okr', 'view_all', NOW(), NOW(), 0,
        false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;


-- 360 Feedback
INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'FEEDBACK_360:VIEW', 'Feedback 360 View', 'View feedback 360', 'feedback_360', 'view', NOW(),
        NOW(), 0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'FEEDBACK_360:CREATE', 'Feedback 360 Create', 'Create feedback 360', 'feedback_360',
        'create', NOW(), NOW(), 0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'FEEDBACK_360:SUBMIT', 'Feedback 360 Submit', 'Submit feedback 360', 'feedback_360',
        'submit', NOW(), NOW(), 0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'FEEDBACK_360:MANAGE', 'Feedback 360 Manage', 'Manage feedback 360', 'feedback_360',
        'manage', NOW(), NOW(), 0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;


-- Feedback (general peer/upward feedback)
INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'FEEDBACK:CREATE', 'Feedback Create', 'Create feedback', 'feedback', 'create', NOW(), NOW(),
        0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'FEEDBACK:UPDATE', 'Feedback Update', 'Update feedback', 'feedback', 'update', NOW(), NOW(),
        0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'FEEDBACK:DELETE', 'Feedback Delete', 'Delete feedback', 'feedback', 'delete', NOW(), NOW(),
        0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;


-- Helpdesk
INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'HELPDESK:TICKET_CREATE', 'Helpdesk Ticket Create', 'Ticket create helpdesk', 'helpdesk',
        'ticket_create', NOW(), NOW(), 0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'HELPDESK:TICKET_VIEW', 'Helpdesk Ticket View', 'Ticket view helpdesk', 'helpdesk',
        'ticket_view', NOW(), NOW(), 0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'HELPDESK:TICKET_ASSIGN', 'Helpdesk Ticket Assign', 'Ticket assign helpdesk', 'helpdesk',
        'ticket_assign', NOW(), NOW(), 0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'HELPDESK:TICKET_RESOLVE', 'Helpdesk Ticket Resolve', 'Ticket resolve helpdesk', 'helpdesk',
        'ticket_resolve', NOW(), NOW(), 0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'HELPDESK:CATEGORY_MANAGE', 'Helpdesk Category Manage', 'Category manage helpdesk',
        'helpdesk', 'category_manage', NOW(), NOW(), 0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'HELPDESK:SLA_MANAGE', 'Helpdesk Sla Manage', 'Sla manage helpdesk', 'helpdesk',
        'sla_manage', NOW(), NOW(), 0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;


-- Reports & Analytics
INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'REPORT:VIEW', 'Report View', 'View report', 'report', 'view', NOW(), NOW(), 0,
        false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'REPORT:CREATE', 'Report Create', 'Create report', 'report', 'create', NOW(), NOW(), 0,
        false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'REPORT:SCHEDULE', 'Report Schedule', 'Schedule report', 'report', 'schedule', NOW(), NOW(),
        0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'ANALYTICS:VIEW', 'Analytics View', 'View analytics', 'analytics', 'view', NOW(), NOW(), 0,
        false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'ANALYTICS:EXPORT', 'Analytics Export', 'Export analytics', 'analytics', 'export', NOW(),
        NOW(), 0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;


-- Document Management
INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'DOCUMENT:VIEW', 'Document View', 'View document', 'document', 'view', NOW(), NOW(), 0,
        false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'DOCUMENT:UPLOAD', 'Document Upload', 'Upload document', 'document', 'upload', NOW(), NOW(),
        0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'DOCUMENT:APPROVE', 'Document Approve', 'Approve document', 'document', 'approve', NOW(),
        NOW(), 0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'DOCUMENT:DELETE', 'Document Delete', 'Delete document', 'document', 'delete', NOW(), NOW(),
        0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'DOCUMENT:MANAGE_CATEGORY', 'Document Manage Category', 'Manage category document',
        'document', 'manage_category', NOW(), NOW(), 0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'DOCUMENT:VIEW_ALL', 'Document View All', 'View all document', 'document', 'view_all', NOW(),
        NOW(), 0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'DOCUMENT:VERSION_MANAGE', 'Document Version Manage', 'Version manage document', 'document',
        'version_manage', NOW(), NOW(), 0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'DOCUMENT:ACCESS_MANAGE', 'Document Access Manage', 'Access manage document', 'document',
        'access_manage', NOW(), NOW(), 0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;


-- Payment Gateway
INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'PAYMENT:VIEW', 'Payment View', 'View payment', 'payment', 'view', NOW(), NOW(), 0,
        false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'PAYMENT:INITIATE', 'Payment Initiate', 'Initiate payment', 'payment', 'initiate', NOW(),
        NOW(), 0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'PAYMENT:REFUND', 'Payment Refund', 'Refund payment', 'payment', 'refund', NOW(), NOW(), 0,
        false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'PAYMENT:CONFIG_MANAGE', 'Payment Config Manage', 'Config manage payment', 'payment',
        'config_manage', NOW(), NOW(), 0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;


-- Expense Management
INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'EXPENSE:VIEW', 'Expense View', 'View expense', 'expense', 'view', NOW(), NOW(), 0,
        false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'EXPENSE:CREATE', 'Expense Create', 'Create expense', 'expense', 'create', NOW(), NOW(), 0,
        false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'EXPENSE:APPROVE', 'Expense Approve', 'Approve expense', 'expense', 'approve', NOW(), NOW(),
        0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'EXPENSE:MANAGE', 'Expense Manage', 'Manage expense', 'expense', 'manage', NOW(), NOW(), 0,
        false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'EXPENSE:VIEW_ALL', 'Expense View All', 'View all expense', 'expense', 'view_all', NOW(),
        NOW(), 0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'EXPENSE:VIEW_TEAM', 'Expense View Team', 'View team expense', 'expense', 'view_team', NOW(),
        NOW(), 0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'EXPENSE:SETTINGS', 'Expense Settings', 'Settings expense', 'expense', 'settings', NOW(),
        NOW(), 0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'EXPENSE:ADVANCE_MANAGE', 'Expense Advance Manage', 'Advance manage expense', 'expense',
        'advance_manage', NOW(), NOW(), 0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'EXPENSE:REPORT', 'Expense Report', 'Report expense', 'expense', 'report', NOW(), NOW(), 0,
        false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;


-- Projects & Timesheets
INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'PROJECT:VIEW', 'Project View', 'View project', 'project', 'view', NOW(), NOW(), 0,
        false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'PROJECT:CREATE', 'Project Create', 'Create project', 'project', 'create', NOW(), NOW(), 0,
        false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'PROJECT:MANAGE', 'Project Manage', 'Manage project', 'project', 'manage', NOW(), NOW(), 0,
        false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'TIMESHEET:SUBMIT', 'Timesheet Submit', 'Submit timesheet', 'timesheet', 'submit', NOW(),
        NOW(), 0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'TIMESHEET:APPROVE', 'Timesheet Approve', 'Approve timesheet', 'timesheet', 'approve', NOW(),
        NOW(), 0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;


-- Resource Allocation Management
INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'ALLOCATION:VIEW', 'Allocation View', 'View allocation', 'allocation', 'view', NOW(), NOW(),
        0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'ALLOCATION:CREATE', 'Allocation Create', 'Create allocation', 'allocation', 'create', NOW(),
        NOW(), 0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'ALLOCATION:APPROVE', 'Allocation Approve', 'Approve allocation', 'allocation', 'approve',
        NOW(), NOW(), 0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'ALLOCATION:MANAGE', 'Allocation Manage', 'Manage allocation', 'allocation', 'manage', NOW(),
        NOW(), 0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;


-- Statutory Compliance
INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'STATUTORY:VIEW', 'Statutory View', 'View statutory', 'statutory', 'view', NOW(), NOW(), 0,
        false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'STATUTORY:MANAGE', 'Statutory Manage', 'Manage statutory', 'statutory', 'manage', NOW(),
        NOW(), 0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'TDS:DECLARE', 'Tds Declare', 'Declare tds', 'tds', 'declare', NOW(), NOW(), 0,
        false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'TDS:APPROVE', 'Tds Approve', 'Approve tds', 'tds', 'approve', NOW(), NOW(), 0,
        false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;


-- LWF (Labour Welfare Fund)
INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'LWF:VIEW', 'Lwf View', 'View lwf', 'lwf', 'view', NOW(), NOW(), 0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'LWF:MANAGE', 'Lwf Manage', 'Manage lwf', 'lwf', 'manage', NOW(), NOW(), 0,
        false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;


-- System Administration
INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'SYSTEM:ADMIN', 'System Admin', 'Admin system', 'system', 'admin', NOW(), NOW(), 0,
        false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'ROLE:MANAGE', 'Role Manage', 'Manage role', 'role', 'manage', NOW(), NOW(), 0,
        false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'ROLE:READ', 'Role Read', 'Read role', 'role', 'read', NOW(), NOW(), 0,
        false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'PERMISSION:MANAGE', 'Permission Manage', 'Manage permission', 'permission', 'manage', NOW(),
        NOW(), 0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'USER:VIEW', 'User View', 'View user', 'user', 'view', NOW(), NOW(), 0,
        false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'USER:MANAGE', 'User Manage', 'Manage user', 'user', 'manage', NOW(), NOW(), 0,
        false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'TENANT:MANAGE', 'Tenant Manage', 'Manage tenant', 'tenant', 'manage', NOW(), NOW(), 0,
        false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'AUDIT:VIEW', 'Audit View', 'View audit', 'audit', 'view', NOW(), NOW(), 0,
        false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;


-- Custom Fields
INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'CUSTOM_FIELD:VIEW', 'Custom Field View', 'View custom field', 'custom_field', 'view', NOW(),
        NOW(), 0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'CUSTOM_FIELD:CREATE', 'Custom Field Create', 'Create custom field', 'custom_field',
        'create', NOW(), NOW(), 0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'CUSTOM_FIELD:UPDATE', 'Custom Field Update', 'Update custom field', 'custom_field',
        'update', NOW(), NOW(), 0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'CUSTOM_FIELD:DELETE', 'Custom Field Delete', 'Delete custom field', 'custom_field',
        'delete', NOW(), NOW(), 0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'CUSTOM_FIELD:MANAGE', 'Custom Field Manage', 'Manage custom field', 'custom_field',
        'manage', NOW(), NOW(), 0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;


-- Settings
INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'SETTINGS:VIEW', 'Settings View', 'View settings', 'settings', 'view', NOW(), NOW(), 0,
        false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'SETTINGS:UPDATE', 'Settings Update', 'Update settings', 'settings', 'update', NOW(), NOW(),
        0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;


-- Notifications
INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'NOTIFICATIONS:VIEW', 'Notifications View', 'View notifications', 'notifications', 'view',
        NOW(), NOW(), 0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'NOTIFICATIONS:CREATE', 'Notifications Create', 'Create notifications', 'notifications',
        'create', NOW(), NOW(), 0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'NOTIFICATIONS:DELETE', 'Notifications Delete', 'Delete notifications', 'notifications',
        'delete', NOW(), NOW(), 0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;


-- Dashboard
INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'DASHBOARD:VIEW', 'Dashboard View', 'View dashboard', 'dashboard', 'view', NOW(), NOW(), 0,
        false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'DASHBOARD:EXECUTIVE', 'Dashboard Executive', 'Executive dashboard', 'dashboard',
        'executive', NOW(), NOW(), 0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'DASHBOARD:HR_OPS', 'Dashboard Hr Ops', 'Hr ops dashboard', 'dashboard', 'hr_ops', NOW(),
        NOW(), 0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'DASHBOARD:MANAGER', 'Dashboard Manager', 'Manager dashboard', 'dashboard', 'manager', NOW(),
        NOW(), 0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'DASHBOARD:EMPLOYEE', 'Dashboard Employee', 'Employee dashboard', 'dashboard', 'employee',
        NOW(), NOW(), 0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'DASHBOARD:WIDGETS', 'Dashboard Widgets', 'Widgets dashboard', 'dashboard', 'widgets', NOW(),
        NOW(), 0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;


-- Pulse Surveys / Engagement
INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'SURVEY:VIEW', 'Survey View', 'View survey', 'survey', 'view', NOW(), NOW(), 0,
        false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'SURVEY:MANAGE', 'Survey Manage', 'Manage survey', 'survey', 'manage', NOW(), NOW(), 0,
        false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'SURVEY:SUBMIT', 'Survey Submit', 'Submit survey', 'survey', 'submit', NOW(), NOW(), 0,
        false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;


-- 1-on-1 Meetings
INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'MEETING:VIEW', 'Meeting View', 'View meeting', 'meeting', 'view', NOW(), NOW(), 0,
        false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'MEETING:CREATE', 'Meeting Create', 'Create meeting', 'meeting', 'create', NOW(), NOW(), 0,
        false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'MEETING:MANAGE', 'Meeting Manage', 'Manage meeting', 'meeting', 'manage', NOW(), NOW(), 0,
        false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;


-- Probation Management
INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'PROBATION:VIEW', 'Probation View', 'View probation', 'probation', 'view', NOW(), NOW(), 0,
        false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'PROBATION:MANAGE', 'Probation Manage', 'Manage probation', 'probation', 'manage', NOW(),
        NOW(), 0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'PROBATION:VIEW_ALL', 'Probation View All', 'View all probation', 'probation', 'view_all',
        NOW(), NOW(), 0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'PROBATION:VIEW_TEAM', 'Probation View Team', 'View team probation', 'probation',
        'view_team', NOW(), NOW(), 0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;


-- Compensation Management
INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'COMPENSATION:VIEW', 'Compensation View', 'View compensation', 'compensation', 'view', NOW(),
        NOW(), 0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'COMPENSATION:MANAGE', 'Compensation Manage', 'Manage compensation', 'compensation',
        'manage', NOW(), NOW(), 0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'COMPENSATION:APPROVE', 'Compensation Approve', 'Approve compensation', 'compensation',
        'approve', NOW(), NOW(), 0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'COMPENSATION:VIEW_ALL', 'Compensation View All', 'View all compensation', 'compensation',
        'view_all', NOW(), NOW(), 0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;


-- Data Migration
INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'MIGRATION:IMPORT', 'Migration Import', 'Import migration', 'migration', 'import', NOW(),
        NOW(), 0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'MIGRATION:EXPORT', 'Migration Export', 'Export migration', 'migration', 'export', NOW(),
        NOW(), 0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;


-- Self-Service Portal
INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'SELF_SERVICE:PROFILE_UPDATE', 'Self Service Profile Update', 'Profile update self service',
        'self_service', 'profile_update', NOW(), NOW(), 0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'SELF_SERVICE:DOCUMENT_REQUEST', 'Self Service Document Request',
        'Document request self service', 'self_service', 'document_request', NOW(), NOW(), 0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'SELF_SERVICE:VIEW_PAYSLIP', 'Self Service View Payslip', 'View payslip self service',
        'self_service', 'view_payslip', NOW(), NOW(), 0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'SELF_SERVICE:VIEW_LETTERS', 'Self Service View Letters', 'View letters self service',
        'self_service', 'view_letters', NOW(), NOW(), 0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;


-- Letter Generation
INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'LETTER:TEMPLATE_VIEW', 'Letter Template View', 'Template view letter', 'letter',
        'template_view', NOW(), NOW(), 0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'LETTER:TEMPLATE_CREATE', 'Letter Template Create', 'Template create letter', 'letter',
        'template_create', NOW(), NOW(), 0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'LETTER:TEMPLATE_MANAGE', 'Letter Template Manage', 'Template manage letter', 'letter',
        'template_manage', NOW(), NOW(), 0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'LETTER:GENERATE', 'Letter Generate', 'Generate letter', 'letter', 'generate', NOW(), NOW(),
        0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'LETTER:APPROVE', 'Letter Approve', 'Approve letter', 'letter', 'approve', NOW(), NOW(), 0,
        false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'LETTER:ISSUE', 'Letter Issue', 'Issue letter', 'letter', 'issue', NOW(), NOW(), 0,
        false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;


-- Recognition & Engagement
INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'RECOGNITION:VIEW', 'Recognition View', 'View recognition', 'recognition', 'view', NOW(),
        NOW(), 0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'RECOGNITION:CREATE', 'Recognition Create', 'Create recognition', 'recognition', 'create',
        NOW(), NOW(), 0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'RECOGNITION:MANAGE', 'Recognition Manage', 'Manage recognition', 'recognition', 'manage',
        NOW(), NOW(), 0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'BADGE:MANAGE', 'Badge Manage', 'Manage badge', 'badge', 'manage', NOW(), NOW(), 0,
        false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'POINTS:MANAGE', 'Points Manage', 'Manage points', 'points', 'manage', NOW(), NOW(), 0,
        false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'MILESTONE:VIEW', 'Milestone View', 'View milestone', 'milestone', 'view', NOW(), NOW(), 0,
        false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'MILESTONE:MANAGE', 'Milestone Manage', 'Manage milestone', 'milestone', 'manage', NOW(),
        NOW(), 0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;


-- Organization Structure
INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'ORG_STRUCTURE:VIEW', 'Org Structure View', 'View org structure', 'org_structure', 'view',
        NOW(), NOW(), 0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'ORG_STRUCTURE:MANAGE', 'Org Structure Manage', 'Manage org structure', 'org_structure',
        'manage', NOW(), NOW(), 0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'POSITION:VIEW', 'Position View', 'View position', 'position', 'view', NOW(), NOW(), 0,
        false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'POSITION:MANAGE', 'Position Manage', 'Manage position', 'position', 'manage', NOW(), NOW(),
        0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'SUCCESSION:VIEW', 'Succession View', 'View succession', 'succession', 'view', NOW(), NOW(),
        0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'SUCCESSION:MANAGE', 'Succession Manage', 'Manage succession', 'succession', 'manage', NOW(),
        NOW(), 0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'TALENT_POOL:VIEW', 'Talent Pool View', 'View talent pool', 'talent_pool', 'view', NOW(),
        NOW(), 0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'TALENT_POOL:MANAGE', 'Talent Pool Manage', 'Manage talent pool', 'talent_pool', 'manage',
        NOW(), NOW(), 0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;


-- Compliance & Audit Management
INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'COMPLIANCE:VIEW', 'Compliance View', 'View compliance', 'compliance', 'view', NOW(), NOW(),
        0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'COMPLIANCE:MANAGE', 'Compliance Manage', 'Manage compliance', 'compliance', 'manage', NOW(),
        NOW(), 0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'POLICY:MANAGE', 'Policy Manage', 'Manage policy', 'policy', 'manage', NOW(), NOW(), 0,
        false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'CHECKLIST:VIEW', 'Checklist View', 'View checklist', 'checklist', 'view', NOW(), NOW(), 0,
        false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'CHECKLIST:MANAGE', 'Checklist Manage', 'Manage checklist', 'checklist', 'manage', NOW(),
        NOW(), 0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'ALERT:VIEW', 'Alert View', 'View alert', 'alert', 'view', NOW(), NOW(), 0,
        false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'ALERT:MANAGE', 'Alert Manage', 'Manage alert', 'alert', 'manage', NOW(), NOW(), 0,
        false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;


-- Employee Referral Program
INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'REFERRAL:VIEW', 'Referral View', 'View referral', 'referral', 'view', NOW(), NOW(), 0,
        false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'REFERRAL:CREATE', 'Referral Create', 'Create referral', 'referral', 'create', NOW(), NOW(),
        0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'REFERRAL:MANAGE', 'Referral Manage', 'Manage referral', 'referral', 'manage', NOW(), NOW(),
        0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;


-- Employee Wellness
INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'WELLNESS:VIEW', 'Wellness View', 'View wellness', 'wellness', 'view', NOW(), NOW(), 0,
        false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'WELLNESS:CREATE', 'Wellness Create', 'Create wellness', 'wellness', 'create', NOW(), NOW(),
        0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'WELLNESS:MANAGE', 'Wellness Manage', 'Manage wellness', 'wellness', 'manage', NOW(), NOW(),
        0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;


-- Budget & Headcount Planning
INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'BUDGET:VIEW', 'Budget View', 'View budget', 'budget', 'view', NOW(), NOW(), 0,
        false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'BUDGET:CREATE', 'Budget Create', 'Create budget', 'budget', 'create', NOW(), NOW(), 0,
        false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'BUDGET:APPROVE', 'Budget Approve', 'Approve budget', 'budget', 'approve', NOW(), NOW(), 0,
        false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'BUDGET:MANAGE', 'Budget Manage', 'Manage budget', 'budget', 'manage', NOW(), NOW(), 0,
        false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'HEADCOUNT:VIEW', 'Headcount View', 'View headcount', 'headcount', 'view', NOW(), NOW(), 0,
        false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'HEADCOUNT:MANAGE', 'Headcount Manage', 'Manage headcount', 'headcount', 'manage', NOW(),
        NOW(), 0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;


-- Predictive Analytics
INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'PREDICTIVE_ANALYTICS:VIEW', 'Predictive Analytics View', 'View predictive analytics',
        'predictive_analytics', 'view', NOW(), NOW(), 0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'PREDICTIVE_ANALYTICS:MANAGE', 'Predictive Analytics Manage', 'Manage predictive analytics',
        'predictive_analytics', 'manage', NOW(), NOW(), 0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;


-- Multi-Currency Payroll
INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'CURRENCY:MANAGE', 'Currency Manage', 'Manage currency', 'currency', 'manage', NOW(), NOW(),
        0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'EXCHANGE_RATE:MANAGE', 'Exchange Rate Manage', 'Manage exchange rate', 'exchange_rate',
        'manage', NOW(), NOW(), 0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'GLOBAL_PAYROLL:VIEW', 'Global Payroll View', 'View global payroll', 'global_payroll',
        'view', NOW(), NOW(), 0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'GLOBAL_PAYROLL:MANAGE', 'Global Payroll Manage', 'Manage global payroll', 'global_payroll',
        'manage', NOW(), NOW(), 0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;


-- Multi-Channel Notifications
INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'NOTIFICATION:VIEW', 'Notification View', 'View notification', 'notification', 'view', NOW(),
        NOW(), 0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'NOTIFICATION:CREATE', 'Notification Create', 'Create notification', 'notification',
        'create', NOW(), NOW(), 0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'NOTIFICATION:MANAGE', 'Notification Manage', 'Manage notification', 'notification',
        'manage', NOW(), NOW(), 0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'NOTIFICATION:SEND', 'Notification Send', 'Send notification', 'notification', 'send', NOW(),
        NOW(), 0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;


-- Benefits Management
INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'BENEFIT:VIEW', 'Benefit View', 'View benefit', 'benefit', 'view', NOW(), NOW(), 0,
        false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'BENEFIT:VIEW_SELF', 'Benefit View Self', 'View self benefit', 'benefit', 'view_self', NOW(),
        NOW(), 0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'BENEFIT:ENROLL', 'Benefit Enroll', 'Enroll benefit', 'benefit', 'enroll', NOW(), NOW(), 0,
        false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'BENEFIT:MANAGE', 'Benefit Manage', 'Manage benefit', 'benefit', 'manage', NOW(), NOW(), 0,
        false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'BENEFIT:APPROVE', 'Benefit Approve', 'Approve benefit', 'benefit', 'approve', NOW(), NOW(),
        0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'BENEFIT:CLAIM_SUBMIT', 'Benefit Claim Submit', 'Claim submit benefit', 'benefit',
        'claim_submit', NOW(), NOW(), 0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'BENEFIT:CLAIM_PROCESS', 'Benefit Claim Process', 'Claim process benefit', 'benefit',
        'claim_process', NOW(), NOW(), 0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;


-- Exit/Offboarding Management
INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'EXIT:VIEW', 'Exit View', 'View exit', 'exit', 'view', NOW(), NOW(), 0,
        false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'EXIT:INITIATE', 'Exit Initiate', 'Initiate exit', 'exit', 'initiate', NOW(), NOW(), 0,
        false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'EXIT:MANAGE', 'Exit Manage', 'Manage exit', 'exit', 'manage', NOW(), NOW(), 0,
        false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'EXIT:APPROVE', 'Exit Approve', 'Approve exit', 'exit', 'approve', NOW(), NOW(), 0,
        false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;


-- Announcement Management
INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'ANNOUNCEMENT:VIEW', 'Announcement View', 'View announcement', 'announcement', 'view', NOW(),
        NOW(), 0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'ANNOUNCEMENT:CREATE', 'Announcement Create', 'Create announcement', 'announcement',
        'create', NOW(), NOW(), 0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'ANNOUNCEMENT:MANAGE', 'Announcement Manage', 'Manage announcement', 'announcement',
        'manage', NOW(), NOW(), 0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;


-- Asset Management
INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'ASSET:VIEW', 'Asset View', 'View asset', 'asset', 'view', NOW(), NOW(), 0,
        false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'ASSET:CREATE', 'Asset Create', 'Create asset', 'asset', 'create', NOW(), NOW(), 0,
        false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'ASSET:ASSIGN', 'Asset Assign', 'Assign asset', 'asset', 'assign', NOW(), NOW(), 0,
        false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'ASSET:MANAGE', 'Asset Manage', 'Manage asset', 'asset', 'manage', NOW(), NOW(), 0,
        false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;


-- Contract Management
INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'CONTRACT:VIEW', 'Contract View', 'View contract', 'contract', 'view', NOW(), NOW(), 0,
        false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'CONTRACT:CREATE', 'Contract Create', 'Create contract', 'contract', 'create', NOW(), NOW(),
        0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'CONTRACT:UPDATE', 'Contract Update', 'Update contract', 'contract', 'update', NOW(), NOW(),
        0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'CONTRACT:DELETE', 'Contract Delete', 'Delete contract', 'contract', 'delete', NOW(), NOW(),
        0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'CONTRACT:APPROVE', 'Contract Approve', 'Approve contract', 'contract', 'approve', NOW(),
        NOW(), 0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'CONTRACT:SIGN', 'Contract Sign', 'Sign contract', 'contract', 'sign', NOW(), NOW(), 0,
        false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'CONTRACT:TEMPLATE_MANAGE', 'Contract Template Manage', 'Template manage contract',
        'contract', 'template_manage', NOW(), NOW(), 0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;


-- Onboarding Management
INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'ONBOARDING:VIEW', 'Onboarding View', 'View onboarding', 'onboarding', 'view', NOW(), NOW(),
        0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'ONBOARDING:CREATE', 'Onboarding Create', 'Create onboarding', 'onboarding', 'create', NOW(),
        NOW(), 0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'ONBOARDING:MANAGE', 'Onboarding Manage', 'Manage onboarding', 'onboarding', 'manage', NOW(),
        NOW(), 0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;


-- Shift Management
INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'SHIFT:VIEW', 'Shift View', 'View shift', 'shift', 'view', NOW(), NOW(), 0,
        false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'SHIFT:CREATE', 'Shift Create', 'Create shift', 'shift', 'create', NOW(), NOW(), 0,
        false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'SHIFT:ASSIGN', 'Shift Assign', 'Assign shift', 'shift', 'assign', NOW(), NOW(), 0,
        false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'SHIFT:MANAGE', 'Shift Manage', 'Manage shift', 'shift', 'manage', NOW(), NOW(), 0,
        false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;


-- Overtime Management
INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'OVERTIME:VIEW', 'Overtime View', 'View overtime', 'overtime', 'view', NOW(), NOW(), 0,
        false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'OVERTIME:REQUEST', 'Overtime Request', 'Request overtime', 'overtime', 'request', NOW(),
        NOW(), 0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'OVERTIME:APPROVE', 'Overtime Approve', 'Approve overtime', 'overtime', 'approve', NOW(),
        NOW(), 0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'OVERTIME:MANAGE', 'Overtime Manage', 'Manage overtime', 'overtime', 'manage', NOW(), NOW(),
        0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;


-- E-Signature Management
INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'ESIGNATURE:VIEW', 'Esignature View', 'View esignature', 'esignature', 'view', NOW(), NOW(),
        0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'ESIGNATURE:REQUEST', 'Esignature Request', 'Request esignature', 'esignature', 'request',
        NOW(), NOW(), 0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'ESIGNATURE:SIGN', 'Esignature Sign', 'Sign esignature', 'esignature', 'sign', NOW(), NOW(),
        0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'ESIGNATURE:MANAGE', 'Esignature Manage', 'Manage esignature', 'esignature', 'manage', NOW(),
        NOW(), 0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;


-- Integration Management
INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'INTEGRATION:READ', 'Integration Read', 'Read integration', 'integration', 'read', NOW(),
        NOW(), 0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'INTEGRATION:MANAGE', 'Integration Manage', 'Manage integration', 'integration', 'manage',
        NOW(), NOW(), 0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;


-- Workflow Management
INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'WORKFLOW:VIEW', 'Workflow View', 'View workflow', 'workflow', 'view', NOW(), NOW(), 0,
        false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'WORKFLOW:CREATE', 'Workflow Create', 'Create workflow', 'workflow', 'create', NOW(), NOW(),
        0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'WORKFLOW:MANAGE', 'Workflow Manage', 'Manage workflow', 'workflow', 'manage', NOW(), NOW(),
        0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'WORKFLOW:EXECUTE', 'Workflow Execute', 'Execute workflow', 'workflow', 'execute', NOW(),
        NOW(), 0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;


-- Platform Administration
INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'PLATFORM:VIEW', 'Platform View', 'View platform', 'platform', 'view', NOW(), NOW(), 0,
        false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'PLATFORM:MANAGE', 'Platform Manage', 'Manage platform', 'platform', 'manage', NOW(), NOW(),
        0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;


-- Leave Type Management
INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'LEAVE_TYPE:VIEW', 'Leave Type View', 'View leave type', 'leave_type', 'view', NOW(), NOW(),
        0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'LEAVE_TYPE:MANAGE', 'Leave Type Manage', 'Manage leave type', 'leave_type', 'manage', NOW(),
        NOW(), 0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;


-- Leave Balance Management
INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'LEAVE_BALANCE:VIEW', 'Leave Balance View', 'View leave balance', 'leave_balance', 'view',
        NOW(), NOW(), 0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'LEAVE_BALANCE:VIEW_ALL', 'Leave Balance View All', 'View all leave balance',
        'leave_balance', 'view_all', NOW(), NOW(), 0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'LEAVE_BALANCE:MANAGE', 'Leave Balance Manage', 'Manage leave balance', 'leave_balance',
        'manage', NOW(), NOW(), 0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'LEAVE_BALANCE:ENCASH', 'Leave Balance Encash', 'Encash leave balance', 'leave_balance',
        'encash', NOW(), NOW(), 0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;


-- Pre-boarding
INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'PREBOARDING:VIEW', 'Preboarding View', 'View preboarding', 'preboarding', 'view', NOW(),
        NOW(), 0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'PREBOARDING:CREATE', 'Preboarding Create', 'Create preboarding', 'preboarding', 'create',
        NOW(), NOW(), 0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'PREBOARDING:MANAGE', 'Preboarding Manage', 'Manage preboarding', 'preboarding', 'manage',
        NOW(), NOW(), 0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;


-- Travel Management
INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'TRAVEL:VIEW', 'Travel View', 'View travel', 'travel', 'view', NOW(), NOW(), 0,
        false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'TRAVEL:CREATE', 'Travel Create', 'Create travel', 'travel', 'create', NOW(), NOW(), 0,
        false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'TRAVEL:UPDATE', 'Travel Update', 'Update travel', 'travel', 'update', NOW(), NOW(), 0,
        false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'TRAVEL:APPROVE', 'Travel Approve', 'Approve travel', 'travel', 'approve', NOW(), NOW(), 0,
        false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'TRAVEL:VIEW_ALL', 'Travel View All', 'View all travel', 'travel', 'view_all', NOW(), NOW(),
        0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'TRAVEL:MANAGE', 'Travel Manage', 'Manage travel', 'travel', 'manage', NOW(), NOW(), 0,
        false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;


-- Employee Loans
INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'LOAN:VIEW', 'Loan View', 'View loan', 'loan', 'view', NOW(), NOW(), 0,
        false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'LOAN:CREATE', 'Loan Create', 'Create loan', 'loan', 'create', NOW(), NOW(), 0,
        false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'LOAN:UPDATE', 'Loan Update', 'Update loan', 'loan', 'update', NOW(), NOW(), 0,
        false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'LOAN:APPROVE', 'Loan Approve', 'Approve loan', 'loan', 'approve', NOW(), NOW(), 0,
        false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'LOAN:VIEW_ALL', 'Loan View All', 'View all loan', 'loan', 'view_all', NOW(), NOW(), 0,
        false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'LOAN:MANAGE', 'Loan Manage', 'Manage loan', 'loan', 'manage', NOW(), NOW(), 0,
        false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;


-- Time Tracking
INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'TIME_TRACKING:VIEW', 'Time Tracking View', 'View time tracking', 'time_tracking', 'view',
        NOW(), NOW(), 0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'TIME_TRACKING:CREATE', 'Time Tracking Create', 'Create time tracking', 'time_tracking',
        'create', NOW(), NOW(), 0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'TIME_TRACKING:UPDATE', 'Time Tracking Update', 'Update time tracking', 'time_tracking',
        'update', NOW(), NOW(), 0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'TIME_TRACKING:APPROVE', 'Time Tracking Approve', 'Approve time tracking', 'time_tracking',
        'approve', NOW(), NOW(), 0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'TIME_TRACKING:VIEW_ALL', 'Time Tracking View All', 'View all time tracking',
        'time_tracking', 'view_all', NOW(), NOW(), 0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'TIME_TRACKING:MANAGE', 'Time Tracking Manage', 'Manage time tracking', 'time_tracking',
        'manage', NOW(), NOW(), 0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;


-- Calendar Integration
INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'CALENDAR:VIEW', 'Calendar View', 'View calendar', 'calendar', 'view', NOW(), NOW(), 0,
        false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'CALENDAR:CREATE', 'Calendar Create', 'Create calendar', 'calendar', 'create', NOW(), NOW(),
        0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'CALENDAR:UPDATE', 'Calendar Update', 'Update calendar', 'calendar', 'update', NOW(), NOW(),
        0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'CALENDAR:DELETE', 'Calendar Delete', 'Delete calendar', 'calendar', 'delete', NOW(), NOW(),
        0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'CALENDAR:MANAGE', 'Calendar Manage', 'Manage calendar', 'calendar', 'manage', NOW(), NOW(),
        0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'CALENDAR:SYNC', 'Calendar Sync', 'Sync calendar', 'calendar', 'sync', NOW(), NOW(), 0,
        false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;


-- Organization Wall
INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'WALL:VIEW', 'Wall View', 'View wall', 'wall', 'view', NOW(), NOW(), 0,
        false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'WALL:POST', 'Wall Post', 'Post wall', 'wall', 'post', NOW(), NOW(), 0,
        false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'WALL:COMMENT', 'Wall Comment', 'Comment wall', 'wall', 'comment', NOW(), NOW(), 0,
        false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'WALL:REACT', 'Wall React', 'React wall', 'wall', 'react', NOW(), NOW(), 0,
        false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'WALL:MANAGE', 'Wall Manage', 'Manage wall', 'wall', 'manage', NOW(), NOW(), 0,
        false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'WALL:PIN', 'Wall Pin', 'Pin wall', 'wall', 'pin', NOW(), NOW(), 0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;


-- Performance Improvement Plans (PIP)
INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'PIP:VIEW', 'Pip View', 'View pip', 'pip', 'view', NOW(), NOW(), 0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'PIP:CREATE', 'Pip Create', 'Create pip', 'pip', 'create', NOW(), NOW(), 0,
        false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'PIP:MANAGE', 'Pip Manage', 'Manage pip', 'pip', 'manage', NOW(), NOW(), 0,
        false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'PIP:CLOSE', 'Pip Close', 'Close pip', 'pip', 'close', NOW(), NOW(), 0,
        false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;


-- Performance Calibration & Bell Curve
INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'CALIBRATION:VIEW', 'Calibration View', 'View calibration', 'calibration', 'view', NOW(),
        NOW(), 0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'CALIBRATION:MANAGE', 'Calibration Manage', 'Manage calibration', 'calibration', 'manage',
        NOW(), NOW(), 0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;


-- Offboarding & Full and Final Settlement
INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'OFFBOARDING:VIEW', 'Offboarding View', 'View offboarding', 'offboarding', 'view', NOW(),
        NOW(), 0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'OFFBOARDING:MANAGE', 'Offboarding Manage', 'Manage offboarding', 'offboarding', 'manage',
        NOW(), NOW(), 0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'OFFBOARDING:FNF_CALCULATE', 'Offboarding Fnf Calculate', 'Fnf calculate offboarding',
        'offboarding', 'fnf_calculate', NOW(), NOW(), 0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;


-- Public Career Page
INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'CAREER:VIEW', 'Career View', 'View career', 'career', 'view', NOW(), NOW(), 0,
        false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'CAREER:MANAGE', 'Career Manage', 'Manage career', 'career', 'manage', NOW(), NOW(), 0,
        false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;


-- Knowledge Management (NU-Fluence)
INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'KNOWLEDGE:WIKI_CREATE', 'Knowledge Wiki Create', 'Wiki create knowledge', 'knowledge',
        'wiki_create', NOW(), NOW(), 0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'KNOWLEDGE:WIKI_READ', 'Knowledge Wiki Read', 'Wiki read knowledge', 'knowledge',
        'wiki_read', NOW(), NOW(), 0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'KNOWLEDGE:WIKI_UPDATE', 'Knowledge Wiki Update', 'Wiki update knowledge', 'knowledge',
        'wiki_update', NOW(), NOW(), 0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'KNOWLEDGE:WIKI_DELETE', 'Knowledge Wiki Delete', 'Wiki delete knowledge', 'knowledge',
        'wiki_delete', NOW(), NOW(), 0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'KNOWLEDGE:WIKI_PUBLISH', 'Knowledge Wiki Publish', 'Wiki publish knowledge', 'knowledge',
        'wiki_publish', NOW(), NOW(), 0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'KNOWLEDGE:WIKI_APPROVE', 'Knowledge Wiki Approve', 'Wiki approve knowledge', 'knowledge',
        'wiki_approve', NOW(), NOW(), 0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'KNOWLEDGE:BLOG_CREATE', 'Knowledge Blog Create', 'Blog create knowledge', 'knowledge',
        'blog_create', NOW(), NOW(), 0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'KNOWLEDGE:BLOG_READ', 'Knowledge Blog Read', 'Blog read knowledge', 'knowledge',
        'blog_read', NOW(), NOW(), 0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'KNOWLEDGE:BLOG_UPDATE', 'Knowledge Blog Update', 'Blog update knowledge', 'knowledge',
        'blog_update', NOW(), NOW(), 0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'KNOWLEDGE:BLOG_DELETE', 'Knowledge Blog Delete', 'Blog delete knowledge', 'knowledge',
        'blog_delete', NOW(), NOW(), 0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'KNOWLEDGE:BLOG_PUBLISH', 'Knowledge Blog Publish', 'Blog publish knowledge', 'knowledge',
        'blog_publish', NOW(), NOW(), 0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'KNOWLEDGE:TEMPLATE_CREATE', 'Knowledge Template Create', 'Template create knowledge',
        'knowledge', 'template_create', NOW(), NOW(), 0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'KNOWLEDGE:TEMPLATE_READ', 'Knowledge Template Read', 'Template read knowledge', 'knowledge',
        'template_read', NOW(), NOW(), 0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'KNOWLEDGE:TEMPLATE_UPDATE', 'Knowledge Template Update', 'Template update knowledge',
        'knowledge', 'template_update', NOW(), NOW(), 0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'KNOWLEDGE:TEMPLATE_DELETE', 'Knowledge Template Delete', 'Template delete knowledge',
        'knowledge', 'template_delete', NOW(), NOW(), 0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'KNOWLEDGE:SEARCH', 'Knowledge Search', 'Search knowledge', 'knowledge', 'search', NOW(),
        NOW(), 0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'KNOWLEDGE:SETTINGS_MANAGE', 'Knowledge Settings Manage', 'Settings manage knowledge',
        'knowledge', 'settings_manage', NOW(), NOW(), 0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

-- ============================================================================
-- Phase 4: Insert ALL field-level permissions from FieldPermission.java (6 total)
-- ============================================================================

-- Salary/Compensation Fields
INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'FIELD:EMPLOYEE:SALARY:VIEW', 'Field Employee Salary View',
        'View employee salary information', 'field_employee_salary', 'view', NOW(), NOW(), 0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'FIELD:EMPLOYEE:SALARY:EDIT', 'Field Employee Salary Edit',
        'Edit employee salary information', 'field_employee_salary', 'edit', NOW(), NOW(), 0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;


-- Bank Details
INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'FIELD:EMPLOYEE:BANK:VIEW', 'Field Employee Bank View', 'View employee bank information',
        'field_employee_bank', 'view', NOW(), NOW(), 0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'FIELD:EMPLOYEE:BANK:EDIT', 'Field Employee Bank Edit', 'Edit employee bank information',
        'field_employee_bank', 'edit', NOW(), NOW(), 0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;


-- Tax Information
INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'FIELD:EMPLOYEE:TAX_ID:VIEW', 'Field Employee Tax Id View',
        'View employee tax id information', 'field_employee_tax_id', 'view', NOW(), NOW(), 0, false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;


-- Identity Documents (PAN, Aadhaar, Passport, etc.)
INSERT INTO permissions (id, tenant_id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001', 'FIELD:EMPLOYEE:ID_DOCS:VIEW', 'Field Employee Id Docs View',
        'View employee id docs information', 'field_employee_id_docs', 'view', NOW(), NOW(), 0,
        false) ON CONFLICT (code)
WHERE is_deleted = false DO NOTHING;

-- ============================================================================
-- Total permissions seeded: 344
-- ============================================================================
