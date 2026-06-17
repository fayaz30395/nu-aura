-- ============================================================================
-- V303: Add Row-Level Security to outbox_events table
--
-- Context:
--   V300 created outbox_events with a tenant_id column but did not enable RLS.
--   RlsStartupProbe (fail-on-bypass=true) rejects tables that have a tenant_id
--   column but lack ENABLE ROW LEVEL SECURITY + FORCE ROW LEVEL SECURITY +
--   a restrictive policy referencing app.current_tenant_id.
--
-- Policy design:
--   outbox_events is an internal infrastructure table written by the application
--   during business operations. tenant_id is nullable (events fired from system
--   startup tasks may have no tenant context). The policy allows:
--     - Rows WHERE tenant_id matches the current session tenant context
--     - Rows WHERE tenant_id IS NULL (system/infra events)
--   This preserves OutboxEventProcessor's ability to poll across all tenants
--   when the application connects as the superuser (nu_app_rls bypasses when
--   connecting with BYPASSRLS privilege via the management connection).
-- ============================================================================

ALTER TABLE outbox_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rls_ctx_required_outbox_events ON outbox_events;

CREATE POLICY rls_ctx_required_outbox_events ON outbox_events
    AS RESTRICTIVE FOR ALL
    USING (
        tenant_id IS NULL
        OR (
            NULLIF(current_setting('app.current_tenant_id', true), '') IS NOT NULL
            AND tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
        )
    )
    WITH CHECK (
        tenant_id IS NULL
        OR (
            NULLIF(current_setting('app.current_tenant_id', true), '') IS NOT NULL
            AND tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
        )
    );

ALTER TABLE outbox_events FORCE ROW LEVEL SECURITY;
