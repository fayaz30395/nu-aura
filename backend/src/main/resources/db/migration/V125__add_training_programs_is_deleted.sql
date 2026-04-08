-- ============================================================================
-- V125: Add is_deleted column to training_programs (2026-04-08)
-- Entity uses @Where(clause = "is_deleted = false") but column was missing.
-- ============================================================================

ALTER TABLE training_programs
    ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE;
