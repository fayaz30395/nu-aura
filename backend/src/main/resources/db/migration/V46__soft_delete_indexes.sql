-- V46__soft_delete_indexes.sql
-- Add partial indexes on is_deleted = false for high-query tables not covered by V34

CREATE INDEX IF NOT EXISTS idx_job_openings_active
  ON job_openings (tenant_id, status) WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS idx_candidates_active
  ON candidates (tenant_id, status) WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS idx_contracts_active
  ON contracts (tenant_id, id) WHERE is_deleted = false;

-- documents table does not exist — skipped

CREATE INDEX IF NOT EXISTS idx_expense_claims_active
  ON expense_claims (tenant_id, employee_id, status) WHERE is_deleted = false;

-- assets table does not have is_deleted column — skipped

-- training_courses table does not exist — skipped
