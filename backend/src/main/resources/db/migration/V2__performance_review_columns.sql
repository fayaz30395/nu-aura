-- V2: Add rating columns to performance_reviews and create PIP tables

-- 1. Add new rating/assessment columns to performance_reviews
ALTER TABLE performance_reviews
  ADD COLUMN IF NOT EXISTS self_rating INT,
  ADD COLUMN IF NOT EXISTS manager_rating INT,
  ADD COLUMN IF NOT EXISTS final_rating INT,
  ADD COLUMN IF NOT EXISTS increment_recommendation NUMERIC (5,2),
  ADD COLUMN IF NOT EXISTS promotion_recommended BOOLEAN,
  ADD COLUMN IF NOT EXISTS overall_comments TEXT,
  ADD COLUMN IF NOT EXISTS goal_achievement_percent INT;

-- 2. Index for calibration distribution queries
CREATE INDEX IF NOT EXISTS idx_perf_review_cycle_rating
  ON performance_reviews (tenant_id, review_cycle_id, final_rating);

-- 3. Create performance_improvement_plans table
CREATE TABLE IF NOT EXISTS performance_improvement_plans
(
  id
  UUID
  PRIMARY
  KEY
  DEFAULT
  gen_random_uuid
(
),
  tenant_id UUID NOT NULL,
  employee_id UUID NOT NULL,
  manager_id UUID NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT,
  goals TEXT,
  check_in_frequency VARCHAR
(
  50
) DEFAULT 'WEEKLY',
  status VARCHAR
(
  50
) NOT NULL DEFAULT 'ACTIVE',
  close_notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW
(
),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW
(
),
  created_by UUID,
  updated_by UUID,
  version BIGINT DEFAULT 0,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE
  );

CREATE INDEX IF NOT EXISTS idx_pip_tenant_employee ON performance_improvement_plans (tenant_id, employee_id);
CREATE INDEX IF NOT EXISTS idx_pip_tenant_manager ON performance_improvement_plans (tenant_id, manager_id);
CREATE INDEX IF NOT EXISTS idx_pip_status ON performance_improvement_plans (tenant_id, status);

-- 4. Create pip_check_ins table
CREATE TABLE IF NOT EXISTS pip_check_ins
(
  id
  UUID
  PRIMARY
  KEY
  DEFAULT
  gen_random_uuid
(
),
  tenant_id UUID NOT NULL,
  pip_id UUID NOT NULL REFERENCES performance_improvement_plans
(
  id
),
  check_in_date DATE NOT NULL,
  progress_notes TEXT,
  manager_comments TEXT,
  goal_updates TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW
(
),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW
(
),
  created_by UUID,
  updated_by UUID,
  version BIGINT DEFAULT 0,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE
  );

CREATE INDEX IF NOT EXISTS idx_pip_checkin_pip_date ON pip_check_ins (pip_id, check_in_date);
CREATE INDEX IF NOT EXISTS idx_pip_checkin_tenant ON pip_check_ins (tenant_id, pip_id);
