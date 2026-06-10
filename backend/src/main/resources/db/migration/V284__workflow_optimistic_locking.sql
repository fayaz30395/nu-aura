-- ============================================================================
-- V284: Workflow optimistic locking hardening (DEV-1)
-- ============================================================================
-- WorkflowExecution and StepExecution inherit @Version (Long) from BaseEntity,
-- and V0 created both tables with `version BIGINT DEFAULT 0` but NULLABLE.
-- A NULL version makes Hibernate treat a loaded row as a new entity and breaks
-- optimistic-lock comparisons. Backfill NULLs and enforce NOT NULL DEFAULT 0
-- so the inherited @Version is fully effective alongside the new
-- PESSIMISTIC_WRITE lock in WorkflowExecutionRepository.findByIdAndTenantIdForUpdate.
-- Idempotent: safe on databases where the column already exists.
-- ============================================================================

ALTER TABLE workflow_executions
  ADD COLUMN IF NOT EXISTS version BIGINT;

UPDATE workflow_executions
SET version = 0
WHERE version IS NULL;

ALTER TABLE workflow_executions
  ALTER COLUMN version SET DEFAULT 0,
  ALTER COLUMN version SET NOT NULL;

ALTER TABLE step_executions
  ADD COLUMN IF NOT EXISTS version BIGINT;

UPDATE step_executions
SET version = 0
WHERE version IS NULL;

ALTER TABLE step_executions
  ALTER COLUMN version SET DEFAULT 0,
  ALTER COLUMN version SET NOT NULL;
