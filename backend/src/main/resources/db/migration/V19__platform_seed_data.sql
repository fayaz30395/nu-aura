-- ============================================================================
-- V19: Platform Seed Data
-- Creates the default tenant, SuperAdmin user, roles, permissions, and
-- the NU-HRMS application record. Idempotent via ON CONFLICT DO NOTHING.
-- ============================================================================

-- 1. TENANT (extends BaseEntity — NO tenant_id column)
INSERT INTO tenants (id, code, name, status, description, contact_email, contact_phone, settings, created_at,
                     updated_at, version, is_deleted)
VALUES ('660e8400-e29b-41d4-a716-446655440001',
        'nulogic',
        'NuLogic',
        'ACTIVE',
        'NuLogic - Primary tenant',
        'admin@nulogic.io',
        '+91-9876543210',
        '{}',
        NOW(), NOW(), 0, false) ON CONFLICT DO NOTHING;

-- 2. USERS (extends TenantAware — has tenant_id)
-- SuperAdmin 1: Sarankarthick Maran
INSERT INTO users (id, tenant_id, email, first_name, last_name, password_hash, status, failed_login_attempts,
                   mfa_enabled, created_at, updated_at, version, is_deleted)
VALUES ('550e8400-e29b-41d4-a716-446655440030',
        '660e8400-e29b-41d4-a716-446655440001',
        'sarankarthick.maran@nulogic.io',
        'Sarankarthick',
        'Maran',
        '',
        'ACTIVE',
        0,
        false,
        NOW(), NOW(), 0, false) ON CONFLICT DO NOTHING;

-- SuperAdmin 2: Fayaz M
INSERT INTO users (id, tenant_id, email, first_name, last_name, password_hash, status, failed_login_attempts,
                   mfa_enabled, created_at, updated_at, version, is_deleted)
VALUES ('550e8400-e29b-41d4-a716-446655440031',
        '660e8400-e29b-41d4-a716-446655440001',
        'fayaz.m@nulogic.io',
        'Fayaz',
        'M',
        '',
        'ACTIVE',
        0,
        false,
        NOW(), NOW(), 0, false) ON CONFLICT DO NOTHING;

-- 3. ROLE — SUPER_ADMIN
INSERT INTO roles (id, tenant_id, code, name, description, is_system_role, created_at, updated_at, version, is_deleted)
VALUES ('550e8400-e29b-41d4-a716-446655440020',
        '660e8400-e29b-41d4-a716-446655440001',
        'SUPER_ADMIN',
        'Super Administrator',
        'Full system access - bypasses all RBAC checks',
        true,
        NOW(), NOW(), 0, false) ON CONFLICT DO NOTHING;

-- 4. USER-ROLE JUNCTION
-- Grant SUPER_ADMIN role to both SuperAdmin users
INSERT INTO user_roles (user_id, role_id)
VALUES ('550e8400-e29b-41d4-a716-446655440030',
        '550e8400-e29b-41d4-a716-446655440020') ON CONFLICT DO NOTHING;

INSERT INTO user_roles (user_id, role_id)
VALUES ('550e8400-e29b-41d4-a716-446655440031',
        '550e8400-e29b-41d4-a716-446655440020') ON CONFLICT DO NOTHING;

-- 5. EMPLOYEES linked to SuperAdmin users
-- Employee for Sarankarthick Maran (SuperAdmin 1)
INSERT INTO employees (id, tenant_id, employee_code, user_id, first_name, last_name, personal_email, joining_date,
                       designation, level, job_role, employment_type, status, created_at, updated_at, version,
                       is_deleted)
VALUES ('550e8400-e29b-41d4-a716-446655440040',
        '660e8400-e29b-41d4-a716-446655440001',
        'EMP-0001',
        '550e8400-e29b-41d4-a716-446655440030',
        'Sarankarthick',
        'Maran',
        'sarankarthick.maran@nulogic.io',
        CURRENT_DATE,
        'System Administrator',
        'CXO',
        'EXECUTIVE',
        'FULL_TIME',
        'ACTIVE',
        NOW(), NOW(), 0, false) ON CONFLICT DO NOTHING;

-- Employee for Fayaz M (SuperAdmin 2)
INSERT INTO employees (id, tenant_id, employee_code, user_id, first_name, last_name, personal_email, joining_date,
                       designation, level, job_role, employment_type, status, created_at, updated_at, version,
                       is_deleted)
VALUES ('550e8400-e29b-41d4-a716-446655440041',
        '660e8400-e29b-41d4-a716-446655440001',
        'EMP-0001A',
        '550e8400-e29b-41d4-a716-446655440031',
        'Fayaz',
        'M',
        'fayaz.m@nulogic.io',
        CURRENT_DATE,
        'System Administrator',
        'CXO',
        'EXECUTIVE',
        'FULL_TIME',
        'ACTIVE',
        NOW(), NOW(), 0, false) ON CONFLICT DO NOTHING;

-- 6. NU-AURA Platform Applications (individual inserts to handle multiple unique constraints)
INSERT INTO nu_applications (id, code, name, description, icon_url, base_url, api_base_path, status, display_order,
                             is_system_app, app_version, created_at, updated_at, version, is_deleted)
VALUES ('550e8400-e29b-41d4-a716-446655440010', 'HRMS', 'NU-HRMS', 'Human Resource Management System',
        '/assets/icons/hrms.svg', 'http://localhost:3000', '/api/v1', 'ACTIVE', 1, true, '1.0.0', NOW(), NOW(), 0,
        false) ON CONFLICT DO NOTHING;

INSERT INTO nu_applications (id, code, name, description, icon_url, base_url, api_base_path, status, display_order,
                             is_system_app, app_version, created_at, updated_at, version, is_deleted)
VALUES ('550e8400-e29b-41d4-a716-446655440011', 'HIRE', 'NU-Hire', 'Recruitment & Onboarding Platform',
        '/assets/icons/hire.svg', 'http://localhost:3000', '/api/v1', 'ACTIVE', 2, true, '1.0.0', NOW(), NOW(), 0,
        false) ON CONFLICT DO NOTHING;

INSERT INTO nu_applications (id, code, name, description, icon_url, base_url, api_base_path, status, display_order,
                             is_system_app, app_version, created_at, updated_at, version, is_deleted)
VALUES ('550e8400-e29b-41d4-a716-446655440012', 'GROW', 'NU-Grow', 'Performance, Learning & Engagement',
        '/assets/icons/grow.svg', 'http://localhost:3000', '/api/v1', 'ACTIVE', 3, true, '1.0.0', NOW(), NOW(), 0,
        false) ON CONFLICT DO NOTHING;

INSERT INTO nu_applications (id, code, name, description, icon_url, base_url, api_base_path, status, display_order,
                             is_system_app, app_version, created_at, updated_at, version, is_deleted)
VALUES ('550e8400-e29b-41d4-a716-446655440013', 'FLUENCE', 'NU-Fluence', 'Knowledge Management & Collaboration',
        '/assets/icons/fluence.svg', 'http://localhost:3000', '/api/v1', 'ACTIVE', 4, true, '1.0.0', NOW(), NOW(), 0,
        false) ON CONFLICT DO NOTHING;

-- 7. CORE PERMISSIONS (individual inserts for idempotency across multiple unique constraints)
INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES ('660e8401-0001-0001-0001-000000000001', 'employee.read', 'View Employees', 'View employee profiles', 'employee',
        'read', NOW(), NOW(), 0, false) ON CONFLICT DO NOTHING;
INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES ('660e8401-0001-0001-0001-000000000002', 'employee.create', 'Create Employees', 'Add new employees', 'employee',
        'create', NOW(), NOW(), 0, false) ON CONFLICT DO NOTHING;
INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES ('660e8401-0001-0001-0001-000000000003', 'employee.update', 'Update Employees', 'Modify employee info',
        'employee', 'update', NOW(), NOW(), 0, false) ON CONFLICT DO NOTHING;
INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES ('660e8401-0001-0001-0001-000000000004', 'employee.delete', 'Delete Employees', 'Remove employees', 'employee',
        'delete', NOW(), NOW(), 0, false) ON CONFLICT DO NOTHING;
INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES ('660e8401-0001-0001-0001-000000000011', 'department.read', 'View Departments', 'View departments', 'department',
        'read', NOW(), NOW(), 0, false) ON CONFLICT DO NOTHING;
INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES ('660e8401-0001-0001-0001-000000000012', 'department.create', 'Create Departments', 'Create departments',
        'department', 'create', NOW(), NOW(), 0, false) ON CONFLICT DO NOTHING;
INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES ('660e8401-0001-0001-0001-000000000013', 'department.update', 'Update Departments', 'Modify departments',
        'department', 'update', NOW(), NOW(), 0, false) ON CONFLICT DO NOTHING;
INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES ('660e8401-0001-0001-0001-000000000014', 'department.delete', 'Delete Departments', 'Remove departments',
        'department', 'delete', NOW(), NOW(), 0, false) ON CONFLICT DO NOTHING;
INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES ('660e8401-0001-0001-0001-000000000021', 'attendance.read', 'View Attendance', 'View attendance', 'attendance',
        'read', NOW(), NOW(), 0, false) ON CONFLICT DO NOTHING;
INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES ('660e8401-0001-0001-0001-000000000022', 'attendance.manage', 'Manage Attendance', 'Manage attendance',
        'attendance', 'manage', NOW(), NOW(), 0, false) ON CONFLICT DO NOTHING;
INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES ('660e8401-0001-0001-0001-000000000031', 'leave.read', 'View Leave', 'View leave info', 'leave', 'read', NOW(),
        NOW(), 0, false) ON CONFLICT DO NOTHING;
INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES ('660e8401-0001-0001-0001-000000000032', 'leave.request', 'Request Leave', 'Apply for leave', 'leave', 'request',
        NOW(), NOW(), 0, false) ON CONFLICT DO NOTHING;
INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES ('660e8401-0001-0001-0001-000000000033', 'leave.approve', 'Approve Leave', 'Approve leave', 'leave', 'approve',
        NOW(), NOW(), 0, false) ON CONFLICT DO NOTHING;
INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES ('660e8401-0001-0001-0001-000000000034', 'leave.manage', 'Manage Leave', 'Full leave management', 'leave',
        'manage', NOW(), NOW(), 0, false) ON CONFLICT DO NOTHING;
INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES ('660e8401-0001-0001-0001-000000000041', 'payroll.read', 'View Payroll', 'View payroll', 'payroll', 'read',
        NOW(), NOW(), 0, false) ON CONFLICT DO NOTHING;
INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES ('660e8401-0001-0001-0001-000000000042', 'payroll.manage', 'Manage Payroll', 'Manage payroll', 'payroll',
        'manage', NOW(), NOW(), 0, false) ON CONFLICT DO NOTHING;
INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES ('660e8401-0001-0001-0001-000000000051', 'performance.read', 'View Performance', 'View performance',
        'performance', 'read', NOW(), NOW(), 0, false) ON CONFLICT DO NOTHING;
INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES ('660e8401-0001-0001-0001-000000000052', 'performance.manage', 'Manage Performance', 'Manage performance',
        'performance', 'manage', NOW(), NOW(), 0, false) ON CONFLICT DO NOTHING;
INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES ('660e8401-0001-0001-0001-000000000061', 'recruitment.read', 'View Recruitment', 'View recruitment',
        'recruitment', 'read', NOW(), NOW(), 0, false) ON CONFLICT DO NOTHING;
INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES ('660e8401-0001-0001-0001-000000000062', 'recruitment.manage', 'Manage Recruitment', 'Manage recruitment',
        'recruitment', 'manage', NOW(), NOW(), 0, false) ON CONFLICT DO NOTHING;
INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES ('660e8401-0001-0001-0001-000000000071', 'report.view', 'View Reports', 'View reports', 'report', 'view', NOW(),
        NOW(), 0, false) ON CONFLICT DO NOTHING;
INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES ('660e8401-0001-0001-0001-000000000072', 'report.manage', 'Manage Reports', 'Manage reports', 'report', 'manage',
        NOW(), NOW(), 0, false) ON CONFLICT DO NOTHING;
INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES ('660e8401-0001-0001-0001-000000000081', 'settings.read', 'View Settings', 'View settings', 'settings', 'read',
        NOW(), NOW(), 0, false) ON CONFLICT DO NOTHING;
INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES ('660e8401-0001-0001-0001-000000000082', 'settings.manage', 'Manage Settings', 'Manage settings', 'settings',
        'manage', NOW(), NOW(), 0, false) ON CONFLICT DO NOTHING;
INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES ('660e8401-0001-0001-0001-000000000091', 'role.read', 'View Roles', 'View roles', 'role', 'read', NOW(), NOW(),
        0, false) ON CONFLICT DO NOTHING;
INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES ('660e8401-0001-0001-0001-000000000092', 'role.manage', 'Manage Roles', 'Manage roles', 'role', 'manage', NOW(),
        NOW(), 0, false) ON CONFLICT DO NOTHING;
INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES ('660e8401-0001-0001-0001-000000000093', 'user.read', 'View Users', 'View users', 'user', 'read', NOW(), NOW(),
        0, false) ON CONFLICT DO NOTHING;
INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES ('660e8401-0001-0001-0001-000000000094', 'user.manage', 'Manage Users', 'Manage users', 'user', 'manage', NOW(),
        NOW(), 0, false) ON CONFLICT DO NOTHING;
INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES ('660e8401-0001-0001-0001-000000000101', 'project.view', 'View Projects', 'View projects', 'project', 'view',
        NOW(), NOW(), 0, false) ON CONFLICT DO NOTHING;
INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES ('660e8401-0001-0001-0001-000000000102', 'project.manage', 'Manage Projects', 'Manage projects', 'project',
        'manage', NOW(), NOW(), 0, false) ON CONFLICT DO NOTHING;
INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES ('660e8401-0001-0001-0001-000000000111', 'announcement.read', 'View Announcements', 'View announcements',
        'announcement', 'read', NOW(), NOW(), 0, false) ON CONFLICT DO NOTHING;
INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES ('660e8401-0001-0001-0001-000000000112', 'announcement.manage', 'Manage Announcements', 'Manage announcements',
        'announcement', 'manage', NOW(), NOW(), 0, false) ON CONFLICT DO NOTHING;
INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES ('660e8401-0001-0001-0001-000000000999', 'system.admin', 'System Admin', 'Full system admin', 'system', 'admin',
        NOW(), NOW(), 0, false) ON CONFLICT DO NOTHING;
INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES ('660e8401-0001-0001-0001-000000000201', 'knowledge.wiki.read', 'View Wiki', 'View wiki pages', 'knowledge',
        'wiki.read', NOW(), NOW(), 0, false) ON CONFLICT DO NOTHING;
INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES ('660e8401-0001-0001-0001-000000000202', 'knowledge.wiki.manage', 'Manage Wiki', 'Create/edit wiki pages',
        'knowledge', 'wiki.manage', NOW(), NOW(), 0, false) ON CONFLICT DO NOTHING;
INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES ('660e8401-0001-0001-0001-000000000203', 'knowledge.blog.read', 'View Blogs', 'View blog posts', 'knowledge',
        'blog.read', NOW(), NOW(), 0, false) ON CONFLICT DO NOTHING;
INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES ('660e8401-0001-0001-0001-000000000204', 'knowledge.blog.manage', 'Manage Blogs', 'Create/edit blog posts',
        'knowledge', 'blog.manage', NOW(), NOW(), 0, false) ON CONFLICT DO NOTHING;
INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES ('660e8401-0001-0001-0001-000000000205', 'knowledge.template.manage', 'Manage Templates', 'Manage doc templates',
        'knowledge', 'template.manage', NOW(), NOW(), 0, false) ON CONFLICT DO NOTHING;
INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES ('660e8401-0001-0001-0001-000000000301', 'contract.read', 'View Contracts', 'View contracts', 'contract', 'read',
        NOW(), NOW(), 0, false) ON CONFLICT DO NOTHING;
INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES ('660e8401-0001-0001-0001-000000000302', 'contract.manage', 'Manage Contracts', 'Create/edit contracts',
        'contract', 'manage', NOW(), NOW(), 0, false) ON CONFLICT DO NOTHING;
INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES ('660e8401-0001-0001-0001-000000000401', 'payment.view', 'View Payments', 'View payments', 'payment', 'view',
        NOW(), NOW(), 0, false) ON CONFLICT DO NOTHING;
INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES ('660e8401-0001-0001-0001-000000000402', 'payment.initiate', 'Initiate Payments', 'Initiate payments', 'payment',
        'initiate', NOW(), NOW(), 0, false) ON CONFLICT DO NOTHING;
INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES ('660e8401-0001-0001-0001-000000000403', 'payment.refund', 'Process Refunds', 'Process payment refunds',
        'payment', 'refund', NOW(), NOW(), 0, false) ON CONFLICT DO NOTHING;
INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES ('660e8401-0001-0001-0001-000000000404', 'payment.config', 'Manage Payment Config', 'Manage payment settings',
        'payment', 'config', NOW(), NOW(), 0, false) ON CONFLICT DO NOTHING;

-- 8. ROLE_PERMISSIONS — grant ALL permissions to SUPER_ADMIN
INSERT INTO role_permissions (id, tenant_id, role_id, permission_id, scope, created_at, updated_at, version, is_deleted)
SELECT gen_random_uuid(),
       '660e8400-e29b-41d4-a716-446655440001',
       '550e8400-e29b-41d4-a716-446655440020',
       p.id,
       'ALL',
       NOW(),
       NOW(),
       0,
       false
FROM permissions p
WHERE NOT EXISTS (SELECT 1
                  FROM role_permissions rp
                  WHERE rp.role_id = '550e8400-e29b-41d4-a716-446655440020'
                    AND rp.permission_id = p.id);

-- 9. Default HR_ADMIN role
INSERT INTO roles (id, tenant_id, code, name, description, is_system_role, created_at, updated_at, version, is_deleted)
VALUES ('550e8400-e29b-41d4-a716-446655440021',
        '660e8400-e29b-41d4-a716-446655440001',
        'HR_ADMIN',
        'HR Administrator',
        'Full HR module access',
        true,
        NOW(), NOW(), 0, false) ON CONFLICT DO NOTHING;

-- 10. Default MANAGER role
INSERT INTO roles (id, tenant_id, code, name, description, is_system_role, created_at, updated_at, version, is_deleted)
VALUES ('550e8400-e29b-41d4-a716-446655440022',
        '660e8400-e29b-41d4-a716-446655440001',
        'MANAGER',
        'Manager',
        'Team management access',
        true,
        NOW(), NOW(), 0, false) ON CONFLICT DO NOTHING;

-- 11. Default EMPLOYEE role
INSERT INTO roles (id, tenant_id, code, name, description, is_system_role, created_at, updated_at, version, is_deleted)
VALUES ('550e8400-e29b-41d4-a716-446655440023',
        '660e8400-e29b-41d4-a716-446655440001',
        'EMPLOYEE',
        'Employee',
        'Basic employee self-service access',
        true,
        NOW(), NOW(), 0, false) ON CONFLICT DO NOTHING;

-- ============================================================================
-- DONE — Platform seed data loaded
-- ============================================================================
