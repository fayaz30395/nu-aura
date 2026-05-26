-- Align verification_checks with VerificationCheck/BaseEntity mapping.
ALTER TABLE verification_checks
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS start_date DATE,
  ADD COLUMN IF NOT EXISTS end_date DATE;
