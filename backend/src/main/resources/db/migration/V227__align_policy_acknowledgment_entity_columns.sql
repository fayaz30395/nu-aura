-- Align policy_acknowledgments with PolicyAcknowledgment mapping.
ALTER TABLE policy_acknowledgments
  ADD COLUMN IF NOT EXISTS acknowledged_at TIMESTAMP;

ALTER TABLE policy_acknowledgments
  ADD COLUMN IF NOT EXISTS ip_address VARCHAR(255);

ALTER TABLE policy_acknowledgments
  ADD COLUMN IF NOT EXISTS user_agent VARCHAR(255);
