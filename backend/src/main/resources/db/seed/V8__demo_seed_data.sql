-- V8: Demo seed data for Acme Corp demonstration tenant
-- All records use a fixed tenant_id; inserts are idempotent via ON CONFLICT DO NOTHING.
-- Column names match actual JPA entity field mappings.

-- ─── Tenant ───────────────────────────────────────────────────────────────────
INSERT INTO tenants (id, code, name, status, created_at, updated_at, is_deleted)
VALUES ('00000000-0000-0000-0000-000000000001', 'acme', 'Acme Corp', 'ACTIVE', NOW(), NOW(), false)
ON CONFLICT (id) DO NOTHING;

-- ─── Departments ─────────────────────────────────────────────────────────────
INSERT INTO departments (id, tenant_id, name, code, is_active, created_at, updated_at, is_deleted)
VALUES
    ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Engineering',     'ENG',  true, NOW(), NOW(), false),
    ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Product',         'PROD', true, NOW(), NOW(), false),
    ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'Human Resources', 'HR',   true, NOW(), NOW(), false)
ON CONFLICT (id) DO NOTHING;

-- ─── Users (required for employee FK user_id) ─────────────────────────────────
INSERT INTO users (id, tenant_id, email, first_name, last_name, password_hash, status, created_at, updated_at, is_deleted)
VALUES
    ('61000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'sarah.chen@acme.example.com',           'Sarah',   'Chen',       '$2a$10$demoHashPlaceholder001', 'ACTIVE', NOW(), NOW(), false),
    ('61000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'michael.rodriguez@acme.example.com',    'Michael', 'Rodriguez',  '$2a$10$demoHashPlaceholder002', 'ACTIVE', NOW(), NOW(), false),
    ('61000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'priya.patel@acme.example.com',          'Priya',   'Patel',      '$2a$10$demoHashPlaceholder003', 'ACTIVE', NOW(), NOW(), false),
    ('61000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'alex.kim@acme.example.com',             'Alex',    'Kim',        '$2a$10$demoHashPlaceholder004', 'ACTIVE', NOW(), NOW(), false),
    ('61000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'jamie.liu@acme.example.com',            'Jamie',   'Liu',        '$2a$10$demoHashPlaceholder005', 'ACTIVE', NOW(), NOW(), false)
ON CONFLICT (id) DO NOTHING;

-- ─── Employees ───────────────────────────────────────────────────────────────
-- Note: email lives on users table; employee has user_id FK.
-- joining_date (not join_date), employment_type required NOT NULL.
INSERT INTO employees (
    id, tenant_id, employee_code, user_id,
    first_name, last_name,
    designation, department_id,
    employment_type, status, joining_date,
    created_at, updated_at, is_deleted
)
VALUES
    (
        '20000000-0000-0000-0000-000000000001',
        '00000000-0000-0000-0000-000000000001',
        'EMP001', '61000000-0000-0000-0000-000000000001',
        'Sarah', 'Chen',
        'Chief Technology Officer', '10000000-0000-0000-0000-000000000001',
        'FULL_TIME', 'ACTIVE', '2021-01-15',
        NOW(), NOW(), false
    ),
    (
        '20000000-0000-0000-0000-000000000002',
        '00000000-0000-0000-0000-000000000001',
        'EMP002', '61000000-0000-0000-0000-000000000002',
        'Michael', 'Rodriguez',
        'Engineering Manager', '10000000-0000-0000-0000-000000000001',
        'FULL_TIME', 'ACTIVE', '2021-06-01',
        NOW(), NOW(), false
    ),
    (
        '20000000-0000-0000-0000-000000000003',
        '00000000-0000-0000-0000-000000000001',
        'EMP003', '61000000-0000-0000-0000-000000000003',
        'Priya', 'Patel',
        'Senior Software Engineer', '10000000-0000-0000-0000-000000000001',
        'FULL_TIME', 'ACTIVE', '2022-03-01',
        NOW(), NOW(), false
    ),
    (
        '20000000-0000-0000-0000-000000000004',
        '00000000-0000-0000-0000-000000000001',
        'EMP004', '61000000-0000-0000-0000-000000000004',
        'Alex', 'Kim',
        'Product Manager', '10000000-0000-0000-0000-000000000002',
        'FULL_TIME', 'ACTIVE', '2021-09-15',
        NOW(), NOW(), false
    ),
    (
        '20000000-0000-0000-0000-000000000005',
        '00000000-0000-0000-0000-000000000001',
        'EMP005', '61000000-0000-0000-0000-000000000005',
        'Jamie', 'Liu',
        'HR Manager', '10000000-0000-0000-0000-000000000003',
        'FULL_TIME', 'ACTIVE', '2021-03-01',
        NOW(), NOW(), false
    )
ON CONFLICT (id) DO NOTHING;

-- ─── Leave types ─────────────────────────────────────────────────────────────
-- Actual column names: leave_name (not name), leave_code (not code), annual_quota (not max_days_per_year)
INSERT INTO leave_types (id, tenant_id, leave_name, leave_code, annual_quota, is_paid, is_active, created_at, updated_at, is_deleted)
VALUES
    (
        '30000000-0000-0000-0000-000000000001',
        '00000000-0000-0000-0000-000000000001',
        'Annual Leave', 'AL', 18.00, true, true, NOW(), NOW(), false
    ),
    (
        '30000000-0000-0000-0000-000000000002',
        '00000000-0000-0000-0000-000000000001',
        'Sick Leave', 'SL', 12.00, true, true, NOW(), NOW(), false
    )
ON CONFLICT (id) DO NOTHING;

-- ─── Projects ────────────────────────────────────────────────────────────────
-- Actual column names: project_code (not code); status enum: IN_PROGRESS not ACTIVE; priority required NOT NULL
INSERT INTO projects (id, tenant_id, name, project_code, status, priority, start_date, created_at, updated_at, is_deleted)
VALUES
    (
        '40000000-0000-0000-0000-000000000001',
        '00000000-0000-0000-0000-000000000001',
        'Aurora Platform', 'AURORA', 'IN_PROGRESS', 'HIGH', '2024-01-01', NOW(), NOW(), false
    ),
    (
        '40000000-0000-0000-0000-000000000002',
        '00000000-0000-0000-0000-000000000001',
        'Internal Tools', 'INTTOOLS', 'IN_PROGRESS', 'MEDIUM', '2024-06-01', NOW(), NOW(), false
    )
ON CONFLICT (id) DO NOTHING;

-- ─── Project employee assignments ─────────────────────────────────────────────
-- ProjectEmployee uses is_active (BOOLEAN) not status (String)
INSERT INTO project_employees (id, tenant_id, project_id, employee_id, role, allocation_percentage, start_date, is_active, created_at, updated_at, is_deleted)
VALUES
    (
        '50000000-0000-0000-0000-000000000001',
        '00000000-0000-0000-0000-000000000001',
        '40000000-0000-0000-0000-000000000001',
        '20000000-0000-0000-0000-000000000002',
        'TECH_LEAD', 60, '2024-01-01', true, NOW(), NOW(), false
    ),
    (
        '50000000-0000-0000-0000-000000000002',
        '00000000-0000-0000-0000-000000000001',
        '40000000-0000-0000-0000-000000000001',
        '20000000-0000-0000-0000-000000000003',
        'DEVELOPER', 100, '2024-01-01', true, NOW(), NOW(), false
    ),
    (
        '50000000-0000-0000-0000-000000000003',
        '00000000-0000-0000-0000-000000000001',
        '40000000-0000-0000-0000-000000000002',
        '20000000-0000-0000-0000-000000000002',
        'DEVELOPER', 40, '2024-06-01', true, NOW(), NOW(), false
    )
ON CONFLICT (id) DO NOTHING;
