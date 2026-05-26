-- Align peer_recognitions with PeerRecognition mapping.
ALTER TABLE peer_recognitions
  ADD COLUMN IF NOT EXISTS giver_id UUID;

ALTER TABLE peer_recognitions
  ADD COLUMN IF NOT EXISTS receiver_id UUID;

ALTER TABLE peer_recognitions
  ADD COLUMN IF NOT EXISTS badge_id UUID;

ALTER TABLE peer_recognitions
  ADD COLUMN IF NOT EXISTS message TEXT;

ALTER TABLE peer_recognitions
  ADD COLUMN IF NOT EXISTS is_public BOOLEAN;
