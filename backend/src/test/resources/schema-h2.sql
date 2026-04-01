-- Create schemas needed for H2 tests
CREATE SCHEMA IF NOT EXISTS "public";
CREATE SCHEMA IF NOT EXISTS "pm";
SET SCHEMA "public";

-- Create TEXT domain for PostgreSQL compatibility
CREATE DOMAIN IF NOT EXISTS "TEXT" AS VARCHAR(10485760);

-- Create JSONB domain for PostgreSQL compatibility (H2 stores as CLOB)
CREATE DOMAIN IF NOT EXISTS "JSONB" AS CLOB;
CREATE DOMAIN IF NOT EXISTS "jsonb" AS CLOB;

-- ShedLock table for distributed lock coordination (used by @SchedulerLock)
CREATE TABLE IF NOT EXISTS "shedlock" (
    "name" VARCHAR(64) NOT NULL,
    "lock_until" TIMESTAMP NOT NULL,
    "locked_at" TIMESTAMP NOT NULL,
    "locked_by" VARCHAR(255) NOT NULL,
    PRIMARY KEY ("name")
);
