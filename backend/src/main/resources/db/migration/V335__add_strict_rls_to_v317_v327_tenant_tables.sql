-- ============================================================================
-- V335: Add strict (fail-closed) Row-Level Security to the six tenant tables
--       introduced by V317, V322, V326 and V327.
--
-- Context:
--   RlsStartupProbe (fail-on-bypass) rejects any tenant_id-bearing table that
--   lacks ENABLE + FORCE ROW LEVEL SECURITY and a RESTRICTIVE
--   app.current_tenant_id policy. A deploy rehearsal against a copy of the
--   production Flyway state (V316 -> V334, render profile, non-BYPASSRLS
--   runtime role) crashed at boot with:
--     "RLS startup probe found strict-policy gaps in tenant tables:
--      [public.competency_frameworks does not have RLS enabled, ...]"
--   covering competency_frameworks, competency_requirements,
--   policy_acknowledgment_reminders, recognition_comments (no RLS at all) and
--   resource_pools / resource_pool_members (permissive policy only).
--
--   So this is both a tenant-isolation gap and a hard deploy blocker: without
--   it the backend will not start once V317..V334 are applied.
--
-- Pattern is identical to V304/V254: ENABLE + a PERMISSIVE tenant-match policy
-- + the rls_ctx_required_<table> RESTRICTIVE overlay + FORCE. A RESTRICTIVE
-- policy alone denies everything, so the four tables with no policy at all get
-- the permissive one too. tenant_id is NOT NULL on all six, so there is no NULL
-- escape. Idempotent: every statement is IF EXISTS / re-creatable.
-- ============================================================================

DO $$
DECLARE
    t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'competency_frameworks',
        'competency_requirements',
        'policy_acknowledgment_reminders',
        'recognition_comments',
        'resource_pools',
        'resource_pool_members'
    ] LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);

        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_tenant_isolation', t);
        EXECUTE format($f$
            CREATE POLICY %I ON public.%I
                USING (tenant_id = (NULLIF(current_setting('app.current_tenant_id', true), ''))::uuid)
                WITH CHECK (tenant_id = (NULLIF(current_setting('app.current_tenant_id', true), ''))::uuid)
        $f$, t || '_tenant_isolation', t);

        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'rls_ctx_required_' || t, t);
        EXECUTE format($f$
            CREATE POLICY %I ON public.%I
                AS RESTRICTIVE FOR ALL
                USING (
                    NULLIF(current_setting('app.current_tenant_id', true), '') IS NOT NULL
                    AND tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
                )
                WITH CHECK (
                    NULLIF(current_setting('app.current_tenant_id', true), '') IS NOT NULL
                    AND tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
                )
        $f$, 'rls_ctx_required_' || t, t);

        EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', t);
    END LOOP;
END $$;
