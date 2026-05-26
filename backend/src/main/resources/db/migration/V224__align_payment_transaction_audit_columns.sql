-- Align payment_transactions with PaymentTransaction/BaseEntity mapping.
ALTER TABLE payment_transactions
  ADD COLUMN IF NOT EXISTS created_by UUID;

ALTER TABLE payment_transactions
  ADD COLUMN IF NOT EXISTS updated_by UUID;

ALTER TABLE payment_transactions
  ADD COLUMN IF NOT EXISTS version BIGINT NOT NULL DEFAULT 0;

ALTER TABLE payment_transactions
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
