-- Test data for integration tests

-- Insert basic permissions for testing
INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version)
VALUES ('00000000-0000-0000-0000-000000000001', 'EMPLOYEE:READ', 'Read Employee', 'View employee details', 'EMPLOYEE',
        'READ', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0),
       ('00000000-0000-0000-0000-000000000002', 'EMPLOYEE:CREATE', 'Create Employee', 'Create new employee', 'EMPLOYEE',
        'CREATE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0),
       ('00000000-0000-0000-0000-000000000003', 'EMPLOYEE:UPDATE', 'Update Employee', 'Update employee details',
        'EMPLOYEE', 'UPDATE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0),
       ('00000000-0000-0000-0000-000000000004', 'EMPLOYEE:DELETE', 'Delete Employee', 'Delete employee', 'EMPLOYEE',
        'DELETE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0),
       ('00000000-0000-0000-0000-000000000005', 'ROLE:MANAGE', 'Manage Roles', 'Manage roles and permissions', 'ROLE',
        'MANAGE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0),
       ('00000000-0000-0000-0000-000000000006', 'SYSTEM:ADMIN', 'System Admin', 'Full system access', 'SYSTEM', 'ADMIN',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0);
