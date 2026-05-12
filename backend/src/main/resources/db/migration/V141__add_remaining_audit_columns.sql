-- ============================================================================
-- V141: Add remaining audit columns missed by V140 — `version` (BIGINT, JPA
--       optimistic lock from BaseEntity) and `updated_at` (TIMESTAMPTZ).
--
-- Triggered by 500s on:
--   - GET /api/v1/integrations/connectors            (version missing)
--   - GET /api/v1/integrations/docusign/templates    (reads connector_configs)
--   - GET /api/v1/integrations/docusign/envelopes/{id} (version missing)
--   - GET /api/v1/fluence/engagement/favorites       (updated_at missing)
--
-- Idempotent: ADD COLUMN IF NOT EXISTS.
-- ============================================================================

DO
$$
DECLARE
tbl TEXT;
BEGIN
FOR tbl IN
SELECT unnest(ARRAY[
                'asset_maintenance_requests',
              'integration_connector_configs',
              'fluence_favorites',
              'mileage_policies',
              'mileage_logs',
              'docusign_envelopes'
                ])
         LOOP
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = tbl) THEN
            EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS version BIGINT DEFAULT 0', tbl);
EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()', tbl);
EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW()', tbl);
EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ', tbl);
EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE', tbl);
END IF;
END LOOP;

    RAISE
NOTICE 'V141: version / updated_at / created_at / deleted_at / is_deleted columns ensured';
END $$;
