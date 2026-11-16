-- 1:1 agenda templates (Keka parity). Per-owner reusable lists of agenda bullet points.
-- Forward-only, idempotent. New table only (no permission rows: MEETING:VIEW/CREATE already cover it),
-- so no per-tenant data seeding is needed. Strict RLS follows the V335 pattern.
CREATE TABLE IF NOT EXISTS meeting_agenda_templates
(
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id  UUID         NOT NULL,
    owner_id   UUID         NOT NULL,
    name       VARCHAR(200) NOT NULL,
    items      TEXT         NOT NULL,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    created_by UUID,
    updated_by UUID,
    version    BIGINT       DEFAULT 0,
    is_deleted BOOLEAN      NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_meeting_agenda_templates_tenant_owner
    ON meeting_agenda_templates (tenant_id, owner_id);

DO $$
DECLARE
    t CONSTANT TEXT := 'meeting_agenda_templates';
BEGIN
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
END $$;
