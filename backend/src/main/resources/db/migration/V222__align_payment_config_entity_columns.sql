-- Align payment configs with PaymentConfig entity fields.

ALTER TABLE payment_configs
  ADD COLUMN IF NOT EXISTS config_key VARCHAR(255),
  ADD COLUMN IF NOT EXISTS version BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

UPDATE payment_configs
SET config_key = tenant_id::TEXT || ':' || provider
WHERE config_key IS NULL;

ALTER TABLE payment_configs
  ALTER COLUMN config_key SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_configs_config_key
  ON payment_configs (config_key);
