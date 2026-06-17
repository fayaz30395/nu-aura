-- Transactional outbox for durable async event processing.
-- Written atomically with the business operation; polled by OutboxEventProcessor.
-- Replaces Kafka direct-publish on Railway (no Kafka provisioned).
CREATE TABLE IF NOT EXISTS outbox_events (
    id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id        VARCHAR(255)    NOT NULL,
    topic           VARCHAR(255)    NOT NULL,
    partition_key   VARCHAR(255),
    event_class     VARCHAR(500)    NOT NULL,
    payload         JSONB           NOT NULL,
    status          VARCHAR(50)     NOT NULL DEFAULT 'PENDING',
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    processed_at    TIMESTAMPTZ,
    retry_count     INT             NOT NULL DEFAULT 0,
    last_error      TEXT,
    tenant_id       UUID,
    CONSTRAINT uq_outbox_event_id UNIQUE (event_id)
);

CREATE INDEX IF NOT EXISTS idx_outbox_status_created ON outbox_events (status, created_at)
    WHERE status = 'PENDING';
