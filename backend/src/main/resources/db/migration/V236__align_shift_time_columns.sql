-- Align shifts time columns with Shift LocalTime mapping.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'shifts'
      AND column_name = 'start_time'
      AND data_type <> 'time without time zone'
  ) THEN
    ALTER TABLE shifts
      ALTER COLUMN start_time TYPE TIME
      USING CASE
        WHEN start_time IS NULL OR trim(start_time::text) = '' THEN '00:00'::time
        WHEN start_time::text ~ '^\d{2}:\d{2}(:\d{2})?$' THEN start_time::time
        ELSE '00:00'::time
      END;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'shifts'
      AND column_name = 'end_time'
      AND data_type <> 'time without time zone'
  ) THEN
    ALTER TABLE shifts
      ALTER COLUMN end_time TYPE TIME
      USING CASE
        WHEN end_time IS NULL OR trim(end_time::text) = '' THEN '00:00'::time
        WHEN end_time::text ~ '^\d{2}:\d{2}(:\d{2})?$' THEN end_time::time
        ELSE '00:00'::time
      END;
  END IF;
END $$;
