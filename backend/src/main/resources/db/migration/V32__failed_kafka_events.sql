-- ============================================================
-- V32 - failed_kafka_events table
-- Stores Kafka messages that exhausted all retry attempts and
-- landed in a Dead Letter Topic (DLT), enabling admin review
-- and replay via the /api/v1/admin/kafka/replay endpoint.
-- ============================================================

CREATE TABLE IF NOT EXISTS failed_kafka_events (
    id            UUID         NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,

    -- Kafka provenance (uniquely identifies the original DLT message)
    topic         VARCHAR(200) NOT NULL,
    partition     INT          NOT NULL,
    "offset"      BIGINT       NOT NULL,

    -- Payload (stored as TEXT; truncated when original > 500 chars)
    payload           TEXT,
    payload_truncated BOOLEAN      NOT NULL DEFAULT FALSE,
    error_message     TEXT,

    -- Lifecycle status
    status            VARCHAR(30)  NOT NULL DEFAULT 'PENDING_REPLAY'
                          CHECK (status IN ('PENDING_REPLAY', 'REPLAYED', 'IGNORED')),

    -- Replay tracking
    target_topic  VARCHAR(200),
    replayed_at   TIMESTAMPTZ,
    replayed_by   UUID,
    replay_count  INT          NOT NULL DEFAULT 0,

    -- BaseEntity audit columns
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
    created_by    UUID,
    updated_by    UUID,
    version       BIGINT       NOT NULL DEFAULT 0,
    is_deleted    BOOLEAN      NOT NULL DEFAULT FALSE
);

-- Primary lookup: topic + status (admin queue, monitoring)
CREATE INDEX idx_fke_topic_status  ON failed_kafka_events (topic, status);
CREATE INDEX idx_fke_status        ON failed_kafka_events (status);
CREATE INDEX idx_fke_topic         ON failed_kafka_events (topic);
CREATE INDEX idx_fke_created_at    ON failed_kafka_events (created_at DESC);

-- Deduplication: prevent inserting the same DLT offset twice on consumer restart
CREATE UNIQUE INDEX uq_fke_topic_partition_offset
    ON failed_kafka_events (topic, partition, "offset");

-- Comment the table for DBA clarity
COMMENT ON TABLE failed_kafka_events IS
    'Dead-lettered Kafka messages awaiting admin review and optional replay.';
COMMENT ON COLUMN failed_kafka_events.status IS
    'PENDING_REPLAY = awaiting action; REPLAYED = republished; IGNORED = dismissed.';
COMMENT ON COLUMN failed_kafka_events.payload_truncated IS
    'TRUE when the original payload exceeded 500 chars and was truncated before storage.';
COMMENT ON COLUMN failed_kafka_events.replay_count IS
    'Incremented on each replay attempt; high values indicate potential poison pills.';
