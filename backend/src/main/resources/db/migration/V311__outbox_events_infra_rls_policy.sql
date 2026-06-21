-- ============================================================================
-- V311: Treat outbox_events as the infrastructure table it is (CRITICAL)
-- ============================================================================
-- Green-Flag R5 (2026-06-22) — definitive fix for R4-OUTBOX.
--
-- BACKGROUND (what V303/V306/V310 got wrong):
--   outbox_events is an INTERNAL transactional-outbox queue. It is written by
--   trusted server code (EventPublisher.publishAuditEvent etc.) inside the
--   business transaction, and read ONLY by OutboxEventProcessor, which polls
--   PENDING rows ACROSS ALL TENANTS on a scheduler thread that has NO tenant
--   context (app.current_tenant_id unset). There is no controller, repository,
--   or view that exposes outbox_events to a tenant user request.
--
--   V303 forced this infra queue into the tenant-RLS model with a RESTRICTIVE
--   policy whose WITH CHECK requires the session GUC to equal the row tenant_id.
--   V306 then applied FORCE RLS. Result, live-confirmed in Railway logs:
--     ERROR: new row violates row-level security policy for table "outbox_events"
--   on EVERY audited/event-emitting mutation (asset assign/return/delete/
--   maintenance, and the same publishAuditEvent pattern across blog/wiki/
--   employee/esignature/exit/recruitment) → HTTP 500 + full transaction rollback.
--   The audit/outbox insert flushes with a session GUC that does not match the
--   row tenant_id, so the strict WITH CHECK rejects it. V310 relaxed the policy
--   to tolerate an UNSET GUC, but the live failure persists because the GUC at
--   flush time is a MISMATCHED non-null value, not null — proven by reproducing
--   the insert as nu_app_rls against the live DB (unset/match → OK, mismatch → fail).
--
-- WHY A GUC-GATED WRITE POLICY IS WRONG FOR THIS TABLE:
--   The outbox row already carries an explicit, trusted tenant_id (set from
--   TenantContext by server code, never user input). The processor routes by
--   that column. Gating the WRITE on the request's session GUC adds no isolation
--   value (tenant_id is authoritative) and only makes durable event publication
--   fragile w.r.t. whatever the connection's GUC happens to be at flush time.
--
-- FIX (self-contained, idempotent, replaces V303/V310 policy state):
--   A single PERMISSIVE policy:
--     * USING  — relaxed read predicate: a session with a tenant GUC sees only
--                its own (or tenant-null) rows; the processor (GUC unset) sees
--                all PENDING rows so cross-tenant polling keeps working.
--     * WITH CHECK (true) — trusted-code writes are never RLS-vetoed, so the
--                transactional outbox can no longer 500 the business operation.
--
--   The matching RlsStartupProbe change excludes outbox_events from the
--   tenant-data canary (it is infra, not tenant data, and has no user read
--   path), so the relaxed USING predicate cannot trip the fail-closed boot probe.
--   This also closes a SECOND latent CRITICAL: under V310 the canary saw
--   outbox rows visible with an unset GUC, so any restart while events were
--   pending would have FAILED the startup probe (the current pod only booted
--   because outbox was empty at boot).
--
-- SECURITY NOTE: tenant DATA tables (employees, payslips, leave_*, etc.) are
--   untouched and remain strict fail-closed. Only this infra queue is relaxed.
-- ============================================================================

ALTER TABLE outbox_events ENABLE ROW LEVEL SECURITY;

-- Remove the strict V303/V310 policy and any out-of-band allow-all policy so the
-- final state is fully defined by this migration (reproducible on a fresh DB).
DROP POLICY IF EXISTS rls_ctx_required_outbox_events ON outbox_events;
DROP POLICY IF EXISTS outbox_events_allow_all ON outbox_events;
DROP POLICY IF EXISTS outbox_events_infra_access ON outbox_events;

CREATE POLICY outbox_events_infra_access ON outbox_events
    AS PERMISSIVE FOR ALL
    USING (
        tenant_id IS NULL
        OR NULLIF(current_setting('app.current_tenant_id', true), '') IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
    )
    WITH CHECK (true);
