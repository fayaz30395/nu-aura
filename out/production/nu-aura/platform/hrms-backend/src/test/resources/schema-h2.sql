-- Create schemas needed for H2 tests
CREATE SCHEMA IF NOT EXISTS "public";
CREATE SCHEMA IF NOT EXISTS "pm";

-- Create TEXT domain for PostgreSQL compatibility
CREATE DOMAIN IF NOT EXISTS "TEXT" AS VARCHAR(10485760);
