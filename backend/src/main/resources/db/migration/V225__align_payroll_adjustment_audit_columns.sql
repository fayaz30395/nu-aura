-- Align payroll_adjustments with PayrollAdjustment/BaseEntity audit mapping.
ALTER TABLE payroll_adjustments
  ADD COLUMN IF NOT EXISTS updated_by UUID;

ALTER TABLE payroll_adjustments
  ADD COLUMN IF NOT EXISTS created_by UUID;

ALTER TABLE payroll_adjustments
  ADD COLUMN IF NOT EXISTS version BIGINT DEFAULT 0;

ALTER TABLE payroll_adjustments
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;

ALTER TABLE payroll_adjustments
  DROP COLUMN IF EXISTS last_modified_by;
