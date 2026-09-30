-- ============================================================================
-- V337: Re-assert the V66 LMS grants for EVERY tenant, RLS-safely.
--
-- Two defects in V334, which is already applied in production and is therefore
-- immutable. This migration is the forward-only correction; V331 and V334 are
-- never edited.
--
-- 1. TENANT COVERAGE. V334 hardcodes tenant 660e8400-e29b-41d4-a716-446655440001
--    in both the INSERT column list and the `roles` guard. Production carries a
--    second tenant (550e8400-e29b-41d4-a716-446655440000, "Default Tenant",
--    2 roles) which never received LMS:ENROLL or LMS:CERTIFICATE_VIEW. It has no
--    employees today, so nothing is broken yet — it breaks the day someone is
--    added to it. This migration iterates every tenant instead.
--
-- 2. FORCED RLS. `roles` and `role_permissions` carry the RESTRICTIVE
--    rls_ctx_required_* policy (V254/V262) and FORCE ROW LEVEL SECURITY (V306).
--    Without app.current_tenant_id the EXISTS guard sees no rows and the INSERT's
--    WITH CHECK cannot pass, so the statement is a SILENT no-op for any migration
--    role that is not BYPASSRLS — and Flyway still records success = true.
--    `permissions` stays readable because V263 exempts its null-tenant catalog
--    rows, which is exactly what makes the failure silent rather than loud.
--    Production runs Flyway as `postgres` (BYPASSRLS), so V334 did land there —
--    verified: all five EMPLOYEE grants present at scope SELF. The exposure is
--    every future run under a least-privilege role, and local/CI runs today.
--
-- 3. SOFT DELETES. The NOT EXISTS duplicate guard ignored is_deleted, so a
--    soft-deleted grant suppressed the re-grant and left the permission missing
--    while the migration reported success.
--
-- Idempotent via NOT EXISTS. Deliberately NOT `ON CONFLICT DO NOTHING`:
-- role_permissions has no unique index beyond the id primary key, so ON CONFLICT
-- matches nothing and silently duplicates — V325 did exactly that and left 136
-- duplicate (role_id, permission_id) pairs behind.
--
-- Scope is unchanged from V66: no new permission, no role widened beyond the
-- three V66 named. Roles are matched by CODE, not by hardcoded id, so tenants
-- provisioned after V49 are covered too.
-- ============================================================================

DO $$
DECLARE
    tt       RECORD;
    inserted INTEGER;
    total    INTEGER := 0;
BEGIN
    FOR tt IN SELECT id FROM tenants LOOP
        -- Transaction-local: required by the FORCE ROW LEVEL SECURITY policies on
        -- roles/role_permissions. Without it every statement below is a no-op for a
        -- NOBYPASSRLS role. Third argument true => reset at transaction end.
        PERFORM set_config('app.current_tenant_id', tt.id::text, true);

        INSERT INTO role_permissions (
            id, tenant_id, role_id, permission_id, scope,
            created_at, updated_at, version, is_deleted
        )
        SELECT gen_random_uuid(), r.tenant_id, r.id, p.id, grants.scope,
               NOW(), NOW(), 0, false
        FROM roles r
        JOIN (VALUES
                  ('EMPLOYEE',    'SELF'),
                  ('MANAGER',     'TEAM'),
                  ('TEAM_LEAD',   'TEAM')
             ) AS grants(role_code, scope) ON grants.role_code = r.code
        CROSS JOIN permissions p
        WHERE r.tenant_id = tt.id
          AND (r.is_deleted = false OR r.is_deleted IS NULL)
          AND p.code IN ('LMS:ENROLL', 'LMS:CERTIFICATE_VIEW')
          AND (p.is_deleted = false OR p.is_deleted IS NULL)
          AND NOT EXISTS (
              SELECT 1 FROM role_permissions rp
              WHERE rp.role_id = r.id
                AND rp.permission_id = p.id
                AND rp.scope = grants.scope
                AND (rp.is_deleted = false OR rp.is_deleted IS NULL)
          );

        GET DIAGNOSTICS inserted = ROW_COUNT;
        total := total + inserted;
    END LOOP;

    RAISE NOTICE 'V337: granted % missing LMS role_permission row(s) across all tenants.', total;
END $$;
