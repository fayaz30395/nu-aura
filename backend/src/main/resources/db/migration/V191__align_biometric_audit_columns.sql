ALTER TABLE biometric_devices
  ADD COLUMN IF NOT EXISTS updated_by UUID;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'biometric_devices'
      AND column_name = 'last_modified_by'
  ) THEN
    EXECUTE 'UPDATE biometric_devices SET updated_by = last_modified_by WHERE updated_by IS NULL';
  END IF;
END $$;

ALTER TABLE biometric_punch_logs
  ADD COLUMN IF NOT EXISTS updated_by UUID;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'biometric_punch_logs'
      AND column_name = 'last_modified_by'
  ) THEN
    EXECUTE 'UPDATE biometric_punch_logs SET updated_by = last_modified_by WHERE updated_by IS NULL';
  END IF;
END $$;

ALTER TABLE biometric_api_keys
  ADD COLUMN IF NOT EXISTS updated_by UUID;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'biometric_api_keys'
      AND column_name = 'last_modified_by'
  ) THEN
    EXECUTE 'UPDATE biometric_api_keys SET updated_by = last_modified_by WHERE updated_by IS NULL';
  END IF;
END $$;
