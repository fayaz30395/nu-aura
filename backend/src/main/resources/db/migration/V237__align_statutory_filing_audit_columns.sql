-- Align statutory filing entities with BaseEntity audit mapping.
ALTER TABLE statutory_filing_templates
  ADD COLUMN IF NOT EXISTS updated_by UUID;

ALTER TABLE statutory_filing_templates
  DROP COLUMN IF EXISTS last_modified_by;

ALTER TABLE statutory_filing_runs
  ADD COLUMN IF NOT EXISTS updated_by UUID;

ALTER TABLE statutory_filing_runs
  DROP COLUMN IF EXISTS last_modified_by;
