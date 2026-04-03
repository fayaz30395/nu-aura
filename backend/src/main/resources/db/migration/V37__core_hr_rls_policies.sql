-- =============================================================================
-- V37 - Enable RLS on Core HR Tables with Tenant-Scoped Policies
-- =============================================================================
--
-- CONTEXT:
--   V36 added "graceful defence-in-depth" RLS to 20 tables (Fluence + Contracts).
--   This migration extends the same pattern to core HR tables that handle the
--   most sensitive data: employees, leave, attendance, payroll, departments,
--   roles/permissions, assets, and approvals.
--
-- STRATEGY (same as V36):
--   1. Enable RLS on each table
--   2. Add PERMISSIVE allow-all policy (baseline)
--   3. Add RESTRICTIVE tenant-scoped policy (enforcement when session var is set)
--
--   When app.current_tenant_id is SET → only matching tenant rows visible
--   When app.current_tenant_id is NOT SET → all rows visible (graceful fallback)
--
-- PREREQUISITE: TenantRlsTransactionManager sets
--   SET LOCAL app.current_tenant_id = '<uuid>'
--   on every JDBC transaction.
-- =============================================================================


-- =============================================================================
-- HELPER: Macro-style policy creation
-- Each table gets: RLS enabled + PERMISSIVE allow-all + RESTRICTIVE tenant check
-- =============================================================================


-- =============================================================================
-- SECTION A — Core Employee & Organization Tables
-- =============================================================================

-- employees
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
CREATE
POLICY employees_allow_all ON employees AS PERMISSIVE FOR ALL USING (true) WITH CHECK (true);
CREATE
POLICY employees_tenant_rls ON employees
    AS RESTRICTIVE FOR ALL
    USING (
        tenant_id = current_setting('app.current_tenant_id', true)::uuid
        OR current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
    )
    WITH CHECK (
        tenant_id = current_setting('app.current_tenant_id', true)::uuid
        OR current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
    );

-- departments
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
CREATE
POLICY departments_allow_all ON departments AS PERMISSIVE FOR ALL USING (true) WITH CHECK (true);
CREATE
POLICY departments_tenant_rls ON departments
    AS RESTRICTIVE FOR ALL
    USING (
        tenant_id = current_setting('app.current_tenant_id', true)::uuid
        OR current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
    )
    WITH CHECK (
        tenant_id = current_setting('app.current_tenant_id', true)::uuid
        OR current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
    );

-- users
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE
POLICY users_allow_all ON users AS PERMISSIVE FOR ALL USING (true) WITH CHECK (true);
CREATE
POLICY users_tenant_rls ON users
    AS RESTRICTIVE FOR ALL
    USING (
        tenant_id = current_setting('app.current_tenant_id', true)::uuid
        OR current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
    )
    WITH CHECK (
        tenant_id = current_setting('app.current_tenant_id', true)::uuid
        OR current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
    );


-- =============================================================================
-- SECTION B — RBAC Tables
-- =============================================================================

-- roles
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
CREATE
POLICY roles_allow_all ON roles AS PERMISSIVE FOR ALL USING (true) WITH CHECK (true);
CREATE
POLICY roles_tenant_rls ON roles
    AS RESTRICTIVE FOR ALL
    USING (
        tenant_id = current_setting('app.current_tenant_id', true)::uuid
        OR current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
    )
    WITH CHECK (
        tenant_id = current_setting('app.current_tenant_id', true)::uuid
        OR current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
    );

-- role_permissions
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
CREATE
POLICY role_permissions_allow_all ON role_permissions AS PERMISSIVE FOR ALL USING (true) WITH CHECK (true);
CREATE
POLICY role_permissions_tenant_rls ON role_permissions
    AS RESTRICTIVE FOR ALL
    USING (
        tenant_id = current_setting('app.current_tenant_id', true)::uuid
        OR current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
    )
    WITH CHECK (
        tenant_id = current_setting('app.current_tenant_id', true)::uuid
        OR current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
    );

-- custom_scope_targets
ALTER TABLE custom_scope_targets ENABLE ROW LEVEL SECURITY;
CREATE
POLICY custom_scope_targets_allow_all ON custom_scope_targets AS PERMISSIVE FOR ALL USING (true) WITH CHECK (true);
CREATE
POLICY custom_scope_targets_tenant_rls ON custom_scope_targets
    AS RESTRICTIVE FOR ALL
    USING (
        tenant_id = current_setting('app.current_tenant_id', true)::uuid
        OR current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
    )
    WITH CHECK (
        tenant_id = current_setting('app.current_tenant_id', true)::uuid
        OR current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
    );

-- user_app_access
ALTER TABLE user_app_access ENABLE ROW LEVEL SECURITY;
CREATE
POLICY user_app_access_allow_all ON user_app_access AS PERMISSIVE FOR ALL USING (true) WITH CHECK (true);
CREATE
POLICY user_app_access_tenant_rls ON user_app_access
    AS RESTRICTIVE FOR ALL
    USING (
        tenant_id = current_setting('app.current_tenant_id', true)::uuid
        OR current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
    )
    WITH CHECK (
        tenant_id = current_setting('app.current_tenant_id', true)::uuid
        OR current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
    );


-- =============================================================================
-- SECTION C — Leave Management Tables
-- =============================================================================

-- leave_requests
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;
CREATE
POLICY leave_requests_allow_all ON leave_requests AS PERMISSIVE FOR ALL USING (true) WITH CHECK (true);
CREATE
POLICY leave_requests_tenant_rls ON leave_requests
    AS RESTRICTIVE FOR ALL
    USING (
        tenant_id = current_setting('app.current_tenant_id', true)::uuid
        OR current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
    )
    WITH CHECK (
        tenant_id = current_setting('app.current_tenant_id', true)::uuid
        OR current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
    );

-- leave_balances
ALTER TABLE leave_balances ENABLE ROW LEVEL SECURITY;
CREATE
POLICY leave_balances_allow_all ON leave_balances AS PERMISSIVE FOR ALL USING (true) WITH CHECK (true);
CREATE
POLICY leave_balances_tenant_rls ON leave_balances
    AS RESTRICTIVE FOR ALL
    USING (
        tenant_id = current_setting('app.current_tenant_id', true)::uuid
        OR current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
    )
    WITH CHECK (
        tenant_id = current_setting('app.current_tenant_id', true)::uuid
        OR current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
    );

-- leave_types
ALTER TABLE leave_types ENABLE ROW LEVEL SECURITY;
CREATE
POLICY leave_types_allow_all ON leave_types AS PERMISSIVE FOR ALL USING (true) WITH CHECK (true);
CREATE
POLICY leave_types_tenant_rls ON leave_types
    AS RESTRICTIVE FOR ALL
    USING (
        tenant_id = current_setting('app.current_tenant_id', true)::uuid
        OR current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
    )
    WITH CHECK (
        tenant_id = current_setting('app.current_tenant_id', true)::uuid
        OR current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
    );


-- =============================================================================
-- SECTION D — Attendance Tables
-- =============================================================================

-- attendance_records
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
CREATE
POLICY attendance_records_allow_all ON attendance_records AS PERMISSIVE FOR ALL USING (true) WITH CHECK (true);
CREATE
POLICY attendance_records_tenant_rls ON attendance_records
    AS RESTRICTIVE FOR ALL
    USING (
        tenant_id = current_setting('app.current_tenant_id', true)::uuid
        OR current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
    )
    WITH CHECK (
        tenant_id = current_setting('app.current_tenant_id', true)::uuid
        OR current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
    );

-- attendance_time_entries does NOT have a tenant_id column.
-- RLS policy skipped. Tenant isolation is enforced via parent table FK (attendance_records.tenant_id).


-- =============================================================================
-- SECTION E — Payroll Tables
-- =============================================================================

-- payroll_runs
ALTER TABLE payroll_runs ENABLE ROW LEVEL SECURITY;
CREATE
POLICY payroll_runs_allow_all ON payroll_runs AS PERMISSIVE FOR ALL USING (true) WITH CHECK (true);
CREATE
POLICY payroll_runs_tenant_rls ON payroll_runs
    AS RESTRICTIVE FOR ALL
    USING (
        tenant_id = current_setting('app.current_tenant_id', true)::uuid
        OR current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
    )
    WITH CHECK (
        tenant_id = current_setting('app.current_tenant_id', true)::uuid
        OR current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
    );

-- payslips
ALTER TABLE payslips ENABLE ROW LEVEL SECURITY;
CREATE
POLICY payslips_allow_all ON payslips AS PERMISSIVE FOR ALL USING (true) WITH CHECK (true);
CREATE
POLICY payslips_tenant_rls ON payslips
    AS RESTRICTIVE FOR ALL
    USING (
        tenant_id = current_setting('app.current_tenant_id', true)::uuid
        OR current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
    )
    WITH CHECK (
        tenant_id = current_setting('app.current_tenant_id', true)::uuid
        OR current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
    );

-- salary_structures
ALTER TABLE salary_structures ENABLE ROW LEVEL SECURITY;
CREATE
POLICY salary_structures_allow_all ON salary_structures AS PERMISSIVE FOR ALL USING (true) WITH CHECK (true);
CREATE
POLICY salary_structures_tenant_rls ON salary_structures
    AS RESTRICTIVE FOR ALL
    USING (
        tenant_id = current_setting('app.current_tenant_id', true)::uuid
        OR current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
    )
    WITH CHECK (
        tenant_id = current_setting('app.current_tenant_id', true)::uuid
        OR current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
    );

-- salary_revisions
ALTER TABLE salary_revisions ENABLE ROW LEVEL SECURITY;
CREATE
POLICY salary_revisions_allow_all ON salary_revisions AS PERMISSIVE FOR ALL USING (true) WITH CHECK (true);
CREATE
POLICY salary_revisions_tenant_rls ON salary_revisions
    AS RESTRICTIVE FOR ALL
    USING (
        tenant_id = current_setting('app.current_tenant_id', true)::uuid
        OR current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
    )
    WITH CHECK (
        tenant_id = current_setting('app.current_tenant_id', true)::uuid
        OR current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
    );

-- employee_payroll_records
ALTER TABLE employee_payroll_records ENABLE ROW LEVEL SECURITY;
CREATE
POLICY employee_payroll_records_allow_all ON employee_payroll_records AS PERMISSIVE FOR ALL USING (true) WITH CHECK (true);
CREATE
POLICY employee_payroll_records_tenant_rls ON employee_payroll_records
    AS RESTRICTIVE FOR ALL
    USING (
        tenant_id = current_setting('app.current_tenant_id', true)::uuid
        OR current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
    )
    WITH CHECK (
        tenant_id = current_setting('app.current_tenant_id', true)::uuid
        OR current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
    );


-- =============================================================================
-- SECTION F — Asset Management
-- =============================================================================

-- assets
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
CREATE
POLICY assets_allow_all ON assets AS PERMISSIVE FOR ALL USING (true) WITH CHECK (true);
CREATE
POLICY assets_tenant_rls ON assets
    AS RESTRICTIVE FOR ALL
    USING (
        tenant_id = current_setting('app.current_tenant_id', true)::uuid
        OR current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
    )
    WITH CHECK (
        tenant_id = current_setting('app.current_tenant_id', true)::uuid
        OR current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
    );

-- asset_assignments does NOT have a tenant_id column.
-- RLS policy skipped. Tenant isolation is enforced via parent table FK (assets.tenant_id).


-- =============================================================================
-- SECTION G — Approval & Workflow Tables
-- =============================================================================

-- approval_steps
ALTER TABLE approval_steps ENABLE ROW LEVEL SECURITY;
CREATE
POLICY approval_steps_allow_all ON approval_steps AS PERMISSIVE FOR ALL USING (true) WITH CHECK (true);
CREATE
POLICY approval_steps_tenant_rls ON approval_steps
    AS RESTRICTIVE FOR ALL
    USING (
        tenant_id = current_setting('app.current_tenant_id', true)::uuid
        OR current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
    )
    WITH CHECK (
        tenant_id = current_setting('app.current_tenant_id', true)::uuid
        OR current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
    );

-- approval_delegates
ALTER TABLE approval_delegates ENABLE ROW LEVEL SECURITY;
CREATE
POLICY approval_delegates_allow_all ON approval_delegates AS PERMISSIVE FOR ALL USING (true) WITH CHECK (true);
CREATE
POLICY approval_delegates_tenant_rls ON approval_delegates
    AS RESTRICTIVE FOR ALL
    USING (
        tenant_id = current_setting('app.current_tenant_id', true)::uuid
        OR current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
    )
    WITH CHECK (
        tenant_id = current_setting('app.current_tenant_id', true)::uuid
        OR current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
    );


-- =============================================================================
-- SECTION H — Audit & Compliance
-- =============================================================================

-- audit_logs
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
CREATE
POLICY audit_logs_allow_all ON audit_logs AS PERMISSIVE FOR ALL USING (true) WITH CHECK (true);
CREATE
POLICY audit_logs_tenant_rls ON audit_logs
    AS RESTRICTIVE FOR ALL
    USING (
        tenant_id = current_setting('app.current_tenant_id', true)::uuid
        OR current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
    )
    WITH CHECK (
        tenant_id = current_setting('app.current_tenant_id', true)::uuid
        OR current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
    );


-- =============================================================================
-- SECTION I — Recruitment & Onboarding
-- =============================================================================

-- job_postings does NOT have a tenant_id column.
-- RLS policy skipped. Tenant isolation is enforced via parent table FK (job_openings.tenant_id).

-- candidates
ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;
CREATE
POLICY candidates_allow_all ON candidates AS PERMISSIVE FOR ALL USING (true) WITH CHECK (true);
CREATE
POLICY candidates_tenant_rls ON candidates
    AS RESTRICTIVE FOR ALL
    USING (
        tenant_id = current_setting('app.current_tenant_id', true)::uuid
        OR current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
    )
    WITH CHECK (
        tenant_id = current_setting('app.current_tenant_id', true)::uuid
        OR current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
    );

-- interviews
ALTER TABLE interviews ENABLE ROW LEVEL SECURITY;
CREATE
POLICY interviews_allow_all ON interviews AS PERMISSIVE FOR ALL USING (true) WITH CHECK (true);
CREATE
POLICY interviews_tenant_rls ON interviews
    AS RESTRICTIVE FOR ALL
    USING (
        tenant_id = current_setting('app.current_tenant_id', true)::uuid
        OR current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
    )
    WITH CHECK (
        tenant_id = current_setting('app.current_tenant_id', true)::uuid
        OR current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
    );


-- =============================================================================
-- SECTION J — Performance Management
-- =============================================================================

-- performance_reviews
ALTER TABLE performance_reviews ENABLE ROW LEVEL SECURITY;
CREATE
POLICY performance_reviews_allow_all ON performance_reviews AS PERMISSIVE FOR ALL USING (true) WITH CHECK (true);
CREATE
POLICY performance_reviews_tenant_rls ON performance_reviews
    AS RESTRICTIVE FOR ALL
    USING (
        tenant_id = current_setting('app.current_tenant_id', true)::uuid
        OR current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
    )
    WITH CHECK (
        tenant_id = current_setting('app.current_tenant_id', true)::uuid
        OR current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
    );

-- goals
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
CREATE
POLICY goals_allow_all ON goals AS PERMISSIVE FOR ALL USING (true) WITH CHECK (true);
CREATE
POLICY goals_tenant_rls ON goals
    AS RESTRICTIVE FOR ALL
    USING (
        tenant_id = current_setting('app.current_tenant_id', true)::uuid
        OR current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
    )
    WITH CHECK (
        tenant_id = current_setting('app.current_tenant_id', true)::uuid
        OR current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
    );


-- =============================================================================
-- SECTION K — Document & Notification Tables
-- =============================================================================

-- documents does NOT have a tenant_id column.
-- RLS policy skipped. Tenant isolation is enforced via application-layer FK references (employees, departments, etc.).

-- notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE
POLICY notifications_allow_all ON notifications AS PERMISSIVE FOR ALL USING (true) WITH CHECK (true);
CREATE
POLICY notifications_tenant_rls ON notifications
    AS RESTRICTIVE FOR ALL
    USING (
        tenant_id = current_setting('app.current_tenant_id', true)::uuid
        OR current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
    )
    WITH CHECK (
        tenant_id = current_setting('app.current_tenant_id', true)::uuid
        OR current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
    );


-- =============================================================================
-- VERIFICATION QUERY (run manually after migration)
-- =============================================================================
-- SELECT schemaname, tablename, policyname, permissive, cmd
-- FROM pg_policies
-- WHERE tablename IN (
--   'employees', 'departments', 'users', 'roles', 'role_permissions',
--   'custom_scope_targets', 'user_app_access',
--   'leave_requests', 'leave_balances', 'leave_types',
--   'attendance_records',
--   'payroll_runs', 'payslips', 'salary_structures', 'salary_revisions',
--   'employee_payroll_records', 'assets',
--   'approval_steps', 'approval_delegates', 'audit_logs',
--   'candidates', 'interviews',
--   'performance_reviews', 'goals', 'notifications'
-- )
-- ORDER BY tablename, policyname;
--
-- Expected: each table above should have TWO policies:
--   1. *_allow_all (PERMISSIVE)
--   2. *_tenant_rls (RESTRICTIVE)
--
-- Skipped (no tenant_id column — isolation via parent FK):
--   attendance_time_entries, asset_assignments, job_postings, documents
-- =============================================================================
