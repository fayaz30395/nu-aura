-- V328: V326/V327 omitted BaseEntity's deleted_at column, only adding is_deleted.
-- Hibernate schema validation fails without it. Add it to all three new tables.

ALTER TABLE recognition_comments ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE competency_frameworks ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE competency_requirements ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
