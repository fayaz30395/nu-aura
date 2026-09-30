-- ============================================================================
-- V341: Forward-only correction of V331 and V334 for already-migrated databases.
--
-- V331 and V334 are applied migrations and are therefore IMMUTABLE. Both were
-- briefly edited in place during the 2026-09-25 remediation; that edit has been
-- reverted and both files are byte-identical to release 3bcb7f31 again. Editing
-- them could never have delivered the fix anyway:
--
--   * prod profile (validate-on-migrate=true, repair-on-migrate=false) would
--     fail Flyway validation at startup on any database that recorded them.
--   * base/render profile (repair-on-migrate=true) silently realigns the
--     checksum and does NOT re-run the migration, so the corrected SQL never
--     executes while Flyway still reports success.
--
-- Hence this migration. Version 341 is the first number free on EVERY lineage.
-- `main` itself ends at V336, but four higher versions already exist on release
-- branches and reusing any of them would collide on merge with a different
-- checksum:
--   V337  release/v33x-candidate + v339-security-remediation — LMS grants (RLS-safe)
--   V338  same lineage — WORKFLOW:DEFINITION_VIEW permission
--   V339  same lineage — grant that permission to DEPARTMENT_MANAGER
--   V340  release/v339-security-remediation —
--         V340__refresh_demo_password_expiry_all_tenants_rls_safe.sql
--
-- Overlap with those is deliberate and safe, because both parts below are
-- idempotent:
--   * Part A duplicates that branch's V340 in effect. Re-refreshing
--     password_changed_at is not state that can drift, so running both is a no-op
--     beyond a second timestamp write.
--   * Part B is NOT a duplicate of that lineage's V337. V337 grants
--     ('EMPLOYEE','SELF'), ('HR_MANAGER','ALL'), ('TEAM_LEAD','TEAM'), which drops
--     MANAGER@TEAM and adds an ALL-scope grant V66 never made. Part B grants V66's
--     actual set, so on that lineage it supplies the missing MANAGER@TEAM rows.
--
-- ---------------------------------------------------------------------------
-- The defect both parts correct: RLS makes the original statements SILENT no-ops
-- ---------------------------------------------------------------------------
-- V254 installed, on every public table carrying a uuid tenant_id column, a
-- RESTRICTIVE policy whose USING/WITH CHECK both require
-- NULLIF(current_setting('app.current_tenant_id', true), '') IS NOT NULL, and
-- V306 added FORCE ROW LEVEL SECURITY. So for any migration role that is not
-- BYPASSRLS (nu_app_rls is NOSUPERUSER/NOBYPASSRLS), a statement issued without
-- app.current_tenant_id matches ZERO rows — and Flyway records success = true.
-- Neither V331 nor V334 set that GUC.
--
-- `tenants` itself is readable without the GUC: V263 names it explicitly, drops
-- the restrictive policy and installs a PERMISSIVE one allowing
-- `tenant_id IS NULL OR tenant_id = <guc>`. Tenant rows carry a NULL tenant_id,
-- so the driving loop below returns rows under nu_app_rls. That is also why the
-- original failure was silent rather than loud.
--
-- Both parts are idempotent, non-destructive, and safe to run on a virgin chain
-- (0 -> HEAD) as well as on an existing database. Part B is deliberately
-- semantically identical to candidate V337, so on the lineage where V337 already
-- ran it inserts nothing.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- PART A — V331: refresh the demo accounts' password clock, for EVERY tenant.
--
-- V331 ran a single tenant-agnostic `WHERE email LIKE '%@nulogic.io'` UPDATE with
-- no tenant context. Under a NOBYPASSRLS role that is UPDATE 0. The @nulogic.io
-- predicate cannot be covered by one set_config, so iterate tenants — the same
-- shape V289/V336 use.
--
-- Still gated on demoCredentialsEnabled: production must not have its password
-- expiry clock touched. Note this is now belt-and-braces rather than the only
-- defence — AuthService.isExpiryExemptDemoAccount exempts the seeded demo hashes
-- from expiry whenever that same flag is on — but a database whose clock already
-- expired still needs the one-time reset.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
    tt       RECORD;
    affected INTEGER;
    total    INTEGER := 0;
BEGIN
    IF lower('${demoCredentialsEnabled}') <> 'true' THEN
        RAISE NOTICE 'V341/A: demoCredentialsEnabled=false — skipping demo password expiry refresh (production environment).';
        RETURN;
    END IF;

    FOR tt IN SELECT id FROM tenants LOOP
        -- Transaction-local (third argument true): required by the FORCE ROW LEVEL
        -- SECURITY policy on users, and reset at transaction end.
        PERFORM set_config('app.current_tenant_id', tt.id::text, true);

        UPDATE users
           SET password_changed_at = NOW(),
               updated_at          = NOW()
         WHERE tenant_id = tt.id
           AND email LIKE '%@nulogic.io';

        GET DIAGNOSTICS affected = ROW_COUNT;
        total := total + affected;
    END LOOP;

    RAISE NOTICE 'V341/A: refreshed password_changed_at for % demo account(s) across all tenants.', total;
END $$;

-- ---------------------------------------------------------------------------
-- PART B — V334: re-assert the V66 LMS grants, for EVERY tenant, RLS-safely.
--
-- Three defects in V334:
--   1. No tenant context — the `EXISTS (SELECT 1 FROM roles ...)` guard saw no
--      rows and the INSERT's WITH CHECK could not pass, so the whole statement
--      was a no-op under a NOBYPASSRLS role. (`permissions` stayed readable via
--      V263's null-tenant catalog exemption, which is what hid the failure.)
--   2. Hardcoded tenant 660e8400-...-446655440001 in both the inserted
--      tenant_id and the roles guard, so any other tenant never received the
--      grants. Roles are matched by CODE here, so tenants provisioned later are
--      covered too.
--   3. The NOT EXISTS duplicate guard ignored is_deleted, so a soft-deleted
--      grant suppressed the re-grant and left the permission missing while the
--      migration reported success.
--
-- Scope is unchanged from V66: no new permission, and no role widened beyond the
-- three V66 named, at the scopes V66 named. Verified against the source rather
-- than assumed:
--   V66:505/:570  role 550e8400-...-446655440022 (code MANAGER)   scope TEAM
--   V66:589-597   role 550e8400-...-446655440023 (code EMPLOYEE)  scope SELF
--   V66:650-662   role 48000000-0e01-...-000000000001 (TEAM_LEAD) scope TEAM
-- which is exactly the (role, scope) triple V334 re-asserts by hardcoded id.
-- Matching by CODE instead of by id is the only change, and it is what extends the
-- fix to tenants other than 660e8400-...-446655440001.
--
-- NOTE for the release/v33x lineages: their V337 claims the same intent but
-- grants ('EMPLOYEE','SELF'), ('HR_MANAGER','ALL'), ('TEAM_LEAD','TEAM') — it drops
-- MANAGER@TEAM and introduces HR_MANAGER at ALL, which V66 never granted. This
-- migration does NOT reproduce that. On a database where that V337 already ran,
-- this adds the missing MANAGER@TEAM rows; removing the extra HR_MANAGER@ALL rows
-- is a deletion and is deliberately left to a separate, reviewed migration.
--
-- NOT `ON CONFLICT DO NOTHING`: role_permissions has no unique index beyond the
-- id primary key, so ON CONFLICT matches nothing and silently duplicates — V325
-- did exactly that. NOT EXISTS is what makes this idempotent.
-- ---------------------------------------------------------------------------
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
        SELECT gen_random_uuid(), r.tenant_id, r.id, p.id, grants.scope,
               NOW(), NOW(), 0, false
        FROM roles r
        JOIN (VALUES
                  ('EMPLOYEE',  'SELF'),
                  ('MANAGER',   'TEAM'),
                  ('TEAM_LEAD', 'TEAM')
             ) AS grants(role_code, scope) ON grants.role_code = r.code
        CROSS JOIN permissions p
        WHERE r.tenant_id = tt.id
          AND (r.is_deleted = false OR r.is_deleted IS NULL)
          AND p.code IN ('LMS:ENROLL', 'LMS:CERTIFICATE_VIEW')
          AND (p.is_deleted = false OR p.is_deleted IS NULL)
          AND NOT EXISTS (
              SELECT 1
              FROM role_permissions rp
              WHERE rp.role_id = r.id
                AND rp.permission_id = p.id
                AND rp.scope = grants.scope
                AND (rp.is_deleted = false OR rp.is_deleted IS NULL)
          );

        GET DIAGNOSTICS inserted = ROW_COUNT;
        total := total + inserted;
    END LOOP;

    RAISE NOTICE 'V341/B: granted % missing LMS role_permission row(s) across all tenants.', total;
END $$;
