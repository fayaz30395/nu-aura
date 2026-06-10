-- ============================================================================
-- V286: Seed FINANCE_ADMIN role + demo finance user (QA-2)
-- ============================================================================
-- The RBAC docs (docs/architecture/rbac/permission-matrix.md, build-kit
-- 04_RBAC_PERMISSION_MATRIX.md) define a FinanceAdmin persona, and the
-- frontend (lib/hooks/usePermissions.ts Roles.FINANCE_ADMIN,
-- e2e/generated/roles.json) expects a FINANCE_ADMIN role — but no migration
-- ever seeded it, leaving the payroll/finance RBAC boundary untestable
-- except as SuperAdmin-vs-Employee.
--
-- Part A (always runs): FINANCE_ADMIN role + role_permissions for the demo
--   tenant, following the V19/V49 convention (roles are seeded per demo
--   tenant; V49 seeded TEAM_LEAD/HR_MANAGER/RECRUITMENT_ADMIN the same way).
--   Permission codes are the canonical colon-format codes from V96
--   (LOAN:MANAGE covers disbursement, STATUTORY:MANAGE covers filing —
--   no LOAN:DISBURSE / STATUTORY:FILE codes exist).
--
-- Part B (demo-gated, fail-closed): ONE demo user finance@nulogic.io holding
--   FINANCE_ADMIN, created ONLY when ${demoCredentialsEnabled} = 'true'
--   (same Flyway placeholder convention as V270/V272; base default is false,
--   dev/demo profiles opt in). In prod the user row is never created, so
--   there is nothing for V272-style lockdowns to neutralize.
--
-- RLS note: users/employees/roles/user_roles/role_permissions carry forced,
-- fail-closed RLS requiring app.current_tenant_id (V254/V255/V262). Following
-- the V265/V285 precedent, the tenant context is set transaction-locally so
-- this works whether Flyway connects as a BYPASSRLS superuser or as the
-- constrained nu_app_rls role.
--
-- Idempotent: every insert is guarded by WHERE NOT EXISTS.
-- ============================================================================

DO
$$
DECLARE
    v_demo_tenant CONSTANT UUID := '660e8400-e29b-41d4-a716-446655440001';
    v_role_seed_id CONSTANT UUID := '48000000-0e01-0000-0000-000000000004'; -- V49 role-id family
    v_user_id     CONSTANT UUID := '48000000-0e02-0000-0000-000000000015'; -- V49/V76 user-id family
    v_employee_id CONSTANT UUID := '48000000-e001-0000-0000-000000000015'; -- V76 employee-id family
    v_role_id     UUID;
    v_now         TIMESTAMP := NOW();
    affected      INTEGER;
BEGIN
    -- Fail-closed RLS policies require the tenant context (V265/V285 pattern).
    PERFORM set_config('app.current_tenant_id', v_demo_tenant::text, true);

    IF NOT EXISTS (SELECT 1 FROM tenants t WHERE t.id = v_demo_tenant AND t.is_deleted = false) THEN
        RAISE NOTICE 'V286: demo tenant % not found — nothing to seed.', v_demo_tenant;
        PERFORM set_config('app.current_tenant_id', '', true);
        RETURN;
    END IF;

    -- ------------------------------------------------------------------
    -- Part A1: FINANCE_ADMIN role for the demo tenant
    -- ------------------------------------------------------------------
    INSERT INTO roles (id, tenant_id, code, name, description, is_system_role,
                       created_at, updated_at, version, is_deleted)
    SELECT v_role_seed_id, v_demo_tenant, 'FINANCE_ADMIN', 'Finance Admin',
           'Payroll, compensation, expenses, loans, statutory filings and benefits administration',
           true, v_now, v_now, 0, false
    WHERE NOT EXISTS (SELECT 1
                      FROM roles r
                      WHERE r.code = 'FINANCE_ADMIN'
                        AND r.tenant_id = v_demo_tenant
                        AND r.is_deleted = false);

    GET DIAGNOSTICS affected = ROW_COUNT;
    RAISE NOTICE 'V286: inserted % FINANCE_ADMIN role row(s).', affected;

    -- Resolve the live role id (handles a pre-existing hand-created role).
    SELECT r.id
      INTO v_role_id
      FROM roles r
     WHERE r.code = 'FINANCE_ADMIN'
       AND r.tenant_id = v_demo_tenant
       AND r.is_deleted = false;

    -- ------------------------------------------------------------------
    -- Part A2: role_permissions (canonical V96 colon-format codes)
    -- ------------------------------------------------------------------
    INSERT INTO role_permissions (id, tenant_id, role_id, permission_id, scope,
                                  created_at, updated_at, version, is_deleted)
    SELECT gen_random_uuid(), v_demo_tenant, v_role_id, p.id, 'ALL',
           v_now, v_now, 0, false
      FROM permissions p
     WHERE p.is_deleted = false
       AND p.code IN (
            -- Payroll: view / process / approve
            'PAYROLL:VIEW',
            'PAYROLL:VIEW_ALL',
            'PAYROLL:VIEW_SELF',
            'PAYROLL:PROCESS',
            'PAYROLL:APPROVE',
            -- Compensation
            'COMPENSATION:VIEW',
            'COMPENSATION:VIEW_ALL',
            'COMPENSATION:MANAGE',
            'COMPENSATION:APPROVE',
            -- Expenses: approve (+ visibility & reporting)
            'EXPENSE:VIEW',
            'EXPENSE:VIEW_ALL',
            'EXPENSE:APPROVE',
            'EXPENSE:REPORT',
            -- Loans: approve / disburse (LOAN:MANAGE covers disbursement)
            'LOAN:VIEW',
            'LOAN:VIEW_ALL',
            'LOAN:APPROVE',
            'LOAN:MANAGE',
            -- Statutory: view / file (STATUTORY:MANAGE covers filing)
            'STATUTORY:VIEW',
            'STATUTORY:MANAGE',
            -- Benefits administration
            'BENEFIT:VIEW',
            'BENEFIT:MANAGE',
            'BENEFIT:APPROVE',
            'BENEFIT:CLAIM_PROCESS'
       )
       AND NOT EXISTS (SELECT 1
                       FROM role_permissions rp
                       WHERE rp.role_id = v_role_id
                         AND rp.permission_id = p.id
                         AND rp.is_deleted = false);

    GET DIAGNOSTICS affected = ROW_COUNT;
    RAISE NOTICE 'V286: granted % permission(s) to FINANCE_ADMIN.', affected;

    -- ------------------------------------------------------------------
    -- Part B: demo finance user — DEMO ENVIRONMENTS ONLY (fail-closed)
    -- ------------------------------------------------------------------
    IF lower('${demoCredentialsEnabled}') <> 'true' THEN
        RAISE NOTICE 'V286: demoCredentialsEnabled != true — fail-closed, no demo finance user created.';
        PERFORM set_config('app.current_tenant_id', '', true);
        RETURN;
    END IF;

    -- Demo login account (bcrypt of Welcome@123 — same digest as the V49/V76
    -- demo users; V270/V272-style lockdowns neutralize this digest whenever
    -- demo credentials are disabled).
    INSERT INTO users (id, tenant_id, email, first_name, last_name, password_hash, status,
                       failed_login_attempts, mfa_enabled, created_at, updated_at, version, is_deleted)
    SELECT v_user_id, v_demo_tenant, 'finance@nulogic.io', 'Fiona', 'Nance',
           '$2a$10$D7mb1w2eljWfrBF3i8iZCu5A/H4mUXe8.3rHyWvgYy2j8eC3ghqD2',
           'ACTIVE', 0, false, v_now, v_now, 0, false
    WHERE NOT EXISTS (SELECT 1
                      FROM users u
                      WHERE lower(u.email) = 'finance@nulogic.io'
                        AND u.tenant_id = v_demo_tenant
                        AND u.is_deleted = false);

    GET DIAGNOSTICS affected = ROW_COUNT;
    RAISE NOTICE 'V286: inserted % demo finance user row(s).', affected;

    -- Employee profile (V110 new-joiner pattern).
    INSERT INTO employees (id, tenant_id, employee_code, user_id, first_name, last_name,
                           personal_email, joining_date, designation, level, job_role,
                           employment_type, status, created_at, updated_at, version, is_deleted)
    SELECT v_employee_id, v_demo_tenant, 'NL-FIN-001', u.id, 'Fiona', 'Nance',
           'fiona.nance.personal@example.com', CURRENT_DATE, 'Finance Administrator',
           'MANAGER', 'FINANCE_MANAGER', 'FULL_TIME', 'ACTIVE',
           v_now, v_now, 0, false
      FROM users u
     WHERE lower(u.email) = 'finance@nulogic.io'
       AND u.tenant_id = v_demo_tenant
       AND u.is_deleted = false
       AND NOT EXISTS (SELECT 1
                       FROM employees e
                       WHERE e.user_id = u.id
                         AND e.is_deleted = false);

    GET DIAGNOSTICS affected = ROW_COUNT;
    RAISE NOTICE 'V286: inserted % demo finance employee row(s).', affected;

    -- FINANCE_ADMIN role assignment (V265 column set: tenant_id + soft-delete flags).
    INSERT INTO user_roles (user_id, role_id, tenant_id, is_deleted, deleted_at)
    SELECT u.id, v_role_id, v_demo_tenant, false, NULL
      FROM users u
     WHERE lower(u.email) = 'finance@nulogic.io'
       AND u.tenant_id = v_demo_tenant
       AND u.is_deleted = false
       AND NOT EXISTS (SELECT 1
                       FROM user_roles ur
                       WHERE ur.user_id = u.id
                         AND ur.role_id = v_role_id);

    GET DIAGNOSTICS affected = ROW_COUNT;
    RAISE NOTICE 'V286: inserted % FINANCE_ADMIN user_role assignment(s).', affected;

    -- Clear the tenant context for the remainder of the Flyway transaction.
    PERFORM set_config('app.current_tenant_id', '', true);
END
$$;
