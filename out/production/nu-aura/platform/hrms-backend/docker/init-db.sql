-- HRMS Database Initialization Script
-- This script sets up the initial database schema and seed data

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Grant privileges to hrms user (if not already done)
GRANT ALL PRIVILEGES ON DATABASE hrms TO hrms;

-- Note: The actual schema will be created by Liquibase migrations
-- This file is for any PostgreSQL-specific setup that needs to run before the application starts

-- Create custom types if needed
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'leave_status') THEN
        CREATE TYPE leave_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');
    END IF;
END$$;

-- Performance indexes (these supplement the JPA-created indexes)
-- These will be created after the tables exist

-- Helpful stored procedures for maintenance

-- Function to clean up old audit logs (older than retention period)
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs(retention_days INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM audit_logs
    WHERE created_at < NOW() - (retention_days || ' days')::INTERVAL;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to archive old attendance records
CREATE OR REPLACE FUNCTION archive_old_attendance(archive_months INTEGER DEFAULT 12)
RETURNS INTEGER AS $$
DECLARE
    archived_count INTEGER;
BEGIN
    -- This is a placeholder - in production, you'd move records to an archive table
    -- For now, just return 0
    archived_count := 0;
    RETURN archived_count;
END;
$$ LANGUAGE plpgsql;

-- Create a view for active employees with their departments (useful for reports)
-- This will work after the application creates the base tables
CREATE OR REPLACE VIEW vw_active_employees AS
SELECT
    e.id,
    e.employee_code,
    e.first_name,
    e.last_name,
    e.email,
    e.department_id,
    e.designation,
    e.date_of_joining,
    e.tenant_id
FROM employees e
WHERE e.employment_status = 'ACTIVE'
  AND e.deleted_at IS NULL;

-- Create a materialized view for leave balances summary (refresh periodically)
-- Uncomment after tables are created by Liquibase
-- CREATE MATERIALIZED VIEW IF NOT EXISTS mv_leave_balance_summary AS
-- SELECT
--     lb.employee_id,
--     lb.tenant_id,
--     SUM(lb.balance) as total_balance,
--     COUNT(DISTINCT lb.leave_type_id) as leave_types_count
-- FROM leave_balances lb
-- GROUP BY lb.employee_id, lb.tenant_id;

-- Seed data for development/testing (only in non-production environments)
-- This is handled by Liquibase, but you can add additional seed data here

-- Log that initialization completed
DO $$
BEGIN
    RAISE NOTICE 'HRMS database initialization completed at %', NOW();
END$$;
