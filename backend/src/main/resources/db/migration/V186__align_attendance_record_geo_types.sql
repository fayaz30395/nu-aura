-- ============================================================================
-- V186: Align attendance_records GPS columns with AttendanceRecord entity
-- ============================================================================

DO
$$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'attendance_records'
  ) THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'attendance_records'
        AND column_name = 'check_in_latitude'
        AND data_type IN ('character varying', 'text')
    ) THEN
      ALTER TABLE attendance_records
        ALTER COLUMN check_in_latitude TYPE NUMERIC(10, 8)
        USING CASE
          WHEN check_in_latitude IS NULL OR btrim(check_in_latitude) = '' THEN NULL
          WHEN check_in_latitude ~ '^[[:space:]]*-?[0-9]+(\.[0-9]+)?[[:space:]]*$'
            THEN check_in_latitude::NUMERIC(10, 8)
          ELSE NULL
        END;
    END IF;

    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'attendance_records'
        AND column_name = 'check_in_longitude'
        AND data_type IN ('character varying', 'text')
    ) THEN
      ALTER TABLE attendance_records
        ALTER COLUMN check_in_longitude TYPE NUMERIC(11, 8)
        USING CASE
          WHEN check_in_longitude IS NULL OR btrim(check_in_longitude) = '' THEN NULL
          WHEN check_in_longitude ~ '^[[:space:]]*-?[0-9]+(\.[0-9]+)?[[:space:]]*$'
            THEN check_in_longitude::NUMERIC(11, 8)
          ELSE NULL
        END;
    END IF;

    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'attendance_records'
        AND column_name = 'check_out_latitude'
        AND data_type IN ('character varying', 'text')
    ) THEN
      ALTER TABLE attendance_records
        ALTER COLUMN check_out_latitude TYPE NUMERIC(10, 8)
        USING CASE
          WHEN check_out_latitude IS NULL OR btrim(check_out_latitude) = '' THEN NULL
          WHEN check_out_latitude ~ '^[[:space:]]*-?[0-9]+(\.[0-9]+)?[[:space:]]*$'
            THEN check_out_latitude::NUMERIC(10, 8)
          ELSE NULL
        END;
    END IF;

    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'attendance_records'
        AND column_name = 'check_out_longitude'
        AND data_type IN ('character varying', 'text')
    ) THEN
      ALTER TABLE attendance_records
        ALTER COLUMN check_out_longitude TYPE NUMERIC(11, 8)
        USING CASE
          WHEN check_out_longitude IS NULL OR btrim(check_out_longitude) = '' THEN NULL
          WHEN check_out_longitude ~ '^[[:space:]]*-?[0-9]+(\.[0-9]+)?[[:space:]]*$'
            THEN check_out_longitude::NUMERIC(11, 8)
          ELSE NULL
        END;
    END IF;
  END IF;
END $$;
