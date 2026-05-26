-- Align recognition_reactions with RecognitionReaction mapping.
ALTER TABLE recognition_reactions
  ADD COLUMN IF NOT EXISTS reacted_at TIMESTAMP;
