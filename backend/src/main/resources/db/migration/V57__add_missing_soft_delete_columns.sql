-- V57__add_missing_soft_delete_columns.sql
-- Add is_deleted and deleted_at to tables that extend BaseEntity but were missed in V51.
-- These columns are required by the JPA entity model (BaseEntity has isDeleted + deletedAt).

DO
$$
DECLARE
tbl TEXT;
BEGIN
FOR tbl IN
SELECT unnest(ARRAY[
                'role_permissions',
              'user_roles',
              'notification_preferences',
              'workflow_definitions',
              'workflow_steps',
              'workflow_executions',
              'approval_tasks',
              'approval_delegates'
                ])
         LOOP
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = tbl) THEN
            EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE', tbl);
EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ', tbl);
END IF;
END LOOP;
END $$;
