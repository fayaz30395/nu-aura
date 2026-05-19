-- V178: Add composite index for retry worker hot path
--
-- The scheduled retry processor scans RETRYING rows ordered by next_retry_at and id.
-- This index supports that workload for large webhook_deliveries tables while keeping the
-- status predicate selective.

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'webhook_deliveries'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_retry_queue
            ON webhook_deliveries (tenant_id, next_retry_at, id)
            WHERE status = 'RETRYING' AND next_retry_at IS NOT NULL;
    END IF;
END $$;
