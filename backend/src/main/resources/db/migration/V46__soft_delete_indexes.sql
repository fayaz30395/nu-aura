-- V46__soft_delete_indexes.sql
-- Add partial indexes on is_deleted = false for high-query tables not covered by V34

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_job_openings_active
  ON job_openings (tenant_id, status) WHERE is_deleted = false;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_candidates_active
  ON candidates (tenant_id, status) WHERE is_deleted = false;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_contracts_active
  ON contracts (tenant_id, id) WHERE is_deleted = false;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_documents_active
  ON documents (tenant_id, id) WHERE is_deleted = false;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_expense_claims_active
  ON expense_claims (tenant_id, employee_id, status) WHERE is_deleted = false;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_assets_active
  ON assets (tenant_id, status) WHERE is_deleted = false;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_training_courses_active
  ON training_courses (tenant_id, id) WHERE is_deleted = false;
