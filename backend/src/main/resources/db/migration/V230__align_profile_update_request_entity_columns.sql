-- Align profile_update_requests with ProfileUpdateRequest mapping.
ALTER TABLE profile_update_requests
  ADD COLUMN IF NOT EXISTS reviewed_by UUID;

ALTER TABLE profile_update_requests
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP;

ALTER TABLE profile_update_requests
  ADD COLUMN IF NOT EXISTS auto_approved BOOLEAN DEFAULT FALSE;
