-- Align fluence_activities with BaseEntity audit/version columns.

ALTER TABLE fluence_activities
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS created_by UUID,
  ADD COLUMN IF NOT EXISTS updated_by UUID,
  ADD COLUMN IF NOT EXISTS version BIGINT NOT NULL DEFAULT 0;
