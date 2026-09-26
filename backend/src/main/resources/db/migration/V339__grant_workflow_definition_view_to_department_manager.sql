-- ============================================================================
-- V339: WORKFLOW:DEFINITION_VIEW for DEPARTMENT_MANAGER
-- ============================================================================
-- V338 introduced WORKFLOW:DEFINITION_VIEW and granted it to SUPER_ADMIN,
-- TENANT_ADMIN, HR_ADMIN, HR_MANAGER, MANAGER and RECRUITMENT_ADMIN. The approved
-- RBAC matrix also grants it to DEPARTMENT_MANAGER (read-only), which V338 omitted.
--
-- DEPARTMENT_MANAGER is a real seeded role, not a synonym for MANAGER:
-- RoleHierarchy.java:18 declares the code, :48 lists it among the specialized roles
-- and :76 routes it to getDepartmentManagerPermissions(); V325 backfills dashboard
-- and wall permissions to it alongside TEAM_LEAD and HR_EXECUTIVE. So the omission
-- left a role that the matrix says should see approval routing unable to.
--
-- Forward-only. V338 is NOT edited: it is part of the release candidate and may
-- already be applied in a preproduction environment, so correcting it in place would
-- change an applied checksum. V331-V338 are untouched; V331/V334 remain byte-identical
-- to 3bcb7f31.
--
-- TEAM_LEAD and EMPLOYEE are deliberately still excluded — workflow definitions are
-- the tenant's approval-routing configuration (approvers, SLA hours, escalation
-- targets), not inbox data. EMPLOYEE holds WORKFLOW:VIEW for their own approval
-- inbox, which is a different permission and unaffected here.
--
-- RLS: role_permissions carries the RESTRICTIVE rls_ctx_required_* policy (V254/V262)
-- and FORCE ROW LEVEL SECURITY (V306). Without app.current_tenant_id the INSERT's
-- WITH CHECK cannot pass and the statement is a SILENT no-op for any non-BYPASSRLS
-- role while Flyway still records success — the V334 defect. Hence the per-tenant GUC.
-- Pinned by MigrationRlsGuardTest, which asserts this for every migration >= V337.
--
-- No catalog work: the WORKFLOW:DEFINITION_VIEW permission row is created by V338.
-- Idempotency via NOT EXISTS, never ON CONFLICT DO NOTHING — role_permissions has no
-- unique index beyond the id primary key, which is how V325 produced 136 duplicates.
-- Roles are matched by CODE, so tenants provisioned after V49 are covered too.
-- ============================================================================

DO $$
DECLARE
    tt       RECORD;
    inserted INTEGER;
    total    INTEGER := 0;
BEGIN
    FOR tt IN SELECT id FROM tenants LOOP
        PERFORM set_config('app.current_tenant_id', tt.id::text, true);

        INSERT INTO role_permissions (
            id, tenant_id, role_id, permission_id, scope,
            created_at, updated_at, version, is_deleted
        )
        SELECT gen_random_uuid(), r.tenant_id, r.id, p.id, 'ALL', NOW(), NOW(), 0, false
        FROM roles r
        JOIN (VALUES
                  ('DEPARTMENT_MANAGER')
             ) AS grants(role_code) ON grants.role_code = r.code
        CROSS JOIN permissions p
        WHERE r.tenant_id = tt.id
          AND (r.is_deleted = false OR r.is_deleted IS NULL)
          AND p.code = 'WORKFLOW:DEFINITION_VIEW'
          AND (p.is_deleted = false OR p.is_deleted IS NULL)
          AND NOT EXISTS (
              SELECT 1 FROM role_permissions rp
              WHERE rp.role_id = r.id
                AND rp.permission_id = p.id
                AND (rp.is_deleted = false OR rp.is_deleted IS NULL)
          );

        GET DIAGNOSTICS inserted = ROW_COUNT;
        total := total + inserted;
    END LOOP;

    RAISE NOTICE 'V339: granted WORKFLOW:DEFINITION_VIEW to DEPARTMENT_MANAGER in % tenant-role row(s).', total;
END $$;
