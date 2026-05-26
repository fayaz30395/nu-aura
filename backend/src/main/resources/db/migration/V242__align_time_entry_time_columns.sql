-- Align time_entries with TimeEntry LocalTime/BaseEntity mapping.
ALTER TABLE time_entries
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'time_entries'
      AND column_name = 'start_time'
      AND data_type <> 'time without time zone'
  ) THEN
    ALTER TABLE time_entries
      ALTER COLUMN start_time TYPE TIME
      USING CASE
        WHEN start_time IS NULL OR trim(start_time::text) = '' THEN NULL
        WHEN start_time::text ~ '^\d{2}:\d{2}(:\d{2})?$' THEN start_time::time
        ELSE NULL
      END;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'time_entries'
      AND column_name = 'end_time'
      AND data_type <> 'time without time zone'
  ) THEN
    ALTER TABLE time_entries
      ALTER COLUMN end_time TYPE TIME
      USING CASE
        WHEN end_time IS NULL OR trim(end_time::text) = '' THEN NULL
        WHEN end_time::text ~ '^\d{2}:\d{2}(:\d{2})?$' THEN end_time::time
        ELSE NULL
      END;
  END IF;
END $$;
