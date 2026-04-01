-- V55: Consolidate dual project employee/member tables
-- Strategy: View-aliasing (non-destructive)
--
-- project_employees (V0) — older table
-- project_members   (V0) — current table with NUMERIC precision and billing rates
--
-- This migration merges project_employees INTO project_members as the single
-- source of truth, then replaces project_employees with a backwards-compatible VIEW.

-- Step 1: Copy any project_employees rows not yet in project_members
INSERT INTO project_members (
    id, tenant_id, created_at, updated_at,
    project_id, employee_id, role, allocation_percentage,
    start_date, end_date, is_active, can_approve_time
)
SELECT
    pe.id,
    pe.tenant_id,
    COALESCE(pe.created_at, NOW()),
    COALESCE(pe.updated_at, NOW()),
    pe.project_id,
    pe.employee_id,
    COALESCE(pe.role, 'MEMBER'),
    COALESCE(pe.allocation_percentage, 0)::NUMERIC(5,2),
    COALESCE(pe.start_date, CURRENT_DATE),
    pe.end_date,
    COALESCE(pe.is_active, TRUE),
    FALSE
FROM project_employees pe
WHERE NOT EXISTS (
    SELECT 1 FROM project_members pm
    WHERE pm.project_id  = pe.project_id
      AND pm.employee_id = pe.employee_id
      AND pm.tenant_id   = pe.tenant_id
);

-- Step 2: Drop the old table
DROP TABLE IF EXISTS project_employees CASCADE;

-- Step 3: Create a backwards-compatible view
CREATE OR REPLACE VIEW project_employees AS
SELECT
    id,
    tenant_id,
    created_at,
    updated_at,
    project_id,
    employee_id,
    role::VARCHAR(100)            AS role,
    allocation_percentage::INTEGER AS allocation_percentage,
    start_date,
    end_date,
    is_active
FROM project_members;

-- Step 4: Indexes on real table
CREATE INDEX IF NOT EXISTS idx_project_members_project  ON project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_project_members_employee ON project_members(employee_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_project_members_unique
    ON project_members(project_id, employee_id, tenant_id);
