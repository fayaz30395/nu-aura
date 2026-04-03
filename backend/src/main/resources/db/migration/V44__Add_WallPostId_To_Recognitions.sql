-- Migration: Add wall_post_id to recognitions table for social features
-- This enables recognitions to leverage wall post reactions and comments

ALTER TABLE recognitions
  ADD COLUMN IF NOT EXISTS wall_post_id UUID;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_recognitions_wall_post ON recognitions(wall_post_id);

-- Add comment
COMMENT
ON COLUMN recognitions.wall_post_id IS 'Reference to wall post for social features (reactions/comments)';
