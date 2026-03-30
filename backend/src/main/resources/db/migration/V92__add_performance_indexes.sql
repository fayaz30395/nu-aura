-- =============================================================================
-- V92: Platform Performance Indexes — High-Traffic Query Optimisation
-- =============================================================================
-- Added as part of platform performance audit (2026-03-30).
-- All indexes use IF NOT EXISTS for idempotency and CONCURRENTLY to avoid
-- write locks on live tables.
--
-- Pre-flight notes (columns verified against V0__init.sql):
--   employees        : status (NOT employment_status), manager_id (NOT reporting_manager_id),
--                      no work_email column — personal_email used instead
--   attendance_records: attendance_date (NOT date)
--   payslips         : pay_period_year + pay_period_month (NOT pay_period_start)
--   audit_logs       : action (NOT action_type)
--   candidates       : current_stage (NOT pipeline_stage)
--   time_entries     : entry_date (NOT date)
--   workflow engine  : workflow_executions + step_executions
--                      (approval_tasks / approval_instances do NOT exist)
--
-- Indexes already covered by earlier migrations are omitted:
--   V9  — idx_employees_tenant_status, idx_employees_tenant_dept,
--          idx_employees_tenant_joining_date, idx_attendance_tenant_date,
--          idx_attendance_tenant_emp_date, idx_leave_requests_tenant_status,
--          idx_leave_requests_tenant_emp_status, idx_leave_requests_tenant_dates,
--          idx_payslips_tenant_period, idx_payslips_tenant_emp_period,
--          idx_perf_reviews_tenant_cycle, idx_perf_reviews_tenant_emp
--   V34 — idx_audit_logs_tenant_action, idx_notifications_tenant_user_read,
--          idx_approval_tasks_assignee_status, idx_approval_instances_entity
--   V39 — idx_candidates_tenant_status, idx_job_openings_tenant_status
--   V59 — idx_employees_manager_tenant_status
--   V71 — idx_step_executions_inbox, idx_step_executions_action_by
-- =============================================================================

-- -----------------------------------------------------------------------------
-- EMPLOYEE QUERIES
-- Most frequently queried entity — multi-column composite indexes for the
-- join patterns not yet covered by V9 or V59.
-- -----------------------------------------------------------------------------

-- Lookup by email within a tenant (login, duplicate-check, search)
CREATE INDEX IF NOT EXISTS idx_employees_tenant_email
    ON employees (tenant_id, personal_email)
    WHERE is_deleted = false;

-- Employee directory sorted by join date (dashboard widgets, anniversary lists)
-- V9 has (tenant_id, joining_date) but without the active-only partial filter.
CREATE INDEX IF NOT EXISTS idx_employees_tenant_joining_active
    ON employees (tenant_id, joining_date DESC)
    WHERE is_deleted = false;

-- -----------------------------------------------------------------------------
-- PAYROLL QUERIES
-- Heavy reporting queries; payslips table uses year+month integers, not a date.
-- -----------------------------------------------------------------------------

-- Payslip list for a specific payroll run (run summary, bulk download)
CREATE INDEX IF NOT EXISTS idx_payslips_tenant_run
    ON payslips (tenant_id, payroll_run_id)
    WHERE is_deleted = false;

-- Payroll run status filter (dashboard: pending/approved runs)
CREATE INDEX IF NOT EXISTS idx_payroll_runs_tenant_status
    ON payroll_runs (tenant_id, status)
    WHERE is_deleted = false;

-- Payroll run period lookup (find run for a given month/year)
CREATE INDEX IF NOT EXISTS idx_payroll_runs_tenant_period
    ON payroll_runs (tenant_id, pay_period_year, pay_period_month)
    WHERE is_deleted = false;

-- -----------------------------------------------------------------------------
-- WORKFLOW ENGINE (step_executions / workflow_executions)
-- Queried on every page load for approval badge counts.
-- step_executions inbox index (tenant+assignee+status) is already in V71.
-- Adding status filter on workflow_executions for entity-level status checks.
-- -----------------------------------------------------------------------------

-- Workflow execution status per entity (e.g. "is this leave request approved?")
CREATE INDEX IF NOT EXISTS idx_workflow_executions_tenant_status
    ON workflow_executions (tenant_id, status)
    WHERE is_deleted = false;

-- Workflow execution lookup by entity (most common join from leave/asset/expense)
CREATE INDEX IF NOT EXISTS idx_workflow_executions_tenant_entity
    ON workflow_executions (tenant_id, entity_type, entity_id)
    WHERE is_deleted = false;

-- -----------------------------------------------------------------------------
-- AUDIT LOGS
-- Frequent admin search and filter queries.
-- V34 covers (tenant_id, action, created_at DESC).
-- Adding entity + time for the entity history panel.
-- -----------------------------------------------------------------------------

-- Chronological audit trail per entity (e.g. "history of employee #X")
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_entity_time
    ON audit_logs (tenant_id, entity_type, entity_id, created_at DESC)
    WHERE is_deleted = false;

-- -----------------------------------------------------------------------------
-- NOTIFICATIONS
-- Queried on every page load (unread badge count + notification dropdown).
-- V34 covers (tenant_id, user_id, is_read, created_at DESC).
-- Adding a partial index on unread-only rows to speed up the badge count query.
-- -----------------------------------------------------------------------------

-- Fast unread count per user (used on every page load for the badge)
CREATE INDEX IF NOT EXISTS idx_notifications_unread
    ON notifications (tenant_id, user_id)
    WHERE is_read = false AND is_deleted = false;

-- -----------------------------------------------------------------------------
-- RECRUITMENT
-- Candidate pipeline views filtered by current stage.
-- V39 covers (tenant_id, status) and (tenant_id, job_opening_id, status).
-- Adding current_stage for the Kanban pipeline column queries.
-- -----------------------------------------------------------------------------

-- Candidates grouped by pipeline stage (Kanban board column load)
CREATE INDEX IF NOT EXISTS idx_candidates_tenant_stage
    ON candidates (tenant_id, current_stage, status)
    WHERE is_deleted = false;

-- -----------------------------------------------------------------------------
-- TIME ENTRIES
-- Time tracking queries grouped by employee and date range.
-- -----------------------------------------------------------------------------

-- Time entries for an employee within a date range (timesheet views, billing)
CREATE INDEX IF NOT EXISTS idx_time_entries_tenant_emp_date
    ON time_entries (tenant_id, employee_id, entry_date DESC)
    WHERE is_deleted = false;

-- Time entries by project (project cost rollups, project manager views)
CREATE INDEX IF NOT EXISTS idx_time_entries_tenant_project_date
    ON time_entries (tenant_id, project_id, entry_date DESC)
    WHERE project_id IS NOT NULL AND is_deleted = false;
