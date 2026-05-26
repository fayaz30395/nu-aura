-- Align recognition milestones with Milestone entity fields.

ALTER TABLE milestones
  ADD COLUMN IF NOT EXISTS milestone_date DATE,
  ADD COLUMN IF NOT EXISTS years_completed INTEGER,
  ADD COLUMN IF NOT EXISTS is_celebrated BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS celebrated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS notification_sent BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS notification_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS wishes_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
