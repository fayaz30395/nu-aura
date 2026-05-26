-- Align employee_points with EmployeePoints/BaseEntity mappings.

ALTER TABLE employee_points
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS total_points_earned INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_points_redeemed INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS current_balance INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS recognitions_given INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS recognitions_received INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ;
