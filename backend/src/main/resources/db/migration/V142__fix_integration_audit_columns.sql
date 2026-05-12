-- V130__fix_integration_audit_columns.sql
-- Fix: BUG-P3 — integration_event_log and docusign_template_mappings predate the
-- TenantAware/BaseEntity contract and miss audit columns (created_by, updated_by,
-- version) plus, for integration_event_log, soft-delete + updated_at columns.
-- This caused 500s on:
--   GET /api/v1/integrations/docusign/template-mappings  (column "created_by" does not exist)
--   GET /api/v1/integrations/events                      (column "created_by" does not exist)

DO
$$
BEGIN
    -- =====================================================================
    -- 1. integration_event_log — created in V65 with only id/tenant_id/created_at.
    --    Entity extends TenantAware, so we need the full audit + soft-delete set.
    -- =====================================================================
    IF
EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'integration_event_log') THEN
        EXECUTE 'ALTER TABLE integration_event_log ADD COLUMN IF NOT EXISTS created_by UUID';
EXECUTE 'ALTER TABLE integration_event_log ADD COLUMN IF NOT EXISTS updated_by UUID';
EXECUTE 'ALTER TABLE integration_event_log ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ';
EXECUTE 'ALTER TABLE integration_event_log ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ';
EXECUTE 'ALTER TABLE integration_event_log ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE';
EXECUTE 'ALTER TABLE integration_event_log ADD COLUMN IF NOT EXISTS version BIGINT NOT NULL DEFAULT 0';
END IF;

    -- =====================================================================
    -- 2. docusign_template_mappings — created in V65 missing audit user columns
    --    and version. is_deleted/deleted_at/created_at/updated_at already exist.
    -- =====================================================================
    IF
EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'docusign_template_mappings') THEN
        EXECUTE 'ALTER TABLE docusign_template_mappings ADD COLUMN IF NOT EXISTS created_by UUID';
EXECUTE 'ALTER TABLE docusign_template_mappings ADD COLUMN IF NOT EXISTS updated_by UUID';
EXECUTE 'ALTER TABLE docusign_template_mappings ADD COLUMN IF NOT EXISTS version BIGINT NOT NULL DEFAULT 0';
END IF;
END $$;
