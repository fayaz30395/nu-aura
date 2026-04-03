-- V58__add_missing_soft_delete_columns.sql
-- Add is_deleted and deleted_at to ALL public tables that are missing them.
-- BaseEntity requires these columns on every JPA entity table.
-- Uses dynamic SQL to safely add columns only where they don't already exist.

DO
$$
DECLARE
tbl_name TEXT;
BEGIN
FOR tbl_name IN
SELECT t.tablename
FROM pg_tables t
WHERE t.schemaname = 'public'
  AND t.tablename NOT LIKE 'flyway_%'
  AND t.tablename NOT LIKE 'pg_%'
  AND NOT EXISTS (SELECT 1
                  FROM information_schema.columns c
                  WHERE c.table_schema = 'public'
                    AND c.table_name = t.tablename
                    AND c.column_name = 'deleted_at')
  LOOP
        -- Only add to tables that have is_deleted or other BaseEntity columns (id, created_at)
        IF EXISTS (
            SELECT 1 FROM information_schema.columns c
            WHERE c.table_schema = 'public'
              AND c.table_name = tbl_name
              AND c.column_name IN ('id', 'created_at')
        ) THEN
            EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE', tbl_name);
EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ', tbl_name);
RAISE
NOTICE 'Added soft-delete columns to: %', tbl_name;
END IF;
END LOOP;
END $$;
