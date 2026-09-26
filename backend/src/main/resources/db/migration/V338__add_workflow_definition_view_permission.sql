-- ============================================================================
-- V338: WORKFLOW:DEFINITION_VIEW — read-only access to workflow definitions.
--
-- Pairs with the B3 authorization fix. A workflow definition is the tenant's
-- approval-ROUTING configuration (which approver sees which entity, at which step,
-- with which SLA and escalation target). Those reads were gated on WORKFLOW:VIEW,
-- which is seeded to EMPLOYEE for their own approval inbox — so every employee in the
-- tenant could read it.
--
-- Tightening the reads to WORKFLOW:MANAGE alone would have removed the read-only
-- Workflow Builder view from HR_MANAGER, MANAGER and RECRUITMENT_ADMIN, none of which
-- hold MANAGE. Granting them MANAGE to restore a READ is the wrong instrument: it would
-- also hand them create/update/delete. Hence a distinct read-only permission.
--
-- Approved matrix (TEAM_LEAD deliberately excluded — workflow definitions are
-- tenant-level objects, so a TEAM scope would not constrain them and would encode a
-- misleading scope model; revisit as its own RBAC decision if needed):
--
--   SUPER_ADMIN        DEFINITION_VIEW + MANAGE
--   TENANT_ADMIN       DEFINITION_VIEW + MANAGE
--   HR_ADMIN           DEFINITION_VIEW + MANAGE
--   HR_MANAGER         DEFINITION_VIEW
--   MANAGER            DEFINITION_VIEW
--   RECRUITMENT_ADMIN  DEFINITION_VIEW
--   TEAM_LEAD          none
--   EMPLOYEE           none          <- the point of the fix
--
-- Forward-only. V331-V337 are untouched; V331/V334 are applied in production and
-- immutable (MigrationRlsGuardTest pins their hashes).
--
-- RLS: role_permissions carries the RESTRICTIVE rls_ctx_required_* policy (V254/V262)
-- and FORCE ROW LEVEL SECURITY (V306). Without app.current_tenant_id the INSERT's
-- WITH CHECK cannot pass and the statement is a SILENT no-op for any non-BYPASSRLS
-- role, with Flyway still recording success — the V334 defect. Hence the per-tenant GUC.
--
-- Idempotency comes from NOT EXISTS, never ON CONFLICT DO NOTHING: role_permissions has
-- no unique index beyond the id primary key, which is how V325 created 136 duplicates.
-- Roles are matched by CODE so tenants provisioned after V49 are covered.
-- ============================================================================

-- 1. Catalog row. Permission codes are global (tenant_id retained for parity with the
--    existing rows); the ON CONFLICT target matches the partial unique index on code.
--
--    The GUC is required HERE too, not just on the grant loop below: `permissions` carries
--    its own rls_ctx_required_* policy, and a tenant-scoped row fails its WITH CHECK without
--    app.current_tenant_id. Caught by rehearsing this migration as nu_app_rls:
--        no GUC  -> ERROR: new row violates row-level security policy ... for table "permissions"
--                   and the grant loop below then finds no permission row, granting 0.
--        GUC set -> catalog row inserted, grants applied.
--    Production runs Flyway as postgres (BYPASSRLS) and would not have surfaced this.
DO $$
BEGIN
    PERFORM set_config('app.current_tenant_id', '660e8400-e29b-41d4-a716-446655440001', true);

    INSERT INTO permissions (id, tenant_id, code, name, description, resource, action,
                             created_at, updated_at, version, is_deleted)
    VALUES (gen_random_uuid(), '660e8400-e29b-41d4-a716-446655440001',
            'WORKFLOW:DEFINITION_VIEW', 'View Workflow Definitions',
            'Read-only access to workflow definitions (approval routing configuration). '
            'Does not permit create, update, delete or activation.',
            'workflow', 'definition_view', NOW(), NOW(), 0, false)
    ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;
END $$;

-- 2. Grant to the approved roles in every tenant.
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
                  ('SUPER_ADMIN'),
                  ('TENANT_ADMIN'),
                  ('HR_ADMIN'),
                  ('HR_MANAGER'),
                  ('MANAGER'),
                  ('RECRUITMENT_ADMIN')
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

    RAISE NOTICE 'V338: granted WORKFLOW:DEFINITION_VIEW to % role(s) across all tenants.', total;
END $$;
