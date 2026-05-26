-- Align scheduled_reports.time_of_day with ScheduledReport LocalTime mapping.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'scheduled_reports'
      AND column_name = 'time_of_day'
      AND data_type <> 'time without time zone'
  ) THEN
    ALTER TABLE scheduled_reports
      ALTER COLUMN time_of_day TYPE TIME
      USING CASE
        WHEN time_of_day IS NULL OR trim(time_of_day::text) = '' THEN NULL
        WHEN time_of_day::text ~ '^\d{2}:\d{2}(:\d{2})?$' THEN time_of_day::time
        ELSE NULL
      END;
  END IF;
END $$;
