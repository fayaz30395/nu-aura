-- V10: Comp-Off requests, Shift Swap enforcement, Job Board Postings
-- Sprint 14: Attendance+Shift, Project, Recruitment improvements

-- ========== Comp-Off Requests ==========
CREATE TABLE IF NOT EXISTS comp_off_requests
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
  attendance_date DATE NOT NULL,
  overtime_minutes INTEGER NOT NULL,
  comp_off_days NUMERIC
(
  4,
  2
) NOT NULL, -- e.g. 0.5 or 1.0
  status VARCHAR
(
  20
) NOT NULL DEFAULT 'PENDING', -- PENDING, APPROVED, REJECTED, CREDITED
  leave_balance_id UUID, -- set when CREDITED
  reason TEXT,
  requested_by UUID NOT NULL, -- employee self or manager
  reviewed_by UUID,
  reviewed_at TIMESTAMP,
  review_note TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW
(
),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW
(
),
  version BIGINT DEFAULT 0,
  CONSTRAINT uq_comp_off_employee_date UNIQUE
(
  tenant_id,
  employee_id,
  attendance_date
)
  );

CREATE INDEX idx_comp_off_tenant_employee ON comp_off_requests (tenant_id, employee_id);
CREATE INDEX idx_comp_off_status ON comp_off_requests (tenant_id, status);
CREATE INDEX idx_comp_off_date ON comp_off_requests (attendance_date);

-- ========== Job Board Postings ==========
CREATE TABLE IF NOT EXISTS job_board_postings
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
  job_opening_id UUID NOT NULL REFERENCES job_openings
(
  id
) ON DELETE CASCADE,
  board_name VARCHAR
(
  50
) NOT NULL, -- NAUKRI, INDEED, LINKEDIN, SHINE, MONSTER
  external_job_id VARCHAR
(
  200
), -- ID returned by the board API
  external_url TEXT, -- Direct link to the posting on the board
  status VARCHAR
(
  20
) NOT NULL DEFAULT 'PENDING', -- PENDING, ACTIVE, PAUSED, EXPIRED, FAILED
  posted_at TIMESTAMP,
  expires_at TIMESTAMP,
  applications_count INTEGER DEFAULT 0,
  views_count INTEGER DEFAULT 0,
  last_synced_at TIMESTAMP,
  error_message TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW
(
),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW
(
),
  CONSTRAINT uq_job_board_unique UNIQUE
(
  tenant_id,
  job_opening_id,
  board_name
)
  );

CREATE INDEX idx_job_board_tenant_job ON job_board_postings (tenant_id, job_opening_id);
CREATE INDEX idx_job_board_status ON job_board_postings (tenant_id, status);
CREATE INDEX idx_job_board_name ON job_board_postings (board_name);

-- ========== Attendance Auto-Regularization Config ==========
CREATE TABLE IF NOT EXISTS attendance_regularization_config
(
  id
  UUID
  PRIMARY
  KEY
  DEFAULT
  gen_random_uuid
(
),
  tenant_id UUID NOT NULL UNIQUE,
  auto_regularize_enabled BOOLEAN NOT NULL DEFAULT false,
  auto_regularize_after_days INTEGER NOT NULL DEFAULT 3, -- regularize INCOMPLETE after N days
  default_regularize_to VARCHAR
(
  20
) NOT NULL DEFAULT 'PRESENT', -- PRESENT, HALF_DAY, WFH
  notify_employee BOOLEAN NOT NULL DEFAULT true,
  notify_manager BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT NOW
(
),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW
(
)
  );

CREATE INDEX idx_attendance_reg_config_tenant ON attendance_regularization_config (tenant_id);

-- ========== Resource Conflict Log ==========
CREATE TABLE IF NOT EXISTS resource_conflict_log
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
  project_id_a UUID NOT NULL,
  project_id_b UUID NOT NULL,
  overlap_start_date DATE NOT NULL,
  overlap_end_date DATE,
  total_allocation_pct NUMERIC
(
  5,
  2
), -- combined % at peak overlap
  detected_at TIMESTAMP NOT NULL DEFAULT NOW
(
),
  resolved_at TIMESTAMP,
  resolved_by UUID,
  status VARCHAR
(
  20
) NOT NULL DEFAULT 'OPEN' -- OPEN, RESOLVED, IGNORED
  );

CREATE INDEX idx_resource_conflict_tenant_emp ON resource_conflict_log (tenant_id, employee_id);
CREATE INDEX idx_resource_conflict_status ON resource_conflict_log (tenant_id, status);
