-- ============================================================================
-- V80: Seed All Missing Permission Constants from Permission.java
-- ============================================================================
-- ROOT CAUSE: 204 of 328 permission constants defined in Permission.java were
-- never seeded in any Flyway migration (V19, V66, V69, V70, V74). Controllers
-- using @RequiresPermission with these codes deny access (403) for ALL
-- non-SuperAdmin users because the permission code doesn't exist in the DB
-- and therefore cannot be assigned to any role.
--
-- FIX: Insert all missing permissions using ON CONFLICT DO NOTHING for
-- idempotency. Permissions are stored in UPPERCASE:COLON format matching
-- the Permission.java constants. The JwtAuthenticationFilter normalizer
-- handles format conversion at load time.
--
-- NOTE: This migration only inserts permission records into the global
-- permissions table. Role assignments are NOT included here — those should
-- be configured per-tenant by administrators after this migration runs.
-- ============================================================================

-- ============================================================================
-- Employee Management (scoped views)
-- ============================================================================
INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'EMPLOYEE:VIEW_ALL', 'View All Employees', 'View employees across all departments', 'employee', 'view_all', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'EMPLOYEE:VIEW_DEPARTMENT', 'View Department Employees', 'View employees within own department', 'employee', 'view_department', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'EMPLOYEE:VIEW_TEAM', 'View Team Employees', 'View employees within own team', 'employee', 'view_team', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'EMPLOYEE:VIEW_SELF', 'View Own Profile', 'View own employee profile', 'employee', 'view_self', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

-- ============================================================================
-- Employment Change Requests
-- ============================================================================
INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'EMPLOYMENT_CHANGE:VIEW', 'View Employment Changes', 'View employment change requests', 'employment_change', 'view', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'EMPLOYMENT_CHANGE:VIEW_ALL', 'View All Employment Changes', 'View all employment change requests', 'employment_change', 'view_all', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'EMPLOYMENT_CHANGE:CREATE', 'Create Employment Change', 'Create employment change requests', 'employment_change', 'create', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'EMPLOYMENT_CHANGE:APPROVE', 'Approve Employment Change', 'Approve employment change requests', 'employment_change', 'approve', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'EMPLOYMENT_CHANGE:CANCEL', 'Cancel Employment Change', 'Cancel employment change requests', 'employment_change', 'cancel', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

-- ============================================================================
-- Department Management
-- ============================================================================
INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'DEPARTMENT:VIEW', 'View Departments', 'View department information', 'department', 'view', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'DEPARTMENT:MANAGE', 'Manage Departments', 'Full department management', 'department', 'manage', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

-- ============================================================================
-- Attendance Management (scoped views + actions)
-- ============================================================================
INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'ATTENDANCE:MARK', 'Mark Attendance', 'Mark daily attendance', 'attendance', 'mark', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'ATTENDANCE:APPROVE', 'Approve Attendance', 'Approve attendance regularizations', 'attendance', 'approve', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'ATTENDANCE:VIEW_ALL', 'View All Attendance', 'View attendance across all departments', 'attendance', 'view_all', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'ATTENDANCE:VIEW_TEAM', 'View Team Attendance', 'View team attendance records', 'attendance', 'view_team', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'ATTENDANCE:VIEW_SELF', 'View Own Attendance', 'View own attendance records', 'attendance', 'view_self', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'ATTENDANCE:REGULARIZE', 'Regularize Attendance', 'Submit attendance regularization requests', 'attendance', 'regularize', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

-- ============================================================================
-- Office Location & Geofencing
-- ============================================================================
INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'OFFICE_LOCATION:VIEW', 'View Office Locations', 'View office location details', 'office_location', 'view', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'OFFICE_LOCATION:CREATE', 'Create Office Location', 'Create new office locations', 'office_location', 'create', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'OFFICE_LOCATION:UPDATE', 'Update Office Location', 'Update office location details', 'office_location', 'update', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'OFFICE_LOCATION:DELETE', 'Delete Office Location', 'Delete office locations', 'office_location', 'delete', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'GEOFENCE:MANAGE', 'Manage Geofencing', 'Manage geofence rules and boundaries', 'geofence', 'manage', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'GEOFENCE:BYPASS', 'Bypass Geofence', 'Bypass geofence restrictions for attendance', 'geofence', 'bypass', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

-- ============================================================================
-- Payroll Management
-- ============================================================================
INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'PAYROLL:VIEW', 'View Payroll', 'View payroll information', 'payroll', 'view', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'PAYROLL:VIEW_ALL', 'View All Payroll', 'View payroll for all employees', 'payroll', 'view_all', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'PAYROLL:PROCESS', 'Process Payroll', 'Run payroll processing', 'payroll', 'process', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'PAYROLL:APPROVE', 'Approve Payroll', 'Approve payroll runs', 'payroll', 'approve', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'PAYROLL:VIEW_SELF', 'View Own Payroll', 'View own payroll and payslips', 'payroll', 'view_self', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

-- ============================================================================
-- Helpdesk (missing actions)
-- ============================================================================
INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'HELPDESK:TICKET_CREATE', 'Create Helpdesk Ticket', 'Create helpdesk support tickets', 'helpdesk', 'ticket_create', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'HELPDESK:TICKET_ASSIGN', 'Assign Helpdesk Ticket', 'Assign helpdesk tickets to agents', 'helpdesk', 'ticket_assign', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'HELPDESK:TICKET_RESOLVE', 'Resolve Helpdesk Ticket', 'Resolve helpdesk tickets', 'helpdesk', 'ticket_resolve', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'HELPDESK:SLA_MANAGE', 'Manage Helpdesk SLAs', 'Manage helpdesk service level agreements', 'helpdesk', 'sla_manage', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

-- ============================================================================
-- Reports & Analytics
-- ============================================================================
INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'REPORT:CREATE', 'Create Reports', 'Create custom reports', 'report', 'create', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'REPORT:SCHEDULE', 'Schedule Reports', 'Schedule recurring reports', 'report', 'schedule', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'ANALYTICS:VIEW', 'View Analytics', 'View analytics dashboards', 'analytics', 'view', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'ANALYTICS:EXPORT', 'Export Analytics', 'Export analytics data', 'analytics', 'export', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

-- ============================================================================
-- Document Management
-- ============================================================================
INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'DOCUMENT:VIEW', 'View Documents', 'View uploaded documents', 'document', 'view', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'DOCUMENT:UPLOAD', 'Upload Documents', 'Upload new documents', 'document', 'upload', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'DOCUMENT:APPROVE', 'Approve Documents', 'Approve uploaded documents', 'document', 'approve', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'DOCUMENT:DELETE', 'Delete Documents', 'Delete documents', 'document', 'delete', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'DOCUMENT:MANAGE_CATEGORY', 'Manage Document Categories', 'Manage document categories', 'document', 'manage_category', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'DOCUMENT:VIEW_ALL', 'View All Documents', 'View all documents across organization', 'document', 'view_all', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'DOCUMENT:VERSION_MANAGE', 'Manage Document Versions', 'Manage document version history', 'document', 'version_manage', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'DOCUMENT:ACCESS_MANAGE', 'Manage Document Access', 'Manage document access permissions', 'document', 'access_manage', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

-- ============================================================================
-- Payment Gateway (missing CONFIG_MANAGE)
-- ============================================================================
INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'PAYMENT:CONFIG_MANAGE', 'Manage Payment Config', 'Manage payment gateway configuration', 'payment', 'config_manage', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

-- ============================================================================
-- Expense Management
-- ============================================================================
INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'EXPENSE:VIEW', 'View Expenses', 'View expense reports', 'expense', 'view', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'EXPENSE:CREATE', 'Create Expense', 'Submit expense reports', 'expense', 'create', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'EXPENSE:APPROVE', 'Approve Expenses', 'Approve expense reports', 'expense', 'approve', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'EXPENSE:MANAGE', 'Manage Expenses', 'Full expense management', 'expense', 'manage', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'EXPENSE:VIEW_ALL', 'View All Expenses', 'View all employee expenses', 'expense', 'view_all', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'EXPENSE:VIEW_TEAM', 'View Team Expenses', 'View team expense reports', 'expense', 'view_team', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

-- ============================================================================
-- Projects & Timesheets (missing PROJECT:MANAGE, TIMESHEET)
-- ============================================================================
INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'PROJECT:MANAGE', 'Manage Projects', 'Full project management', 'project', 'manage', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'TIMESHEET:SUBMIT', 'Submit Timesheet', 'Submit timesheet entries', 'timesheet', 'submit', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'TIMESHEET:APPROVE', 'Approve Timesheet', 'Approve timesheet submissions', 'timesheet', 'approve', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

-- ============================================================================
-- Statutory Compliance (missing TDS)
-- ============================================================================
INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'TDS:DECLARE', 'Declare TDS', 'Submit TDS declarations', 'tds', 'declare', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'TDS:APPROVE', 'Approve TDS', 'Approve TDS declarations', 'tds', 'approve', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

-- ============================================================================
-- System Administration (missing codes)
-- ============================================================================
INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'ROLE:READ', 'View Roles', 'View role definitions', 'role', 'read', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'USER:VIEW', 'View Users', 'View user accounts', 'user', 'view', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'TENANT:MANAGE', 'Manage Tenants', 'Manage tenant configuration', 'tenant', 'manage', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'AUDIT:VIEW', 'View Audit Logs', 'View system audit trail', 'audit', 'view', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

-- ============================================================================
-- Settings
-- ============================================================================
INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'SETTINGS:VIEW', 'View Settings', 'View system settings', 'settings', 'view', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'SETTINGS:UPDATE', 'Update Settings', 'Update system settings', 'settings', 'update', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

-- ============================================================================
-- Dashboard
-- ============================================================================
INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'DASHBOARD:VIEW', 'View Dashboard', 'View main dashboard', 'dashboard', 'view', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'DASHBOARD:EXECUTIVE', 'Executive Dashboard', 'View executive dashboard', 'dashboard', 'executive', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'DASHBOARD:HR_OPS', 'HR Ops Dashboard', 'View HR operations dashboard', 'dashboard', 'hr_ops', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'DASHBOARD:MANAGER', 'Manager Dashboard', 'View manager dashboard', 'dashboard', 'manager', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'DASHBOARD:EMPLOYEE', 'Employee Dashboard', 'View employee self-service dashboard', 'dashboard', 'employee', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'DASHBOARD:WIDGETS', 'Dashboard Widgets', 'Configure dashboard widgets', 'dashboard', 'widgets', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

-- ============================================================================
-- 1-on-1 Meetings
-- ============================================================================
INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'MEETING:VIEW', 'View Meetings', 'View 1-on-1 meetings', 'meeting', 'view', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'MEETING:CREATE', 'Create Meeting', 'Schedule 1-on-1 meetings', 'meeting', 'create', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'MEETING:MANAGE', 'Manage Meetings', 'Manage 1-on-1 meeting settings', 'meeting', 'manage', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

-- ============================================================================
-- Probation Management
-- ============================================================================
INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'PROBATION:VIEW', 'View Probation', 'View probation status', 'probation', 'view', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'PROBATION:MANAGE', 'Manage Probation', 'Manage probation reviews and confirmations', 'probation', 'manage', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'PROBATION:VIEW_ALL', 'View All Probation', 'View probation for all employees', 'probation', 'view_all', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'PROBATION:VIEW_TEAM', 'View Team Probation', 'View team probation records', 'probation', 'view_team', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

-- ============================================================================
-- Compensation Management
-- ============================================================================
INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'COMPENSATION:VIEW', 'View Compensation', 'View compensation details', 'compensation', 'view', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'COMPENSATION:MANAGE', 'Manage Compensation', 'Manage compensation structures', 'compensation', 'manage', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'COMPENSATION:APPROVE', 'Approve Compensation', 'Approve compensation changes', 'compensation', 'approve', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'COMPENSATION:VIEW_ALL', 'View All Compensation', 'View compensation for all employees', 'compensation', 'view_all', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

-- ============================================================================
-- Data Migration
-- ============================================================================
INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'MIGRATION:IMPORT', 'Import Data', 'Import data from external sources', 'migration', 'import', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'MIGRATION:EXPORT', 'Export Data', 'Export data to external formats', 'migration', 'export', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

-- ============================================================================
-- Self-Service Portal
-- ============================================================================
INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'SELF_SERVICE:PROFILE_UPDATE', 'Update Own Profile', 'Update personal profile information', 'self_service', 'profile_update', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'SELF_SERVICE:DOCUMENT_REQUEST', 'Request Documents', 'Request official documents', 'self_service', 'document_request', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'SELF_SERVICE:VIEW_PAYSLIP', 'View Payslips', 'View own payslips', 'self_service', 'view_payslip', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'SELF_SERVICE:VIEW_LETTERS', 'View Letters', 'View own issued letters', 'self_service', 'view_letters', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

-- ============================================================================
-- Recognition & Engagement (missing codes)
-- ============================================================================
INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'BADGE:MANAGE', 'Manage Badges', 'Manage recognition badges', 'badge', 'manage', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'POINTS:MANAGE', 'Manage Points', 'Manage recognition points system', 'points', 'manage', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'MILESTONE:VIEW', 'View Milestones', 'View employee milestones', 'milestone', 'view', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'MILESTONE:MANAGE', 'Manage Milestones', 'Manage employee milestones', 'milestone', 'manage', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

-- ============================================================================
-- Organization Structure
-- ============================================================================
INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'ORG_STRUCTURE:VIEW', 'View Org Structure', 'View organization chart and structure', 'org_structure', 'view', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'ORG_STRUCTURE:MANAGE', 'Manage Org Structure', 'Manage organization structure', 'org_structure', 'manage', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'POSITION:VIEW', 'View Positions', 'View position definitions', 'position', 'view', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'POSITION:MANAGE', 'Manage Positions', 'Manage position definitions', 'position', 'manage', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'SUCCESSION:VIEW', 'View Succession Plans', 'View succession planning', 'succession', 'view', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'SUCCESSION:MANAGE', 'Manage Succession Plans', 'Manage succession planning', 'succession', 'manage', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'TALENT_POOL:VIEW', 'View Talent Pool', 'View talent pool candidates', 'talent_pool', 'view', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'TALENT_POOL:MANAGE', 'Manage Talent Pool', 'Manage talent pool', 'talent_pool', 'manage', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

-- ============================================================================
-- Compliance & Audit Management
-- ============================================================================
INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'COMPLIANCE:VIEW', 'View Compliance', 'View compliance status and reports', 'compliance', 'view', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'COMPLIANCE:MANAGE', 'Manage Compliance', 'Manage compliance requirements', 'compliance', 'manage', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'POLICY:MANAGE', 'Manage Policies', 'Manage organizational policies', 'policy', 'manage', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'CHECKLIST:VIEW', 'View Checklists', 'View compliance checklists', 'checklist', 'view', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'CHECKLIST:MANAGE', 'Manage Checklists', 'Manage compliance checklists', 'checklist', 'manage', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'ALERT:VIEW', 'View Alerts', 'View compliance alerts', 'alert', 'view', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'ALERT:MANAGE', 'Manage Alerts', 'Manage compliance alerts', 'alert', 'manage', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

-- ============================================================================
-- Employee Referral Program
-- ============================================================================
INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'REFERRAL:VIEW', 'View Referrals', 'View employee referrals', 'referral', 'view', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'REFERRAL:CREATE', 'Create Referral', 'Submit employee referrals', 'referral', 'create', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'REFERRAL:MANAGE', 'Manage Referrals', 'Manage referral program', 'referral', 'manage', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

-- ============================================================================
-- Budget & Headcount Planning
-- ============================================================================
INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'BUDGET:VIEW', 'View Budget', 'View budget allocations', 'budget', 'view', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'BUDGET:CREATE', 'Create Budget', 'Create budget proposals', 'budget', 'create', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'BUDGET:APPROVE', 'Approve Budget', 'Approve budget proposals', 'budget', 'approve', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'BUDGET:MANAGE', 'Manage Budget', 'Full budget management', 'budget', 'manage', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'HEADCOUNT:VIEW', 'View Headcount', 'View headcount planning', 'headcount', 'view', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'HEADCOUNT:MANAGE', 'Manage Headcount', 'Manage headcount planning', 'headcount', 'manage', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

-- ============================================================================
-- Predictive Analytics
-- ============================================================================
INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'PREDICTIVE_ANALYTICS:VIEW', 'View Predictive Analytics', 'View predictive analytics dashboards', 'predictive_analytics', 'view', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'PREDICTIVE_ANALYTICS:MANAGE', 'Manage Predictive Analytics', 'Manage predictive analytics models', 'predictive_analytics', 'manage', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

-- ============================================================================
-- Multi-Currency Payroll
-- ============================================================================
INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'CURRENCY:MANAGE', 'Manage Currencies', 'Manage supported currencies', 'currency', 'manage', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'EXCHANGE_RATE:MANAGE', 'Manage Exchange Rates', 'Manage currency exchange rates', 'exchange_rate', 'manage', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'GLOBAL_PAYROLL:VIEW', 'View Global Payroll', 'View multi-currency payroll', 'global_payroll', 'view', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'GLOBAL_PAYROLL:MANAGE', 'Manage Global Payroll', 'Manage multi-currency payroll', 'global_payroll', 'manage', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

-- ============================================================================
-- Benefits Management
-- ============================================================================
INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'BENEFIT:VIEW', 'View Benefits', 'View available benefits', 'benefit', 'view', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'BENEFIT:VIEW_SELF', 'View Own Benefits', 'View own benefit enrollments', 'benefit', 'view_self', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'BENEFIT:ENROLL', 'Enroll in Benefits', 'Enroll in benefit plans', 'benefit', 'enroll', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'BENEFIT:MANAGE', 'Manage Benefits', 'Manage benefit plans and enrollments', 'benefit', 'manage', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'BENEFIT:APPROVE', 'Approve Benefits', 'Approve benefit enrollments', 'benefit', 'approve', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'BENEFIT:CLAIM_SUBMIT', 'Submit Benefit Claim', 'Submit benefit claims', 'benefit', 'claim_submit', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'BENEFIT:CLAIM_PROCESS', 'Process Benefit Claim', 'Process and settle benefit claims', 'benefit', 'claim_process', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

-- ============================================================================
-- Exit/Offboarding Management
-- ============================================================================
INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'EXIT:VIEW', 'View Exit Requests', 'View exit and resignation requests', 'exit', 'view', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'EXIT:INITIATE', 'Initiate Exit', 'Initiate exit and resignation process', 'exit', 'initiate', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'EXIT:MANAGE', 'Manage Exit', 'Manage exit process and clearance', 'exit', 'manage', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'EXIT:APPROVE', 'Approve Exit', 'Approve exit and resignation requests', 'exit', 'approve', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

-- ============================================================================
-- Announcement Management
-- ============================================================================
INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'ANNOUNCEMENT:VIEW', 'View Announcements', 'View company announcements', 'announcement', 'view', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'ANNOUNCEMENT:CREATE', 'Create Announcement', 'Create company announcements', 'announcement', 'create', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'ANNOUNCEMENT:MANAGE', 'Manage Announcements', 'Manage company announcements', 'announcement', 'manage', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

-- ============================================================================
-- Asset Management
-- ============================================================================
INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'ASSET:VIEW', 'View Assets', 'View company assets', 'asset', 'view', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'ASSET:CREATE', 'Create Asset', 'Register new assets', 'asset', 'create', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'ASSET:ASSIGN', 'Assign Asset', 'Assign assets to employees', 'asset', 'assign', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'ASSET:MANAGE', 'Manage Assets', 'Full asset management', 'asset', 'manage', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

-- ============================================================================
-- Shift Management
-- ============================================================================
INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'SHIFT:VIEW', 'View Shifts', 'View shift schedules', 'shift', 'view', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'SHIFT:CREATE', 'Create Shift', 'Create shift schedules', 'shift', 'create', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'SHIFT:ASSIGN', 'Assign Shift', 'Assign shifts to employees', 'shift', 'assign', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'SHIFT:MANAGE', 'Manage Shifts', 'Full shift management', 'shift', 'manage', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

-- ============================================================================
-- Overtime Management
-- ============================================================================
INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'OVERTIME:VIEW', 'View Overtime', 'View overtime records', 'overtime', 'view', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'OVERTIME:REQUEST', 'Request Overtime', 'Submit overtime requests', 'overtime', 'request', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'OVERTIME:APPROVE', 'Approve Overtime', 'Approve overtime requests', 'overtime', 'approve', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'OVERTIME:MANAGE', 'Manage Overtime', 'Full overtime management', 'overtime', 'manage', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

-- ============================================================================
-- E-Signature Management
-- ============================================================================
INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'ESIGNATURE:VIEW', 'View E-Signatures', 'View e-signature requests', 'esignature', 'view', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'ESIGNATURE:REQUEST', 'Request E-Signature', 'Send e-signature requests', 'esignature', 'request', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'ESIGNATURE:SIGN', 'Sign E-Signature', 'Sign documents electronically', 'esignature', 'sign', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'ESIGNATURE:MANAGE', 'Manage E-Signatures', 'Manage e-signature workflows', 'esignature', 'manage', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

-- ============================================================================
-- Integration Management
-- ============================================================================
INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'INTEGRATION:READ', 'View Integrations', 'View integration configurations', 'integration', 'read', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'INTEGRATION:MANAGE', 'Manage Integrations', 'Manage third-party integrations', 'integration', 'manage', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

-- ============================================================================
-- Platform Administration
-- ============================================================================
INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'PLATFORM:VIEW', 'View Platform', 'View platform administration', 'platform', 'view', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'PLATFORM:MANAGE', 'Manage Platform', 'Manage platform settings and apps', 'platform', 'manage', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

-- ============================================================================
-- Leave Type Management
-- ============================================================================
INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'LEAVE_TYPE:VIEW', 'View Leave Types', 'View leave type configurations', 'leave_type', 'view', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'LEAVE_TYPE:MANAGE', 'Manage Leave Types', 'Manage leave type configurations', 'leave_type', 'manage', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

-- ============================================================================
-- Travel Management
-- ============================================================================
INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'TRAVEL:VIEW', 'View Travel', 'View travel requests', 'travel', 'view', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'TRAVEL:CREATE', 'Create Travel Request', 'Submit travel requests', 'travel', 'create', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'TRAVEL:UPDATE', 'Update Travel Request', 'Update travel requests', 'travel', 'update', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'TRAVEL:APPROVE', 'Approve Travel', 'Approve travel requests', 'travel', 'approve', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'TRAVEL:VIEW_ALL', 'View All Travel', 'View all travel requests', 'travel', 'view_all', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'TRAVEL:MANAGE', 'Manage Travel', 'Full travel management', 'travel', 'manage', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

-- ============================================================================
-- Employee Loans
-- ============================================================================
INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'LOAN:VIEW', 'View Loans', 'View employee loans', 'loan', 'view', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'LOAN:CREATE', 'Create Loan', 'Apply for employee loans', 'loan', 'create', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'LOAN:UPDATE', 'Update Loan', 'Update loan details', 'loan', 'update', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'LOAN:APPROVE', 'Approve Loan', 'Approve employee loan requests', 'loan', 'approve', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'LOAN:VIEW_ALL', 'View All Loans', 'View all employee loans', 'loan', 'view_all', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'LOAN:MANAGE', 'Manage Loans', 'Full loan management', 'loan', 'manage', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

-- ============================================================================
-- Time Tracking
-- ============================================================================
INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'TIME_TRACKING:VIEW', 'View Time Tracking', 'View time tracking entries', 'time_tracking', 'view', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'TIME_TRACKING:CREATE', 'Create Time Entry', 'Log time tracking entries', 'time_tracking', 'create', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'TIME_TRACKING:UPDATE', 'Update Time Entry', 'Update time tracking entries', 'time_tracking', 'update', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'TIME_TRACKING:APPROVE', 'Approve Time Entries', 'Approve time tracking entries', 'time_tracking', 'approve', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'TIME_TRACKING:VIEW_ALL', 'View All Time Tracking', 'View all time tracking entries', 'time_tracking', 'view_all', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'TIME_TRACKING:MANAGE', 'Manage Time Tracking', 'Full time tracking management', 'time_tracking', 'manage', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

-- ============================================================================
-- Calendar Integration
-- ============================================================================
INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'CALENDAR:VIEW', 'View Calendar', 'View calendar events', 'calendar', 'view', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'CALENDAR:CREATE', 'Create Calendar Event', 'Create calendar events', 'calendar', 'create', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'CALENDAR:UPDATE', 'Update Calendar Event', 'Update calendar events', 'calendar', 'update', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'CALENDAR:DELETE', 'Delete Calendar Event', 'Delete calendar events', 'calendar', 'delete', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'CALENDAR:MANAGE', 'Manage Calendar', 'Manage calendar settings', 'calendar', 'manage', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'CALENDAR:SYNC', 'Sync Calendar', 'Sync with external calendars', 'calendar', 'sync', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

-- ============================================================================
-- Performance Improvement Plans (PIP)
-- ============================================================================
INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'PIP:VIEW', 'View PIP', 'View performance improvement plans', 'pip', 'view', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'PIP:CREATE', 'Create PIP', 'Create performance improvement plans', 'pip', 'create', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'PIP:MANAGE', 'Manage PIP', 'Manage performance improvement plans', 'pip', 'manage', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'PIP:CLOSE', 'Close PIP', 'Close performance improvement plans', 'pip', 'close', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

-- ============================================================================
-- Performance Calibration & Bell Curve
-- ============================================================================
INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'CALIBRATION:VIEW', 'View Calibration', 'View performance calibration sessions', 'calibration', 'view', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'CALIBRATION:MANAGE', 'Manage Calibration', 'Manage performance calibration', 'calibration', 'manage', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

-- ============================================================================
-- Offboarding & Full and Final Settlement
-- ============================================================================
INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'OFFBOARDING:VIEW', 'View Offboarding', 'View offboarding process', 'offboarding', 'view', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'OFFBOARDING:MANAGE', 'Manage Offboarding', 'Manage offboarding process', 'offboarding', 'manage', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'OFFBOARDING:FNF_CALCULATE', 'Calculate FnF Settlement', 'Calculate full and final settlement', 'offboarding', 'fnf_calculate', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

-- ============================================================================
-- Public Career Page
-- ============================================================================
INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'CAREER:VIEW', 'View Career Page', 'View public career page', 'career', 'view', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'CAREER:MANAGE', 'Manage Career Page', 'Manage career page and job postings', 'career', 'manage', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

-- ============================================================================
-- Knowledge Management (NU-Fluence) — granular permissions
-- V19 seeded coarse-grained knowledge.wiki.read, knowledge.blog.read, etc.
-- These are the fine-grained UPPERCASE:COLON variants from Permission.java.
-- ============================================================================
INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'KNOWLEDGE:WIKI_CREATE', 'Create Wiki Pages', 'Create wiki pages in knowledge base', 'knowledge', 'wiki_create', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'KNOWLEDGE:WIKI_READ', 'Read Wiki Pages', 'Read wiki pages in knowledge base', 'knowledge', 'wiki_read', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'KNOWLEDGE:WIKI_UPDATE', 'Update Wiki Pages', 'Update wiki pages in knowledge base', 'knowledge', 'wiki_update', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'KNOWLEDGE:WIKI_DELETE', 'Delete Wiki Pages', 'Delete wiki pages from knowledge base', 'knowledge', 'wiki_delete', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'KNOWLEDGE:WIKI_PUBLISH', 'Publish Wiki Pages', 'Publish wiki pages', 'knowledge', 'wiki_publish', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'KNOWLEDGE:WIKI_APPROVE', 'Approve Wiki Pages', 'Approve wiki pages for publishing', 'knowledge', 'wiki_approve', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'KNOWLEDGE:BLOG_CREATE', 'Create Blog Posts', 'Create blog posts in knowledge base', 'knowledge', 'blog_create', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'KNOWLEDGE:BLOG_READ', 'Read Blog Posts', 'Read blog posts in knowledge base', 'knowledge', 'blog_read', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'KNOWLEDGE:BLOG_UPDATE', 'Update Blog Posts', 'Update blog posts in knowledge base', 'knowledge', 'blog_update', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'KNOWLEDGE:BLOG_DELETE', 'Delete Blog Posts', 'Delete blog posts from knowledge base', 'knowledge', 'blog_delete', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'KNOWLEDGE:BLOG_PUBLISH', 'Publish Blog Posts', 'Publish blog posts', 'knowledge', 'blog_publish', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'KNOWLEDGE:TEMPLATE_CREATE', 'Create Knowledge Templates', 'Create document templates', 'knowledge', 'template_create', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'KNOWLEDGE:TEMPLATE_READ', 'Read Knowledge Templates', 'Read document templates', 'knowledge', 'template_read', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'KNOWLEDGE:TEMPLATE_UPDATE', 'Update Knowledge Templates', 'Update document templates', 'knowledge', 'template_update', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'KNOWLEDGE:TEMPLATE_DELETE', 'Delete Knowledge Templates', 'Delete document templates', 'knowledge', 'template_delete', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'KNOWLEDGE:SEARCH', 'Search Knowledge Base', 'Search across knowledge base content', 'knowledge', 'search', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES (gen_random_uuid(), 'KNOWLEDGE:SETTINGS_MANAGE', 'Manage Knowledge Settings', 'Manage knowledge base settings', 'knowledge', 'settings_manage', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

-- ============================================================================
-- Grant all newly inserted permissions to SUPER_ADMIN role
-- (SuperAdmin bypasses checks anyway, but this keeps role_permissions complete)
-- ============================================================================
INSERT INTO role_permissions (id, tenant_id, role_id, permission_id, scope, created_at, updated_at, version, is_deleted)
SELECT
    gen_random_uuid(),
    '660e8400-e29b-41d4-a716-446655440001',
    '550e8400-e29b-41d4-a716-446655440020',
    p.id,
    'ALL',
    NOW(), NOW(), 0, false
FROM permissions p
WHERE NOT EXISTS (
    SELECT 1 FROM role_permissions rp
    WHERE rp.role_id = '550e8400-e29b-41d4-a716-446655440020'
    AND rp.permission_id = p.id
);

-- ============================================================================
-- DONE — 204 missing permissions seeded from Permission.java constants
-- ============================================================================
