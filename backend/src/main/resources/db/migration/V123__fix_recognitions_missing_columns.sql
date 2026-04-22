-- V123__fix_recognitions_missing_columns.sql
-- BUG-FIX: Add missing columns to recognitions table that the Recognition entity expects.
-- The V0__init.sql only created the table with basic columns (giver, receiver, type, category, title, message).
-- The Recognition entity (extending BaseEntity via TenantAware) also expects these additional columns.

ALTER TABLE recognitions
  ADD COLUMN IF NOT EXISTS points_awarded INTEGER DEFAULT 0;
ALTER TABLE recognitions
  ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT TRUE;
ALTER TABLE recognitions
  ADD COLUMN IF NOT EXISTS is_anonymous BOOLEAN DEFAULT FALSE;
ALTER TABLE recognitions
  ADD COLUMN IF NOT EXISTS badge_id UUID;
ALTER TABLE recognitions
  ADD COLUMN IF NOT EXISTS wall_post_id UUID;
ALTER TABLE recognitions
  ADD COLUMN IF NOT EXISTS likes_count INTEGER DEFAULT 0;
ALTER TABLE recognitions
  ADD COLUMN IF NOT EXISTS comments_count INTEGER DEFAULT 0;
ALTER TABLE recognitions
  ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT TRUE;
ALTER TABLE recognitions
  ADD COLUMN IF NOT EXISTS approved_by UUID;
ALTER TABLE recognitions
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE recognitions
  ADD COLUMN IF NOT EXISTS recognized_at TIMESTAMPTZ;
ALTER TABLE recognitions
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
