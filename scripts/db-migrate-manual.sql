-- ============================================================================
-- NU-AURA Database Migration Script (Manual SQL)
-- Purpose: Manual database migration for systems without shell access
-- Usage: psql -U postgres -f db-migrate-manual.sql
-- ============================================================================

-- Step 1: Create database if not exists
SELECT 'Creating database hrms_db...' AS status;
CREATE
DATABASE hrms_db
    WITH
    OWNER = postgres
    ENCODING = 'UTF8'
    LC_COLLATE = 'en_US.utf8'
    LC_CTYPE = 'en_US.utf8'
    TABLESPACE = pg_default
    CONNECTION LIMIT = -1;

-- Connect to the database
\c
hrms_db

-- Step 2: Enable required extensions
SELECT 'Enabling PostgreSQL extensions...' AS status;
CREATE
EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE
EXTENSION IF NOT EXISTS "pgcrypto";

-- Step 3: Verify extensions
SELECT 'Verifying extensions...' AS status;
SELECT extname, extversion
FROM pg_extension
WHERE extname IN ('uuid-ossp', 'pgcrypto');

-- ============================================================================
-- EXPORT COMMANDS (Run on SOURCE system)
-- ============================================================================
-- Use these commands to export data from source system:

-- Option 1: Full backup (recommended)
-- pg_dump -h localhost -U postgres -d hrms_db --clean --if-exists --create -F plain -f nuaura_full_backup.sql

-- Option 2: Schema only
-- pg_dump -h localhost -U postgres -d hrms_db --schema-only --clean --if-exists -F plain -f nuaura_schema.sql

-- Option 3: Data only
-- pg_dump -h localhost -U postgres -d hrms_db --data-only --column-inserts -F plain -f nuaura_data.sql

-- Option 4: Specific tables
-- pg_dump -h localhost -U postgres -d hrms_db -t users -t employees -t tenants --column-inserts -F plain -f nuaura_partial.sql

-- ============================================================================
-- IMPORT COMMANDS (Run on TARGET system)
-- ============================================================================
-- Use these commands to import data to target system:

-- Option 1: Import full backup
-- psql -U postgres -d postgres -f nuaura_full_backup.sql

-- Option 2: Import schema then data
-- psql -U postgres -d hrms_db -f nuaura_schema.sql
-- psql -U postgres -d hrms_db -f nuaura_data.sql

-- Option 3: Import specific tables
-- psql -U postgres -d hrms_db -f nuaura_partial.sql

-- ============================================================================
-- POST-MIGRATION VERIFICATION
-- ============================================================================

-- Check table count
SELECT 'Total tables:' AS metric, COUNT(*) AS value
FROM information_schema.tables
WHERE table_schema = 'public'
UNION ALL
-- Check row counts for key tables
SELECT 'Tenants:' AS metric, COUNT(*) ::text AS value
FROM tenants
UNION ALL
SELECT 'Users:' AS metric, COUNT(*) ::text AS value
FROM users
UNION ALL
SELECT 'Employees:' AS metric, COUNT(*) ::text AS value
FROM employees
UNION ALL
SELECT 'Departments:' AS metric, COUNT(*) ::text AS value
FROM departments
UNION ALL
SELECT 'Roles:' AS metric, COUNT(*) ::text AS value
FROM roles
UNION ALL
SELECT 'Permissions:' AS metric, COUNT(*) ::text AS value
FROM permissions;

-- Check sequences
SELECT 'Checking sequences...' AS status;
SELECT schemaname, sequencename, last_value
FROM pg_sequences
WHERE schemaname = 'public';

-- Check foreign key constraints
SELECT 'Checking foreign keys...' AS status;
SELECT tc.table_name,
       tc.constraint_name,
       tc.constraint_type
FROM information_schema.table_constraints tc
WHERE tc.constraint_schema = 'public'
  AND tc.constraint_type = 'FOREIGN KEY'
ORDER BY tc.table_name;

-- Check indexes
SELECT 'Checking indexes...' AS status;
SELECT schemaname,
       tablename,
       indexname,
       indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- ============================================================================
-- RESET SEQUENCES (Run after data import if needed)
-- ============================================================================

-- This section is needed if you import data with explicit IDs
-- PostgreSQL sequences won't auto-increment properly without resetting

DO
$$
DECLARE
rec RECORD;
    max_id
BIGINT;
BEGIN
FOR rec IN
SELECT table_name,
       column_name,
       pg_get_serial_sequence(table_name, column_name) as seq_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND column_default LIKE 'nextval%'
  AND pg_get_serial_sequence(table_name, column_name) IS NOT NULL LOOP
        EXECUTE format('SELECT COALESCE(MAX(%I), 0) FROM %I', rec.column_name, rec.table_name)
INTO max_id;
EXECUTE format('SELECT setval(%L, %s)', rec.seq_name, max_id + 1);
RAISE
NOTICE 'Reset sequence % to %', rec.seq_name, max_id + 1;
END LOOP;
END $$;

-- ============================================================================
-- CLEANUP (Optional - run on SOURCE system after successful migration)
-- ============================================================================

-- WARNING: Only run this on the OLD system after verifying new system works!
-- DROP DATABASE hrms_db;
