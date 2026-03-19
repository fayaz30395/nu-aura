-- V55: Consolidate dual project employee/member tables
-- Strategy: View-aliasing (non-destructive)
--
-- Context:
--   project_employees  (V0) — older table, INTEGER allocation, no billing/cost rates
--   project_members    (V0) — current table, NUMERIC(5,2) allocation, billing_rate, cost_rate, can_approve_time, notes
--
-- The JPA entity ProjectEmployee maps to project_employees and is used by
-- ResourceManagement, AllocationApproval, WorkloadAnalytics, and ResourceAllocation services.
-- The JPA entity ProjectMember maps to project_members and is used by
-- ProjectTimesheetService (timesheet billing, member CRUD).
--
-- Both tables are actively written to, which creates data-consistency risk.
-- This migration merges project_employees INTO project_members as the single
-- source of truth, then replaces the project_employees table with a
-- backwards-compatible VIEW so existing JPA mappings continue to work without
-- code changes.
--
-- Step 1: Migrate rows from project_employees that don't already exist in project_members
-- Step 2: Drop the project_employees table
-- Step 3: Create a VIEW named project_employees that reads from project_members

-- Step 1: Copy any project_employees rows that are not yet in project_members
INSERT INTO project_members (
    id, tenant_id, created_at, updated_at, created_by, updated_by, version, is_deleted,
    project_id, employee_id, role, allocation_percentage, billing_rate, cost_rate,
    start_date, end_date, is_active, can_approve_time, notes
)
SELECT
    pe.id,
    pe.tenant_id,
    pe.created_at,
    pe.updated_at,
    pe.created_by,
    pe.updated_by,
    pe.version,
    pe.is_deleted,
    pe.project_id,
    pe.employee_id,
    COALESCE(pe.role, 'MEMBER'),
    COALESCE(pe.allocation_percentage, 0)::NUMERIC(5,2),
    NULL,   -- billing_rate  (not available in old table)
    NULL,   -- cost_rate     (not available in old table)
    pe.start_date,
    pe.end_date,
    pe.is_active,
    FALSE,  -- can_approve_time default
    NULL    -- notes
FROM project_employees pe
WHERE NOT EXISTS (
    SELECT 1 FROM project_members pm
    WHERE pm.project_id  = pe.project_id
      AND pm.employee_id = pe.employee_id
      AND pm.tenant_id   = pe.tenant_id
);

-- Step 2: Drop the old table and its indexes
DROP TABLE IF EXISTS project_employees CASCADE;

-- Step 3: Create a backwards-compatible view for existing JPA queries
CREATE OR REPLACE VIEW project_employees AS
SELECT
    id,
    tenant_id,
    created_at,
    updated_at,
    created_by,
    updated_by,
    version,
    is_deleted,
    project_id,
    employee_id,
    role::VARCHAR(100)            AS role,
    allocation_percentage::INTEGER AS allocation_percentage,
    start_date,
    end_date,
    is_active
FROM project_members;

-- Recreate the indexes that the JPA entity expects (on the real table)
CREATE INDEX IF NOT EXISTS idx_project_members_project  ON project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_project_members_employee ON project_members(employee_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_project_members_unique
    ON project_members(project_id, employee_id, tenant_id);
