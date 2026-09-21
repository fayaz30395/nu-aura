-- US-2FZ93KN09R89: idempotency tracking for the policy-acknowledgment reminder job
CREATE TABLE IF NOT EXISTS policy_acknowledgment_reminders
(
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id         UUID        NOT NULL,
    policy_id         UUID        NOT NULL,
    employee_id       UUID        NOT NULL,
    last_reminded_at  TIMESTAMPTZ NOT NULL,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by        UUID,
    updated_by        UUID,
    version           BIGINT      NOT NULL DEFAULT 0,
    is_deleted        BOOLEAN     NOT NULL DEFAULT FALSE,
    deleted_at        TIMESTAMPTZ,
    CONSTRAINT uq_policy_ack_reminder UNIQUE (tenant_id, policy_id, employee_id)
);

CREATE INDEX IF NOT EXISTS idx_policy_ack_reminder_tenant ON policy_acknowledgment_reminders (tenant_id);
