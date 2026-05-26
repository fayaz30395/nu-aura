-- Align talent pool tables with TalentPool/TalentPoolMember/BaseEntity mappings.
ALTER TABLE talent_pool_members
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS added_date DATE,
  ADD COLUMN IF NOT EXISTS added_by UUID,
  ADD COLUMN IF NOT EXISTS review_date DATE;

ALTER TABLE talent_pools
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS member_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS owner_id UUID;
