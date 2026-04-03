-- ShedLock table for distributed job locking.
-- Prevents duplicate execution of @Scheduled jobs in multi-pod K8s deployments.
-- This is a global infrastructure table — no tenant_id or RLS needed.

CREATE TABLE IF NOT EXISTS shedlock
(
  name
  VARCHAR
(
  64
) NOT NULL,
  lock_until TIMESTAMPTZ NOT NULL,
  locked_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  locked_by VARCHAR
(
  255
) NOT NULL,
  PRIMARY KEY
(
  name
)
  );
