-- Align lms_learning_paths with BaseEntity audit columns.

ALTER TABLE lms_learning_paths
  ADD COLUMN IF NOT EXISTS updated_by UUID,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
