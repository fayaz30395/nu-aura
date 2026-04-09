-- V129__fix_missing_columns_p2_p3_bugs.sql
-- Fix: BUG-P3-015 (systematic) — Tables missing deleted_at column required by TenantAware/BaseEntity.
-- Fix: BUG-P3-018 — one_on_one_meetings.start_time/end_time are VARCHAR(50) but entity uses LocalTime.

DO $$
BEGIN
    -- =====================================================================
    -- 1. Add deleted_at to tables that extend TenantAware but were missed
    --    by V51 and V128.
    -- =====================================================================

    -- feedback_360_cycles (BUG-P3-015: POST returns DB_INTEGRITY_VIOLATION)
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'feedback_360_cycles') THEN
        EXECUTE 'ALTER TABLE feedback_360_cycles ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ';
    END IF;

    -- pulse_surveys (BUG-P3-015: POST returns DB_INTEGRITY_VIOLATION)
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'pulse_surveys') THEN
        EXECUTE 'ALTER TABLE pulse_surveys ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ';
    END IF;

    -- one_on_one_meetings (BUG-P3-018: POST returns 500)
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'one_on_one_meetings') THEN
        EXECUTE 'ALTER TABLE one_on_one_meetings ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ';
    END IF;

    -- =====================================================================
    -- 2. Fix one_on_one_meetings column type mismatch (BUG-P3-018).
    --    DB has start_time VARCHAR(50), end_time VARCHAR(50) but entity
    --    uses LocalTime -> JDBC TIME type. Convert safely.
    -- =====================================================================

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'one_on_one_meetings'
          AND column_name = 'start_time'
          AND data_type = 'character varying'
    ) THEN
        -- Clear any non-parseable time values first
        EXECUTE 'UPDATE one_on_one_meetings SET start_time = NULL WHERE start_time IS NOT NULL AND start_time !~ ''^\d{2}:\d{2}''';
        EXECUTE 'ALTER TABLE one_on_one_meetings ALTER COLUMN start_time TYPE TIME USING start_time::TIME';
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'one_on_one_meetings'
          AND column_name = 'end_time'
          AND data_type = 'character varying'
    ) THEN
        EXECUTE 'UPDATE one_on_one_meetings SET end_time = NULL WHERE end_time IS NOT NULL AND end_time !~ ''^\d{2}:\d{2}''';
        EXECUTE 'ALTER TABLE one_on_one_meetings ALTER COLUMN end_time TYPE TIME USING end_time::TIME';
    END IF;

    -- =====================================================================
    -- 3. Add missing columns to other tables that may cause survey creation
    --    failures (surveys table uses standalone entity, not TenantAware).
    -- =====================================================================

    -- surveys table has is_deleted but may be missing deleted_at
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'surveys') THEN
        EXECUTE 'ALTER TABLE surveys ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ';
    END IF;

    RAISE NOTICE 'V129: Fixed deleted_at columns and one_on_one_meetings time column types';
END $$;
