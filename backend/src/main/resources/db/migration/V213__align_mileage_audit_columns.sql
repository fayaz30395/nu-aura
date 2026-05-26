-- Align mileage audit columns with BaseEntity/TenantAware UUID audit fields.

ALTER TABLE mileage_policies
  ADD COLUMN IF NOT EXISTS updated_by UUID;

ALTER TABLE mileage_logs
  ADD COLUMN IF NOT EXISTS updated_by UUID;

DO
$$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'mileage_policies'
      AND column_name = 'vehicle_rates'
      AND data_type <> 'text'
  ) THEN
    ALTER TABLE mileage_policies
      ALTER COLUMN vehicle_rates TYPE TEXT USING vehicle_rates::TEXT;
  END IF;
END $$;

DO
$$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'mileage_policies'
      AND column_name = 'created_by'
      AND data_type <> 'uuid'
  ) THEN
    ALTER TABLE mileage_policies
      ALTER COLUMN created_by TYPE UUID USING NULLIF(created_by, '')::UUID;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'mileage_logs'
      AND column_name = 'created_by'
      AND data_type <> 'uuid'
  ) THEN
    ALTER TABLE mileage_logs
      ALTER COLUMN created_by TYPE UUID USING NULLIF(created_by, '')::UUID;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'mileage_policies'
      AND column_name = 'last_modified_by'
  ) THEN
    ALTER TABLE mileage_policies
      DROP COLUMN last_modified_by;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'mileage_logs'
      AND column_name = 'last_modified_by'
  ) THEN
    ALTER TABLE mileage_logs
      DROP COLUMN last_modified_by;
  END IF;
END $$;
