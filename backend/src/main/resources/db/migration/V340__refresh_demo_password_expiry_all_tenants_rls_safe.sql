-- ============================================================================
-- V340: Re-run V331's demo password expiry refresh, RLS-safely, across every tenant.
--
-- Same class of defect as V337 (LMS grants) and V338/V339 (workflow definition view).
-- V331 is already applied in production and is therefore immutable — this is the
-- forward-only correction. V331/V334 are never edited.
--
-- 1. TENANT SCOPE. V331's UPDATE matches `email LIKE '%@nulogic.io'` with no tenant
--    predicate, so on a single-tenant seed it happened to cover everything. It does
--    not enumerate tenants, so any additional demo/seed tenant that carries a
--    nulogic.io email is silently skipped.
--
-- 2. FORCED RLS. `users` carries the RESTRICTIVE rls_ctx_required_* policy
--    (V254/V262) and FORCE ROW LEVEL SECURITY (V306). Without
--    app.current_tenant_id the UPDATE matches zero rows for any migration role
--    that is not BYPASSRLS, and Flyway still records success = true. Measured on
--    postgres:16 as nu_app_rls (NOSUPERUSER, NOBYPASSRLS):
--        no GUC  -> UPDATE 0
--        GUC set -> UPDATE matches
--    Production runs Flyway as `postgres` (BYPASSRLS), so V331 did land there for
--    the one tenant that existed at the time. The exposure is any tenant added
--    since, and any future run under a least-privilege role, including local/CI.
--
-- Idempotent: re-running only refreshes password_changed_at/updated_at again for
-- the same rows — no state that can drift out of sync from re-application.
-- Gated on the same demoCredentialsEnabled placeholder as V331, so it is a no-op
-- in a real production environment.
-- ============================================================================

DO $$
DECLARE
    tt       RECORD;
    affected INTEGER;
    total    INTEGER := 0;
BEGIN
    IF lower('${demoCredentialsEnabled}') <> 'true' THEN
        RAISE NOTICE 'V340: demoCredentialsEnabled=false — skipping demo password expiry refresh (production environment).';
        RETURN;
    END IF;

    FOR tt IN SELECT id FROM tenants LOOP
        -- Transaction-local: required by the FORCE ROW LEVEL SECURITY policy on users.
        -- Third argument true => reset at transaction end.
        PERFORM set_config('app.current_tenant_id', tt.id::text, true);

        UPDATE users
           SET password_changed_at = NOW(),
               updated_at          = NOW()
         WHERE tenant_id = tt.id
           AND email LIKE '%@nulogic.io';

        GET DIAGNOSTICS affected = ROW_COUNT;
        total := total + affected;
    END LOOP;

    RAISE NOTICE 'V340: refreshed password_changed_at for % demo account(s) across all tenants.', total;
END $$;
