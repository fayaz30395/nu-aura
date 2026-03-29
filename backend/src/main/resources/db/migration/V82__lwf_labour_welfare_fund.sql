-- ============================================================================
-- V82: Labour Welfare Fund (LWF) — statutory deduction tables + seed data
-- ============================================================================
-- LWF is a state-specific statutory contribution in India.
-- Both employer and employee contribute fixed amounts.
-- Different states have different amounts, frequencies, and applicable months.
-- ============================================================================

-- 1. LWF Configuration table (state-wise rules)
CREATE TABLE IF NOT EXISTS lwf_configurations (
    id              UUID PRIMARY KEY,
    tenant_id       UUID NOT NULL,
    state_code      VARCHAR(5) NOT NULL,
    state_name      VARCHAR(50) NOT NULL,
    employee_contribution NUMERIC(10, 2) NOT NULL,
    employer_contribution NUMERIC(10, 2) NOT NULL,
    frequency       VARCHAR(20) NOT NULL CHECK (frequency IN ('MONTHLY', 'HALF_YEARLY', 'YEARLY')),
    applicable_months VARCHAR(100) NOT NULL,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    effective_from  DATE NOT NULL,
    effective_to    DATE,
    salary_threshold NUMERIC(10, 2),
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by      UUID,
    updated_by      UUID
);

CREATE INDEX idx_lwf_config_tenant ON lwf_configurations(tenant_id);
CREATE INDEX idx_lwf_config_tenant_state ON lwf_configurations(tenant_id, state_code);
CREATE INDEX idx_lwf_config_active ON lwf_configurations(tenant_id, is_active);

-- 2. LWF Deduction records table (per employee per period)
CREATE TABLE IF NOT EXISTS lwf_deductions (
    id              UUID PRIMARY KEY,
    tenant_id       UUID NOT NULL,
    employee_id     UUID NOT NULL,
    payroll_run_id  UUID,
    state_code      VARCHAR(5) NOT NULL,
    employee_amount NUMERIC(10, 2) NOT NULL,
    employer_amount NUMERIC(10, 2) NOT NULL,
    frequency       VARCHAR(20) NOT NULL CHECK (frequency IN ('MONTHLY', 'HALF_YEARLY', 'YEARLY')),
    deduction_month INTEGER NOT NULL CHECK (deduction_month BETWEEN 1 AND 12),
    deduction_year  INTEGER NOT NULL CHECK (deduction_year >= 2020),
    status          VARCHAR(20) NOT NULL DEFAULT 'CALCULATED'
                    CHECK (status IN ('CALCULATED', 'DEDUCTED', 'REMITTED')),
    gross_salary    NUMERIC(12, 2),
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_lwf_ded_tenant ON lwf_deductions(tenant_id);
CREATE INDEX idx_lwf_ded_employee ON lwf_deductions(tenant_id, employee_id);
CREATE INDEX idx_lwf_ded_payroll_run ON lwf_deductions(tenant_id, payroll_run_id);
CREATE INDEX idx_lwf_ded_period ON lwf_deductions(tenant_id, deduction_month, deduction_year);
CREATE INDEX idx_lwf_ded_state ON lwf_deductions(tenant_id, state_code);

-- Prevent duplicate deductions for the same employee in the same period
CREATE UNIQUE INDEX idx_lwf_ded_unique_emp_period
    ON lwf_deductions(tenant_id, employee_id, deduction_month, deduction_year);

-- 3. Add LWF columns to monthly_statutory_contributions (if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'monthly_statutory_contributions') THEN
        IF NOT EXISTS (SELECT FROM information_schema.columns
                       WHERE table_name = 'monthly_statutory_contributions'
                       AND column_name = 'lwf_employee_contribution') THEN
            ALTER TABLE monthly_statutory_contributions
                ADD COLUMN lwf_employee_contribution NUMERIC(10, 2),
                ADD COLUMN lwf_employer_contribution NUMERIC(10, 2);
        END IF;
    END IF;
END $$;

-- 4. Enable RLS on new tables
ALTER TABLE lwf_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE lwf_deductions ENABLE ROW LEVEL SECURITY;

-- RLS policies: tenant isolation
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'lwf_configurations' AND policyname = 'lwf_configurations_tenant_isolation') THEN
        EXECUTE 'CREATE POLICY lwf_configurations_tenant_isolation ON lwf_configurations
            USING (tenant_id = current_setting(''app.current_tenant'')::UUID)';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'lwf_deductions' AND policyname = 'lwf_deductions_tenant_isolation') THEN
        EXECUTE 'CREATE POLICY lwf_deductions_tenant_isolation ON lwf_deductions
            USING (tenant_id = current_setting(''app.current_tenant'')::UUID)';
    END IF;
END $$;

-- 5. Seed LWF permissions
INSERT INTO permissions (id, tenant_id, name, description, module, action, is_active, created_at, updated_at)
SELECT gen_random_uuid(), t.id, 'lwf.view', 'View LWF configurations and deductions', 'lwf', 'view', true, NOW(), NOW()
FROM tenants t
WHERE NOT EXISTS (
    SELECT 1 FROM permissions p WHERE p.tenant_id = t.id AND p.name = 'lwf.view'
)
ON CONFLICT DO NOTHING;

INSERT INTO permissions (id, tenant_id, name, description, module, action, is_active, created_at, updated_at)
SELECT gen_random_uuid(), t.id, 'lwf.manage', 'Manage LWF configurations', 'lwf', 'manage', true, NOW(), NOW()
FROM tenants t
WHERE NOT EXISTS (
    SELECT 1 FROM permissions p WHERE p.tenant_id = t.id AND p.name = 'lwf.manage'
)
ON CONFLICT DO NOTHING;

-- Grant LWF permissions to HR Admin and Payroll Manager roles
INSERT INTO role_permissions (id, role_id, permission_id, created_at, updated_at)
SELECT gen_random_uuid(), r.id, p.id, NOW(), NOW()
FROM roles r
CROSS JOIN permissions p
WHERE r.name IN ('HR_ADMIN', 'HR_MANAGER', 'PAYROLL_MANAGER', 'SUPER_ADMIN')
  AND p.name IN ('lwf.view', 'lwf.manage')
  AND r.tenant_id = p.tenant_id
  AND NOT EXISTS (
      SELECT 1 FROM role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id
  )
ON CONFLICT DO NOTHING;

-- 6. Seed default LWF configurations for major Indian states
-- Uses a well-known demo tenant UUID (same pattern as other seed migrations)
-- These are realistic rates as of 2024-25
DO $$
DECLARE
    v_tenant_id UUID;
BEGIN
    -- Get the first tenant for seeding (same pattern as V72, V76)
    SELECT id INTO v_tenant_id FROM tenants ORDER BY created_at ASC LIMIT 1;

    IF v_tenant_id IS NULL THEN
        RAISE NOTICE 'No tenant found for LWF seed data — skipping';
        RETURN;
    END IF;

    -- Maharashtra (MH): Half-yearly — June & December
    -- Employee: ₹25, Employer: ₹75
    INSERT INTO lwf_configurations (id, tenant_id, state_code, state_name, employee_contribution, employer_contribution, frequency, applicable_months, is_active, effective_from)
    VALUES (gen_random_uuid(), v_tenant_id, 'MH', 'Maharashtra', 25.00, 75.00, 'HALF_YEARLY', '[6,12]', true, '2024-04-01')
    ON CONFLICT DO NOTHING;

    -- Karnataka (KA): Yearly — December
    -- Employee: ₹20, Employer: ₹40
    INSERT INTO lwf_configurations (id, tenant_id, state_code, state_name, employee_contribution, employer_contribution, frequency, applicable_months, is_active, effective_from)
    VALUES (gen_random_uuid(), v_tenant_id, 'KA', 'Karnataka', 20.00, 40.00, 'YEARLY', '[12]', true, '2024-04-01')
    ON CONFLICT DO NOTHING;

    -- Tamil Nadu (TN): Monthly — all months
    -- Employee: ₹10, Employer: ₹20
    INSERT INTO lwf_configurations (id, tenant_id, state_code, state_name, employee_contribution, employer_contribution, frequency, applicable_months, is_active, effective_from)
    VALUES (gen_random_uuid(), v_tenant_id, 'TN', 'Tamil Nadu', 10.00, 20.00, 'MONTHLY', '[1,2,3,4,5,6,7,8,9,10,11,12]', true, '2024-04-01')
    ON CONFLICT DO NOTHING;

    -- Delhi (DL): Yearly — December
    -- Employee: ₹15, Employer: ₹25
    INSERT INTO lwf_configurations (id, tenant_id, state_code, state_name, employee_contribution, employer_contribution, frequency, applicable_months, is_active, effective_from)
    VALUES (gen_random_uuid(), v_tenant_id, 'DL', 'Delhi', 15.00, 25.00, 'YEARLY', '[12]', true, '2024-04-01')
    ON CONFLICT DO NOTHING;

    -- Gujarat (GJ): Half-yearly — June & December
    -- Employee: ₹6, Employer: ₹12
    INSERT INTO lwf_configurations (id, tenant_id, state_code, state_name, employee_contribution, employer_contribution, frequency, applicable_months, is_active, effective_from)
    VALUES (gen_random_uuid(), v_tenant_id, 'GJ', 'Gujarat', 6.00, 12.00, 'HALF_YEARLY', '[6,12]', true, '2024-04-01')
    ON CONFLICT DO NOTHING;

    -- Telangana (TS): Yearly — December
    -- Employee: ₹10, Employer: ₹20
    INSERT INTO lwf_configurations (id, tenant_id, state_code, state_name, employee_contribution, employer_contribution, frequency, applicable_months, is_active, effective_from)
    VALUES (gen_random_uuid(), v_tenant_id, 'TS', 'Telangana', 10.00, 20.00, 'YEARLY', '[12]', true, '2024-04-01')
    ON CONFLICT DO NOTHING;

    -- West Bengal (WB): Half-yearly — June & December
    -- Employee: ₹3, Employer: ₹5 (for salary > ₹10,000)
    INSERT INTO lwf_configurations (id, tenant_id, state_code, state_name, employee_contribution, employer_contribution, frequency, applicable_months, is_active, effective_from, salary_threshold)
    VALUES (gen_random_uuid(), v_tenant_id, 'WB', 'West Bengal', 3.00, 5.00, 'HALF_YEARLY', '[6,12]', true, '2024-04-01', 10000.00)
    ON CONFLICT DO NOTHING;

    -- Madhya Pradesh (MP): Half-yearly — June & December
    -- Employee: ₹10, Employer: ₹30
    INSERT INTO lwf_configurations (id, tenant_id, state_code, state_name, employee_contribution, employer_contribution, frequency, applicable_months, is_active, effective_from)
    VALUES (gen_random_uuid(), v_tenant_id, 'MP', 'Madhya Pradesh', 10.00, 30.00, 'HALF_YEARLY', '[6,12]', true, '2024-04-01')
    ON CONFLICT DO NOTHING;

    -- Andhra Pradesh (AP): Yearly — December
    -- Employee: ₹10, Employer: ₹20
    INSERT INTO lwf_configurations (id, tenant_id, state_code, state_name, employee_contribution, employer_contribution, frequency, applicable_months, is_active, effective_from)
    VALUES (gen_random_uuid(), v_tenant_id, 'AP', 'Andhra Pradesh', 10.00, 20.00, 'YEARLY', '[12]', true, '2024-04-01')
    ON CONFLICT DO NOTHING;

    -- Rajasthan (RJ): Half-yearly — June & December
    -- Employee: ₹20, Employer: ₹40
    INSERT INTO lwf_configurations (id, tenant_id, state_code, state_name, employee_contribution, employer_contribution, frequency, applicable_months, is_active, effective_from)
    VALUES (gen_random_uuid(), v_tenant_id, 'RJ', 'Rajasthan', 20.00, 40.00, 'HALF_YEARLY', '[6,12]', true, '2024-04-01')
    ON CONFLICT DO NOTHING;

    RAISE NOTICE 'Seeded LWF configurations for 10 Indian states in tenant %', v_tenant_id;
END $$;
