-- Align succession_candidates with SuccessionCandidate/BaseEntity mapping.
ALTER TABLE succession_candidates
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE succession_candidates
  ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 1;

ALTER TABLE succession_candidates
  ADD COLUMN IF NOT EXISTS estimated_ready_date DATE;

ALTER TABLE succession_candidates
  ADD COLUMN IF NOT EXISTS is_confidential BOOLEAN DEFAULT FALSE;
