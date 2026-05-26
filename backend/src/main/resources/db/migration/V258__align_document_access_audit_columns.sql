-- Align document_access with TenantAware/BaseEntity audit columns.
ALTER TABLE document_access
  ADD COLUMN IF NOT EXISTS created_by UUID,
  ADD COLUMN IF NOT EXISTS updated_by UUID,
  ADD COLUMN IF NOT EXISTS version BIGINT DEFAULT 0;

ALTER TABLE document_approval_workflows
  ADD COLUMN IF NOT EXISTS version BIGINT DEFAULT 0;

ALTER TABLE document_approval_tasks
  ADD COLUMN IF NOT EXISTS version BIGINT DEFAULT 0;

ALTER TABLE document_expiry_tracking
  ADD COLUMN IF NOT EXISTS created_by UUID,
  ADD COLUMN IF NOT EXISTS updated_by UUID,
  ADD COLUMN IF NOT EXISTS version BIGINT DEFAULT 0;
