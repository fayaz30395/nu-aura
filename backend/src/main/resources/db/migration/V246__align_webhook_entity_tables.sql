-- Align webhook aggregate tables with Webhook/WebhookDelivery mappings.
ALTER TABLE webhook_deliveries
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE webhooks
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_success_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_failure_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS webhook_events
(
  webhook_id UUID NOT NULL,
  event_type VARCHAR(255)
);

CREATE INDEX IF NOT EXISTS idx_webhook_events_webhook
  ON webhook_events(webhook_id);
