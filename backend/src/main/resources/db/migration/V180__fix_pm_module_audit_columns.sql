-- ============================================================================
-- V180: Align bundled PM module tables with local BaseEntity audit columns
-- ============================================================================
-- The pm-module jar owns schema pm and creates its tables from its bundled
-- V1 migration. Its entities extend this application's TenantAware/BaseEntity,
-- so Hibernate validation expects updated_by, is_deleted, and deleted_at on
-- each pm table. Add the local audit columns idempotently after the jar
-- migration has created the schema.
-- ============================================================================

DO
$$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN
    SELECT unnest(ARRAY[
      'projects',
      'project_tasks',
      'project_milestones',
      'project_members',
      'project_comments'
    ])
  LOOP
    IF EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'pm'
        AND table_name = tbl
    ) THEN
      EXECUTE format('ALTER TABLE pm.%I ADD COLUMN IF NOT EXISTS updated_by UUID', tbl);
      EXECUTE format('ALTER TABLE pm.%I ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE', tbl);
      EXECUTE format('ALTER TABLE pm.%I ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ', tbl);
    END IF;
  END LOOP;
END $$;
