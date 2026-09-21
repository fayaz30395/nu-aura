-- US-2FZ9349PQQ6K: dependent verification workflow audit trail
ALTER TABLE benefit_dependents
    ADD COLUMN IF NOT EXISTS verified_by UUID,
    ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS verification_reason TEXT;
