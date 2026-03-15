-- Migration: Add wall_post_id to announcements table for social features
-- This enables announcements to leverage wall post reactions and comments

ALTER TABLE announcements ADD COLUMN wall_post_id UUID;

-- Create index for faster lookups
CREATE INDEX idx_announcements_wall_post ON announcements(wall_post_id);

-- Add comment
COMMENT ON COLUMN announcements.wall_post_id IS 'Reference to wall post for social features (reactions/comments)';
