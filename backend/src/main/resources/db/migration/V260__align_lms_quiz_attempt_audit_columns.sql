-- Align lms_quiz_attempts with BaseEntity audit column names.

ALTER TABLE lms_quiz_attempts
  ADD COLUMN IF NOT EXISTS updated_by UUID,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
