-- Align succession_plans with SuccessionPlan/BaseEntity mapping.
ALTER TABLE succession_plans
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE succession_plans
  ADD COLUMN IF NOT EXISTS current_incumbent_id UUID;

ALTER TABLE succession_plans
  ADD COLUMN IF NOT EXISTS risk_reason VARCHAR(255);

ALTER TABLE succession_plans
  ADD COLUMN IF NOT EXISTS expected_vacancy_date DATE;

ALTER TABLE succession_plans
  ADD COLUMN IF NOT EXISTS last_reviewed_by UUID;

ALTER TABLE succession_plans
  ADD COLUMN IF NOT EXISTS last_reviewed_at TIMESTAMPTZ;
