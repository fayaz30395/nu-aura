-- Align shift_patterns with ShiftPattern/BaseEntity audit mapping.
ALTER TABLE shift_patterns
  ADD COLUMN IF NOT EXISTS updated_by UUID;

ALTER TABLE shift_patterns
  ADD COLUMN IF NOT EXISTS created_by UUID;

ALTER TABLE shift_patterns
  ADD COLUMN IF NOT EXISTS version BIGINT DEFAULT 0;

ALTER TABLE shift_patterns
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;

ALTER TABLE shift_patterns
  DROP COLUMN IF EXISTS last_modified_by;
