-- Add missing columns to webhook_deliveries table

-- Duration of last request in milliseconds
ALTER TABLE webhook_deliveries ADD COLUMN IF NOT EXISTS duration_ms BIGINT;

-- HTTP status code from last attempt
ALTER TABLE webhook_deliveries ADD COLUMN IF NOT EXISTS response_status INTEGER;

-- Next scheduled retry time
ALTER TABLE webhook_deliveries ADD COLUMN IF NOT EXISTS next_retry_at TIMESTAMPTZ;

-- Timestamp of first delivery attempt
ALTER TABLE webhook_deliveries ADD COLUMN IF NOT EXISTS first_attempt_at TIMESTAMPTZ;

-- Timestamp of last delivery attempt
ALTER TABLE webhook_deliveries ADD COLUMN IF NOT EXISTS last_attempt_at TIMESTAMPTZ;

-- Timestamp of successful delivery
ALTER TABLE webhook_deliveries ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;

-- Add index for retry processing
CREATE INDEX IF NOT EXISTS idx_webhook_delivery_retry
    ON webhook_deliveries(status, next_retry_at)
    WHERE status = 'RETRYING';

COMMENT ON COLUMN webhook_deliveries.duration_ms IS 'Duration of last HTTP request in milliseconds';
COMMENT ON COLUMN webhook_deliveries.response_status IS 'HTTP status code from last delivery attempt';
COMMENT ON COLUMN webhook_deliveries.next_retry_at IS 'Next scheduled retry time for failed deliveries';
COMMENT ON COLUMN webhook_deliveries.first_attempt_at IS 'Timestamp of first delivery attempt';
COMMENT ON COLUMN webhook_deliveries.last_attempt_at IS 'Timestamp of most recent delivery attempt';
COMMENT ON COLUMN webhook_deliveries.delivered_at IS 'Timestamp when delivery succeeded';
