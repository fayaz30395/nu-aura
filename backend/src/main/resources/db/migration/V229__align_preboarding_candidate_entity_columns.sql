-- Align preboarding_candidates with PreboardingCandidate mapping.
ALTER TABLE preboarding_candidates
  ADD COLUMN IF NOT EXISTS date_of_birth DATE;
