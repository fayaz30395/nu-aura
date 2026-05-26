-- Align recognition_badges with RecognitionBadge mapping.
ALTER TABLE recognition_badges
  ADD COLUMN IF NOT EXISTS color VARCHAR(255);

ALTER TABLE recognition_badges
  ADD COLUMN IF NOT EXISTS points_value INTEGER DEFAULT 0;

ALTER TABLE recognition_badges
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

ALTER TABLE recognition_badges
  ADD COLUMN IF NOT EXISTS is_system_badge BOOLEAN DEFAULT FALSE;

ALTER TABLE recognition_badges
  ADD COLUMN IF NOT EXISTS sort_order INTEGER;
