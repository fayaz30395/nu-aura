-- V8: Demo seed data for Acme Corp demonstration tenant
-- All records use a fixed tenant_id; inserts are idempotent via ON CONFLICT DO NOTHING.

-- ─── Tenant ───────────────────────────────────────────────────────────────────
INSERT INTO tenants (id, name, slug, plan, is_active, created_at)
VALUES ('00000000-0000-0000-0000-000000000001', 'Acme Corp', 'acme', 'ENTERPRISE', true, NOW())
ON CONFLICT (id) DO NOTHING;

-- ─── Departments ─────────────────────────────────────────────────────────────
INSERT INTO departments (id, tenant_id, name, code, created_at)
VALUES
    ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Engineering', 'ENG', NOW()),
    ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Product', 'PROD', NOW()),
    ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'Human Resources', 'HR', NOW())
ON CONFLICT (id) DO NOTHING;

-- ─── Employees ───────────────────────────────────────────────────────────────
INSERT INTO employees (
    id, tenant_id, employee_code, first_name, last_name, email,
    designation, department_id, status, join_date, created_at
)
VALUES
    (
        '20000000-0000-0000-0000-000000000001',
        '00000000-0000-0000-0000-000000000001',
        'EMP001', 'Sarah', 'Chen', 'sarah.chen@acme.example.com',
        'Chief Technology Officer',
        '10000000-0000-0000-0000-000000000001',
        'ACTIVE', '2021-01-15', NOW()
    ),
    (
        '20000000-0000-0000-0000-000000000002',
        '00000000-0000-0000-0000-000000000001',
        'EMP002', 'Michael', 'Rodriguez', 'michael.rodriguez@acme.example.com',
        'Engineering Manager',
        '10000000-0000-0000-0000-000000000001',
        'ACTIVE', '2021-06-01', NOW()
    ),
    (
        '20000000-0000-0000-0000-000000000003',
        '00000000-0000-0000-0000-000000000001',
        'EMP003', 'Priya', 'Patel', 'priya.patel@acme.example.com',
        'Senior Software Engineer',
        '10000000-0000-0000-0000-000000000001',
        'ACTIVE', '2022-03-01', NOW()
    ),
    (
        '20000000-0000-0000-0000-000000000004',
        '00000000-0000-0000-0000-000000000001',
        'EMP004', 'Alex', 'Kim', 'alex.kim@acme.example.com',
        'Product Manager',
        '10000000-0000-0000-0000-000000000002',
        'ACTIVE', '2021-09-15', NOW()
    ),
    (
        '20000000-0000-0000-0000-000000000005',
        '00000000-0000-0000-0000-000000000001',
        'EMP005', 'Jamie', 'Liu', 'jamie.liu@acme.example.com',
        'HR Manager',
        '10000000-0000-0000-0000-000000000003',
        'ACTIVE', '2021-03-01', NOW()
    )
ON CONFLICT (id) DO NOTHING;

-- ─── Leave types ─────────────────────────────────────────────────────────────
INSERT INTO leave_types (id, tenant_id, name, code, max_days_per_year, is_paid, is_active, created_at)
VALUES
    (
        '30000000-0000-0000-0000-000000000001',
        '00000000-0000-0000-0000-000000000001',
        'Annual Leave', 'AL', 18, true, true, NOW()
    ),
    (
        '30000000-0000-0000-0000-000000000002',
        '00000000-0000-0000-0000-000000000001',
        'Sick Leave', 'SL', 12, true, true, NOW()
    )
ON CONFLICT (id) DO NOTHING;

-- ─── Projects ────────────────────────────────────────────────────────────────
INSERT INTO projects (id, tenant_id, name, code, status, start_date, created_at)
VALUES
    (
        '40000000-0000-0000-0000-000000000001',
        '00000000-0000-0000-0000-000000000001',
        'Aurora Platform', 'AURORA', 'ACTIVE', '2024-01-01', NOW()
    ),
    (
        '40000000-0000-0000-0000-000000000002',
        '00000000-0000-0000-0000-000000000001',
        'Internal Tools', 'INTTOOLS', 'ACTIVE', '2024-06-01', NOW()
    )
ON CONFLICT (id) DO NOTHING;

-- ─── Project employee assignments ─────────────────────────────────────────────
INSERT INTO project_employees (id, tenant_id, project_id, employee_id, role, allocation_percentage, start_date, status, created_at)
VALUES
    (
        '50000000-0000-0000-0000-000000000001',
        '00000000-0000-0000-0000-000000000001',
        '40000000-0000-0000-0000-000000000001',
        '20000000-0000-0000-0000-000000000002',
        'TECH_LEAD', 60, '2024-01-01', 'ACTIVE', NOW()
    ),
    (
        '50000000-0000-0000-0000-000000000002',
        '00000000-0000-0000-0000-000000000001',
        '40000000-0000-0000-0000-000000000001',
        '20000000-0000-0000-0000-000000000003',
        'DEVELOPER', 100, '2024-01-01', 'ACTIVE', NOW()
    ),
    (
        '50000000-0000-0000-0000-000000000003',
        '00000000-0000-0000-0000-000000000001',
        '40000000-0000-0000-0000-000000000002',
        '20000000-0000-0000-0000-000000000002',
        'DEVELOPER', 40, '2024-06-01', 'ACTIVE', NOW()
    )
ON CONFLICT (id) DO NOTHING;
