-- V3: Add public_token to exit_interviews for unauthenticated exit survey access

ALTER TABLE exit_interviews
  ADD COLUMN IF NOT EXISTS public_token VARCHAR (64);

CREATE UNIQUE INDEX IF NOT EXISTS idx_exit_interview_public_token
  ON exit_interviews (public_token)
  WHERE public_token IS NOT NULL;

-- Ensure full_and_final_settlements has version column for optimistic locking
ALTER TABLE full_and_final_settlements
  ADD COLUMN IF NOT EXISTS version BIGINT DEFAULT 0;
