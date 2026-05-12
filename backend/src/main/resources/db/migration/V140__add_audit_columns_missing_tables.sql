-- ============================================================================
-- V134: Add missing created_by / updated_by audit columns to tables whose
--       JPA entities extend BaseEntity / TenantAware (which expose
--       @CreatedBy createdBy + @LastModifiedBy lastModifiedBy → updated_by).
--
-- Without these columns, every SELECT that Hibernate generates for these
-- tables fails with `column ... does not exist`, surfacing as HTTP 500
-- (InvalidDataAccessResourceUsageException) on read endpoints such as:
--   - GET /api/v1/assets/{id}/maintenance
--   - GET /api/v1/integrations/connectors
--   - GET /api/v1/integrations/docusign/templates (reads connector configs)
--   - GET /api/v1/integrations/docusign/envelopes/{id}
--   - GET /api/v1/fluence/engagement/favorites
--   - GET /api/v1/expenses/mileage/policies/{id}
--   - GET /api/v1/expenses/mileage/employee/{id}
--
-- Idempotent: uses ADD COLUMN IF NOT EXISTS so re-runs are safe.
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
            EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS created_by UUID', tbl);
EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS updated_by UUID', tbl);
END IF;
END LOOP;

    RAISE
NOTICE 'V134: created_by / updated_by columns ensured on 6 tables';
END $$;
