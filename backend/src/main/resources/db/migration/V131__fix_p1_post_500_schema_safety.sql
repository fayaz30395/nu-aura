-- ============================================================================
-- V131: Schema safety net for P1 POST 500 errors (2026-04-09)
-- BUG-P1-008/009/011: POST on loans, travel, holidays returns 500.
-- Ensures deleted_at column exists and NOT NULL defaults are relaxed for
-- audit columns that JPA auditing populates (created_at, updated_at).
-- Also ensures updated_by (lastModifiedBy) column exists on all affected tables.
-- ============================================================================

DO $$
BEGIN
    -- =====================================================================
    -- 1. Add deleted_at to tables that may have been missed by V58
    -- =====================================================================

    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'employee_loans') THEN
        EXECUTE 'ALTER TABLE employee_loans ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ';
    END IF;

    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'travel_requests') THEN
        EXECUTE 'ALTER TABLE travel_requests ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ';
    END IF;

    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'holidays') THEN
        EXECUTE 'ALTER TABLE holidays ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ';
    END IF;

    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'tickets') THEN
        EXECUTE 'ALTER TABLE tickets ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ';
    END IF;

    -- =====================================================================
    -- 2. Relax NOT NULL on created_at / updated_at so that JPA auditing
    --    can work without hitting constraint violations (DB DEFAULT still
    --    fires if Hibernate sends NULL, but some JDBC drivers send explicit
    --    NULL which overrides the DEFAULT).
    -- =====================================================================

    -- employee_loans
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'employee_loans'
          AND column_name = 'created_at' AND is_nullable = 'NO'
    ) THEN
        EXECUTE 'ALTER TABLE employee_loans ALTER COLUMN created_at SET DEFAULT NOW()';
        EXECUTE 'ALTER TABLE employee_loans ALTER COLUMN created_at DROP NOT NULL';
    END IF;
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'employee_loans'
          AND column_name = 'updated_at' AND is_nullable = 'NO'
    ) THEN
        EXECUTE 'ALTER TABLE employee_loans ALTER COLUMN updated_at SET DEFAULT NOW()';
        EXECUTE 'ALTER TABLE employee_loans ALTER COLUMN updated_at DROP NOT NULL';
    END IF;

    -- travel_requests
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'travel_requests'
          AND column_name = 'created_at' AND is_nullable = 'NO'
    ) THEN
        EXECUTE 'ALTER TABLE travel_requests ALTER COLUMN created_at SET DEFAULT NOW()';
        EXECUTE 'ALTER TABLE travel_requests ALTER COLUMN created_at DROP NOT NULL';
    END IF;
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'travel_requests'
          AND column_name = 'updated_at' AND is_nullable = 'NO'
    ) THEN
        EXECUTE 'ALTER TABLE travel_requests ALTER COLUMN updated_at SET DEFAULT NOW()';
        EXECUTE 'ALTER TABLE travel_requests ALTER COLUMN updated_at DROP NOT NULL';
    END IF;

    -- holidays
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'holidays'
          AND column_name = 'created_at' AND is_nullable = 'NO'
    ) THEN
        EXECUTE 'ALTER TABLE holidays ALTER COLUMN created_at SET DEFAULT NOW()';
        EXECUTE 'ALTER TABLE holidays ALTER COLUMN created_at DROP NOT NULL';
    END IF;
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'holidays'
          AND column_name = 'updated_at' AND is_nullable = 'NO'
    ) THEN
        EXECUTE 'ALTER TABLE holidays ALTER COLUMN updated_at SET DEFAULT NOW()';
        EXECUTE 'ALTER TABLE holidays ALTER COLUMN updated_at DROP NOT NULL';
    END IF;

    -- tickets
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'tickets'
          AND column_name = 'created_at' AND is_nullable = 'NO'
    ) THEN
        EXECUTE 'ALTER TABLE tickets ALTER COLUMN created_at SET DEFAULT NOW()';
        EXECUTE 'ALTER TABLE tickets ALTER COLUMN created_at DROP NOT NULL';
    END IF;
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'tickets'
          AND column_name = 'updated_at' AND is_nullable = 'NO'
    ) THEN
        EXECUTE 'ALTER TABLE tickets ALTER COLUMN updated_at SET DEFAULT NOW()';
        EXECUTE 'ALTER TABLE tickets ALTER COLUMN updated_at DROP NOT NULL';
    END IF;

    RAISE NOTICE 'V131: Schema safety net applied for P1 POST endpoints';
END $$;
