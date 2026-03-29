-- V83: Shift Management Enhancement
-- Adds shift patterns, flexible shift support, and seed data for common shifts

-- ========== Add new columns to shifts table ==========

ALTER TABLE shifts ADD COLUMN IF NOT EXISTS is_flexible BOOLEAN DEFAULT FALSE;
ALTER TABLE shifts ADD COLUMN IF NOT EXISTS flexible_window_minutes INTEGER DEFAULT 0;
ALTER TABLE shifts ADD COLUMN IF NOT EXISTS min_gap_between_shifts_hours INTEGER DEFAULT 11;

-- ========== Create shift_patterns table ==========

CREATE TABLE IF NOT EXISTS shift_patterns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    rotation_type VARCHAR(30) NOT NULL,
    pattern TEXT NOT NULL,
    cycle_days INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    color_code VARCHAR(7),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by UUID,
    last_modified_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_shift_pattern_tenant ON shift_patterns(tenant_id);
CREATE INDEX IF NOT EXISTS idx_shift_pattern_active ON shift_patterns(tenant_id, is_active);

-- ========== Create rosters table (if not exists) ==========

CREATE TABLE IF NOT EXISTS rosters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    name VARCHAR(100) NOT NULL,
    department_id UUID,
    team_id UUID,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(30) DEFAULT 'DRAFT',
    pattern_type VARCHAR(30),
    created_by UUID,
    published_by UUID,
    published_date DATE,
    notes TEXT,
    is_recurring BOOLEAN DEFAULT FALSE,
    recurrence_weeks INTEGER,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    last_modified_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_roster_tenant ON rosters(tenant_id);
CREATE INDEX IF NOT EXISTS idx_roster_dept ON rosters(tenant_id, department_id);
CREATE INDEX IF NOT EXISTS idx_roster_dates ON rosters(tenant_id, start_date, end_date);

-- ========== Create roster_entries table (if not exists) ==========

CREATE TABLE IF NOT EXISTS roster_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    roster_id UUID NOT NULL REFERENCES rosters(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL,
    shift_id UUID NOT NULL,
    work_date DATE NOT NULL,
    day_type VARCHAR(20) DEFAULT 'WORKING',
    is_overtime BOOLEAN DEFAULT FALSE,
    notes VARCHAR(500),
    is_published BOOLEAN DEFAULT FALSE,
    is_acknowledged BOOLEAN DEFAULT FALSE,
    acknowledged_date DATE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by UUID,
    last_modified_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_roster_entry_roster ON roster_entries(roster_id);
CREATE INDEX IF NOT EXISTS idx_roster_entry_employee ON roster_entries(tenant_id, employee_id, work_date);

-- ========== Enable RLS on new tables ==========

ALTER TABLE shift_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE rosters ENABLE ROW LEVEL SECURITY;
ALTER TABLE roster_entries ENABLE ROW LEVEL SECURITY;

-- ========== Seed shift permissions if not already present ==========

INSERT INTO permissions (id, code, name, description, resource, action, created_at, updated_at, version, is_deleted)
VALUES
    (gen_random_uuid(), 'SHIFT:VIEW', 'Shift View', 'View shift definitions and schedules', 'SHIFT', 'VIEW', NOW(), NOW(), 0, false),
    (gen_random_uuid(), 'SHIFT:CREATE', 'Shift Create', 'Create shift definitions', 'SHIFT', 'CREATE', NOW(), NOW(), 0, false),
    (gen_random_uuid(), 'SHIFT:ASSIGN', 'Shift Assign', 'Assign shifts to employees', 'SHIFT', 'ASSIGN', NOW(), NOW(), 0, false),
    (gen_random_uuid(), 'SHIFT:MANAGE', 'Shift Manage', 'Full shift management (patterns, schedules, rules)', 'SHIFT', 'MANAGE', NOW(), NOW(), 0, false)
ON CONFLICT (code) WHERE is_deleted = false DO NOTHING;

-- ========== Seed common shift definitions ==========
-- Only insert if no shifts exist for the tenant (avoid duplicates on re-run)

INSERT INTO shifts (id, tenant_id, shift_code, shift_name, description, start_time, end_time,
    grace_period_in_minutes, late_mark_after_minutes, half_day_after_minutes,
    full_day_hours, break_duration_minutes, is_night_shift, working_days,
    is_active, shift_type, color_code, allows_overtime, overtime_multiplier,
    is_flexible, flexible_window_minutes, min_gap_between_shifts_hours,
    created_at, updated_at, version)
SELECT
    gen_random_uuid(), t.id, 'GEN', 'General (9-6)', 'Standard general shift 9 AM to 6 PM',
    '09:00:00', '18:00:00', 15, 15, 240, 8.00, 60, FALSE, 'MON,TUE,WED,THU,FRI',
    TRUE, 'FIXED', '#3B82F6', TRUE, 1.50,
    FALSE, 0, 11,
    NOW(), NOW(), 0
FROM tenants t
WHERE NOT EXISTS (
    SELECT 1 FROM shifts s WHERE s.tenant_id = t.id AND s.shift_code = 'GEN'
);

INSERT INTO shifts (id, tenant_id, shift_code, shift_name, description, start_time, end_time,
    grace_period_in_minutes, late_mark_after_minutes, half_day_after_minutes,
    full_day_hours, break_duration_minutes, is_night_shift, working_days,
    is_active, shift_type, color_code, allows_overtime, overtime_multiplier,
    is_flexible, flexible_window_minutes, min_gap_between_shifts_hours,
    created_at, updated_at, version)
SELECT
    gen_random_uuid(), t.id, 'MOR', 'Morning (6-2)', 'Morning shift 6 AM to 2 PM',
    '06:00:00', '14:00:00', 10, 15, 240, 8.00, 30, FALSE, 'MON,TUE,WED,THU,FRI,SAT',
    TRUE, 'ROTATING', '#F59E0B',  TRUE, 1.50,
    FALSE, 0, 11,
    NOW(), NOW(), 0
FROM tenants t
WHERE NOT EXISTS (
    SELECT 1 FROM shifts s WHERE s.tenant_id = t.id AND s.shift_code = 'MOR'
);

INSERT INTO shifts (id, tenant_id, shift_code, shift_name, description, start_time, end_time,
    grace_period_in_minutes, late_mark_after_minutes, half_day_after_minutes,
    full_day_hours, break_duration_minutes, is_night_shift, working_days,
    is_active, shift_type, color_code, allows_overtime, overtime_multiplier,
    is_flexible, flexible_window_minutes, min_gap_between_shifts_hours,
    created_at, updated_at, version)
SELECT
    gen_random_uuid(), t.id, 'AFT', 'Afternoon (2-10)', 'Afternoon shift 2 PM to 10 PM',
    '14:00:00', '22:00:00', 10, 15, 240, 8.00, 30, FALSE, 'MON,TUE,WED,THU,FRI,SAT',
    TRUE, 'ROTATING', '#8B5CF6', TRUE, 1.50,
    FALSE, 0, 11,
    NOW(), NOW(), 0
FROM tenants t
WHERE NOT EXISTS (
    SELECT 1 FROM shifts s WHERE s.tenant_id = t.id AND s.shift_code = 'AFT'
);

INSERT INTO shifts (id, tenant_id, shift_code, shift_name, description, start_time, end_time,
    grace_period_in_minutes, late_mark_after_minutes, half_day_after_minutes,
    full_day_hours, break_duration_minutes, is_night_shift, working_days,
    is_active, shift_type, color_code, allows_overtime, overtime_multiplier,
    is_flexible, flexible_window_minutes, min_gap_between_shifts_hours,
    created_at, updated_at, version)
SELECT
    gen_random_uuid(), t.id, 'NGT', 'Night (10-6)', 'Night shift 10 PM to 6 AM',
    '22:00:00', '06:00:00', 10, 15, 240, 8.00, 30, TRUE, 'MON,TUE,WED,THU,FRI,SAT',
    TRUE, 'ROTATING', '#EF4444', TRUE, 2.00,
    FALSE, 0, 11,
    NOW(), NOW(), 0
FROM tenants t
WHERE NOT EXISTS (
    SELECT 1 FROM shifts s WHERE s.tenant_id = t.id AND s.shift_code = 'NGT'
);

INSERT INTO shifts (id, tenant_id, shift_code, shift_name, description, start_time, end_time,
    grace_period_in_minutes, late_mark_after_minutes, half_day_after_minutes,
    full_day_hours, break_duration_minutes, is_night_shift, working_days,
    is_active, shift_type, color_code, allows_overtime, overtime_multiplier,
    is_flexible, flexible_window_minutes, min_gap_between_shifts_hours,
    created_at, updated_at, version)
SELECT
    gen_random_uuid(), t.id, 'FLX', 'Flexible (core 10-4)', 'Flexible shift with core hours 10 AM to 4 PM',
    '10:00:00', '16:00:00', 30, 30, 180, 8.00, 60, FALSE, 'MON,TUE,WED,THU,FRI',
    TRUE, 'FLEXIBLE', '#10B981', FALSE, 1.00,
    TRUE, 120, 11,
    NOW(), NOW(), 0
FROM tenants t
WHERE NOT EXISTS (
    SELECT 1 FROM shifts s WHERE s.tenant_id = t.id AND s.shift_code = 'FLX'
);
