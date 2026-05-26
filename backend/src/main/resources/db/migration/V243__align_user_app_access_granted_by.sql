-- Align user_app_access granted_by/BaseEntity columns with UserAppAccess mapping.
ALTER TABLE user_app_access
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'user_app_access'
      AND column_name = 'granted_by'
      AND data_type <> 'uuid'
  ) THEN
    ALTER TABLE user_app_access
      ALTER COLUMN granted_by TYPE UUID
      USING CASE
        WHEN granted_by IS NULL OR trim(granted_by::text) = '' THEN NULL
        WHEN granted_by::text ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          THEN granted_by::uuid
        ELSE NULL
      END;
  END IF;
END $$;
