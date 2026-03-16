-- ============================================================================
-- V30: Comprehensive Demo Seed Data
-- Extends existing seed data with realistic demo records across all modules.
-- All records use NuLogic tenant (660e8400-e29b-41d4-a716-446655440001).
-- Idempotent via ON CONFLICT DO NOTHING.
-- ============================================================================

-- Fixed tenant_id for all demo data
-- '660e8400-e29b-41d4-a716-446655440001' = NuLogic tenant from V19

-- ══════════════════════════════════════════════════════════════════════════
-- 1. DEPARTMENTS
-- ══════════════════════════════════════════════════════════════════════════

INSERT INTO departments (id, tenant_id, name, code, description, is_active, created_at, updated_at, version, is_deleted)
VALUES
    ('660e8400-d001-0000-0000-000000000001', '660e8400-e29b-41d4-a716-446655440001', 'Engineering', 'ENG', 'Software Development & Engineering', true, NOW(), NOW(), 0, false),
    ('660e8400-d001-0000-0000-000000000002', '660e8400-e29b-41d4-a716-446655440001', 'Product', 'PROD', 'Product Management', true, NOW(), NOW(), 0, false),
    ('660e8400-d001-0000-0000-000000000003', '660e8400-e29b-41d4-a716-446655440001', 'Human Resources', 'HR', 'HR & People Operations', true, NOW(), NOW(), 0, false),
    ('660e8400-d001-0000-0000-000000000004', '660e8400-e29b-41d4-a716-446655440001', 'Finance', 'FIN', 'Finance & Accounting', true, NOW(), NOW(), 0, false),
    ('660e8400-d001-0000-0000-000000000005', '660e8400-e29b-41d4-a716-446655440001', 'Sales', 'SALES', 'Sales & Business Development', true, NOW(), NOW(), 0, false),
    ('660e8400-d001-0000-0000-000000000006', '660e8400-e29b-41d4-a716-446655440001', 'Marketing', 'MKT', 'Marketing & Growth', true, NOW(), NOW(), 0, false),
    ('660e8400-d001-0000-0000-000000000007', '660e8400-e29b-41d4-a716-446655440001', 'Customer Success', 'CS', 'Customer Success & Support', true, NOW(), NOW(), 0, false),
    ('660e8400-d001-0000-0000-000000000008', '660e8400-e29b-41d4-a716-446655440001', 'Operations', 'OPS', 'Operations & Admin', true, NOW(), NOW(), 0, false)
ON CONFLICT (id) DO NOTHING;

-- ══════════════════════════════════════════════════════════════════════════
-- 2. USERS & EMPLOYEES
-- ══════════════════════════════════════════════════════════════════════════

-- Note: fayaz.m@nulogic.io already exists from V19, employee_code: EMP-0001

-- Engineering Team (10 employees)
INSERT INTO users (id, tenant_id, email, first_name, last_name, password_hash, status, failed_login_attempts, mfa_enabled, created_at, updated_at, version, is_deleted)
VALUES
    ('660e8400-u001-0000-0000-000000000001', '660e8400-e29b-41d4-a716-446655440001', 'sarah.chen@nulogic.io', 'Sarah', 'Chen', '$2a$10$demoHash001', 'ACTIVE', 0, false, NOW(), NOW(), 0, false),
    ('660e8400-u001-0000-0000-000000000002', '660e8400-e29b-41d4-a716-446655440001', 'raj.kumar@nulogic.io', 'Raj', 'Kumar', '$2a$10$demoHash002', 'ACTIVE', 0, false, NOW(), NOW(), 0, false),
    ('660e8400-u001-0000-0000-000000000003', '660e8400-e29b-41d4-a716-446655440001', 'emily.watson@nulogic.io', 'Emily', 'Watson', '$2a$10$demoHash003', 'ACTIVE', 0, false, NOW(), NOW(), 0, false),
    ('660e8400-u001-0000-0000-000000000004', '660e8400-e29b-41d4-a716-446655440001', 'david.kim@nulogic.io', 'David', 'Kim', '$2a$10$demoHash004', 'ACTIVE', 0, false, NOW(), NOW(), 0, false),
    ('660e8400-u001-0000-0000-000000000005', '660e8400-e29b-41d4-a716-446655440001', 'priya.sharma@nulogic.io', 'Priya', 'Sharma', '$2a$10$demoHash005', 'ACTIVE', 0, false, NOW(), NOW(), 0, false),
    ('660e8400-u001-0000-0000-000000000006', '660e8400-e29b-41d4-a716-446655440001', 'alex.johnson@nulogic.io', 'Alex', 'Johnson', '$2a$10$demoHash006', 'ACTIVE', 0, false, NOW(), NOW(), 0, false),
    ('660e8400-u001-0000-0000-000000000007', '660e8400-e29b-41d4-a716-446655440001', 'maria.garcia@nulogic.io', 'Maria', 'Garcia', '$2a$10$demoHash007', 'ACTIVE', 0, false, NOW(), NOW(), 0, false),
    ('660e8400-u001-0000-0000-000000000008', '660e8400-e29b-41d4-a716-446655440001', 'james.taylor@nulogic.io', 'James', 'Taylor', '$2a$10$demoHash008', 'ACTIVE', 0, false, NOW(), NOW(), 0, false),
    ('660e8400-u001-0000-0000-000000000009', '660e8400-e29b-41d4-a716-446655440001', 'lisa.nguyen@nulogic.io', 'Lisa', 'Nguyen', '$2a$10$demoHash009', 'ACTIVE', 0, false, NOW(), NOW(), 0, false),
    ('660e8400-u001-0000-0000-000000000010', '660e8400-e29b-41d4-a716-446655440001', 'michael.brown@nulogic.io', 'Michael', 'Brown', '$2a$10$demoHash010', 'ACTIVE', 0, false, NOW(), NOW(), 0, false)
ON CONFLICT (id) DO NOTHING;

-- Product, HR, Finance, Sales, Marketing, CS, Ops (15 employees)
INSERT INTO users (id, tenant_id, email, first_name, last_name, password_hash, status, failed_login_attempts, mfa_enabled, created_at, updated_at, version, is_deleted)
VALUES
    ('660e8400-u001-0000-0000-000000000011', '660e8400-e29b-41d4-a716-446655440001', 'olivia.martinez@nulogic.io', 'Olivia', 'Martinez', '$2a$10$demoHash011', 'ACTIVE', 0, false, NOW(), NOW(), 0, false),
    ('660e8400-u001-0000-0000-000000000012', '660e8400-e29b-41d4-a716-446655440001', 'william.davis@nulogic.io', 'William', 'Davis', '$2a$10$demoHash012', 'ACTIVE', 0, false, NOW(), NOW(), 0, false),
    ('660e8400-u001-0000-0000-000000000013', '660e8400-e29b-41d4-a716-446655440001', 'sophia.wilson@nulogic.io', 'Sophia', 'Wilson', '$2a$10$demoHash013', 'ACTIVE', 0, false, NOW(), NOW(), 0, false),
    ('660e8400-u001-0000-0000-000000000014', '660e8400-e29b-41d4-a716-446655440001', 'liam.anderson@nulogic.io', 'Liam', 'Anderson', '$2a$10$demoHash014', 'ACTIVE', 0, false, NOW(), NOW(), 0, false),
    ('660e8400-u001-0000-0000-000000000015', '660e8400-e29b-41d4-a716-446655440001', 'emma.thomas@nulogic.io', 'Emma', 'Thomas', '$2a$10$demoHash015', 'ACTIVE', 0, false, NOW(), NOW(), 0, false),
    ('660e8400-u001-0000-0000-000000000016', '660e8400-e29b-41d4-a716-446655440001', 'noah.jackson@nulogic.io', 'Noah', 'Jackson', '$2a$10$demoHash016', 'ACTIVE', 0, false, NOW(), NOW(), 0, false),
    ('660e8400-u001-0000-0000-000000000017', '660e8400-e29b-41d4-a716-446655440001', 'ava.white@nulogic.io', 'Ava', 'White', '$2a$10$demoHash017', 'ACTIVE', 0, false, NOW(), NOW(), 0, false),
    ('660e8400-u001-0000-0000-000000000018', '660e8400-e29b-41d4-a716-446655440001', 'ethan.harris@nulogic.io', 'Ethan', 'Harris', '$2a$10$demoHash018', 'ACTIVE', 0, false, NOW(), NOW(), 0, false),
    ('660e8400-u001-0000-0000-000000000019', '660e8400-e29b-41d4-a716-446655440001', 'isabella.martin@nulogic.io', 'Isabella', 'Martin', '$2a$10$demoHash019', 'ACTIVE', 0, false, NOW(), NOW(), 0, false),
    ('660e8400-u001-0000-0000-000000000020', '660e8400-e29b-41d4-a716-446655440001', 'mason.thompson@nulogic.io', 'Mason', 'Thompson', '$2a$10$demoHash020', 'ACTIVE', 0, false, NOW(), NOW(), 0, false),
    ('660e8400-u001-0000-0000-000000000021', '660e8400-e29b-41d4-a716-446655440001', 'mia.garcia@nulogic.io', 'Mia', 'Garcia', '$2a$10$demoHash021', 'ACTIVE', 0, false, NOW(), NOW(), 0, false),
    ('660e8400-u001-0000-0000-000000000022', '660e8400-e29b-41d4-a716-446655440001', 'lucas.rodriguez@nulogic.io', 'Lucas', 'Rodriguez', '$2a$10$demoHash022', 'ACTIVE', 0, false, NOW(), NOW(), 0, false),
    ('660e8400-u001-0000-0000-000000000023', '660e8400-e29b-41d4-a716-446655440001', 'amelia.lee@nulogic.io', 'Amelia', 'Lee', '$2a$10$demoHash023', 'ACTIVE', 0, false, NOW(), NOW(), 0, false),
    ('660e8400-u001-0000-0000-000000000024', '660e8400-e29b-41d4-a716-446655440001', 'logan.walker@nulogic.io', 'Logan', 'Walker', '$2a$10$demoHash024', 'ACTIVE', 0, false, NOW(), NOW(), 0, false),
    ('660e8400-u001-0000-0000-000000000025', '660e8400-e29b-41d4-a716-446655440001', 'harper.hall@nulogic.io', 'Harper', 'Hall', '$2a$10$demoHash025', 'ACTIVE', 0, false, NOW(), NOW(), 0, false)
ON CONFLICT (id) DO NOTHING;

-- Employees linked to users (Engineering: 10, Product: 2, HR: 2, Finance: 2, Sales: 3, Marketing: 2, CS: 2, Ops: 2)
INSERT INTO employees (id, tenant_id, employee_code, user_id, first_name, last_name, personal_email, joining_date, designation, level, job_role, employment_type, status, department_id, created_at, updated_at, version, is_deleted)
VALUES
    -- Engineering (10)
    ('660e8400-e001-0000-0000-000000000001', '660e8400-e29b-41d4-a716-446655440001', 'EMP-0002', '660e8400-u001-0000-0000-000000000001', 'Sarah', 'Chen', 'sarah.chen@gmail.com', '2022-01-15', 'Engineering Manager', 'L6', 'MANAGER', 'FULL_TIME', 'ACTIVE', '660e8400-d001-0000-0000-000000000001', NOW(), NOW(), 0, false),
    ('660e8400-e001-0000-0000-000000000002', '660e8400-e29b-41d4-a716-446655440001', 'EMP-0003', '660e8400-u001-0000-0000-000000000002', 'Raj', 'Kumar', 'raj.kumar@gmail.com', '2022-03-20', 'Senior Software Engineer', 'L5', 'INDIVIDUAL_CONTRIBUTOR', 'FULL_TIME', 'ACTIVE', '660e8400-d001-0000-0000-000000000001', NOW(), NOW(), 0, false),
    ('660e8400-e001-0000-0000-000000000003', '660e8400-e29b-41d4-a716-446655440001', 'EMP-0004', '660e8400-u001-0000-0000-000000000003', 'Emily', 'Watson', 'emily.watson@gmail.com', '2023-02-01', 'Senior Software Engineer', 'L5', 'INDIVIDUAL_CONTRIBUTOR', 'FULL_TIME', 'ACTIVE', '660e8400-d001-0000-0000-000000000001', NOW(), NOW(), 0, false),
    ('660e8400-e001-0000-0000-000000000004', '660e8400-e29b-41d4-a716-446655440001', 'EMP-0005', '660e8400-u001-0000-0000-000000000004', 'David', 'Kim', 'david.kim@gmail.com', '2023-06-15', 'Software Engineer', 'L4', 'INDIVIDUAL_CONTRIBUTOR', 'FULL_TIME', 'ACTIVE', '660e8400-d001-0000-0000-000000000001', NOW(), NOW(), 0, false),
    ('660e8400-e001-0000-0000-000000000005', '660e8400-e29b-41d4-a716-446655440001', 'EMP-0006', '660e8400-u001-0000-0000-000000000005', 'Priya', 'Sharma', 'priya.sharma@gmail.com', '2023-08-01', 'Software Engineer', 'L4', 'INDIVIDUAL_CONTRIBUTOR', 'FULL_TIME', 'ACTIVE', '660e8400-d001-0000-0000-000000000001', NOW(), NOW(), 0, false),
    ('660e8400-e001-0000-0000-000000000006', '660e8400-e29b-41d4-a716-446655440001', 'EMP-0007', '660e8400-u001-0000-0000-000000000006', 'Alex', 'Johnson', 'alex.johnson@gmail.com', '2024-01-10', 'Software Engineer', 'L3', 'INDIVIDUAL_CONTRIBUTOR', 'FULL_TIME', 'ACTIVE', '660e8400-d001-0000-0000-000000000001', NOW(), NOW(), 0, false),
    ('660e8400-e001-0000-0000-000000000007', '660e8400-e29b-41d4-a716-446655440001', 'EMP-0008', '660e8400-u001-0000-0000-000000000007', 'Maria', 'Garcia', 'maria.garcia@gmail.com', '2024-03-01', 'QA Engineer', 'L4', 'INDIVIDUAL_CONTRIBUTOR', 'FULL_TIME', 'ACTIVE', '660e8400-d001-0000-0000-000000000001', NOW(), NOW(), 0, false),
    ('660e8400-e001-0000-0000-000000000008', '660e8400-e29b-41d4-a716-446655440001', 'EMP-0009', '660e8400-u001-0000-0000-000000000008', 'James', 'Taylor', 'james.taylor@gmail.com', '2024-05-15', 'DevOps Engineer', 'L5', 'INDIVIDUAL_CONTRIBUTOR', 'FULL_TIME', 'ACTIVE', '660e8400-d001-0000-0000-000000000001', NOW(), NOW(), 0, false),
    ('660e8400-e001-0000-0000-000000000009', '660e8400-e29b-41d4-a716-446655440001', 'EMP-0010', '660e8400-u001-0000-0000-000000000009', 'Lisa', 'Nguyen', 'lisa.nguyen@gmail.com', '2024-07-01', 'Frontend Developer', 'L3', 'INDIVIDUAL_CONTRIBUTOR', 'FULL_TIME', 'ACTIVE', '660e8400-d001-0000-0000-000000000001', NOW(), NOW(), 0, false),
    ('660e8400-e001-0000-0000-000000000010', '660e8400-e29b-41d4-a716-446655440001', 'EMP-0011', '660e8400-u001-0000-0000-000000000010', 'Michael', 'Brown', 'michael.brown@gmail.com', '2024-09-01', 'Backend Developer', 'L3', 'INDIVIDUAL_CONTRIBUTOR', 'FULL_TIME', 'ACTIVE', '660e8400-d001-0000-0000-000000000001', NOW(), NOW(), 0, false),
    -- Product (2)
    ('660e8400-e001-0000-0000-000000000011', '660e8400-e29b-41d4-a716-446655440001', 'EMP-0012', '660e8400-u001-0000-0000-000000000011', 'Olivia', 'Martinez', 'olivia.martinez@gmail.com', '2022-06-01', 'VP of Product', 'L7', 'EXECUTIVE', 'FULL_TIME', 'ACTIVE', '660e8400-d001-0000-0000-000000000002', NOW(), NOW(), 0, false),
    ('660e8400-e001-0000-0000-000000000012', '660e8400-e29b-41d4-a716-446655440001', 'EMP-0013', '660e8400-u001-0000-0000-000000000012', 'William', 'Davis', 'william.davis@gmail.com', '2023-04-01', 'Senior Product Manager', 'L5', 'MANAGER', 'FULL_TIME', 'ACTIVE', '660e8400-d001-0000-0000-000000000002', NOW(), NOW(), 0, false),
    -- HR (2)
    ('660e8400-e001-0000-0000-000000000013', '660e8400-e29b-41d4-a716-446655440001', 'EMP-0014', '660e8400-u001-0000-0000-000000000013', 'Sophia', 'Wilson', 'sophia.wilson@gmail.com', '2021-09-01', 'HR Director', 'L6', 'MANAGER', 'FULL_TIME', 'ACTIVE', '660e8400-d001-0000-0000-000000000003', NOW(), NOW(), 0, false),
    ('660e8400-e001-0000-0000-000000000014', '660e8400-e29b-41d4-a716-446655440001', 'EMP-0015', '660e8400-u001-0000-0000-000000000014', 'Liam', 'Anderson', 'liam.anderson@gmail.com', '2022-11-01', 'HR Business Partner', 'L4', 'INDIVIDUAL_CONTRIBUTOR', 'FULL_TIME', 'ACTIVE', '660e8400-d001-0000-0000-000000000003', NOW(), NOW(), 0, false),
    -- Finance (2)
    ('660e8400-e001-0000-0000-000000000015', '660e8400-e29b-41d4-a716-446655440001', 'EMP-0016', '660e8400-u001-0000-0000-000000000015', 'Emma', 'Thomas', 'emma.thomas@gmail.com', '2021-07-01', 'CFO', 'CXO', 'EXECUTIVE', 'FULL_TIME', 'ACTIVE', '660e8400-d001-0000-0000-000000000004', NOW(), NOW(), 0, false),
    ('660e8400-e001-0000-0000-000000000016', '660e8400-e29b-41d4-a716-446655440001', 'EMP-0017', '660e8400-u001-0000-0000-000000000016', 'Noah', 'Jackson', 'noah.jackson@gmail.com', '2022-08-15', 'Senior Accountant', 'L5', 'INDIVIDUAL_CONTRIBUTOR', 'FULL_TIME', 'ACTIVE', '660e8400-d001-0000-0000-000000000004', NOW(), NOW(), 0, false),
    -- Sales (3)
    ('660e8400-e001-0000-0000-000000000017', '660e8400-e29b-41d4-a716-446655440001', 'EMP-0018', '660e8400-u001-0000-0000-000000000017', 'Ava', 'White', 'ava.white@gmail.com', '2022-02-01', 'VP of Sales', 'L7', 'EXECUTIVE', 'FULL_TIME', 'ACTIVE', '660e8400-d001-0000-0000-000000000005', NOW(), NOW(), 0, false),
    ('660e8400-e001-0000-0000-000000000018', '660e8400-e29b-41d4-a716-446655440001', 'EMP-0019', '660e8400-u001-0000-0000-000000000018', 'Ethan', 'Harris', 'ethan.harris@gmail.com', '2023-05-15', 'Sales Manager', 'L5', 'MANAGER', 'FULL_TIME', 'ACTIVE', '660e8400-d001-0000-0000-000000000005', NOW(), NOW(), 0, false),
    ('660e8400-e001-0000-0000-000000000019', '660e8400-e29b-41d4-a716-446655440001', 'EMP-0020', '660e8400-u001-0000-0000-000000000019', 'Isabella', 'Martin', 'isabella.martin@gmail.com', '2024-02-01', 'Account Executive', 'L4', 'INDIVIDUAL_CONTRIBUTOR', 'FULL_TIME', 'ACTIVE', '660e8400-d001-0000-0000-000000000005', NOW(), NOW(), 0, false),
    -- Marketing (2)
    ('660e8400-e001-0000-0000-000000000020', '660e8400-e29b-41d4-a716-446655440001', 'EMP-0021', '660e8400-u001-0000-0000-000000000020', 'Mason', 'Thompson', 'mason.thompson@gmail.com', '2022-10-01', 'Marketing Director', 'L6', 'MANAGER', 'FULL_TIME', 'ACTIVE', '660e8400-d001-0000-0000-000000000006', NOW(), NOW(), 0, false),
    ('660e8400-e001-0000-0000-000000000021', '660e8400-e29b-41d4-a716-446655440001', 'EMP-0022', '660e8400-u001-0000-0000-000000000021', 'Mia', 'Garcia', 'mia.garcia@gmail.com', '2023-09-01', 'Content Marketing Manager', 'L4', 'INDIVIDUAL_CONTRIBUTOR', 'FULL_TIME', 'ACTIVE', '660e8400-d001-0000-0000-000000000006', NOW(), NOW(), 0, false),
    -- Customer Success (2)
    ('660e8400-e001-0000-0000-000000000022', '660e8400-e29b-41d4-a716-446655440001', 'EMP-0023', '660e8400-u001-0000-0000-000000000022', 'Lucas', 'Rodriguez', 'lucas.rodriguez@gmail.com', '2023-01-15', 'CS Manager', 'L5', 'MANAGER', 'FULL_TIME', 'ACTIVE', '660e8400-d001-0000-0000-000000000007', NOW(), NOW(), 0, false),
    ('660e8400-e001-0000-0000-000000000023', '660e8400-e29b-41d4-a716-446655440001', 'EMP-0024', '660e8400-u001-0000-0000-000000000023', 'Amelia', 'Lee', 'amelia.lee@gmail.com', '2024-04-01', 'Customer Success Specialist', 'L3', 'INDIVIDUAL_CONTRIBUTOR', 'FULL_TIME', 'ACTIVE', '660e8400-d001-0000-0000-000000000007', NOW(), NOW(), 0, false),
    -- Operations (2)
    ('660e8400-e001-0000-0000-000000000024', '660e8400-e29b-41d4-a716-446655440001', 'EMP-0025', '660e8400-u001-0000-0000-000000000024', 'Logan', 'Walker', 'logan.walker@gmail.com', '2022-05-01', 'Operations Manager', 'L5', 'MANAGER', 'FULL_TIME', 'ACTIVE', '660e8400-d001-0000-0000-000000000008', NOW(), NOW(), 0, false),
    ('660e8400-e001-0000-0000-000000000025', '660e8400-e29b-41d4-a716-446655440001', 'EMP-0026', '660e8400-u001-0000-0000-000000000025', 'Harper', 'Hall', 'harper.hall@gmail.com', '2023-12-01', 'Office Administrator', 'L3', 'INDIVIDUAL_CONTRIBUTOR', 'FULL_TIME', 'ACTIVE', '660e8400-d001-0000-0000-000000000008', NOW(), NOW(), 0, false)
ON CONFLICT (id) DO NOTHING;

-- ══════════════════════════════════════════════════════════════════════════
-- 3. LEAVE TYPES
-- ══════════════════════════════════════════════════════════════════════════

INSERT INTO leave_types (id, tenant_id, leave_name, leave_code, annual_quota, is_paid, is_active, created_at, updated_at, version, is_deleted)
VALUES
    ('660e8400-lt01-0000-0000-000000000001', '660e8400-e29b-41d4-a716-446655440001', 'Annual Leave', 'AL', 20.0, true, true, NOW(), NOW(), 0, false),
    ('660e8400-lt01-0000-0000-000000000002', '660e8400-e29b-41d4-a716-446655440001', 'Sick Leave', 'SL', 10.0, true, true, NOW(), NOW(), 0, false),
    ('660e8400-lt01-0000-0000-000000000003', '660e8400-e29b-41d4-a716-446655440001', 'Casual Leave', 'CL', 12.0, true, true, NOW(), NOW(), 0, false),
    ('660e8400-lt01-0000-0000-000000000004', '660e8400-e29b-41d4-a716-446655440001', 'Maternity Leave', 'ML', 180.0, true, true, NOW(), NOW(), 0, false),
    ('660e8400-lt01-0000-0000-000000000005', '660e8400-e29b-41d4-a716-446655440001', 'Paternity Leave', 'PL', 15.0, true, true, NOW(), NOW(), 0, false),
    ('660e8400-lt01-0000-0000-000000000006', '660e8400-e29b-41d4-a716-446655440001', 'Unpaid Leave', 'UL', 0.0, false, true, NOW(), NOW(), 0, false)
ON CONFLICT (id) DO NOTHING;

-- ══════════════════════════════════════════════════════════════════════════
-- 4. LEAVE BALANCES (For all 25+ employees)
-- ══════════════════════════════════════════════════════════════════════════

-- Generate leave balances for Annual Leave (20 days quota)
INSERT INTO leave_balances (id, tenant_id, employee_id, leave_type_id, year, total_quota, used_days, balance_days, created_at, updated_at, version, is_deleted)
SELECT
    gen_random_uuid(),
    '660e8400-e29b-41d4-a716-446655440001',
    e.id,
    '660e8400-lt01-0000-0000-000000000001',
    2025,
    20.0,
    FLOOR(RANDOM() * 5)::DECIMAL,  -- Random used days (0-4)
    20.0 - FLOOR(RANDOM() * 5)::DECIMAL,
    NOW(), NOW(), 0, false
FROM employees e
WHERE e.tenant_id = '660e8400-e29b-41d4-a716-446655440001'
  AND e.employee_code LIKE 'EMP-%'
  AND NOT EXISTS (
      SELECT 1 FROM leave_balances lb
      WHERE lb.employee_id = e.id
        AND lb.leave_type_id = '660e8400-lt01-0000-0000-000000000001'
        AND lb.year = 2025
  );

-- Generate leave balances for Sick Leave (10 days quota)
INSERT INTO leave_balances (id, tenant_id, employee_id, leave_type_id, year, total_quota, used_days, balance_days, created_at, updated_at, version, is_deleted)
SELECT
    gen_random_uuid(),
    '660e8400-e29b-41d4-a716-446655440001',
    e.id,
    '660e8400-lt01-0000-0000-000000000002',
    2025,
    10.0,
    FLOOR(RANDOM() * 3)::DECIMAL,  -- Random used days (0-2)
    10.0 - FLOOR(RANDOM() * 3)::DECIMAL,
    NOW(), NOW(), 0, false
FROM employees e
WHERE e.tenant_id = '660e8400-e29b-41d4-a716-446655440001'
  AND e.employee_code LIKE 'EMP-%'
  AND NOT EXISTS (
      SELECT 1 FROM leave_balances lb
      WHERE lb.employee_id = e.id
        AND lb.leave_type_id = '660e8400-lt01-0000-0000-000000000002'
        AND lb.year = 2025
  );

-- Generate leave balances for Casual Leave (12 days quota)
INSERT INTO leave_balances (id, tenant_id, employee_id, leave_type_id, year, total_quota, used_days, balance_days, created_at, updated_at, version, is_deleted)
SELECT
    gen_random_uuid(),
    '660e8400-e29b-41d4-a716-446655440001',
    e.id,
    '660e8400-lt01-0000-0000-000000000003',
    2025,
    12.0,
    FLOOR(RANDOM() * 4)::DECIMAL,  -- Random used days (0-3)
    12.0 - FLOOR(RANDOM() * 4)::DECIMAL,
    NOW(), NOW(), 0, false
FROM employees e
WHERE e.tenant_id = '660e8400-e29b-41d4-a716-446655440001'
  AND e.employee_code LIKE 'EMP-%'
  AND NOT EXISTS (
      SELECT 1 FROM leave_balances lb
      WHERE lb.employee_id = e.id
        AND lb.leave_type_id = '660e8400-lt01-0000-0000-000000000003'
        AND lb.year = 2025
  );

-- ══════════════════════════════════════════════════════════════════════════
-- 5. HOLIDAYS (2025 Calendar)
-- ══════════════════════════════════════════════════════════════════════════

INSERT INTO holidays (id, tenant_id, name, date, description, is_active, created_at, updated_at, version, is_deleted)
VALUES
    ('660e8400-h001-0000-0000-000000000001', '660e8400-e29b-41d4-a716-446655440001', 'New Year', '2025-01-01', 'New Year''s Day', true, NOW(), NOW(), 0, false),
    ('660e8400-h001-0000-0000-000000000002', '660e8400-e29b-41d4-a716-446655440001', 'Republic Day', '2025-01-26', 'Republic Day of India', true, NOW(), NOW(), 0, false),
    ('660e8400-h001-0000-0000-000000000003', '660e8400-e29b-41d4-a716-446655440001', 'Holi', '2025-03-14', 'Festival of Colors', true, NOW(), NOW(), 0, false),
    ('660e8400-h001-0000-0000-000000000004', '660e8400-e29b-41d4-a716-446655440001', 'Good Friday', '2025-04-18', 'Good Friday', true, NOW(), NOW(), 0, false),
    ('660e8400-h001-0000-0000-000000000005', '660e8400-e29b-41d4-a716-446655440001', 'Independence Day', '2025-08-15', 'Independence Day of India', true, NOW(), NOW(), 0, false),
    ('660e8400-h001-0000-0000-000000000006', '660e8400-e29b-41d4-a716-446655440001', 'Gandhi Jayanti', '2025-10-02', 'Birth of Mahatma Gandhi', true, NOW(), NOW(), 0, false),
    ('660e8400-h001-0000-0000-000000000007', '660e8400-e29b-41d4-a716-446655440001', 'Diwali', '2025-10-20', 'Festival of Lights', true, NOW(), NOW(), 0, false),
    ('660e8400-h001-0000-0000-000000000008', '660e8400-e29b-41d4-a716-446655440001', 'Christmas', '2025-12-25', 'Christmas Day', true, NOW(), NOW(), 0, false)
ON CONFLICT (id) DO NOTHING;

-- ══════════════════════════════════════════════════════════════════════════
-- 6. ANNOUNCEMENTS
-- ══════════════════════════════════════════════════════════════════════════

INSERT INTO announcements (id, tenant_id, title, content, type, priority, start_date, end_date, target_audience, status, created_by, created_at, updated_at, version, is_deleted)
VALUES
    ('660e8400-a001-0000-0000-000000000001', '660e8400-e29b-41d4-a716-446655440001', 'Welcome to NU-AURA Platform!', 'We are excited to announce the launch of our new HR platform. Explore all the amazing features designed to streamline your work experience.', 'GENERAL', 'HIGH', NOW() - INTERVAL '30 days', NOW() + INTERVAL '60 days', 'ALL', 'PUBLISHED', '550e8400-e29b-41d4-a716-446655440040', NOW(), NOW(), 0, false),
    ('660e8400-a001-0000-0000-000000000002', '660e8400-e29b-41d4-a716-446655440001', 'Year-End Performance Reviews', 'Performance review cycle for 2024 is now open. Please complete your self-assessments by end of this week.', 'PERFORMANCE', 'MEDIUM', NOW() - INTERVAL '7 days', NOW() + INTERVAL '14 days', 'ALL', 'PUBLISHED', '660e8400-e001-0000-0000-000000000013', NOW(), NOW(), 0, false),
    ('660e8400-a001-0000-0000-000000000003', '660e8400-e29b-41d4-a716-446655440001', 'Office Closed - Christmas Holiday', 'The office will be closed from Dec 24-26 for the Christmas holiday. Emergency contacts will be shared separately.', 'HOLIDAY', 'LOW', NOW() - INTERVAL '3 days', '2025-12-26', 'ALL', 'PUBLISHED', '660e8400-e001-0000-0000-000000000024', NOW(), NOW(), 0, false)
ON CONFLICT (id) DO NOTHING;

-- ══════════════════════════════════════════════════════════════════════════
-- 7. PROJECTS
-- ══════════════════════════════════════════════════════════════════════════

INSERT INTO projects (id, tenant_id, name, project_code, description, status, priority, start_date, end_date, created_at, updated_at, version, is_deleted)
VALUES
    ('660e8400-p001-0000-0000-000000000001', '660e8400-e29b-41d4-a716-446655440001', 'NU-AURA Platform Development', 'AURA-CORE', 'Core platform development for NU-AURA HRMS bundle', 'IN_PROGRESS', 'HIGH', '2024-01-15', '2025-12-31', NOW(), NOW(), 0, false),
    ('660e8400-p001-0000-0000-000000000002', '660e8400-e29b-41d4-a716-446655440001', 'Customer Portal 2.0', 'PORTAL-V2', 'Revamp customer-facing portal with modern UI', 'IN_PROGRESS', 'MEDIUM', '2024-06-01', '2025-06-30', NOW(), NOW(), 0, false),
    ('660e8400-p001-0000-0000-000000000003', '660e8400-e29b-41d4-a716-446655440001', 'Mobile App Launch', 'MOBILE-V1', 'Native mobile app for iOS and Android', 'PLANNING', 'LOW', '2025-03-01', '2025-12-31', NOW(), NOW(), 0, false)
ON CONFLICT (id) DO NOTHING;

-- ══════════════════════════════════════════════════════════════════════════
-- 8. JOB OPENINGS (Recruitment)
-- ══════════════════════════════════════════════════════════════════════════

INSERT INTO job_openings (id, tenant_id, title, job_code, department_id, employment_type, min_experience, max_experience, min_salary, max_salary, location, description, requirements, status, posted_date, application_deadline, created_at, updated_at, version, is_deleted)
VALUES
    ('660e8400-j001-0000-0000-000000000001', '660e8400-e29b-41d4-a716-446655440001', 'Senior Frontend Developer', 'JOB-ENG-001', '660e8400-d001-0000-0000-000000000001', 'FULL_TIME', 5, 8, 80000.0, 120000.0, 'Bengaluru, India', 'We are looking for an experienced Frontend Developer with React/Next.js expertise.', 'Must have: React, TypeScript, Next.js, 5+ years experience', 'OPEN', NOW() - INTERVAL '10 days', NOW() + INTERVAL '20 days', NOW(), NOW(), 0, false),
    ('660e8400-j001-0000-0000-000000000002', '660e8400-e29b-41d4-a716-446655440001', 'Product Manager', 'JOB-PROD-001', '660e8400-d001-0000-0000-000000000002', 'FULL_TIME', 3, 6, 70000.0, 100000.0, 'Remote', 'Seeking a Product Manager to drive product strategy and roadmap.', 'Must have: Product management experience, stakeholder management, technical background', 'OPEN', NOW() - INTERVAL '5 days', NOW() + INTERVAL '25 days', NOW(), NOW(), 0, false),
    ('660e8400-j001-0000-0000-000000000003', '660e8400-e29b-41d4-a716-446655440001', 'DevOps Engineer', 'JOB-ENG-002', '660e8400-d001-0000-0000-000000000001', 'FULL_TIME', 4, 7, 75000.0, 110000.0, 'Bengaluru, India', 'Looking for a DevOps Engineer with Kubernetes and AWS experience.', 'Must have: Kubernetes, Docker, AWS, CI/CD, 4+ years experience', 'OPEN', NOW() - INTERVAL '15 days', NOW() + INTERVAL '15 days', NOW(), NOW(), 0, false)
ON CONFLICT (id) DO NOTHING;

-- ══════════════════════════════════════════════════════════════════════════
-- 9. ASSET TYPES & ASSETS
-- ══════════════════════════════════════════════════════════════════════════

-- First, let's add asset categories (if table exists - will fail silently if not)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'asset_categories') THEN
        INSERT INTO asset_categories (id, tenant_id, name, code, description, is_active, created_at, updated_at, version, is_deleted)
        VALUES
            ('660e8400-ac01-0000-0000-000000000001', '660e8400-e29b-41d4-a716-446655440001', 'Electronics', 'ELEC', 'Electronic devices and equipment', true, NOW(), NOW(), 0, false),
            ('660e8400-ac01-0000-0000-000000000002', '660e8400-e29b-41d4-a716-446655440001', 'Furniture', 'FURN', 'Office furniture', true, NOW(), NOW(), 0, false),
            ('660e8400-ac01-0000-0000-000000000003', '660e8400-e29b-41d4-a716-446655440001', 'Accessories', 'ACC', 'Computer accessories', true, NOW(), NOW(), 0, false)
        ON CONFLICT (id) DO NOTHING;
    END IF;
END $$;

-- Sample assets
INSERT INTO assets (id, tenant_id, asset_code, name, description, category, status, purchase_date, warranty_expiry, assigned_to, assigned_date, created_at, updated_at, version, is_deleted)
VALUES
    ('660e8400-as01-0000-0000-000000000001', '660e8400-e29b-41d4-a716-446655440001', 'LAP-001', 'MacBook Pro 16"', 'MacBook Pro 16-inch M2 Pro', 'ELECTRONICS', 'ASSIGNED', '2024-01-15', '2027-01-15', '660e8400-e001-0000-0000-000000000001', '2024-01-20', NOW(), NOW(), 0, false),
    ('660e8400-as01-0000-0000-000000000002', '660e8400-e29b-41d4-a716-446655440001', 'LAP-002', 'MacBook Air 13"', 'MacBook Air 13-inch M2', 'ELECTRONICS', 'ASSIGNED', '2024-02-10', '2027-02-10', '660e8400-e001-0000-0000-000000000002', '2024-02-15', NOW(), NOW(), 0, false),
    ('660e8400-as01-0000-0000-000000000003', '660e8400-e29b-41d4-a716-446655440001', 'MON-001', 'Dell UltraSharp 27"', '27-inch 4K Monitor', 'ELECTRONICS', 'ASSIGNED', '2024-03-01', '2027-03-01', '660e8400-e001-0000-0000-000000000003', '2024-03-05', NOW(), NOW(), 0, false),
    ('660e8400-as01-0000-0000-000000000004', '660e8400-e29b-41d4-a716-446655440001', 'CHR-001', 'Herman Miller Aeron Chair', 'Ergonomic office chair', 'FURNITURE', 'ASSIGNED', '2024-01-10', NULL, '550e8400-e29b-41d4-a716-446655440040', '2024-01-15', NOW(), NOW(), 0, false),
    ('660e8400-as01-0000-0000-000000000005', '660e8400-e29b-41d4-a716-446655440001', 'KEY-001', 'Logitech MX Keys', 'Wireless Keyboard', 'ACCESSORIES', 'AVAILABLE', '2024-05-01', '2026-05-01', NULL, NULL, NOW(), NOW(), 0, false)
ON CONFLICT (id) DO NOTHING;

-- ══════════════════════════════════════════════════════════════════════════
-- 10. PERFORMANCE REVIEWS (Sample)
-- ══════════════════════════════════════════════════════════════════════════

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'performance_reviews') THEN
        INSERT INTO performance_reviews (id, tenant_id, employee_id, reviewer_id, review_period, review_type, status, self_rating, manager_rating, final_rating, comments, created_at, updated_at, version, is_deleted)
        VALUES
            ('660e8400-pr01-0000-0000-000000000001', '660e8400-e29b-41d4-a716-446655440001', '660e8400-e001-0000-0000-000000000002', '660e8400-e001-0000-0000-000000000001', '2024-Q4', 'QUARTERLY', 'COMPLETED', 4, 4, 4, 'Excellent performance on backend microservices', NOW(), NOW(), 0, false),
            ('660e8400-pr01-0000-0000-000000000002', '660e8400-e29b-41d4-a716-446655440001', '660e8400-e001-0000-0000-000000000003', '660e8400-e001-0000-0000-000000000001', '2024-Q4', 'QUARTERLY', 'COMPLETED', 5, 5, 5, 'Outstanding work on frontend architecture', NOW(), NOW(), 0, false),
            ('660e8400-pr01-0000-0000-000000000003', '660e8400-e29b-41d4-a716-446655440001', '660e8400-e001-0000-0000-000000000004', '660e8400-e001-0000-0000-000000000001', '2024-Q4', 'QUARTERLY', 'IN_PROGRESS', 4, NULL, NULL, NULL, NOW(), NOW(), 0, false)
        ON CONFLICT (id) DO NOTHING;
    END IF;
END $$;

-- ══════════════════════════════════════════════════════════════════════════
-- 11. LMS COURSES (Sample Learning Content)
-- ══════════════════════════════════════════════════════════════════════════

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'lms_courses') THEN
        INSERT INTO lms_courses (id, tenant_id, title, description, category, difficulty_level, duration_hours, status, instructor, thumbnail_url, created_at, updated_at, version, is_deleted)
        VALUES
            ('660e8400-lc01-0000-0000-000000000001', '660e8400-e29b-41d4-a716-446655440001', 'Introduction to TypeScript', 'Learn TypeScript fundamentals and best practices', 'TECHNICAL', 'BEGINNER', 8, 'PUBLISHED', 'Sarah Chen', '/courses/typescript.jpg', NOW(), NOW(), 0, false),
            ('660e8400-lc01-0000-0000-000000000002', '660e8400-e29b-41d4-a716-446655440001', 'React Performance Optimization', 'Advanced techniques for optimizing React applications', 'TECHNICAL', 'ADVANCED', 12, 'PUBLISHED', 'Emily Watson', '/courses/react-perf.jpg', NOW(), NOW(), 0, false),
            ('660e8400-lc01-0000-0000-000000000003', '660e8400-e29b-41d4-a716-446655440001', 'Leadership Essentials', 'Core leadership skills for new managers', 'SOFT_SKILLS', 'INTERMEDIATE', 16, 'PUBLISHED', 'Sophia Wilson', '/courses/leadership.jpg', NOW(), NOW(), 0, false)
        ON CONFLICT (id) DO NOTHING;
    END IF;
END $$;

-- ══════════════════════════════════════════════════════════════════════════
-- 12. WALL POSTS (Social Feed)
-- ══════════════════════════════════════════════════════════════════════════

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'wall_posts') THEN
        INSERT INTO wall_posts (id, tenant_id, author_id, content, post_type, visibility, status, likes_count, comments_count, created_at, updated_at, version, is_deleted)
        VALUES
            ('660e8400-wp01-0000-0000-000000000001', '660e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440040', 'Excited to announce the launch of NU-AURA platform! 🚀 Thank you to the entire team for making this happen.', 'ANNOUNCEMENT', 'PUBLIC', 'PUBLISHED', 15, 3, NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days', 0, false),
            ('660e8400-wp01-0000-0000-000000000002', '660e8400-e29b-41d4-a716-446655440001', '660e8400-e001-0000-0000-000000000001', 'Our Engineering team just completed a major milestone - all core modules are now live! Proud of everyone''s dedication. 💪', 'UPDATE', 'PUBLIC', 'PUBLISHED', 22, 5, NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days', 0, false),
            ('660e8400-wp01-0000-0000-000000000003', '660e8400-e29b-41d4-a716-446655440001', '660e8400-e001-0000-0000-000000000020', 'New blog post: "Building a Culture of Innovation" 📝 Check it out on our internal wiki!', 'BLOG', 'PUBLIC', 'PUBLISHED', 8, 2, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day', 0, false)
        ON CONFLICT (id) DO NOTHING;
    END IF;
END $$;

-- ══════════════════════════════════════════════════════════════════════════
-- 13. RECOGNITION (Employee Recognition)
-- ══════════════════════════════════════════════════════════════════════════

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'recognitions') THEN
        INSERT INTO recognitions (id, tenant_id, from_employee_id, to_employee_id, recognition_type, message, points, status, created_at, updated_at, version, is_deleted)
        VALUES
            ('660e8400-rc01-0000-0000-000000000001', '660e8400-e29b-41d4-a716-446655440001', '660e8400-e001-0000-0000-000000000001', '660e8400-e001-0000-0000-000000000002', 'EXCELLENCE', 'Outstanding work on the authentication module! Your attention to security details is exceptional.', 50, 'APPROVED', NOW() - INTERVAL '7 days', NOW() - INTERVAL '7 days', 0, false),
            ('660e8400-rc01-0000-0000-000000000002', '660e8400-e29b-41d4-a716-446655440001', '660e8400-e001-0000-0000-000000000011', '660e8400-e001-0000-0000-000000000003', 'TEAMWORK', 'Great collaboration on the product roadmap. Your insights were invaluable!', 30, 'APPROVED', NOW() - INTERVAL '4 days', NOW() - INTERVAL '4 days', 0, false),
            ('660e8400-rc01-0000-0000-000000000003', '660e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440040', '660e8400-e001-0000-0000-000000000001', 'LEADERSHIP', 'Thank you for leading the engineering team with such vision and dedication. Your leadership has been instrumental to our success.', 100, 'APPROVED', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days', 0, false)
        ON CONFLICT (id) DO NOTHING;
    END IF;
END $$;

-- ══════════════════════════════════════════════════════════════════════════
-- 14. ATTENDANCE RECORDS (Sample - Last 30 Days)
-- ══════════════════════════════════════════════════════════════════════════

-- Generate attendance records for last 30 days for active employees (weekdays only)
INSERT INTO attendance_records (id, tenant_id, employee_id, date, check_in_time, check_out_time, status, work_hours, created_at, updated_at, version, is_deleted)
SELECT
    gen_random_uuid(),
    '660e8400-e29b-41d4-a716-446655440001',
    e.id,
    d.date,
    d.date + (TIME '09:00:00' + (INTERVAL '1 minute' * FLOOR(RANDOM() * 60))),  -- Random check-in 9:00-10:00 AM
    d.date + (TIME '18:00:00' + (INTERVAL '1 minute' * FLOOR(RANDOM() * 120))), -- Random check-out 6:00-8:00 PM
    'PRESENT',
    8.0 + (RANDOM() * 2)::DECIMAL(4,2),  -- Random work hours 8-10
    NOW(), NOW(), 0, false
FROM employees e
CROSS JOIN (
    SELECT generate_series(
        CURRENT_DATE - INTERVAL '30 days',
        CURRENT_DATE - INTERVAL '1 day',
        '1 day'::INTERVAL
    )::DATE as date
) d
WHERE e.tenant_id = '660e8400-e29b-41d4-a716-446655440001'
  AND e.employee_code LIKE 'EMP-%'
  AND e.status = 'ACTIVE'
  AND EXTRACT(DOW FROM d.date) NOT IN (0, 6)  -- Exclude weekends
  AND NOT EXISTS (
      SELECT 1 FROM attendance_records ar
      WHERE ar.employee_id = e.id
        AND ar.date = d.date
  )
LIMIT 500;  -- Limit to prevent too many inserts

-- ══════════════════════════════════════════════════════════════════════════
-- SEED DATA COMPLETE
-- ══════════════════════════════════════════════════════════════════════════

-- Summary:
-- ✓ 8 Departments
-- ✓ 25+ Users & Employees across all departments
-- ✓ 6 Leave Types with balances for all employees
-- ✓ 8 National Holidays (2025)
-- ✓ 3 Company Announcements
-- ✓ 3 Active Projects
-- ✓ 3 Job Openings
-- ✓ 5 Sample Assets (laptops, monitors, furniture)
-- ✓ 3 Performance Reviews
-- ✓ 3 LMS Courses
-- ✓ 3 Wall Posts
-- ✓ 3 Recognition Posts
-- ✓ 30 days of Attendance Records (weekdays only, ~500 records)

SELECT 'V30: Comprehensive demo seed data loaded successfully!' as status;
