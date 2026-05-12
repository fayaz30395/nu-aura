-- V153: GDPR Data Subject Rights (DSR) request queue.
--
-- Context (S7-A sprint, wave-3 compliance #1 + #2):
--   GDPR Articles 15 (Access), 17 (Erasure), 20 (Portability), 16 (Rectification)
--   grant data subjects the right to request export, deletion, portable copy, or
--   correction of their personal data. Until the deep work to wire up automated
--   cascading export/erasure across employees, payroll, attendance, audit, etc.,
--   ships, this table is the auditable intake queue: every request is persisted,
--   ops gets emailed, and a human fulfils it within the 30-day statutory window.
--
-- Scope of this migration:
--   Create the `dsr_requests` table with status workflow (PENDING -> IN_PROGRESS
--   -> COMPLETED/REJECTED), soft-delete columns (the entity extends BaseEntity,
--   which expects is_deleted/deleted_at), and indexes for the two hot read paths:
--     1. Admin queue: tenant + status (ops dashboard "open requests")
--     2. User self-service: requester_user_id (GET /me/dsr/status)
--
-- Notes:
--   * `request_type` and `status` are VARCHAR(32) rather than enum types so the
--     enum can evolve in Java without a DDL migration. The application layer
--     enforces the allowed values via {@code DsrRequest.RequestType} and
--     {@code DsrRequest.Status} enums.
--   * `handler_user_id` records which SYSTEM_ADMIN moved the request to a
--     terminal state — required for the audit chain when the actual data
--     export/erasure work happens outside this table.
--   * `is_deleted` follows the project-wide soft-delete pattern (BaseEntity).
--   * No FK to `users`/`tenants` here — DSR records must survive the deletion
--     of the requester user (Article 17 fulfilment) and the parent tenant
--     records for retention. The IDs are kept as logical references only.

CREATE TABLE IF NOT EXISTS dsr_requests
(
  id
  UUID
  PRIMARY
  KEY
  DEFAULT
  gen_random_uuid
(
),
  tenant_id UUID NOT NULL,
  requester_user_id UUID NOT NULL,
  request_type VARCHAR
(
  32
) NOT NULL, -- ACCESS / ERASURE / PORTABILITY / RECTIFICATION
  status VARCHAR
(
  32
) NOT NULL DEFAULT 'PENDING', -- PENDING / IN_PROGRESS / COMPLETED / REJECTED
  reason TEXT,
  admin_notes TEXT,
  requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP WITH TIME ZONE,
  handler_user_id UUID,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
                         version BIGINT NOT NULL DEFAULT 0
                         );

CREATE INDEX IF NOT EXISTS idx_dsr_requests_tenant_status
  ON dsr_requests (tenant_id, status);

CREATE INDEX IF NOT EXISTS idx_dsr_requests_requester
  ON dsr_requests (requester_user_id);

COMMENT
ON TABLE dsr_requests IS
    'GDPR Article 15/17/20 Data Subject Rights request queue. Manual-fulfilment scaffold while automated export/erasure cascading is built out.';
COMMENT
ON COLUMN dsr_requests.request_type IS
    'GDPR right exercised: ACCESS (Art. 15), ERASURE (Art. 17), PORTABILITY (Art. 20), RECTIFICATION (Art. 16).';
COMMENT
ON COLUMN dsr_requests.status IS
    'Workflow: PENDING (intake) -> IN_PROGRESS (ops working) -> COMPLETED or REJECTED (terminal).';
COMMENT
ON COLUMN dsr_requests.handler_user_id IS
    'SYSTEM_ADMIN user that moved the request to a terminal state. Null while PENDING.';
