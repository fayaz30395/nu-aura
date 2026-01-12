--liquibase formatted sql

--changeset hrms:086-01
--comment: Create nu_applications table - core table for NU Platform multi-app support
CREATE TABLE nu_applications (
    id UUID PRIMARY KEY,
    code VARCHAR(20) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    description VARCHAR(1000),
    icon_url VARCHAR(200),
    base_url VARCHAR(200),
    api_base_path VARCHAR(100),
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    display_order INTEGER DEFAULT 0,
    is_system_app BOOLEAN NOT NULL DEFAULT FALSE,
    app_version VARCHAR(20),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0
);

CREATE INDEX idx_nu_app_code ON nu_applications(code);
CREATE INDEX idx_nu_app_status ON nu_applications(status);

--changeset hrms:086-02
--comment: Create app_permissions table - application-specific permissions
CREATE TABLE app_permissions (
    id UUID PRIMARY KEY,
    application_id UUID NOT NULL,
    code VARCHAR(100) NOT NULL UNIQUE,
    module VARCHAR(50) NOT NULL,
    action VARCHAR(30) NOT NULL,
    name VARCHAR(100) NOT NULL,
    description VARCHAR(500),
    category VARCHAR(50),
    is_system_permission BOOLEAN NOT NULL DEFAULT FALSE,
    display_order INTEGER DEFAULT 0,
    depends_on VARCHAR(500),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    CONSTRAINT fk_app_perm_app FOREIGN KEY (application_id) REFERENCES nu_applications(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX idx_app_perm_code ON app_permissions(code);
CREATE INDEX idx_app_perm_app ON app_permissions(application_id);
CREATE INDEX idx_app_perm_module ON app_permissions(module);
CREATE INDEX idx_app_perm_action ON app_permissions(action);

--changeset hrms:086-03
--comment: Create app_roles table - application-specific roles (tenant-aware)
CREATE TABLE app_roles (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    application_id UUID NOT NULL,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    description VARCHAR(500),
    level INTEGER NOT NULL DEFAULT 0,
    is_system_role BOOLEAN NOT NULL DEFAULT FALSE,
    is_default_role BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    CONSTRAINT fk_app_role_app FOREIGN KEY (application_id) REFERENCES nu_applications(id) ON DELETE CASCADE,
    CONSTRAINT fk_app_role_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    CONSTRAINT uk_app_role_code_tenant_app UNIQUE (code, tenant_id, application_id)
);

CREATE INDEX idx_app_role_tenant ON app_roles(tenant_id);
CREATE INDEX idx_app_role_app ON app_roles(application_id);
CREATE INDEX idx_app_role_code ON app_roles(code);

--changeset hrms:086-04
--comment: Create app_role_permissions join table
CREATE TABLE app_role_permissions (
    role_id UUID NOT NULL,
    permission_id UUID NOT NULL,
    PRIMARY KEY (role_id, permission_id),
    CONSTRAINT fk_arp_role FOREIGN KEY (role_id) REFERENCES app_roles(id) ON DELETE CASCADE,
    CONSTRAINT fk_arp_perm FOREIGN KEY (permission_id) REFERENCES app_permissions(id) ON DELETE CASCADE
);

CREATE INDEX idx_app_role_perm_role ON app_role_permissions(role_id);
CREATE INDEX idx_app_role_perm_perm ON app_role_permissions(permission_id);

--changeset hrms:086-05
--comment: Create user_app_access table - user access to applications (tenant-aware)
CREATE TABLE user_app_access (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    user_id UUID NOT NULL,
    application_id UUID NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    granted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    granted_by UUID,
    last_accessed_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    CONSTRAINT fk_uaa_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_uaa_app FOREIGN KEY (application_id) REFERENCES nu_applications(id) ON DELETE CASCADE,
    CONSTRAINT fk_uaa_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    CONSTRAINT uk_user_app_access UNIQUE (user_id, application_id)
);

CREATE INDEX idx_user_app_user ON user_app_access(user_id);
CREATE INDEX idx_user_app_app ON user_app_access(application_id);
CREATE INDEX idx_user_app_tenant ON user_app_access(tenant_id);
CREATE INDEX idx_user_app_status ON user_app_access(status);

--changeset hrms:086-06
--comment: Create user_app_roles join table
CREATE TABLE user_app_roles (
    user_app_access_id UUID NOT NULL,
    role_id UUID NOT NULL,
    PRIMARY KEY (user_app_access_id, role_id),
    CONSTRAINT fk_uar_access FOREIGN KEY (user_app_access_id) REFERENCES user_app_access(id) ON DELETE CASCADE,
    CONSTRAINT fk_uar_role FOREIGN KEY (role_id) REFERENCES app_roles(id) ON DELETE CASCADE
);

CREATE INDEX idx_user_app_roles_access ON user_app_roles(user_app_access_id);
CREATE INDEX idx_user_app_roles_role ON user_app_roles(role_id);

--changeset hrms:086-07
--comment: Create user_app_direct_permissions join table
CREATE TABLE user_app_direct_permissions (
    user_app_access_id UUID NOT NULL,
    permission_id UUID NOT NULL,
    PRIMARY KEY (user_app_access_id, permission_id),
    CONSTRAINT fk_uadp_access FOREIGN KEY (user_app_access_id) REFERENCES user_app_access(id) ON DELETE CASCADE,
    CONSTRAINT fk_uadp_perm FOREIGN KEY (permission_id) REFERENCES app_permissions(id) ON DELETE CASCADE
);

CREATE INDEX idx_user_app_direct_perm_access ON user_app_direct_permissions(user_app_access_id);
CREATE INDEX idx_user_app_direct_perm_perm ON user_app_direct_permissions(permission_id);

--changeset hrms:086-08
--comment: Create tenant_applications table - tenant subscription to applications
CREATE TABLE tenant_applications (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    application_id UUID NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    activated_at TIMESTAMP,
    expires_at DATE,
    subscription_tier VARCHAR(50),
    max_users INTEGER,
    configuration TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    CONSTRAINT fk_ta_app FOREIGN KEY (application_id) REFERENCES nu_applications(id) ON DELETE CASCADE,
    CONSTRAINT fk_ta_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    CONSTRAINT uk_tenant_app UNIQUE (tenant_id, application_id)
);

CREATE INDEX idx_tenant_app_tenant ON tenant_applications(tenant_id);
CREATE INDEX idx_tenant_app_app ON tenant_applications(application_id);
CREATE INDEX idx_tenant_app_status ON tenant_applications(status);

--changeset hrms:086-09
--comment: Seed default HRMS application
INSERT INTO nu_applications (id, code, name, description, icon_url, base_url, api_base_path, status, display_order, is_system_app, app_version, created_at, updated_at, version)
VALUES (
    '550e8400-e29b-41d4-a716-446655440001',
    'HRMS',
    'NU-HRMS',
    'Human Resource Management System - Core HR, Payroll, Attendance, Leave Management',
    'Users',
    'http://localhost:3000',
    '/api/v1',
    'ACTIVE',
    1,
    TRUE,
    '1.0.0',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP,
    0
);

--changeset hrms:086-10
--comment: Link default tenant to HRMS application
INSERT INTO tenant_applications (id, tenant_id, application_id, status, activated_at, subscription_tier, created_at, updated_at, version)
SELECT
    gen_random_uuid(),
    t.id,
    '550e8400-e29b-41d4-a716-446655440001',
    'ACTIVE',
    CURRENT_TIMESTAMP,
    'ENTERPRISE',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP,
    0
FROM tenants t
WHERE NOT EXISTS (
    SELECT 1 FROM tenant_applications ta
    WHERE ta.tenant_id = t.id AND ta.application_id = '550e8400-e29b-41d4-a716-446655440001'
);

--changeset hrms:086-11
--comment: Create HRMS permissions for existing modules
INSERT INTO app_permissions (id, application_id, code, module, action, name, description, category, is_system_permission, display_order, created_at, updated_at, version)
SELECT gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440001', 'HRMS:EMPLOYEE:READ', 'EMPLOYEE', 'READ', 'View Employees', 'View employee information', 'Core HR', TRUE, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0
WHERE NOT EXISTS (SELECT 1 FROM app_permissions WHERE code = 'HRMS:EMPLOYEE:READ');

INSERT INTO app_permissions (id, application_id, code, module, action, name, description, category, is_system_permission, display_order, created_at, updated_at, version)
SELECT gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440001', 'HRMS:EMPLOYEE:CREATE', 'EMPLOYEE', 'CREATE', 'Create Employees', 'Create new employees', 'Core HR', TRUE, 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0
WHERE NOT EXISTS (SELECT 1 FROM app_permissions WHERE code = 'HRMS:EMPLOYEE:CREATE');

INSERT INTO app_permissions (id, application_id, code, module, action, name, description, category, is_system_permission, display_order, created_at, updated_at, version)
SELECT gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440001', 'HRMS:EMPLOYEE:UPDATE', 'EMPLOYEE', 'UPDATE', 'Update Employees', 'Update employee information', 'Core HR', TRUE, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0
WHERE NOT EXISTS (SELECT 1 FROM app_permissions WHERE code = 'HRMS:EMPLOYEE:UPDATE');

INSERT INTO app_permissions (id, application_id, code, module, action, name, description, category, is_system_permission, display_order, created_at, updated_at, version)
SELECT gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440001', 'HRMS:EMPLOYEE:DELETE', 'EMPLOYEE', 'DELETE', 'Delete Employees', 'Delete employees', 'Core HR', TRUE, 4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0
WHERE NOT EXISTS (SELECT 1 FROM app_permissions WHERE code = 'HRMS:EMPLOYEE:DELETE');

INSERT INTO app_permissions (id, application_id, code, module, action, name, description, category, is_system_permission, display_order, created_at, updated_at, version)
SELECT gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440001', 'HRMS:LEAVE:READ', 'LEAVE', 'READ', 'View Leave', 'View leave requests', 'Leave Management', TRUE, 10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0
WHERE NOT EXISTS (SELECT 1 FROM app_permissions WHERE code = 'HRMS:LEAVE:READ');

INSERT INTO app_permissions (id, application_id, code, module, action, name, description, category, is_system_permission, display_order, created_at, updated_at, version)
SELECT gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440001', 'HRMS:LEAVE:CREATE', 'LEAVE', 'CREATE', 'Apply Leave', 'Create leave requests', 'Leave Management', TRUE, 11, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0
WHERE NOT EXISTS (SELECT 1 FROM app_permissions WHERE code = 'HRMS:LEAVE:CREATE');

INSERT INTO app_permissions (id, application_id, code, module, action, name, description, category, is_system_permission, display_order, created_at, updated_at, version)
SELECT gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440001', 'HRMS:LEAVE:APPROVE', 'LEAVE', 'APPROVE', 'Approve Leave', 'Approve or reject leave requests', 'Leave Management', TRUE, 12, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0
WHERE NOT EXISTS (SELECT 1 FROM app_permissions WHERE code = 'HRMS:LEAVE:APPROVE');

INSERT INTO app_permissions (id, application_id, code, module, action, name, description, category, is_system_permission, display_order, created_at, updated_at, version)
SELECT gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440001', 'HRMS:ATTENDANCE:READ', 'ATTENDANCE', 'READ', 'View Attendance', 'View attendance records', 'Attendance', TRUE, 20, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0
WHERE NOT EXISTS (SELECT 1 FROM app_permissions WHERE code = 'HRMS:ATTENDANCE:READ');

INSERT INTO app_permissions (id, application_id, code, module, action, name, description, category, is_system_permission, display_order, created_at, updated_at, version)
SELECT gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440001', 'HRMS:ATTENDANCE:MANAGE', 'ATTENDANCE', 'MANAGE', 'Manage Attendance', 'Manage attendance records', 'Attendance', TRUE, 21, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0
WHERE NOT EXISTS (SELECT 1 FROM app_permissions WHERE code = 'HRMS:ATTENDANCE:MANAGE');

INSERT INTO app_permissions (id, application_id, code, module, action, name, description, category, is_system_permission, display_order, created_at, updated_at, version)
SELECT gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440001', 'HRMS:PAYROLL:READ', 'PAYROLL', 'READ', 'View Payroll', 'View payroll information', 'Payroll', TRUE, 30, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0
WHERE NOT EXISTS (SELECT 1 FROM app_permissions WHERE code = 'HRMS:PAYROLL:READ');

INSERT INTO app_permissions (id, application_id, code, module, action, name, description, category, is_system_permission, display_order, created_at, updated_at, version)
SELECT gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440001', 'HRMS:PAYROLL:MANAGE', 'PAYROLL', 'MANAGE', 'Manage Payroll', 'Manage payroll runs and settings', 'Payroll', TRUE, 31, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0
WHERE NOT EXISTS (SELECT 1 FROM app_permissions WHERE code = 'HRMS:PAYROLL:MANAGE');

INSERT INTO app_permissions (id, application_id, code, module, action, name, description, category, is_system_permission, display_order, created_at, updated_at, version)
SELECT gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440001', 'HRMS:REPORT:VIEW', 'REPORT', 'VIEW', 'View Reports', 'View HR reports and analytics', 'Reports', TRUE, 40, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0
WHERE NOT EXISTS (SELECT 1 FROM app_permissions WHERE code = 'HRMS:REPORT:VIEW');

INSERT INTO app_permissions (id, application_id, code, module, action, name, description, category, is_system_permission, display_order, created_at, updated_at, version)
SELECT gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440001', 'HRMS:SYSTEM:ADMIN', 'SYSTEM', 'ADMIN', 'System Administration', 'Full system administration access', 'Administration', TRUE, 100, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0
WHERE NOT EXISTS (SELECT 1 FROM app_permissions WHERE code = 'HRMS:SYSTEM:ADMIN');

--changeset hrms:086-12
--comment: Create default HRMS roles for each tenant
INSERT INTO app_roles (id, tenant_id, application_id, code, name, description, level, is_system_role, is_default_role, created_at, updated_at, version)
SELECT
    gen_random_uuid(),
    t.id,
    '550e8400-e29b-41d4-a716-446655440001',
    'SUPER_ADMIN',
    'Super Administrator',
    'Full access to all HRMS features',
    100,
    TRUE,
    FALSE,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP,
    0
FROM tenants t
WHERE NOT EXISTS (
    SELECT 1 FROM app_roles ar
    WHERE ar.tenant_id = t.id AND ar.application_id = '550e8400-e29b-41d4-a716-446655440001' AND ar.code = 'SUPER_ADMIN'
);

INSERT INTO app_roles (id, tenant_id, application_id, code, name, description, level, is_system_role, is_default_role, created_at, updated_at, version)
SELECT
    gen_random_uuid(),
    t.id,
    '550e8400-e29b-41d4-a716-446655440001',
    'HR_MANAGER',
    'HR Manager',
    'Manage HR operations, employees, leave, and payroll',
    80,
    TRUE,
    FALSE,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP,
    0
FROM tenants t
WHERE NOT EXISTS (
    SELECT 1 FROM app_roles ar
    WHERE ar.tenant_id = t.id AND ar.application_id = '550e8400-e29b-41d4-a716-446655440001' AND ar.code = 'HR_MANAGER'
);

INSERT INTO app_roles (id, tenant_id, application_id, code, name, description, level, is_system_role, is_default_role, created_at, updated_at, version)
SELECT
    gen_random_uuid(),
    t.id,
    '550e8400-e29b-41d4-a716-446655440001',
    'EMPLOYEE',
    'Employee',
    'Basic employee self-service access',
    10,
    TRUE,
    TRUE,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP,
    0
FROM tenants t
WHERE NOT EXISTS (
    SELECT 1 FROM app_roles ar
    WHERE ar.tenant_id = t.id AND ar.application_id = '550e8400-e29b-41d4-a716-446655440001' AND ar.code = 'EMPLOYEE'
);

--changeset hrms:086-13
--comment: Assign all permissions to SUPER_ADMIN role
INSERT INTO app_role_permissions (role_id, permission_id)
SELECT ar.id, ap.id
FROM app_roles ar
CROSS JOIN app_permissions ap
WHERE ar.code = 'SUPER_ADMIN'
  AND ar.application_id = '550e8400-e29b-41d4-a716-446655440001'
  AND ap.application_id = '550e8400-e29b-41d4-a716-446655440001'
  AND NOT EXISTS (
    SELECT 1 FROM app_role_permissions arp
    WHERE arp.role_id = ar.id AND arp.permission_id = ap.id
  );

--changeset hrms:086-14
--comment: Assign HR permissions to HR_MANAGER role
INSERT INTO app_role_permissions (role_id, permission_id)
SELECT ar.id, ap.id
FROM app_roles ar
CROSS JOIN app_permissions ap
WHERE ar.code = 'HR_MANAGER'
  AND ar.application_id = '550e8400-e29b-41d4-a716-446655440001'
  AND ap.application_id = '550e8400-e29b-41d4-a716-446655440001'
  AND ap.code NOT LIKE '%:SYSTEM:%'
  AND NOT EXISTS (
    SELECT 1 FROM app_role_permissions arp
    WHERE arp.role_id = ar.id AND arp.permission_id = ap.id
  );

--changeset hrms:086-15
--comment: Assign basic permissions to EMPLOYEE role
INSERT INTO app_role_permissions (role_id, permission_id)
SELECT ar.id, ap.id
FROM app_roles ar
CROSS JOIN app_permissions ap
WHERE ar.code = 'EMPLOYEE'
  AND ar.application_id = '550e8400-e29b-41d4-a716-446655440001'
  AND ap.application_id = '550e8400-e29b-41d4-a716-446655440001'
  AND ap.code IN ('HRMS:LEAVE:READ', 'HRMS:LEAVE:CREATE', 'HRMS:ATTENDANCE:READ')
  AND NOT EXISTS (
    SELECT 1 FROM app_role_permissions arp
    WHERE arp.role_id = ar.id AND arp.permission_id = ap.id
  );

--changeset hrms:086-16
--comment: Grant admin users access to HRMS with SUPER_ADMIN role
INSERT INTO user_app_access (id, tenant_id, user_id, application_id, status, granted_at, created_at, updated_at, version)
SELECT
    gen_random_uuid(),
    u.tenant_id,
    u.id,
    '550e8400-e29b-41d4-a716-446655440001',
    'ACTIVE',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP,
    0
FROM users u
WHERE u.email LIKE '%admin%'
  AND NOT EXISTS (
    SELECT 1 FROM user_app_access uaa
    WHERE uaa.user_id = u.id AND uaa.application_id = '550e8400-e29b-41d4-a716-446655440001'
  );

--changeset hrms:086-17
--comment: Assign SUPER_ADMIN role to admin users
INSERT INTO user_app_roles (user_app_access_id, role_id)
SELECT uaa.id, ar.id
FROM user_app_access uaa
JOIN users u ON u.id = uaa.user_id
JOIN app_roles ar ON ar.tenant_id = uaa.tenant_id AND ar.application_id = uaa.application_id AND ar.code = 'SUPER_ADMIN'
WHERE u.email LIKE '%admin%'
  AND uaa.application_id = '550e8400-e29b-41d4-a716-446655440001'
  AND NOT EXISTS (
    SELECT 1 FROM user_app_roles uar
    WHERE uar.user_app_access_id = uaa.id AND uar.role_id = ar.id
  );
