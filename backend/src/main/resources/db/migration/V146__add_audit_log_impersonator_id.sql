-- Audit M-C3 / M-M5: preserve the forensic chain when a SuperAdmin acts on
-- behalf of a tenant user. The existing actor_id column records the
-- impersonated principal (so RBAC scope checks still apply at read time);
-- the new impersonator_id column records the underlying admin behind the
-- action. Both must be present for any cross-tenant operation to be auditable.

ALTER TABLE audit_logs
    ADD COLUMN IF NOT EXISTS impersonator_id UUID;

-- Partial index — impersonation events are rare, so we only pay the index
-- cost on rows that actually carry an impersonator. This keeps writes fast
-- on the 99% of audit entries with no impersonator while still giving
-- security review fast lookups by SuperAdmin id.
CREATE INDEX IF NOT EXISTS idx_audit_logs_impersonator
    ON audit_logs (impersonator_id)
    WHERE impersonator_id IS NOT NULL;
