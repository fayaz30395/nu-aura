-- ============================================================================
-- V126: Re-add is_deleted to training_programs (2026-04-08)
-- V125 was recorded by Flyway but column did not persist due to race condition.
-- ============================================================================

ALTER TABLE training_programs
    ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE;
