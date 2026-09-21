-- =============================================================================
-- V325: Backfill DASHBOARD:VIEW + WALL:VIEW/POST/COMMENT/REACT to roles missing
--       them (Company Feed dashboard widget returning 403 for these roles)
-- =============================================================================
-- CONTEXT:
--   RoleHierarchy.get*Permissions() only granted Dashboard/Wall access to
--   EMPLOYEE and (transitively) HR_MANAGER/HR_ADMIN/TENANT_ADMIN. Every other
--   role — the specialized admins (RECRUITMENT_ADMIN, PROJECT_ADMIN,
--   ASSET_MANAGER, EXPENSE_MANAGER, PAYROLL_ADMIN, HELPDESK_ADMIN,
--   TRAVEL_ADMIN, COMPLIANCE_OFFICER, LMS_ADMIN, CONTRACTOR) and the people
--   managers (DEPARTMENT_MANAGER, TEAM_LEAD, HR_EXECUTIVE) — never got these
--   permissions in code, and the role_permissions rows seeded at role-creation
--   time (V305 and earlier) mirror that same gap. Fixed in RoleHierarchy.java
--   for new tenants/roles; this backfills existing rows the same way V305/V127
--   did for their respective gaps.
--
-- SAFETY:
--   ON CONFLICT DO NOTHING — idempotent, safe to re-run. Scope 'ALL' matches
--   how these roles' other permissions are scoped.
-- =============================================================================

DO $$
DECLARE
    tt RECORD;
    r RECORD;
BEGIN
    FOR tt IN SELECT id FROM tenants LOOP
        PERFORM set_config('app.current_tenant_id', tt.id::text, true);

        FOR r IN
            SELECT DISTINCT rl.tenant_id, rl.id AS role_id
            FROM roles rl
            WHERE rl.code IN (
                'RECRUITMENT_ADMIN', 'PROJECT_ADMIN', 'ASSET_MANAGER', 'EXPENSE_MANAGER',
                'PAYROLL_ADMIN', 'HELPDESK_ADMIN', 'TRAVEL_ADMIN', 'COMPLIANCE_OFFICER',
                'LMS_ADMIN', 'CONTRACTOR', 'DEPARTMENT_MANAGER', 'TEAM_LEAD', 'HR_EXECUTIVE'
            )
              AND rl.tenant_id = tt.id
              AND (rl.is_deleted = false OR rl.is_deleted IS NULL)
        LOOP
            INSERT INTO role_permissions (
                id, tenant_id, role_id, permission_id, scope,
                created_at, updated_at, version, is_deleted
            )
            SELECT
                gen_random_uuid(),
                r.tenant_id,
                r.role_id,
                p.id,
                'ALL',
                NOW(),
                NOW(),
                0,
                false
            FROM permissions p
            WHERE p.code IN ('DASHBOARD:VIEW', 'WALL:VIEW', 'WALL:POST', 'WALL:COMMENT', 'WALL:REACT')
              AND (p.is_deleted = false OR p.is_deleted IS NULL)
            ON CONFLICT DO NOTHING;
        END LOOP;
    END LOOP;
END $$;
