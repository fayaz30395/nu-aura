-- ============================================================================
-- V187: Align audit_logs with domain.audit.AuditLog
-- ============================================================================

ALTER TABLE audit_logs
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS impersonator_id UUID,
  ADD COLUMN IF NOT EXISTS description TEXT;
