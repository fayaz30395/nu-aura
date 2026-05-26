-- Align flex_benefit_allocations with FlexBenefitAllocation/BaseEntity mappings.

ALTER TABLE flex_benefit_allocations
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS used_credits NUMERIC(38,2),
  ADD COLUMN IF NOT EXISTS remaining_credits NUMERIC(38,2),
  ADD COLUMN IF NOT EXISTS forfeited_credits NUMERIC(38,2),
  ADD COLUMN IF NOT EXISTS health_allocation NUMERIC(38,2),
  ADD COLUMN IF NOT EXISTS health_used NUMERIC(38,2),
  ADD COLUMN IF NOT EXISTS wellness_allocation NUMERIC(38,2),
  ADD COLUMN IF NOT EXISTS wellness_used NUMERIC(38,2),
  ADD COLUMN IF NOT EXISTS lifestyle_allocation NUMERIC(38,2),
  ADD COLUMN IF NOT EXISTS lifestyle_used NUMERIC(38,2),
  ADD COLUMN IF NOT EXISTS retirement_allocation NUMERIC(38,2),
  ADD COLUMN IF NOT EXISTS retirement_used NUMERIC(38,2),
  ADD COLUMN IF NOT EXISTS education_allocation NUMERIC(38,2),
  ADD COLUMN IF NOT EXISTS education_used NUMERIC(38,2),
  ADD COLUMN IF NOT EXISTS transport_allocation NUMERIC(38,2),
  ADD COLUMN IF NOT EXISTS transport_used NUMERIC(38,2),
  ADD COLUMN IF NOT EXISTS allocation_date DATE,
  ADD COLUMN IF NOT EXISTS expiry_date DATE,
  ADD COLUMN IF NOT EXISTS carryover_amount NUMERIC(38,2),
  ADD COLUMN IF NOT EXISTS carryover_from_year INTEGER NOT NULL DEFAULT 0;

ALTER TABLE flex_benefit_allocations
  ALTER COLUMN total_credits TYPE NUMERIC(38,2),
  ALTER COLUMN status TYPE VARCHAR(255);
