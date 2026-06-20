-- ============================================================================
-- V310: Fix outbox_events RLS — tolerate an unset/empty tenant GUC (CRITICAL)
-- ============================================================================
-- Green-Flag R4 (2026-06-21) live finding R4-ASSET-DEL / outbox regression:
--   Every operation that writes to outbox_events via EventPublisher.publishAuditEvent
--   (asset assign/return/delete/maintenance, and the same pattern across blog/wiki/
--   employee/esignature/etc.) returns HTTP 500 and rolls back, with:
--     ERROR: new row violates row-level security policy for table "outbox_events"
--
-- Root cause:
--   V303 created a STRICT policy on outbox_events that REQUIRES the session GUC
--   app.current_tenant_id to be set AND equal to the row's tenant_id. V306 then
--   applied FORCE ROW LEVEL SECURITY, enforcing it even for the app's own inserts.
--   In practice the audit/outbox insert flushes with the GUC effectively unset
--   (the AuditEvent is built by the audit layer with user_id=null / outside the
--   request's tenant-scoped connection state). Other tenant tables do not 500 on
--   the same operations because their writes either run with the GUC set or are
--   not exercised on this path — only the strict outbox policy rejects the insert.
--   Result: the transactional outbox is fully broken on the deployed backend, so
--   every audited/event-emitting mutation fails.
--
-- Fix:
--   Relax the outbox policy to also allow a row when the session GUC is unset/empty
--   (NULLIF(current_setting('app.current_tenant_id', true), '') IS NULL). The row
--   still carries an explicit, correct tenant_id, and the OutboxEventProcessor polls
--   with elevated privileges and routes by the row's tenant_id. This restores the
--   pre-outbox behavior (writes succeed) while keeping cross-tenant isolation for any
--   session that DOES have a tenant context set (it must still match).
--
-- Safety: policy-only change; idempotent (DROP IF EXISTS + CREATE). No data change.
-- ============================================================================

DROP POLICY IF EXISTS rls_ctx_required_outbox_events ON outbox_events;

CREATE POLICY rls_ctx_required_outbox_events ON outbox_events
    AS RESTRICTIVE FOR ALL
    USING (
        tenant_id IS NULL
        OR NULLIF(current_setting('app.current_tenant_id', true), '') IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
    )
    WITH CHECK (
        tenant_id IS NULL
        OR NULLIF(current_setting('app.current_tenant_id', true), '') IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
    );
