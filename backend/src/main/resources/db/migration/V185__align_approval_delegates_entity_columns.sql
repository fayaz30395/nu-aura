-- ============================================================================
-- V185: Align approval_delegates with ApprovalDelegate entity
-- ============================================================================

ALTER TABLE approval_delegates
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS delegator_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS delegate_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS reason VARCHAR(255),
  ADD COLUMN IF NOT EXISTS workflow_definition_id UUID,
  ADD COLUMN IF NOT EXISTS department_id UUID,
  ADD COLUMN IF NOT EXISTS max_approval_amount NUMERIC(38, 2),
  ADD COLUMN IF NOT EXISTS can_sub_delegate BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS notify_delegator_on_action BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS notify_delegate_on_assignment BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS expiry_notification_days INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS revoked BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS revoked_by UUID,
  ADD COLUMN IF NOT EXISTS revocation_reason VARCHAR(255);
