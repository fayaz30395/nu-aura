-- ============================================================================
-- V330: Fix contract_signatures_tenant_rls missing NULLIF/soft-fail guard
-- ============================================================================
-- Found during release-readiness Workstream B (RLS inventory sweep, 2026-09-22).
--
-- contract_signatures_tenant_rls (a PERMISSIVE policy) called
-- current_setting('app.current_tenant_id') without the second (missing_ok)
-- argument and without NULLIF — the exact broken pattern already found and
-- fixed on resource_pools/resource_pool_members earlier this session. On an
-- unscoped connection (GUC never set), current_setting() without missing_ok
-- throws "unrecognized configuration parameter" instead of returning empty,
-- and without NULLIF an empty-string GUC fails the ::uuid cast.
--
-- No live data leak: a correct RESTRICTIVE fail-closed backstop policy
-- (rls_ctx_required_contract_signatures) already exists on this table and
-- was not touched. This fix only replaces the malformed PERMISSIVE policy
-- with the same tenant-match pattern used everywhere else, so unscoped
-- queries fail cleanly (return zero rows) instead of risking a raw
-- Postgres error surfacing to the application.
--
-- Table is empty in all known environments checked (local dev) — this is a
-- structural correctness fix, not a response to demonstrated data exposure.
-- ============================================================================

DROP POLICY IF EXISTS contract_signatures_tenant_rls ON public.contract_signatures;

CREATE POLICY contract_signatures_tenant_rls ON public.contract_signatures
  USING (tenant_id = (NULLIF(current_setting('app.current_tenant_id', true), ''))::uuid)
  WITH CHECK (tenant_id = (NULLIF(current_setting('app.current_tenant_id', true), ''))::uuid);
