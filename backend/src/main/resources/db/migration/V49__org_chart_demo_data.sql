-- ============================================================================
-- V48: Org Chart Demo Data
-- Creates the organizational hierarchy as per the handwritten org chart:
--
-- Box 1 — Engineering:
--   Fayaz (CEO/SuperAdmin) ← already exists in V19
--     └─ Sumit (Manager)
--         ├─ Saran (Employee)
--         └─ Mani (Team Lead)
--             ├─ Raj (Employee)
--             └─ Gokul (Lead)
--                 └─ Anshuman (Employee)
--
-- Box 2 — HR:
--   Fayaz (CEO/SuperAdmin)
--     └─ Jagadeesh (HR Manager)
--         ├─ Suresh (Recruitment Lead)
--         │   ├─ Arun (HR - Recruitment)
--         │   └─ Bharath (HR - Recruitment)
--         └─ Dhanush (HR Lead)
--             ├─ Chitra (HR)
--             └─ Deepak (HR)
--
-- Tenant: NuLogic (660e8400-e29b-41d4-a716-446655440001)
-- Idempotent via ON CONFLICT DO NOTHING.
-- ============================================================================

-- ============================================================================
-- 1. DEPARTMENTS (Engineering & HR)
-- ============================================================================
INSERT INTO departments (id, tenant_id, name, code, type, is_active, created_at, updated_at, version, is_deleted)
VALUES ('48000000-de00-0000-0000-000000000001', '660e8400-e29b-41d4-a716-446655440001', 'Engineering', 'ENG',
        'ENGINEERING', true, NOW(), NOW(), 0, false) ON CONFLICT (id) DO NOTHING;

INSERT INTO departments (id, tenant_id, name, code, type, is_active, created_at, updated_at, version, is_deleted)
VALUES ('48000000-de00-0000-0000-000000000002', '660e8400-e29b-41d4-a716-446655440001', 'Human Resources', 'HR', 'HR',
        true, NOW(), NOW(), 0, false) ON CONFLICT (id) DO NOTHING;

-- HR sub-department: Recruitment (parent = HR)
INSERT INTO departments (id, tenant_id, name, code, type, parent_department_id, is_active, created_at, updated_at,
                         version, is_deleted)
VALUES ('48000000-de00-0000-0000-000000000003', '660e8400-e29b-41d4-a716-446655440001', 'Recruitment', 'HR-REC', 'HR',
        '48000000-de00-0000-0000-000000000002', true, NOW(), NOW(), 0, false) ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 2. ADDITIONAL ROLES (TEAM_LEAD, HR_MANAGER if not present)
-- ============================================================================
INSERT INTO roles (id, tenant_id, code, name, description, is_system_role, created_at, updated_at, version, is_deleted)
VALUES ('48000000-0e01-0000-0000-000000000001', '660e8400-e29b-41d4-a716-446655440001', 'TEAM_LEAD', 'Team Lead',
        'Team leadership and direct report management', true, NOW(), NOW(), 0, false) ON CONFLICT (id) DO NOTHING;

INSERT INTO roles (id, tenant_id, code, name, description, is_system_role, created_at, updated_at, version, is_deleted)
VALUES ('48000000-0e01-0000-0000-000000000002', '660e8400-e29b-41d4-a716-446655440001', 'HR_MANAGER', 'HR Manager',
        'HR department management and people operations', true, NOW(), NOW(), 0, false) ON CONFLICT (id) DO NOTHING;

INSERT INTO roles (id, tenant_id, code, name, description, is_system_role, created_at, updated_at, version, is_deleted)
VALUES ('48000000-0e01-0000-0000-000000000003', '660e8400-e29b-41d4-a716-446655440001', 'RECRUITMENT_ADMIN',
        'Recruitment Admin', 'Recruitment pipeline and hiring management', true, NOW(), NOW(), 0,
        false) ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 3. USERS (login accounts for each person)
-- Password hash = bcrypt of 'Welcome@123' for all demo users
-- ============================================================================

-- Sumit (Manager - Engineering)
INSERT INTO users (id, tenant_id, email, first_name, last_name, password_hash, status, failed_login_attempts,
                   mfa_enabled, created_at, updated_at, version, is_deleted)
VALUES ('48000000-0e02-0000-0000-000000000001', '660e8400-e29b-41d4-a716-446655440001', 'sumit@nulogic.io', 'Sumit',
        'Kumar', '$2a$10$D7mb1w2eljWfrBF3i8iZCu5A/H4mUXe8.3rHyWvgYy2j8eC3ghqD2', 'ACTIVE', 0, false, NOW(), NOW(), 0,
        false) ON CONFLICT (id) DO NOTHING;

-- Saran (Employee - Engineering)
INSERT INTO users (id, tenant_id, email, first_name, last_name, password_hash, status, failed_login_attempts,
                   mfa_enabled, created_at, updated_at, version, is_deleted)
VALUES ('48000000-0e02-0000-0000-000000000002', '660e8400-e29b-41d4-a716-446655440001', 'saran@nulogic.io', 'Saran',
        'V', '$2a$10$D7mb1w2eljWfrBF3i8iZCu5A/H4mUXe8.3rHyWvgYy2j8eC3ghqD2', 'ACTIVE', 0, false, NOW(), NOW(), 0,
        false) ON CONFLICT (id) DO NOTHING;

-- Mani (Team Lead - Engineering)
INSERT INTO users (id, tenant_id, email, first_name, last_name, password_hash, status, failed_login_attempts,
                   mfa_enabled, created_at, updated_at, version, is_deleted)
VALUES ('48000000-0e02-0000-0000-000000000003', '660e8400-e29b-41d4-a716-446655440001', 'mani@nulogic.io', 'Mani', 'S',
        '$2a$10$D7mb1w2eljWfrBF3i8iZCu5A/H4mUXe8.3rHyWvgYy2j8eC3ghqD2', 'ACTIVE', 0, false, NOW(), NOW(), 0,
        false) ON CONFLICT (id) DO NOTHING;

-- Raj (Employee - Engineering)
INSERT INTO users (id, tenant_id, email, first_name, last_name, password_hash, status, failed_login_attempts,
                   mfa_enabled, created_at, updated_at, version, is_deleted)
VALUES ('48000000-0e02-0000-0000-000000000004', '660e8400-e29b-41d4-a716-446655440001', 'raj@nulogic.io', 'Raj', 'P',
        '$2a$10$D7mb1w2eljWfrBF3i8iZCu5A/H4mUXe8.3rHyWvgYy2j8eC3ghqD2', 'ACTIVE', 0, false, NOW(), NOW(), 0,
        false) ON CONFLICT (id) DO NOTHING;

-- Gokul (Lead - Engineering)
INSERT INTO users (id, tenant_id, email, first_name, last_name, password_hash, status, failed_login_attempts,
                   mfa_enabled, created_at, updated_at, version, is_deleted)
VALUES ('48000000-0e02-0000-0000-000000000005', '660e8400-e29b-41d4-a716-446655440001', 'gokul@nulogic.io', 'Gokul',
        'R', '$2a$10$D7mb1w2eljWfrBF3i8iZCu5A/H4mUXe8.3rHyWvgYy2j8eC3ghqD2', 'ACTIVE', 0, false, NOW(), NOW(), 0,
        false) ON CONFLICT (id) DO NOTHING;

-- Anshuman (Employee - Engineering, reports to Gokul)
INSERT INTO users (id, tenant_id, email, first_name, last_name, password_hash, status, failed_login_attempts,
                   mfa_enabled, created_at, updated_at, version, is_deleted)
VALUES ('48000000-0e02-0000-0000-000000000006', '660e8400-e29b-41d4-a716-446655440001', 'anshuman@nulogic.io',
        'Anshuman', 'K', '$2a$10$D7mb1w2eljWfrBF3i8iZCu5A/H4mUXe8.3rHyWvgYy2j8eC3ghqD2', 'ACTIVE', 0, false, NOW(),
        NOW(), 0, false) ON CONFLICT (id) DO NOTHING;

-- Jagadeesh (HR Manager)
INSERT INTO users (id, tenant_id, email, first_name, last_name, password_hash, status, failed_login_attempts,
                   mfa_enabled, created_at, updated_at, version, is_deleted)
VALUES ('48000000-0e02-0000-0000-000000000007', '660e8400-e29b-41d4-a716-446655440001', 'jagadeesh@nulogic.io',
        'Jagadeesh', 'N', '$2a$10$D7mb1w2eljWfrBF3i8iZCu5A/H4mUXe8.3rHyWvgYy2j8eC3ghqD2', 'ACTIVE', 0, false, NOW(),
        NOW(), 0, false) ON CONFLICT (id) DO NOTHING;

-- Suresh (Recruitment Lead)
INSERT INTO users (id, tenant_id, email, first_name, last_name, password_hash, status, failed_login_attempts,
                   mfa_enabled, created_at, updated_at, version, is_deleted)
VALUES ('48000000-0e02-0000-0000-000000000008', '660e8400-e29b-41d4-a716-446655440001', 'suresh@nulogic.io', 'Suresh',
        'M', '$2a$10$D7mb1w2eljWfrBF3i8iZCu5A/H4mUXe8.3rHyWvgYy2j8eC3ghqD2', 'ACTIVE', 0, false, NOW(), NOW(), 0,
        false) ON CONFLICT (id) DO NOTHING;

-- Arun (HR - Recruitment, labeled "A" in diagram)
INSERT INTO users (id, tenant_id, email, first_name, last_name, password_hash, status, failed_login_attempts,
                   mfa_enabled, created_at, updated_at, version, is_deleted)
VALUES ('48000000-0e02-0000-0000-000000000009', '660e8400-e29b-41d4-a716-446655440001', 'arun@nulogic.io', 'Arun', 'T',
        '$2a$10$D7mb1w2eljWfrBF3i8iZCu5A/H4mUXe8.3rHyWvgYy2j8eC3ghqD2', 'ACTIVE', 0, false, NOW(), NOW(), 0,
        false) ON CONFLICT (id) DO NOTHING;

-- Bharath (HR - Recruitment, labeled "B" in diagram)
INSERT INTO users (id, tenant_id, email, first_name, last_name, password_hash, status, failed_login_attempts,
                   mfa_enabled, created_at, updated_at, version, is_deleted)
VALUES ('48000000-0e02-0000-0000-000000000010', '660e8400-e29b-41d4-a716-446655440001', 'bharath@nulogic.io', 'Bharath',
        'R', '$2a$10$D7mb1w2eljWfrBF3i8iZCu5A/H4mUXe8.3rHyWvgYy2j8eC3ghqD2', 'ACTIVE', 0, false, NOW(), NOW(), 0,
        false) ON CONFLICT (id) DO NOTHING;

-- Dhanush (HR Lead)
INSERT INTO users (id, tenant_id, email, first_name, last_name, password_hash, status, failed_login_attempts,
                   mfa_enabled, created_at, updated_at, version, is_deleted)
VALUES ('48000000-0e02-0000-0000-000000000011', '660e8400-e29b-41d4-a716-446655440001', 'dhanush@nulogic.io', 'Dhanush',
        'A', '$2a$10$D7mb1w2eljWfrBF3i8iZCu5A/H4mUXe8.3rHyWvgYy2j8eC3ghqD2', 'ACTIVE', 0, false, NOW(), NOW(), 0,
        false) ON CONFLICT (id) DO NOTHING;

-- Chitra (HR, labeled "C" in diagram)
INSERT INTO users (id, tenant_id, email, first_name, last_name, password_hash, status, failed_login_attempts,
                   mfa_enabled, created_at, updated_at, version, is_deleted)
VALUES ('48000000-0e02-0000-0000-000000000012', '660e8400-e29b-41d4-a716-446655440001', 'chitra@nulogic.io', 'Chitra',
        'S', '$2a$10$D7mb1w2eljWfrBF3i8iZCu5A/H4mUXe8.3rHyWvgYy2j8eC3ghqD2', 'ACTIVE', 0, false, NOW(), NOW(), 0,
        false) ON CONFLICT (id) DO NOTHING;

-- Deepak (HR, labeled "D" in diagram)
INSERT INTO users (id, tenant_id, email, first_name, last_name, password_hash, status, failed_login_attempts,
                   mfa_enabled, created_at, updated_at, version, is_deleted)
VALUES ('48000000-0e02-0000-0000-000000000013', '660e8400-e29b-41d4-a716-446655440001', 'deepak@nulogic.io', 'Deepak',
        'V', '$2a$10$D7mb1w2eljWfrBF3i8iZCu5A/H4mUXe8.3rHyWvgYy2j8eC3ghqD2', 'ACTIVE', 0, false, NOW(), NOW(), 0,
        false) ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 4. EMPLOYEES (with reporting hierarchy via manager_id)
-- Fayaz employee already exists: 550e8400-e29b-41d4-a716-446655440040
-- ============================================================================

-- === ENGINEERING DEPARTMENT ===

-- Sumit (Manager) → reports to Fayaz
INSERT INTO employees (id, tenant_id, employee_code, user_id, first_name, last_name, designation, level, job_role,
                       department_id, manager_id, employment_type, status, joining_date, created_at, updated_at,
                       version, is_deleted)
VALUES ('48000000-e001-0000-0000-000000000001',
        '660e8400-e29b-41d4-a716-446655440001',
        'EMP-0002', '48000000-0e02-0000-0000-000000000001',
        'Sumit', 'Kumar',
        'Engineering Manager', 'MANAGER', 'ENGINEERING_MANAGER',
        '48000000-de00-0000-0000-000000000001',
        '550e8400-e29b-41d4-a716-446655440040', -- reports to Fayaz
        'FULL_TIME', 'ACTIVE', '2023-03-15',
        NOW(), NOW(), 0, false) ON CONFLICT (id) DO NOTHING;

-- Saran (Employee) → reports to Sumit
INSERT INTO employees (id, tenant_id, employee_code, user_id, first_name, last_name, designation, level, job_role,
                       department_id, manager_id, employment_type, status, joining_date, created_at, updated_at,
                       version, is_deleted)
VALUES ('48000000-e001-0000-0000-000000000002',
        '660e8400-e29b-41d4-a716-446655440001',
        'EMP-0003', '48000000-0e02-0000-0000-000000000002',
        'Saran', 'V',
        'Software Engineer', 'MID', 'SOFTWARE_ENGINEER',
        '48000000-de00-0000-0000-000000000001',
        '48000000-e001-0000-0000-000000000001', -- reports to Sumit
        'FULL_TIME', 'ACTIVE', '2023-06-01',
        NOW(), NOW(), 0, false) ON CONFLICT (id) DO NOTHING;

-- Mani (Team Lead) → reports to Sumit
INSERT INTO employees (id, tenant_id, employee_code, user_id, first_name, last_name, designation, level, job_role,
                       department_id, manager_id, employment_type, status, joining_date, created_at, updated_at,
                       version, is_deleted)
VALUES ('48000000-e001-0000-0000-000000000003',
        '660e8400-e29b-41d4-a716-446655440001',
        'EMP-0004', '48000000-0e02-0000-0000-000000000003',
        'Mani', 'S',
        'Team Lead', 'LEAD', 'TECH_LEAD',
        '48000000-de00-0000-0000-000000000001',
        '48000000-e001-0000-0000-000000000001', -- reports to Sumit
        'FULL_TIME', 'ACTIVE', '2023-04-10',
        NOW(), NOW(), 0, false) ON CONFLICT (id) DO NOTHING;

-- Raj (Employee) → reports to Mani
INSERT INTO employees (id, tenant_id, employee_code, user_id, first_name, last_name, designation, level, job_role,
                       department_id, manager_id, employment_type, status, joining_date, created_at, updated_at,
                       version, is_deleted)
VALUES ('48000000-e001-0000-0000-000000000004',
        '660e8400-e29b-41d4-a716-446655440001',
        'EMP-0005', '48000000-0e02-0000-0000-000000000004',
        'Raj', 'P',
        'Software Engineer', 'MID', 'SOFTWARE_ENGINEER',
        '48000000-de00-0000-0000-000000000001',
        '48000000-e001-0000-0000-000000000003', -- reports to Mani
        'FULL_TIME', 'ACTIVE', '2023-08-20',
        NOW(), NOW(), 0, false) ON CONFLICT (id) DO NOTHING;

-- Gokul (Lead) → reports to Mani
INSERT INTO employees (id, tenant_id, employee_code, user_id, first_name, last_name, designation, level, job_role,
                       department_id, manager_id, employment_type, status, joining_date, created_at, updated_at,
                       version, is_deleted)
VALUES ('48000000-e001-0000-0000-000000000005',
        '660e8400-e29b-41d4-a716-446655440001',
        'EMP-0006', '48000000-0e02-0000-0000-000000000005',
        'Gokul', 'R',
        'Lead Engineer', 'LEAD', 'TECH_LEAD',
        '48000000-de00-0000-0000-000000000001',
        '48000000-e001-0000-0000-000000000003', -- reports to Mani
        'FULL_TIME', 'ACTIVE', '2023-05-05',
        NOW(), NOW(), 0, false) ON CONFLICT (id) DO NOTHING;

-- Anshuman (Employee) → reports to Gokul
INSERT INTO employees (id, tenant_id, employee_code, user_id, first_name, last_name, designation, level, job_role,
                       department_id, manager_id, employment_type, status, joining_date, created_at, updated_at,
                       version, is_deleted)
VALUES ('48000000-e001-0000-0000-000000000006',
        '660e8400-e29b-41d4-a716-446655440001',
        'EMP-0007', '48000000-0e02-0000-0000-000000000006',
        'Anshuman', 'K',
        'Software Engineer', 'ENTRY', 'SOFTWARE_ENGINEER',
        '48000000-de00-0000-0000-000000000001',
        '48000000-e001-0000-0000-000000000005', -- reports to Gokul
        'FULL_TIME', 'ACTIVE', '2024-01-10',
        NOW(), NOW(), 0, false) ON CONFLICT (id) DO NOTHING;

-- === HR DEPARTMENT ===

-- Jagadeesh (HR Manager) → reports to Fayaz
INSERT INTO employees (id, tenant_id, employee_code, user_id, first_name, last_name, designation, level, job_role,
                       department_id, manager_id, employment_type, status, joining_date, created_at, updated_at,
                       version, is_deleted)
VALUES ('48000000-e001-0000-0000-000000000007',
        '660e8400-e29b-41d4-a716-446655440001',
        'EMP-0008', '48000000-0e02-0000-0000-000000000007',
        'Jagadeesh', 'N',
        'HR Manager', 'MANAGER', 'HR_MANAGER',
        '48000000-de00-0000-0000-000000000002',
        '550e8400-e29b-41d4-a716-446655440040', -- reports to Fayaz
        'FULL_TIME', 'ACTIVE', '2023-02-01',
        NOW(), NOW(), 0, false) ON CONFLICT (id) DO NOTHING;

-- Suresh (Recruitment Lead) → reports to Jagadeesh
INSERT INTO employees (id, tenant_id, employee_code, user_id, first_name, last_name, designation, level, job_role,
                       department_id, manager_id, employment_type, status, joining_date, created_at, updated_at,
                       version, is_deleted)
VALUES ('48000000-e001-0000-0000-000000000008',
        '660e8400-e29b-41d4-a716-446655440001',
        'EMP-0009', '48000000-0e02-0000-0000-000000000008',
        'Suresh', 'M',
        'Recruitment Lead', 'LEAD', 'RECRUITER',
        '48000000-de00-0000-0000-000000000003', -- Recruitment sub-department
        '48000000-e001-0000-0000-000000000007', -- reports to Jagadeesh
        'FULL_TIME', 'ACTIVE', '2023-07-15',
        NOW(), NOW(), 0, false) ON CONFLICT (id) DO NOTHING;

-- Arun ("A" in diagram, HR - Recruitment) → reports to Suresh
INSERT INTO employees (id, tenant_id, employee_code, user_id, first_name, last_name, designation, level, job_role,
                       department_id, manager_id, employment_type, status, joining_date, created_at, updated_at,
                       version, is_deleted)
VALUES ('48000000-e001-0000-0000-000000000009',
        '660e8400-e29b-41d4-a716-446655440001',
        'EMP-0010', '48000000-0e02-0000-0000-000000000009',
        'Arun', 'T',
        'HR Executive - Recruitment', 'MID', 'RECRUITER',
        '48000000-de00-0000-0000-000000000003', -- Recruitment sub-department
        '48000000-e001-0000-0000-000000000008', -- reports to Suresh
        'FULL_TIME', 'ACTIVE', '2023-09-01',
        NOW(), NOW(), 0, false) ON CONFLICT (id) DO NOTHING;

-- Bharath ("B" in diagram, HR - Recruitment) → reports to Suresh
INSERT INTO employees (id, tenant_id, employee_code, user_id, first_name, last_name, designation, level, job_role,
                       department_id, manager_id, employment_type, status, joining_date, created_at, updated_at,
                       version, is_deleted)
VALUES ('48000000-e001-0000-0000-000000000010',
        '660e8400-e29b-41d4-a716-446655440001',
        'EMP-0011', '48000000-0e02-0000-0000-000000000010',
        'Bharath', 'R',
        'HR Executive - Recruitment', 'MID', 'RECRUITER',
        '48000000-de00-0000-0000-000000000003', -- Recruitment sub-department
        '48000000-e001-0000-0000-000000000008', -- reports to Suresh
        'FULL_TIME', 'ACTIVE', '2023-10-15',
        NOW(), NOW(), 0, false) ON CONFLICT (id) DO NOTHING;

-- Dhanush (HR Lead) → reports to Jagadeesh
INSERT INTO employees (id, tenant_id, employee_code, user_id, first_name, last_name, designation, level, job_role,
                       department_id, manager_id, employment_type, status, joining_date, created_at, updated_at,
                       version, is_deleted)
VALUES ('48000000-e001-0000-0000-000000000011',
        '660e8400-e29b-41d4-a716-446655440001',
        'EMP-0012', '48000000-0e02-0000-0000-000000000011',
        'Dhanush', 'A',
        'HR Lead', 'LEAD', 'HR_GENERALIST',
        '48000000-de00-0000-0000-000000000002',
        '48000000-e001-0000-0000-000000000007', -- reports to Jagadeesh
        'FULL_TIME', 'ACTIVE', '2023-05-20',
        NOW(), NOW(), 0, false) ON CONFLICT (id) DO NOTHING;

-- Chitra ("C" in diagram, HR) → reports to Dhanush
INSERT INTO employees (id, tenant_id, employee_code, user_id, first_name, last_name, designation, level, job_role,
                       department_id, manager_id, employment_type, status, joining_date, created_at, updated_at,
                       version, is_deleted)
VALUES ('48000000-e001-0000-0000-000000000012',
        '660e8400-e29b-41d4-a716-446655440001',
        'EMP-0013', '48000000-0e02-0000-0000-000000000012',
        'Chitra', 'S',
        'HR Executive', 'MID', 'HR_GENERALIST',
        '48000000-de00-0000-0000-000000000002',
        '48000000-e001-0000-0000-000000000011', -- reports to Dhanush
        'FULL_TIME', 'ACTIVE', '2023-11-01',
        NOW(), NOW(), 0, false) ON CONFLICT (id) DO NOTHING;

-- Deepak ("D" in diagram, HR) → reports to Dhanush
INSERT INTO employees (id, tenant_id, employee_code, user_id, first_name, last_name, designation, level, job_role,
                       department_id, manager_id, employment_type, status, joining_date, created_at, updated_at,
                       version, is_deleted)
VALUES ('48000000-e001-0000-0000-000000000013',
        '660e8400-e29b-41d4-a716-446655440001',
        'EMP-0014', '48000000-0e02-0000-0000-000000000013',
        'Deepak', 'V',
        'HR Executive', 'ENTRY', 'HR_GENERALIST',
        '48000000-de00-0000-0000-000000000002',
        '48000000-e001-0000-0000-000000000011', -- reports to Dhanush
        'FULL_TIME', 'ACTIVE', '2024-02-01',
        NOW(), NOW(), 0, false) ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 5. UPDATE FAYAZ — set department to Engineering (CEO oversees all)
-- ============================================================================
UPDATE employees
SET department_id = '48000000-de00-0000-0000-000000000001',
    designation   = 'Chief Executive Officer',
    level         = 'CXO',
    job_role      = 'CEO'
WHERE id = '550e8400-e29b-41d4-a716-446655440040'
  AND department_id IS NULL;

-- ============================================================================
-- 6. SET DEPARTMENT HEADS (manager_id on departments table)
-- ============================================================================
UPDATE departments
SET manager_id = '48000000-e001-0000-0000-000000000001'
WHERE id = '48000000-de00-0000-0000-000000000001'; -- Sumit heads Engineering
UPDATE departments
SET manager_id = '48000000-e001-0000-0000-000000000007'
WHERE id = '48000000-de00-0000-0000-000000000002'; -- Jagadeesh heads HR
UPDATE departments
SET manager_id = '48000000-e001-0000-0000-000000000008'
WHERE id = '48000000-de00-0000-0000-000000000003';
-- Suresh heads Recruitment

-- ============================================================================
-- 7. USER-ROLE ASSIGNMENTS
-- ============================================================================

-- Sumit → MANAGER role
INSERT INTO user_roles (user_id, role_id)
VALUES ('48000000-0e02-0000-0000-000000000001', '550e8400-e29b-41d4-a716-446655440022') ON CONFLICT DO NOTHING;

-- Saran → EMPLOYEE role
INSERT INTO user_roles (user_id, role_id)
VALUES ('48000000-0e02-0000-0000-000000000002', '550e8400-e29b-41d4-a716-446655440023') ON CONFLICT DO NOTHING;

-- Mani → TEAM_LEAD role
INSERT INTO user_roles (user_id, role_id)
VALUES ('48000000-0e02-0000-0000-000000000003', '48000000-0e01-0000-0000-000000000001') ON CONFLICT DO NOTHING;

-- Raj → EMPLOYEE role
INSERT INTO user_roles (user_id, role_id)
VALUES ('48000000-0e02-0000-0000-000000000004', '550e8400-e29b-41d4-a716-446655440023') ON CONFLICT DO NOTHING;

-- Gokul → TEAM_LEAD role (Lead)
INSERT INTO user_roles (user_id, role_id)
VALUES ('48000000-0e02-0000-0000-000000000005', '48000000-0e01-0000-0000-000000000001') ON CONFLICT DO NOTHING;

-- Anshuman → EMPLOYEE role
INSERT INTO user_roles (user_id, role_id)
VALUES ('48000000-0e02-0000-0000-000000000006', '550e8400-e29b-41d4-a716-446655440023') ON CONFLICT DO NOTHING;

-- Jagadeesh → HR_MANAGER role
INSERT INTO user_roles (user_id, role_id)
VALUES ('48000000-0e02-0000-0000-000000000007', '48000000-0e01-0000-0000-000000000002') ON CONFLICT DO NOTHING;

-- Suresh → RECRUITMENT_ADMIN role
INSERT INTO user_roles (user_id, role_id)
VALUES ('48000000-0e02-0000-0000-000000000008', '48000000-0e01-0000-0000-000000000003') ON CONFLICT DO NOTHING;

-- Arun → EMPLOYEE role (HR)
INSERT INTO user_roles (user_id, role_id)
VALUES ('48000000-0e02-0000-0000-000000000009', '550e8400-e29b-41d4-a716-446655440023') ON CONFLICT DO NOTHING;

-- Bharath → EMPLOYEE role (HR)
INSERT INTO user_roles (user_id, role_id)
VALUES ('48000000-0e02-0000-0000-000000000010', '550e8400-e29b-41d4-a716-446655440023') ON CONFLICT DO NOTHING;

-- Dhanush → TEAM_LEAD role (HR Lead)
INSERT INTO user_roles (user_id, role_id)
VALUES ('48000000-0e02-0000-0000-000000000011', '48000000-0e01-0000-0000-000000000001') ON CONFLICT DO NOTHING;

-- Chitra → EMPLOYEE role (HR)
INSERT INTO user_roles (user_id, role_id)
VALUES ('48000000-0e02-0000-0000-000000000012', '550e8400-e29b-41d4-a716-446655440023') ON CONFLICT DO NOTHING;

-- Deepak → EMPLOYEE role (HR)
INSERT INTO user_roles (user_id, role_id)
VALUES ('48000000-0e02-0000-0000-000000000013', '550e8400-e29b-41d4-a716-446655440023') ON CONFLICT DO NOTHING;

-- ============================================================================
-- 8. SET PASSWORD FOR EXISTING SUPERADMIN USERS (V19 created them with empty hash)
-- Password: Welcome@123
-- ============================================================================
UPDATE users
SET password_hash = '$2a$10$D7mb1w2eljWfrBF3i8iZCu5A/H4mUXe8.3rHyWvgYy2j8eC3ghqD2'
WHERE id IN ('550e8400-e29b-41d4-a716-446655440030', '550e8400-e29b-41d4-a716-446655440031')
  AND (password_hash IS NULL OR password_hash = '');

-- ============================================================================
-- DONE — Org chart demo data loaded
-- Hierarchy:
--   Fayaz (CEO/SuperAdmin)
--     ├─ Sumit (Engineering Manager)
--     │   ├─ Saran (Software Engineer)
--     │   └─ Mani (Team Lead)
--     │       ├─ Raj (Software Engineer)
--     │       └─ Gokul (Lead Engineer)
--     │           └─ Anshuman (Software Engineer)
--     └─ Jagadeesh (HR Manager)
--         ├─ Suresh (Recruitment Lead)
--         │   ├─ Arun (HR - Recruitment)
--         │   └─ Bharath (HR - Recruitment)
--         └─ Dhanush (HR Lead)
--             ├─ Chitra (HR Executive)
--             └─ Deepak (HR Executive)
-- ============================================================================
