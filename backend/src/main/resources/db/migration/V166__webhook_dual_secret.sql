-- V166: Dual-secret rotation window for webhook signing (Wave-10 P0-5).
-- When an admin rotates a webhook's HMAC secret we must NOT instantly break in-flight
-- deliveries that consumers are still verifying with the old secret. We persist the
-- previous secret alongside an expiry timestamp; verification accepts EITHER current
-- or previous (while non-expired); signing always uses the current secret only.
-- A scheduled job nulls out previous_secret once previous_secret_expires_at < now.
ALTER TABLE webhooks
  ADD COLUMN previous_secret VARCHAR(255);
ALTER TABLE webhooks
  ADD COLUMN previous_secret_expires_at TIMESTAMP;

COMMENT
ON COLUMN webhooks.previous_secret IS 'Previous HMAC secret kept for a rotation window so in-flight retries can still verify. NULL once rotation window expires.';

-- Partial index on the expiry column — most rows have NULL previous_secret_expires_at
-- (no active rotation), so a partial index keeps the cleanup-scan cheap.
CREATE INDEX idx_webhooks_previous_secret_expires
  ON webhooks (previous_secret_expires_at) WHERE previous_secret_expires_at IS NOT NULL;
