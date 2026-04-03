-- V21: Add missing audit columns to recruitment tables.
-- These tables were created by Hibernate ddl-auto (which only mapped fields the old entities had).
-- The V0__init.sql defined them but was baselined at V18, so these columns were never physically created.

-- ── candidates ──
ALTER TABLE candidates
  ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE candidates
  ADD COLUMN IF NOT EXISTS updated_by UUID;
ALTER TABLE candidates
  ADD COLUMN IF NOT EXISTS version BIGINT DEFAULT 0;
ALTER TABLE candidates
  ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE;

-- ── job_openings ──
ALTER TABLE job_openings
  ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE job_openings
  ADD COLUMN IF NOT EXISTS updated_by UUID;
ALTER TABLE job_openings
  ADD COLUMN IF NOT EXISTS version BIGINT DEFAULT 0;
ALTER TABLE job_openings
  ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE;

-- ── interviews ──
ALTER TABLE interviews
  ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE interviews
  ADD COLUMN IF NOT EXISTS updated_by UUID;
ALTER TABLE interviews
  ADD COLUMN IF NOT EXISTS version BIGINT DEFAULT 0;
ALTER TABLE interviews
  ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE;

-- Backfill version for any existing rows (NULL → 0 for optimistic locking)
UPDATE candidates
SET version = 0
WHERE version IS NULL;
UPDATE job_openings
SET version = 0
WHERE version IS NULL;
UPDATE interviews
SET version = 0
WHERE version IS NULL;

-- Ensure updated_at is set (matches created_at if missing)
UPDATE candidates
SET updated_at = created_at
WHERE updated_at IS NULL;
UPDATE job_openings
SET updated_at = created_at
WHERE updated_at IS NULL;
UPDATE interviews
SET updated_at = created_at
WHERE updated_at IS NULL;
