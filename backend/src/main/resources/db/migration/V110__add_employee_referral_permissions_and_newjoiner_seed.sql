-- V110: Two fixes combined into one migration:
--
-- 1. Add REFERRAL:CREATE and REFERRAL:VIEW to EMPLOYEE role (BUG-QA3-006).
--    V107 repopulated role_permissions but omitted referral permissions for EMPLOYEE.
--    Per business logic, all employees should be able to submit and view their own referrals.
--
-- 2. Add a NEW_JOINER seed user for QA testing (BUG-QA3-004).
--    UC-RBAC-016 requires a new joiner account to validate role restriction tests.

-- ============================================================================
-- Part 1: REFERRAL permissions for EMPLOYEE role
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
                 'REFERRAL:CREATE',
                 'REFERRAL:VIEW'
  )
  AND p.is_deleted = false ON CONFLICT DO NOTHING;

-- ============================================================================
-- Part 2: New joiner seed user for QA (BUG-QA3-004)
-- ============================================================================

-- Insert new joiner user account
INSERT INTO users (id, tenant_id, email, first_name, last_name, password_hash, status,
                   mfa_enabled, failed_login_attempts,
                   created_at, updated_at, version, is_deleted)
VALUES ('aa000000-0000-0000-0000-000000000099',
        '660e8400-e29b-41d4-a716-446655440001',
        'newjoiner@nulogic.io',
        'New', 'Joiner',
        '$2a$12$XMYaVk5yNVtCKiuFM5m3rOpR.73IKHFykmuvWP3OWYi8cqRbK0VHG', -- Welcome@123
        'ACTIVE',
        false, 0,
        NOW(), NOW(), 0, false) ON CONFLICT DO NOTHING;

-- Insert employee profile for new joiner
INSERT INTO employees (id, tenant_id, employee_code, user_id, first_name, last_name,
                       personal_email, joining_date, designation, level, job_role,
                       employment_type, status, created_at, updated_at, version, is_deleted)
VALUES ('aa000000-0000-0000-0000-000000000098',
        '660e8400-e29b-41d4-a716-446655440001',
        'NL-QA-099',
        'aa000000-0000-0000-0000-000000000099',
        'New', 'Joiner',
        'newjoiner.personal@example.com',
        CURRENT_DATE,
        'New Joiner',
        'ENTRY',
        'OTHER',
        'FULL_TIME',
        'ACTIVE',
        NOW(), NOW(), 0, false) ON CONFLICT DO NOTHING;

-- Assign EMPLOYEE role to new joiner
INSERT INTO user_roles (user_id, role_id)
SELECT 'aa000000-0000-0000-0000-000000000099',
       r.id
FROM roles r
WHERE r.name = 'EMPLOYEE'
  AND r.tenant_id = '660e8400-e29b-41d4-a716-446655440001'
  AND r.is_deleted = false ON CONFLICT DO NOTHING;
