-- ============================================================
-- V1: Complete baseline schema for NU-AURA HRMS Platform
-- ============================================================
-- Generated from 244 JPA entities.
-- All tables: tenant_id UUID NOT NULL for row-level multi-tenancy.
-- Soft deletes: deleted_at TIMESTAMPTZ (nullable) on applicable tables.
-- Run order: tenants → users/roles → departments → employees → all other tables.
-- ============================================================

SET client_encoding = 'UTF8';
CREATE EXTENSION IF NOT EXISTS "pgcrypto";  -- for gen_random_uuid()

-- tenants
CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(200) NOT NULL,
    status VARCHAR(20) NOT NULL,
    description VARCHAR(500),
    contact_email VARCHAR(100),
    contact_phone VARCHAR(20),
    settings TEXT
);

-- users
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
email VARCHAR(200) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100),
    password_hash VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL,
    last_login_at TIMESTAMPTZ,
    password_changed_at TIMESTAMPTZ,
    failed_login_attempts INTEGER,
    locked_until TIMESTAMPTZ,
    password_reset_token VARCHAR(255),
    password_reset_token_expiry TIMESTAMPTZ,
    profile_picture_url VARCHAR(500)
);

-- user_roles (ManyToMany join table: users <-> roles)
CREATE TABLE IF NOT EXISTS user_roles (
    user_id UUID NOT NULL,
    role_id UUID NOT NULL,
    PRIMARY KEY (user_id, role_id)
);
CREATE INDEX IF NOT EXISTS idx_user_roles_user ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role_id);


-- roles
CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
code VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    description VARCHAR(500),
    is_system_role BOOLEAN NOT NULL DEFAULT FALSE
);

-- permissions
CREATE TABLE IF NOT EXISTS permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
code VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    description VARCHAR(500),
    resource VARCHAR(50) NOT NULL,
    action VARCHAR(20) NOT NULL
);

-- departments
CREATE TABLE IF NOT EXISTS departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
code VARCHAR(50) NOT NULL,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    parent_department_id UUID,
    manager_id UUID,
    is_active BOOLEAN NOT NULL DEFAULT FALSE,
    location VARCHAR(500),
    cost_center VARCHAR(20),
    type VARCHAR(50)
);

-- employees
CREATE TABLE IF NOT EXISTS employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
employee_code VARCHAR(50) NOT NULL,
    user_id UUID NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    middle_name VARCHAR(100),
    last_name VARCHAR(100),
    personal_email VARCHAR(200),
    phone_number VARCHAR(20),
    emergency_contact_number VARCHAR(20),
    date_of_birth DATE,
    gender VARCHAR(20),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(100),
    joining_date DATE NOT NULL,
    confirmation_date DATE,
    exit_date DATE,
    department_id UUID,
    office_location_id UUID,
    team_id UUID,
    designation VARCHAR(100),
    level VARCHAR(50),
    job_role VARCHAR(50),
    manager_id UUID,
    employment_type VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL,
    bank_account_number VARCHAR(100),
    bank_name VARCHAR(50),
    bank_ifsc_code VARCHAR(50),
    tax_id VARCHAR(50)
);

-- allocation_requests
CREATE TABLE IF NOT EXISTS allocation_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
employee_id UUID NOT NULL,
    project_id UUID NOT NULL,
    requested_allocation INTEGER NOT NULL,
    role VARCHAR(100),
    start_date DATE NOT NULL,
    end_date DATE,
    requested_by_id UUID NOT NULL,
    approver_id UUID,
    status VARCHAR(30) NOT NULL,
    request_reason TEXT,
    approval_comment TEXT,
    rejection_reason TEXT,
    resolved_at TIMESTAMPTZ
);

-- analytics_insights
CREATE TABLE IF NOT EXISTS analytics_insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    insight_type VARCHAR(50) NOT NULL,
    category VARCHAR(50) NOT NULL,
    severity VARCHAR(50),
    department_id UUID,
    department_name VARCHAR(255),
    impact_score INTEGER,
    affected_employees INTEGER,
    potential_cost_impact VARCHAR(50),
    recommendation TEXT,
    action_items TEXT,
    status VARCHAR(50),
    assigned_to UUID,
    due_date DATE,
    resolved_at TIMESTAMPTZ,
    resolution_notes TEXT,
    data_source VARCHAR(255),
    generated_at TIMESTAMPTZ NOT NULL,
    valid_until DATE
);

-- analytics_metrics
CREATE TABLE IF NOT EXISTS analytics_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
metric_name VARCHAR(100) NOT NULL,
    metric_category VARCHAR(50) NOT NULL,
    metric_date DATE NOT NULL,
    metric_value NUMERIC(15,2) NOT NULL,
    dimension1 VARCHAR(255),
    dimension2 VARCHAR(255),
    dimension3 VARCHAR(255)
);

-- analytics_snapshots
CREATE TABLE IF NOT EXISTS analytics_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
snapshot_type VARCHAR(50) NOT NULL,
    period VARCHAR(50) NOT NULL,
    department_distribution TEXT,
    location_distribution TEXT,
    employment_type_distribution TEXT,
    tenure_distribution TEXT,
    age_distribution TEXT,
    performance_distribution TEXT,
    salary_band_distribution TEXT
);

-- announcement_reads
CREATE TABLE IF NOT EXISTS announcement_reads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
announcement_id UUID NOT NULL,
    employee_id UUID NOT NULL,
    read_at TIMESTAMPTZ NOT NULL,
    accepted_at TIMESTAMPTZ,
    is_accepted BOOLEAN DEFAULT FALSE,
    CONSTRAINT uc_announcement_reads_announcement_id_employee_id UNIQUE (announcement_id, employee_id, tenant_id)
);

-- announcements
CREATE TABLE IF NOT EXISTS announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    category VARCHAR(30) NOT NULL,
    priority VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL,
    target_audience VARCHAR(30) NOT NULL,
    department_id JSONB,
    employee_id JSONB,
    published_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    is_pinned BOOLEAN DEFAULT FALSE,
    send_email BOOLEAN DEFAULT FALSE,
    attachment_url VARCHAR(500),
    read_count INTEGER,
    accepted_count INTEGER,
    requires_acceptance BOOLEAN DEFAULT FALSE,
    published_by UUID,
    published_by_name VARCHAR(200)
);

-- app_permissions
CREATE TABLE IF NOT EXISTS app_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
application_id UUID NOT NULL,
    code VARCHAR(100) NOT NULL UNIQUE,
    module VARCHAR(50) NOT NULL,
    action VARCHAR(30) NOT NULL,
    name VARCHAR(100) NOT NULL,
    description VARCHAR(500),
    category VARCHAR(50),
    is_system_permission BOOLEAN NOT NULL DEFAULT FALSE,
    display_order INTEGER,
    depends_on VARCHAR(500)
);

-- app_roles
CREATE TABLE IF NOT EXISTS app_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
application_id UUID NOT NULL,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    description VARCHAR(500),
    level INTEGER NOT NULL,
    is_system_role BOOLEAN NOT NULL DEFAULT FALSE,
    is_default_role BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT uc_app_roles_code_tenantId UNIQUE (code, tenant_id, application_id)
);

-- applicants
CREATE TABLE IF NOT EXISTS applicants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
candidate_id UUID,
    job_opening_id UUID,
    status VARCHAR(30) NOT NULL,
    source VARCHAR(30),
    applied_date DATE,
    current_stage_entered_at TIMESTAMPTZ,
    notes TEXT,
    rating INTEGER,
    resume_file_id UUID,
    rejection_reason TEXT,
    offered_salary NUMERIC(15,2),
    expected_salary NUMERIC(15,2)
);

-- approval_delegates
CREATE TABLE IF NOT EXISTS approval_delegates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
delegator_id UUID NOT NULL,
    delegate_id UUID NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT FALSE,
    entity_type VARCHAR(50)
);

-- approval_steps
CREATE TABLE IF NOT EXISTS approval_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
workflow_definition_id UUID NOT NULL,
    step_order INTEGER NOT NULL,
    step_name VARCHAR(255) NOT NULL,
    approver_type VARCHAR(50) NOT NULL
);

-- asset_recoveries
CREATE TABLE IF NOT EXISTS asset_recoveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
exit_process_id UUID NOT NULL,
    employee_id UUID NOT NULL,
    asset_id UUID,
    asset_name VARCHAR(255) NOT NULL,
    asset_type VARCHAR(50) NOT NULL,
    asset_tag VARCHAR(255),
    serial_number VARCHAR(255),
    assigned_date DATE,
    expected_return_date DATE,
    actual_return_date DATE,
    status VARCHAR(50),
    condition_on_return VARCHAR(50),
    damage_description TEXT,
    deduction_amount NUMERIC(12,2),
    recovered_by UUID,
    verified_by UUID,
    verification_date DATE,
    remarks TEXT,
    is_waived BOOLEAN DEFAULT FALSE,
    waiver_reason VARCHAR(255),
    waived_by UUID
);

-- assets
CREATE TABLE IF NOT EXISTS assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
asset_code VARCHAR(50) NOT NULL,
    asset_name VARCHAR(200) NOT NULL,
    category VARCHAR(50),
    brand VARCHAR(100),
    model VARCHAR(100),
    serial_number VARCHAR(100),
    purchase_date DATE,
    purchase_cost NUMERIC(10,2),
    current_value NUMERIC(10,2),
    status VARCHAR(20),
    assigned_to UUID,
    location VARCHAR(200),
    warranty_expiry DATE,
    notes TEXT
);

-- attendance_records
CREATE TABLE IF NOT EXISTS attendance_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
employee_id UUID NOT NULL,
    shift_id UUID,
    attendance_date DATE NOT NULL,
    check_in_time TIMESTAMPTZ,
    check_out_time TIMESTAMPTZ,
    check_in_source VARCHAR(50),
    check_out_source VARCHAR(50),
    check_in_location TEXT,
    check_out_location TEXT,
    check_in_ip VARCHAR(50),
    check_out_ip VARCHAR(50),
    check_in_latitude VARCHAR(50),
    check_in_longitude VARCHAR(50),
    check_out_latitude VARCHAR(50),
    check_out_longitude VARCHAR(50),
    check_in_office_location_id UUID,
    check_out_office_location_id UUID,
    check_in_within_geofence BOOLEAN DEFAULT FALSE,
    check_out_within_geofence BOOLEAN DEFAULT FALSE,
    check_in_distance_meters INTEGER,
    check_out_distance_meters INTEGER,
    is_remote_checkin BOOLEAN DEFAULT FALSE,
    status VARCHAR(50) NOT NULL,
    work_duration_minutes INTEGER,
    break_duration_minutes INTEGER,
    overtime_minutes INTEGER,
    is_late BOOLEAN DEFAULT FALSE,
    late_by_minutes INTEGER,
    is_early_departure BOOLEAN DEFAULT FALSE,
    early_departure_minutes INTEGER,
    is_half_day BOOLEAN DEFAULT FALSE,
    is_overtime BOOLEAN DEFAULT FALSE,
    notes TEXT,
    regularization_requested BOOLEAN DEFAULT FALSE,
    regularization_approved BOOLEAN DEFAULT FALSE,
    regularization_reason TEXT,
    approved_by UUID,
    approved_at TIMESTAMPTZ
);

-- attendance_time_entries
CREATE TABLE IF NOT EXISTS attendance_time_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
attendance_record_id UUID NOT NULL,
    entry_type VARCHAR(50) NOT NULL,
    check_in_time TIMESTAMPTZ NOT NULL,
    check_out_time TIMESTAMPTZ,
    check_in_source VARCHAR(50),
    check_out_source VARCHAR(50),
    check_in_location TEXT,
    check_out_location TEXT,
    check_in_ip VARCHAR(50),
    check_out_ip VARCHAR(50),
    duration_minutes INTEGER,
    notes TEXT,
    sequence_number INTEGER
);

-- attrition_predictions
CREATE TABLE IF NOT EXISTS attrition_predictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
employee_id UUID NOT NULL,
    prediction_date DATE NOT NULL,
    risk_score NUMERIC(5,2) NOT NULL,
    risk_level VARCHAR(50) NOT NULL,
    predicted_leave_date DATE,
    confidence_score NUMERIC(5,2),
    tenure_risk NUMERIC(5,2),
    compensation_risk NUMERIC(5,2),
    engagement_risk NUMERIC(5,2),
    performance_risk NUMERIC(5,2),
    manager_change_risk NUMERIC(5,2),
    promotion_gap_risk NUMERIC(5,2),
    workload_risk NUMERIC(5,2),
    commute_risk NUMERIC(5,2),
    tenure_months INTEGER,
    salary_percentile NUMERIC(5,2),
    last_promotion_months INTEGER,
    manager_tenure_months INTEGER,
    overtime_hours_avg NUMERIC(5,2),
    engagement_score NUMERIC(5,2),
    performance_rating NUMERIC(3,1),
    recommendations TEXT,
    action_taken BOOLEAN DEFAULT FALSE,
    actual_outcome VARCHAR(50),
    actual_leave_date DATE
);

-- audit_logs
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
entity_type VARCHAR(100) NOT NULL,
    entity_id UUID NOT NULL,
    action VARCHAR(20) NOT NULL,
    actor_id UUID NOT NULL,
    actor_email VARCHAR(200),
    old_value TEXT,
    new_value TEXT,
    changes TEXT,
    ip_address VARCHAR(50),
    user_agent VARCHAR(500)
);

-- background_verifications
CREATE TABLE IF NOT EXISTS background_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
employee_id UUID NOT NULL,
    candidate_name VARCHAR(255) NOT NULL,
    candidate_email VARCHAR(255),
    initiated_date DATE,
    status VARCHAR(50),
    vendor_id UUID,
    vendor_name VARCHAR(255),
    vendor_reference VARCHAR(255),
    expected_completion_date DATE,
    actual_completion_date DATE,
    overall_result VARCHAR(50),
    initiated_by UUID,
    reviewed_by UUID,
    review_date DATE,
    review_notes TEXT,
    is_green_channel BOOLEAN DEFAULT FALSE,
    priority INTEGER
);

-- benefit_claims
CREATE TABLE IF NOT EXISTS benefit_claims (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
enrollment_id UUID NOT NULL,
    employee_id UUID NOT NULL,
    claim_number VARCHAR(255) NOT NULL UNIQUE,
    claim_type VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL,
    claimed_amount NUMERIC(19,4) NOT NULL,
    document_url JSONB,
    payment_mode VARCHAR(50),
    appeal_status VARCHAR(50)
);

-- benefit_dependents
CREATE TABLE IF NOT EXISTS benefit_dependents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
enrollment_id UUID NOT NULL,
    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255) NOT NULL,
    relationship VARCHAR(50) NOT NULL,
    date_of_birth DATE NOT NULL,
    status VARCHAR(50)
);

-- benefit_enrollments
CREATE TABLE IF NOT EXISTS benefit_enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
benefit_plan_id UUID NOT NULL,
    employee_id UUID NOT NULL,
    status VARCHAR(50) NOT NULL,
    coverage_level VARCHAR(50)
);

-- benefit_plans
CREATE TABLE IF NOT EXISTS benefit_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
plan_code VARCHAR(50) NOT NULL,
    plan_name VARCHAR(200) NOT NULL,
    description TEXT,
    benefit_type VARCHAR(50),
    provider_id UUID,
    coverage_amount NUMERIC(12,2),
    employee_contribution NUMERIC(10,2),
    employer_contribution NUMERIC(10,2),
    effective_date DATE,
    expiry_date DATE,
    is_active BOOLEAN DEFAULT FALSE,
    eligibility_criteria TEXT
);

-- benefit_plans_enhanced
CREATE TABLE IF NOT EXISTS benefit_plans_enhanced (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
name VARCHAR(255) NOT NULL,
    plan_type VARCHAR(50) NOT NULL,
    category VARCHAR(50) NOT NULL,
    premium_frequency VARCHAR(50)
);

-- budget_scenarios
CREATE TABLE IF NOT EXISTS budget_scenarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
base_budget_id UUID,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    scenario_type VARCHAR(50) NOT NULL,
    headcount_adjustment INTEGER,
    salary_adjustment_percent NUMERIC(5,2),
    hiring_freeze BOOLEAN DEFAULT FALSE,
    attrition_rate_adjustment NUMERIC(5,2),
    projected_headcount INTEGER,
    projected_cost NUMERIC(15,2),
    cost_variance NUMERIC(15,2),
    variance_percent NUMERIC(5,2),
    is_selected BOOLEAN DEFAULT FALSE,
    notes TEXT
);

-- calendar_events
CREATE TABLE IF NOT EXISTS calendar_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
employee_id UUID NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    all_day BOOLEAN DEFAULT FALSE,
    location VARCHAR(255),
    meeting_link VARCHAR(255),
    event_type VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL,
    is_recurring BOOLEAN DEFAULT FALSE,
    recurrence_pattern VARCHAR(50),
    recurrence_end_date TIMESTAMPTZ,
    parent_event_id UUID,
    sync_provider VARCHAR(50),
    external_event_id VARCHAR(255),
    last_synced_at TIMESTAMPTZ,
    sync_status VARCHAR(50),
    reminder_minutes INTEGER,
    reminder_sent BOOLEAN DEFAULT FALSE,
    attendee_ids TEXT,
    organizer_id UUID,
    visibility VARCHAR(50),
    color VARCHAR(255),
    notes VARCHAR(255)
);

-- candidate_match_scores
CREATE TABLE IF NOT EXISTS candidate_match_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
candidate_id UUID NOT NULL,
    job_opening_id UUID NOT NULL,
    overall_match_score DOUBLE PRECISION NOT NULL,
    skills_match_score DOUBLE PRECISION,
    experience_match_score DOUBLE PRECISION,
    education_match_score DOUBLE PRECISION,
    cultural_fit_score DOUBLE PRECISION,
    matching_criteria TEXT,
    strengths TEXT,
    gaps TEXT,
    recommendation VARCHAR(50),
    ai_model_version VARCHAR(50)
);

-- candidates
CREATE TABLE IF NOT EXISTS candidates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
candidate_code VARCHAR(50) NOT NULL,
    job_opening_id UUID NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(200) NOT NULL,
    phone VARCHAR(20),
    current_location VARCHAR(200),
    current_company VARCHAR(200),
    current_designation VARCHAR(200),
    total_experience NUMERIC(19,4),
    current_ctc NUMERIC(19,4),
    expected_ctc NUMERIC(19,4),
    notice_period_days INTEGER,
    resume_url VARCHAR(500),
    source VARCHAR(100),
    status VARCHAR(30) NOT NULL,
    current_stage VARCHAR(50),
    applied_date DATE,
    notes TEXT,
    assigned_recruiter_id UUID,
    offered_ctc NUMERIC(19,4),
    offered_designation VARCHAR(200),
    proposed_joining_date DATE,
    offer_letter_id UUID,
    offer_extended_date DATE,
    offer_accepted_date DATE,
    offer_declined_date DATE,
    offer_decline_reason TEXT,
    CONSTRAINT uc_candidates_tenant_id_candidate_code UNIQUE (tenant_id, candidate_code)
);

-- challenge_participants
CREATE TABLE IF NOT EXISTS challenge_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
challenge_id UUID NOT NULL,
    employee_id UUID NOT NULL,
    team_id UUID,
    team_name VARCHAR(255),
    joined_at TIMESTAMPTZ,
    status VARCHAR(50) NOT NULL,
    total_progress DOUBLE PRECISION,
    completion_percentage DOUBLE PRECISION,
    points_earned INTEGER,
    current_streak INTEGER,
    longest_streak INTEGER,
    last_activity_date DATE,
    goal_achieved BOOLEAN DEFAULT FALSE,
    goal_achieved_date DATE,
    rank_position INTEGER
);

-- chatbot_conversations
CREATE TABLE IF NOT EXISTS chatbot_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
user_id UUID,
    session_id UUID NOT NULL,
    conversation_history TEXT,
    intent VARCHAR(100),
    entities TEXT,
    status VARCHAR(20) NOT NULL,
    satisfaction_rating INTEGER,
    was_escalated BOOLEAN DEFAULT FALSE,
    escalated_to UUID,
    resolved BOOLEAN DEFAULT FALSE
);

-- comp_time_balances
CREATE TABLE IF NOT EXISTS comp_time_balances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
employee_id UUID NOT NULL,
    fiscal_year INTEGER NOT NULL,
    total_accrued NUMERIC(19,4) NOT NULL,
    total_used NUMERIC(19,4) NOT NULL,
    total_expired NUMERIC(19,4) NOT NULL,
    total_forfeited NUMERIC(19,4) NOT NULL,
    current_balance NUMERIC(19,4) NOT NULL
);

-- comp_time_transactions
CREATE TABLE IF NOT EXISTS comp_time_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
balance_id UUID NOT NULL,
    transaction_type VARCHAR(50) NOT NULL,
    hours NUMERIC(19,4) NOT NULL,
    transaction_date DATE NOT NULL
);

-- compensation_review_cycles
CREATE TABLE IF NOT EXISTS compensation_review_cycles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
name VARCHAR(200) NOT NULL,
    description VARCHAR(1000),
    cycle_type VARCHAR(50) NOT NULL,
    fiscal_year INTEGER NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    effective_date DATE NOT NULL,
    status VARCHAR(50) NOT NULL,
    budget_amount NUMERIC(15,2),
    utilized_amount NUMERIC(15,2),
    min_increment_percentage NUMERIC(5,2),
    max_increment_percentage NUMERIC(5,2),
    average_increment_target NUMERIC(5,2),
    include_all_employees BOOLEAN DEFAULT FALSE,
    min_tenure_months INTEGER,
    exclude_probationers BOOLEAN DEFAULT FALSE,
    exclude_notice_period BOOLEAN DEFAULT FALSE,
    allow_promotions BOOLEAN DEFAULT FALSE,
    require_performance_rating BOOLEAN DEFAULT FALSE,
    min_performance_rating DOUBLE PRECISION,
    approved_by UUID,
    approval_date DATE,
    total_employees INTEGER,
    revisions_drafted INTEGER,
    revisions_approved INTEGER,
    revisions_applied INTEGER,
    currency VARCHAR(3)
);

-- compliance_alerts
CREATE TABLE IF NOT EXISTS compliance_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
title VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(50) NOT NULL,
    priority VARCHAR(50) NOT NULL,
    status VARCHAR(50)
);

-- compliance_audit_logs
CREATE TABLE IF NOT EXISTS compliance_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
action VARCHAR(50) NOT NULL,
    entity_type VARCHAR(255) NOT NULL,
    entity_id UUID,
    entity_name VARCHAR(255),
    performed_by UUID NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    old_value TEXT,
    new_value TEXT,
    changed_fields TEXT,
    additional_info TEXT,
    severity VARCHAR(50)
);

-- compliance_checklists
CREATE TABLE IF NOT EXISTS compliance_checklists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL,
    frequency VARCHAR(50),
    status VARCHAR(50)
);

-- compliance_policies
CREATE TABLE IF NOT EXISTS compliance_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
name VARCHAR(255) NOT NULL,
    code VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    category VARCHAR(50) NOT NULL,
    status VARCHAR(50),
    policy_content TEXT
);

-- currencies
CREATE TABLE IF NOT EXISTS currencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
currency_code VARCHAR(3) NOT NULL,
    currency_name VARCHAR(255) NOT NULL,
    symbol VARCHAR(10),
    decimal_places INTEGER,
    is_base_currency BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT FALSE,
    country_code VARCHAR(2),
    exchange_rate_to_base NUMERIC(18,8),
    notes TEXT
);

-- custom_field_definitions
CREATE TABLE IF NOT EXISTS custom_field_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
field_code VARCHAR(100) NOT NULL,
    field_name VARCHAR(200) NOT NULL,
    description VARCHAR(500),
    entity_type VARCHAR(50) NOT NULL,
    field_type VARCHAR(50) NOT NULL,
    field_group VARCHAR(100),
    display_order INTEGER NOT NULL,
    is_required BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT FALSE,
    is_searchable BOOLEAN NOT NULL DEFAULT FALSE,
    show_in_list BOOLEAN NOT NULL DEFAULT FALSE,
    default_value VARCHAR(1000),
    placeholder VARCHAR(200),
    options TEXT,
    validation_rules TEXT,
    allowed_file_types VARCHAR(200),
    view_visibility VARCHAR(50),
    edit_visibility VARCHAR(50)
);

-- custom_field_values
CREATE TABLE IF NOT EXISTS custom_field_values (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
fieldDefinitionId UUID NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    text_value TEXT,
    number_value NUMERIC(19,4),
    multi_select_value TEXT,
    file_value VARCHAR(500),
    file_name VARCHAR(255),
    file_mime_type VARCHAR(100),
    currency_code VARCHAR(3)
);

-- custom_scope_targets
CREATE TABLE IF NOT EXISTS custom_scope_targets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
role_permission_id UUID NOT NULL,
    target_type VARCHAR(20) NOT NULL,
    target_id UUID NOT NULL,
    CONSTRAINT uc_custom_scope_targets_role_permission_id_target_type UNIQUE (role_permission_id, target_type, target_id)
);

-- dashboard_widgets
CREATE TABLE IF NOT EXISTS dashboard_widgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
dashboard_id UUID NOT NULL,
    widget_name VARCHAR(200) NOT NULL,
    widget_type VARCHAR(30) NOT NULL,
    data_source TEXT,
    configuration TEXT,
    position_x INTEGER,
    position_y INTEGER,
    width INTEGER,
    height INTEGER,
    refresh_interval INTEGER,
    is_visible BOOLEAN NOT NULL DEFAULT FALSE
);

-- dashboards
CREATE TABLE IF NOT EXISTS dashboards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
dashboard_name VARCHAR(200) NOT NULL,
    dashboard_type VARCHAR(30) NOT NULL,
    description TEXT,
    layout_config TEXT,
    is_default BOOLEAN DEFAULT FALSE,
    is_public BOOLEAN DEFAULT FALSE,
    owner_id UUID
);

-- document_approvals
CREATE TABLE IF NOT EXISTS document_approvals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
document_id UUID NOT NULL,
    approver_id UUID NOT NULL,
    approval_level INTEGER,
    status VARCHAR(20) NOT NULL,
    comments TEXT,
    approved_at TIMESTAMPTZ
);

-- document_categories
CREATE TABLE IF NOT EXISTS document_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
category_code VARCHAR(50) NOT NULL UNIQUE,
    category_name VARCHAR(200) NOT NULL,
    parent_category_id UUID,
    description TEXT,
    retention_period_days INTEGER,
    is_mandatory BOOLEAN DEFAULT FALSE,
    requires_expiry_tracking BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT FALSE
);

-- document_requests
CREATE TABLE IF NOT EXISTS document_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
employee_id UUID NOT NULL,
    document_type VARCHAR(50) NOT NULL,
    purpose TEXT,
    status VARCHAR(50) NOT NULL,
    delivery_mode VARCHAR(50),
    processing_notes TEXT,
    rejection_reason TEXT
);

-- document_templates
CREATE TABLE IF NOT EXISTS document_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
template_code VARCHAR(50) NOT NULL UNIQUE,
    template_name VARCHAR(200) NOT NULL,
    category VARCHAR(50) NOT NULL,
    description TEXT,
    template_content TEXT,
    placeholders TEXT,
    file_name_pattern VARCHAR(200),
    is_system_template BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT FALSE,
    requires_approval BOOLEAN DEFAULT FALSE
);

-- document_versions
CREATE TABLE IF NOT EXISTS document_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
document_id UUID NOT NULL,
    version_number INTEGER NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size BIGINT,
    checksum VARCHAR(64),
    change_summary TEXT,
    is_current BOOLEAN NOT NULL DEFAULT FALSE
);

-- email_notifications
CREATE TABLE IF NOT EXISTS email_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
recipient_email VARCHAR(100) NOT NULL,
    recipient_name VARCHAR(200) NOT NULL,
    subject VARCHAR(500) NOT NULL,
    body TEXT NOT NULL,
    email_type VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL,
    sent_at TIMESTAMPTZ,
    scheduled_at TIMESTAMPTZ,
    error_message TEXT,
    retry_count INTEGER,
    metadata TEXT
);

-- employee_esi_records
CREATE TABLE IF NOT EXISTS employee_esi_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
employee_id UUID NOT NULL,
    esi_number VARCHAR(17),
    ip_number VARCHAR(20),
    enrollment_date DATE,
    exit_date DATE,
    dispensary_name VARCHAR(200),
    status VARCHAR(20) NOT NULL
);

-- employee_loans
CREATE TABLE IF NOT EXISTS employee_loans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
employee_id UUID NOT NULL,
    loan_number VARCHAR(255),
    loan_type VARCHAR(50) NOT NULL,
    principal_amount NUMERIC(12,2) NOT NULL,
    interest_rate NUMERIC(5,2),
    total_amount NUMERIC(12,2),
    outstanding_amount NUMERIC(12,2),
    emi_amount NUMERIC(12,2),
    tenure_months INTEGER,
    disbursement_date DATE,
    first_emi_date DATE,
    last_emi_date DATE,
    status VARCHAR(50),
    purpose TEXT,
    requested_date DATE,
    approved_by UUID,
    approved_date DATE,
    rejected_reason VARCHAR(255),
    is_salary_deduction BOOLEAN DEFAULT FALSE,
    guarantor_name VARCHAR(255),
    guarantor_employee_id UUID,
    remarks TEXT,
    CONSTRAINT uc_employee_loans_tenantId_loan_number UNIQUE (tenant_id, loan_number)
);

-- employee_payroll_records
CREATE TABLE IF NOT EXISTS employee_payroll_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
payroll_run_id UUID NOT NULL,
    employee_id UUID NOT NULL,
    employee_name VARCHAR(255),
    employee_number VARCHAR(255),
    location_id UUID,
    location_code VARCHAR(255),
    department_id UUID,
    department_name VARCHAR(255),
    local_currency VARCHAR(3) NOT NULL,
    base_salary_local NUMERIC(15,2),
    allowances_local NUMERIC(15,2),
    bonuses_local NUMERIC(15,2),
    overtime_local NUMERIC(15,2),
    gross_pay_local NUMERIC(15,2),
    income_tax_local NUMERIC(15,2),
    social_security_local NUMERIC(15,2),
    other_deductions_local NUMERIC(15,2),
    total_deductions_local NUMERIC(15,2),
    net_pay_local NUMERIC(15,2),
    employer_social_security_local NUMERIC(15,2),
    employer_other_contributions_local NUMERIC(15,2),
    total_employer_cost_local NUMERIC(15,2),
    exchange_rate NUMERIC(18,8),
    rate_date VARCHAR(50),
    gross_pay_base NUMERIC(15,2),
    total_deductions_base NUMERIC(15,2),
    net_pay_base NUMERIC(15,2),
    total_employer_cost_base NUMERIC(15,2),
    status VARCHAR(50),
    error_message TEXT,
    notes TEXT
);

-- employee_pf_records
CREATE TABLE IF NOT EXISTS employee_pf_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
employee_id UUID NOT NULL,
    uan_number VARCHAR(12),
    pf_number VARCHAR(50),
    enrollment_date DATE,
    exit_date DATE,
    vpf_percentage NUMERIC(5,2),
    is_international_worker BOOLEAN DEFAULT FALSE,
    previous_pf_balance NUMERIC(12,2),
    status VARCHAR(20) NOT NULL
);

-- employee_points
CREATE TABLE IF NOT EXISTS employee_points (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
employee_id UUID NOT NULL,
    CONSTRAINT uc_employee_points_employee_id_tenant_id UNIQUE (employee_id, tenant_id)
);

-- employee_referrals
CREATE TABLE IF NOT EXISTS employee_referrals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
referrer_id UUID NOT NULL,
    referral_code VARCHAR(255),
    candidate_name VARCHAR(255) NOT NULL,
    candidate_email VARCHAR(255) NOT NULL,
    candidate_phone VARCHAR(255),
    candidate_linkedin VARCHAR(255),
    resume_path VARCHAR(255),
    job_id UUID,
    job_title VARCHAR(255),
    department_id UUID,
    relationship VARCHAR(50),
    known_since DATE,
    referrer_notes TEXT,
    status VARCHAR(50),
    submitted_date DATE,
    screening_date DATE,
    interview_date DATE,
    offer_date DATE,
    joining_date DATE,
    hired_employee_id UUID,
    rejection_reason VARCHAR(255),
    rejection_stage VARCHAR(255),
    bonus_amount NUMERIC(12,2),
    bonus_status VARCHAR(50),
    bonus_eligible_date DATE,
    bonus_paid_date DATE,
    bonus_payment_reference VARCHAR(255),
    processing_notes TEXT
);

-- employee_skills
CREATE TABLE IF NOT EXISTS employee_skills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
employee_id UUID NOT NULL,
    skill_name VARCHAR(100) NOT NULL,
    category VARCHAR(50),
    proficiency_level INTEGER NOT NULL,
    years_of_experience DOUBLE PRECISION,
    last_used TIMESTAMPTZ,
    is_verified BOOLEAN DEFAULT FALSE,
    verified_by UUID,
    verified_at TIMESTAMPTZ,
    source VARCHAR(255)
);

-- employee_tds_declarations
CREATE TABLE IF NOT EXISTS employee_tds_declarations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
employee_id UUID NOT NULL,
    financial_year VARCHAR(10) NOT NULL,
    tax_regime VARCHAR(20) NOT NULL,
    section_80c NUMERIC(12,2),
    section_80d NUMERIC(12,2),
    section_80g NUMERIC(12,2),
    section_24 NUMERIC(12,2),
    section_80e NUMERIC(12,2),
    hra_exemption NUMERIC(12,2),
    lta_exemption NUMERIC(12,2),
    other_exemptions NUMERIC(12,2),
    previous_employer_income NUMERIC(12,2),
    previous_employer_tds NUMERIC(12,2),
    status VARCHAR(20) NOT NULL,
    submitted_at TIMESTAMPTZ,
    approved_at TIMESTAMPTZ,
    approved_by UUID,
    remarks TEXT
);

-- employment_change_requests
CREATE TABLE IF NOT EXISTS employment_change_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
employee_id UUID NOT NULL,
    requester_id UUID NOT NULL,
    approver_id UUID,
    status VARCHAR(20) NOT NULL,
    change_type VARCHAR(50) NOT NULL,
    current_designation VARCHAR(255),
    current_level VARCHAR(50),
    current_job_role VARCHAR(50),
    current_department_id UUID,
    current_manager_id UUID,
    current_employment_type VARCHAR(20),
    current_confirmation_date DATE,
    current_status VARCHAR(20),
    new_designation VARCHAR(255),
    new_level VARCHAR(50),
    new_job_role VARCHAR(50),
    new_department_id UUID,
    new_manager_id UUID,
    new_employment_type VARCHAR(20),
    new_confirmation_date DATE,
    new_status VARCHAR(20),
    reason VARCHAR(500),
    rejection_reason VARCHAR(500),
    effective_date DATE,
    approved_at TIMESTAMPTZ,
    rejected_at TIMESTAMPTZ
);

-- engagement_scores
CREATE TABLE IF NOT EXISTS engagement_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
survey_id UUID,
    score_date DATE NOT NULL,
    score_level VARCHAR(50) NOT NULL,
    score_type VARCHAR(50),
    overall_score DOUBLE PRECISION NOT NULL
);

-- esi_configs
CREATE TABLE IF NOT EXISTS esi_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
effective_from DATE NOT NULL,
    effective_to DATE,
    employee_contribution_percentage NUMERIC(5,2) NOT NULL,
    employer_contribution_percentage NUMERIC(5,2) NOT NULL,
    wage_ceiling NUMERIC(10,2),
    is_active BOOLEAN NOT NULL DEFAULT FALSE
);

-- exchange_rates
CREATE TABLE IF NOT EXISTS exchange_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
from_currency VARCHAR(3) NOT NULL,
    to_currency VARCHAR(3) NOT NULL,
    rate NUMERIC(18,8) NOT NULL,
    effective_date DATE NOT NULL,
    expiry_date DATE,
    rate_type VARCHAR(50),
    source VARCHAR(255),
    is_manual_override BOOLEAN DEFAULT FALSE,
    notes TEXT
);

-- exit_clearances
CREATE TABLE IF NOT EXISTS exit_clearances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
exit_process_id UUID NOT NULL,
    department VARCHAR(100) NOT NULL,
    approver_id UUID NOT NULL,
    status VARCHAR(30) NOT NULL,
    requested_date DATE,
    approved_date DATE,
    comments TEXT,
    checklist_items TEXT
);

-- exit_interviews
CREATE TABLE IF NOT EXISTS exit_interviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
exit_process_id UUID NOT NULL,
    employee_id UUID NOT NULL,
    interviewer_id UUID,
    scheduled_date DATE,
    scheduled_time TIMESTAMPTZ,
    actual_date DATE,
    interview_mode VARCHAR(50),
    status VARCHAR(50),
    overall_experience_rating INTEGER,
    management_rating INTEGER,
    work_life_balance_rating INTEGER,
    growth_opportunities_rating INTEGER,
    compensation_rating INTEGER,
    team_culture_rating INTEGER,
    primary_reason_for_leaving VARCHAR(50),
    detailed_reason TEXT,
    what_liked_most TEXT,
    what_could_improve TEXT,
    suggestions TEXT,
    would_recommend_company BOOLEAN DEFAULT FALSE,
    would_consider_returning BOOLEAN DEFAULT FALSE,
    new_employer VARCHAR(255),
    new_role VARCHAR(255),
    new_salary_increase_percentage INTEGER,
    interviewer_notes TEXT,
    is_confidential BOOLEAN DEFAULT FALSE,
    public_token VARCHAR(255) UNIQUE
);

-- exit_processes
CREATE TABLE IF NOT EXISTS exit_processes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
employee_id UUID NOT NULL,
    exit_type VARCHAR(30) NOT NULL,
    resignation_date DATE,
    last_working_date DATE,
    notice_period_days INTEGER,
    notice_period_served INTEGER,
    buyout_amount NUMERIC(19,4),
    reason_for_leaving TEXT,
    new_company VARCHAR(200),
    new_designation VARCHAR(200),
    status VARCHAR(30) NOT NULL,
    rehire_eligible BOOLEAN DEFAULT FALSE,
    exit_interview_scheduled BOOLEAN DEFAULT FALSE,
    exit_interview_date DATE,
    exit_interview_feedback TEXT,
    final_settlement_amount NUMERIC(19,4),
    settlement_date DATE,
    manager_id UUID,
    hr_spoc_id UUID,
    notes TEXT
);

-- expense_claims
CREATE TABLE IF NOT EXISTS expense_claims (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
employee_id UUID NOT NULL,
    claim_number VARCHAR(50),
    claim_date DATE NOT NULL,
    category VARCHAR(50) NOT NULL,
    description VARCHAR(500) NOT NULL,
    amount NUMERIC(10,2) NOT NULL,
    currency VARCHAR(3),
    status VARCHAR(20) NOT NULL,
    receipt_url VARCHAR(500),
    submitted_at TIMESTAMPTZ,
    approved_by UUID,
    approved_at TIMESTAMPTZ,
    rejected_by UUID,
    rejected_at TIMESTAMPTZ,
    rejection_reason VARCHAR(500),
    payment_date DATE,
    payment_reference VARCHAR(100),
    notes VARCHAR(1000),
    CONSTRAINT uc_expense_claims_tenantId_claim_number UNIQUE (tenant_id, claim_number)
);

-- feature_flags
CREATE TABLE IF NOT EXISTS feature_flags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
feature_key VARCHAR(100) NOT NULL,
    feature_name VARCHAR(200) NOT NULL,
    description VARCHAR(500),
    enabled BOOLEAN NOT NULL DEFAULT FALSE,
    percentage_rollout INTEGER,
    metadata TEXT,
    category VARCHAR(50),
    CONSTRAINT uc_feature_flags_tenant_id_feature_key UNIQUE (tenant_id, feature_key)
);

-- feedback
CREATE TABLE IF NOT EXISTS feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
recipient_id UUID NOT NULL,
    giver_id UUID NOT NULL,
    feedback_type VARCHAR(50),
    category VARCHAR(100),
    feedback_text TEXT NOT NULL,
    is_anonymous BOOLEAN DEFAULT FALSE,
    is_public BOOLEAN DEFAULT FALSE,
    related_review_id UUID
);

-- feedback_360_cycles
CREATE TABLE IF NOT EXISTS feedback_360_cycles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
name VARCHAR(200) NOT NULL,
    description TEXT,
    status VARCHAR(30),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    nomination_deadline DATE,
    self_review_deadline DATE,
    peer_review_deadline DATE,
    manager_review_deadline DATE,
    min_peers_required INTEGER,
    max_peers_allowed INTEGER,
    is_anonymous BOOLEAN DEFAULT FALSE,
    include_self_review BOOLEAN DEFAULT FALSE,
    include_manager_review BOOLEAN DEFAULT FALSE,
    include_peer_review BOOLEAN DEFAULT FALSE,
    include_upward_review BOOLEAN DEFAULT FALSE,
    template_id UUID
);

-- feedback_360_requests
CREATE TABLE IF NOT EXISTS feedback_360_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
cycle_id UUID NOT NULL,
    subject_employee_id UUID NOT NULL,
    reviewer_id UUID NOT NULL,
    reviewer_type VARCHAR(30) NOT NULL,
    status VARCHAR(30),
    nominated_by UUID,
    nomination_approved BOOLEAN DEFAULT FALSE,
    approved_by UUID,
    approved_at TIMESTAMPTZ,
    reminder_sent_at TIMESTAMPTZ,
    reminder_count INTEGER
);

-- feedback_360_responses
CREATE TABLE IF NOT EXISTS feedback_360_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
request_id UUID NOT NULL,
    cycle_id UUID NOT NULL,
    subject_employee_id UUID NOT NULL,
    reviewer_id UUID NOT NULL,
    reviewer_type VARCHAR(30),
    submitted_at TIMESTAMPTZ,
    is_draft BOOLEAN DEFAULT FALSE,
    overall_rating NUMERIC(3,2),
    communication_rating NUMERIC(3,2),
    teamwork_rating NUMERIC(3,2),
    leadership_rating NUMERIC(3,2),
    problem_solving_rating NUMERIC(3,2),
    technical_skills_rating NUMERIC(3,2),
    adaptability_rating NUMERIC(3,2),
    work_quality_rating NUMERIC(3,2),
    time_management_rating NUMERIC(3,2),
    strengths TEXT,
    areas_for_improvement TEXT,
    additional_comments TEXT,
    specific_examples TEXT,
    development_suggestions TEXT,
    custom_responses TEXT
);

-- feedback_360_summaries
CREATE TABLE IF NOT EXISTS feedback_360_summaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
cycle_id UUID NOT NULL,
    subject_employee_id UUID NOT NULL,
    total_reviewers INTEGER,
    responses_received INTEGER,
    self_review_completed BOOLEAN DEFAULT FALSE,
    manager_review_completed BOOLEAN DEFAULT FALSE,
    peer_reviews_completed INTEGER,
    upward_reviews_completed INTEGER,
    self_overall_rating NUMERIC(3,2),
    manager_overall_rating NUMERIC(3,2),
    peer_avg_rating NUMERIC(3,2),
    upward_avg_rating NUMERIC(3,2),
    final_rating NUMERIC(3,2),
    avg_communication NUMERIC(3,2),
    avg_teamwork NUMERIC(3,2),
    avg_leadership NUMERIC(3,2),
    avg_problem_solving NUMERIC(3,2),
    avg_technical_skills NUMERIC(3,2),
    avg_adaptability NUMERIC(3,2),
    avg_work_quality NUMERIC(3,2),
    avg_time_management NUMERIC(3,2),
    consolidated_strengths TEXT,
    consolidated_improvements TEXT,
    action_items TEXT,
    generated_at TIMESTAMPTZ,
    shared_with_employee BOOLEAN DEFAULT FALSE,
    shared_at TIMESTAMPTZ
);

-- file_metadata
CREATE TABLE IF NOT EXISTS file_metadata (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
file_name VARCHAR(255) NOT NULL,
    storage_path VARCHAR(500) NOT NULL,
    content_type VARCHAR(100) NOT NULL,
    file_size BIGINT NOT NULL,
    entity_type VARCHAR(100),
    entity_id UUID,
    category VARCHAR(50),
    description TEXT,
    checksum VARCHAR(64)
);

-- flex_benefit_allocations
CREATE TABLE IF NOT EXISTS flex_benefit_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
employee_id UUID NOT NULL,
    fiscal_year INTEGER NOT NULL,
    total_credits NUMERIC(19,4) NOT NULL,
    status VARCHAR(50)
);

-- full_and_final_settlements
CREATE TABLE IF NOT EXISTS full_and_final_settlements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
exit_process_id UUID NOT NULL,
    employee_id UUID NOT NULL,
    pending_salary NUMERIC(12,2),
    leave_encashment NUMERIC(12,2),
    bonus_amount NUMERIC(12,2),
    gratuity_amount NUMERIC(12,2),
    notice_period_recovery NUMERIC(12,2),
    reimbursements NUMERIC(12,2),
    other_earnings NUMERIC(12,2),
    notice_buyout NUMERIC(12,2),
    loan_recovery NUMERIC(12,2),
    advance_recovery NUMERIC(12,2),
    asset_damage_deduction NUMERIC(12,2),
    tax_deduction NUMERIC(12,2),
    other_deductions NUMERIC(12,2),
    total_earnings NUMERIC(12,2),
    total_deductions NUMERIC(12,2),
    net_payable NUMERIC(12,2),
    status VARCHAR(50),
    payment_mode VARCHAR(50),
    payment_reference VARCHAR(255),
    payment_date DATE,
    prepared_by UUID,
    approved_by UUID,
    approval_date DATE,
    remarks TEXT,
    years_of_service NUMERIC(5,2),
    is_gratuity_eligible BOOLEAN DEFAULT FALSE,
    last_drawn_salary NUMERIC(12,2)
);

-- generated_documents
CREATE TABLE IF NOT EXISTS generated_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
template_id UUID NOT NULL,
    employee_id UUID,
    document_number VARCHAR(50) UNIQUE,
    file_path VARCHAR(500),
    file_size BIGINT,
    mime_type VARCHAR(100),
    status VARCHAR(30) NOT NULL,
    generated_data TEXT,
    is_signed BOOLEAN DEFAULT FALSE,
    signature_data TEXT,
    valid_until TIMESTAMPTZ
);

-- generated_letters
CREATE TABLE IF NOT EXISTS generated_letters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
reference_number VARCHAR(255) NOT NULL UNIQUE,
    template_id UUID NOT NULL,
    category VARCHAR(50) NOT NULL,
    letter_title VARCHAR(255) NOT NULL,
    generated_content TEXT NOT NULL,
    pdf_url TEXT,
    status VARCHAR(50) NOT NULL,
    approval_comments TEXT,
    additional_notes TEXT,
    custom_placeholder_values TEXT
);

-- global_payroll_runs
CREATE TABLE IF NOT EXISTS global_payroll_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
run_code VARCHAR(255) NOT NULL,
    description VARCHAR(255),
    pay_period_start DATE NOT NULL,
    pay_period_end DATE NOT NULL,
    payment_date DATE,
    status VARCHAR(50) NOT NULL,
    total_gross_base NUMERIC(15,2),
    total_deductions_base NUMERIC(15,2),
    total_net_base NUMERIC(15,2),
    total_employer_cost_base NUMERIC(15,2),
    base_currency VARCHAR(3),
    employee_count INTEGER,
    location_count INTEGER,
    processed_at TIMESTAMPTZ,
    processed_by UUID,
    approved_at TIMESTAMPTZ,
    approved_by UUID,
    error_count INTEGER,
    warning_count INTEGER,
    notes TEXT
);

-- goals
CREATE TABLE IF NOT EXISTS goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
employee_id UUID NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    goal_type VARCHAR(50),
    category VARCHAR(100),
    target_value NUMERIC(19,2),
    current_value NUMERIC(19,2),
    measurement_unit VARCHAR(50),
    start_date DATE NOT NULL,
    due_date DATE NOT NULL,
    status VARCHAR(50),
    progress_percentage INTEGER,
    parent_goal_id UUID,
    weight INTEGER,
    approved_by UUID
);

-- headcount_budgets
CREATE TABLE IF NOT EXISTS headcount_budgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
fiscal_year INTEGER NOT NULL,
    quarter VARCHAR(50),
    department_id UUID,
    department_name VARCHAR(255),
    cost_center_id UUID,
    cost_center_code VARCHAR(255),
    cost_center VARCHAR(255),
    budget_name VARCHAR(255) NOT NULL,
    description TEXT,
    notes TEXT,
    currency VARCHAR(10),
    status VARCHAR(50),
    opening_headcount INTEGER,
    planned_hires INTEGER,
    planned_attrition INTEGER,
    planned_transfers_in INTEGER,
    planned_transfers_out INTEGER,
    closing_headcount INTEGER,
    actual_headcount INTEGER,
    current_headcount INTEGER,
    actual_hires INTEGER,
    actual_attrition INTEGER,
    attrition_rate NUMERIC(5,2),
    salary_budget NUMERIC(15,2),
    benefits_budget NUMERIC(15,2),
    bonus_budget NUMERIC(15,2),
    training_budget NUMERIC(15,2),
    recruitment_budget NUMERIC(15,2),
    other_budget NUMERIC(15,2),
    contingency_budget NUMERIC(15,2),
    total_budget NUMERIC(15,2),
    allocated_budget NUMERIC(15,2),
    actual_salary_spend NUMERIC(15,2),
    actual_total_spend NUMERIC(15,2),
    submitted_by UUID,
    approved_by UUID,
    approved_at TIMESTAMPTZ,
    approval_notes TEXT
);

-- headcount_positions
CREATE TABLE IF NOT EXISTS headcount_positions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
budget_id UUID NOT NULL,
    position_code VARCHAR(255),
    position_title VARCHAR(255) NOT NULL,
    position_type VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL,
    job_level VARCHAR(255),
    job_family VARCHAR(255),
    location VARCHAR(255),
    employment_type VARCHAR(255),
    fte_count NUMERIC(3,2),
    min_salary NUMERIC(12,2),
    max_salary NUMERIC(12,2),
    budgeted_salary NUMERIC(12,2),
    budgeted_benefits NUMERIC(12,2),
    total_cost NUMERIC(12,2),
    planned_start_date DATE,
    planned_fill_date DATE,
    actual_fill_date DATE,
    current_employee_id UUID,
    replacement_for UUID,
    requisition_id UUID,
    justification TEXT,
    hiring_manager_id UUID
);

-- health_logs
CREATE TABLE IF NOT EXISTS health_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
employee_id UUID NOT NULL,
    participant_id UUID,
    log_date DATE NOT NULL,
    metric_type VARCHAR(50) NOT NULL,
    value DOUBLE PRECISION NOT NULL,
    unit VARCHAR(255),
    source VARCHAR(255),
    notes VARCHAR(255),
    verified BOOLEAN DEFAULT FALSE,
    verified_by UUID,
    verified_at TIMESTAMPTZ,
    points_awarded INTEGER,
    logged_at TIMESTAMPTZ
);

-- holidays
CREATE TABLE IF NOT EXISTS holidays (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
holiday_name VARCHAR(200) NOT NULL,
    holiday_date DATE NOT NULL,
    holiday_type VARCHAR(50) NOT NULL,
    description TEXT,
    is_optional BOOLEAN DEFAULT FALSE,
    is_restricted BOOLEAN DEFAULT FALSE,
    applicable_locations TEXT,
    applicable_departments TEXT,
    year INTEGER NOT NULL
);

-- interviews
CREATE TABLE IF NOT EXISTS interviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
candidate_id UUID NOT NULL,
    job_opening_id UUID NOT NULL,
    interview_round VARCHAR(50),
    interview_type VARCHAR(30),
    scheduled_at TIMESTAMPTZ,
    duration_minutes INTEGER,
    interviewer_id UUID,
    location VARCHAR(500),
    meeting_link VARCHAR(500),
    status VARCHAR(30) NOT NULL,
    feedback TEXT,
    rating INTEGER,
    result VARCHAR(30),
    notes TEXT
);

-- job_openings
CREATE TABLE IF NOT EXISTS job_openings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
job_code VARCHAR(50) NOT NULL UNIQUE,
    job_title VARCHAR(200) NOT NULL,
    department_id UUID,
    location VARCHAR(200),
    employment_type VARCHAR(50),
    experience_required VARCHAR(100),
    min_salary NUMERIC(19,4),
    max_salary NUMERIC(19,4),
    number_of_openings INTEGER,
    job_description TEXT,
    requirements TEXT,
    skills_required TEXT,
    hiring_manager_id UUID,
    status VARCHAR(30) NOT NULL,
    posted_date DATE,
    closing_date DATE,
    priority VARCHAR(20),
    is_active BOOLEAN NOT NULL DEFAULT FALSE
);

-- key_results
CREATE TABLE IF NOT EXISTS key_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
objective_id UUID NOT NULL,
    owner_id UUID NOT NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    measurement_type VARCHAR(30),
    start_value NUMERIC(19,2),
    current_value NUMERIC(19,2),
    target_value NUMERIC(19,2) NOT NULL,
    measurement_unit VARCHAR(50),
    status VARCHAR(30),
    progress_percentage NUMERIC(5,2),
    weight INTEGER,
    due_date DATE,
    is_milestone BOOLEAN DEFAULT FALSE,
    milestone_order INTEGER,
    confidence_level INTEGER,
    last_updated_notes TEXT
);

-- leave_balances
CREATE TABLE IF NOT EXISTS leave_balances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
employee_id UUID NOT NULL,
    leave_type_id UUID NOT NULL,
    year INTEGER NOT NULL,
    opening_balance NUMERIC(5,2),
    accrued NUMERIC(5,2),
    used NUMERIC(5,2),
    pending NUMERIC(5,2),
    available NUMERIC(5,2),
    carried_forward NUMERIC(5,2),
    encashed NUMERIC(5,2),
    lapsed NUMERIC(5,2),
    last_accrual_date DATE
);

-- leave_requests
CREATE TABLE IF NOT EXISTS leave_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
employee_id UUID NOT NULL,
    leave_type_id UUID NOT NULL,
    request_number VARCHAR(50) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    total_days NUMERIC(5,2) NOT NULL,
    is_half_day BOOLEAN DEFAULT FALSE,
    half_day_period VARCHAR(20),
    reason TEXT NOT NULL,
    status VARCHAR(50) NOT NULL,
    document_path TEXT,
    applied_on TIMESTAMPTZ NOT NULL,
    approved_by UUID,
    approved_on TIMESTAMPTZ,
    rejection_reason TEXT,
    cancelled_on TIMESTAMPTZ,
    cancellation_reason TEXT,
    comments TEXT
);

-- leave_types
CREATE TABLE IF NOT EXISTS leave_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
leave_code VARCHAR(50) NOT NULL,
    leave_name VARCHAR(100) NOT NULL,
    description TEXT,
    is_paid BOOLEAN DEFAULT FALSE,
    color_code VARCHAR(20),
    annual_quota NUMERIC(5,2),
    max_consecutive_days INTEGER,
    min_days_notice INTEGER,
    max_days_per_request INTEGER,
    is_carry_forward_allowed BOOLEAN DEFAULT FALSE,
    max_carry_forward_days NUMERIC(5,2),
    is_encashable BOOLEAN DEFAULT FALSE,
    requires_document BOOLEAN DEFAULT FALSE,
    applicable_after_days INTEGER,
    accrual_type VARCHAR(50),
    accrual_rate NUMERIC(5,2),
    gender_specific VARCHAR(20),
    is_active BOOLEAN DEFAULT FALSE
);

-- letter_templates
CREATE TABLE IF NOT EXISTS letter_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
name VARCHAR(255) NOT NULL,
    code VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    category VARCHAR(50) NOT NULL,
    template_content TEXT NOT NULL,
    header_html TEXT,
    footer_html TEXT,
    css_styles TEXT,
    available_placeholders TEXT
);

-- lms_certificates
CREATE TABLE IF NOT EXISTS lms_certificates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
certificate_number VARCHAR(50) NOT NULL UNIQUE,
    course_id UUID NOT NULL,
    employee_id UUID NOT NULL,
    enrollment_id UUID NOT NULL,
    course_title VARCHAR(255),
    employee_name VARCHAR(200),
    issued_at TIMESTAMPTZ NOT NULL,
    expiry_date DATE,
    is_active BOOLEAN DEFAULT FALSE,
    score_achieved INTEGER,
    completion_date DATE,
    certificate_url VARCHAR(1000),
    verification_url VARCHAR(1000),
    template_id UUID,
    issued_by UUID,
    issuer_name VARCHAR(200),
    additional_info TEXT
);

-- lms_content_progress
CREATE TABLE IF NOT EXISTS lms_content_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
enrollment_id UUID NOT NULL,
    content_id UUID NOT NULL,
    module_id UUID NOT NULL,
    status VARCHAR(30),
    progress_percentage NUMERIC(5,2),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    time_spent_seconds INTEGER,
    video_position_seconds INTEGER,
    current_page INTEGER,
    total_pages INTEGER,
    CONSTRAINT uc_lms_content_progress_enrollmentId_contentId UNIQUE (enrollment_id, content_id, tenant_id)
);

-- lms_course_enrollments
CREATE TABLE IF NOT EXISTS lms_course_enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
course_id UUID NOT NULL,
    employee_id UUID NOT NULL,
    status VARCHAR(30),
    enrolled_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    progress_percentage NUMERIC(5,2),
    last_accessed_at TIMESTAMPTZ,
    last_module_id UUID,
    last_content_id UUID,
    total_time_spent_minutes INTEGER,
    quiz_score NUMERIC(5,2),
    quiz_attempts INTEGER,
    quiz_passed BOOLEAN DEFAULT FALSE,
    certificate_id UUID,
    certificate_issued_at TIMESTAMPTZ,
    rating NUMERIC(3,2),
    feedback TEXT,
    enrolled_by UUID,
    due_date TIMESTAMPTZ,
    CONSTRAINT uc_lms_course_enrollments_courseId_employeeId UNIQUE (course_id, employee_id, tenant_id)
);

-- lms_course_modules
CREATE TABLE IF NOT EXISTS lms_course_modules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
course_id UUID NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    order_index INTEGER,
    duration_minutes INTEGER,
    is_mandatory BOOLEAN DEFAULT FALSE,
    unlock_after_days INTEGER
);

-- lms_courses
CREATE TABLE IF NOT EXISTS lms_courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
title VARCHAR(255) NOT NULL,
    code VARCHAR(100),
    description TEXT,
    short_description VARCHAR(500),
    category_id UUID,
    thumbnail_url VARCHAR(500),
    preview_video_url VARCHAR(500),
    status VARCHAR(30),
    difficulty_level VARCHAR(20),
    duration_hours NUMERIC(5,2),
    passing_score INTEGER,
    max_attempts INTEGER,
    is_mandatory BOOLEAN DEFAULT FALSE,
    is_self_paced BOOLEAN DEFAULT FALSE,
    enrollment_deadline DATE,
    completion_deadline DATE,
    instructor_id UUID,
    instructor_name VARCHAR(200),
    prerequisites TEXT,
    skills_covered TEXT,
    tags VARCHAR(500),
    certificate_template_id UUID,
    is_certificate_enabled BOOLEAN DEFAULT FALSE,
    total_enrollments INTEGER,
    avg_rating NUMERIC(3,2),
    total_ratings INTEGER
);

-- lms_module_contents
CREATE TABLE IF NOT EXISTS lms_module_contents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
module_id UUID NOT NULL,
    title VARCHAR(255) NOT NULL,
    content_type VARCHAR(30) NOT NULL,
    order_index INTEGER,
    duration_minutes INTEGER,
    video_url VARCHAR(1000),
    video_provider VARCHAR(50),
    document_url VARCHAR(1000),
    document_type VARCHAR(20),
    text_content TEXT,
    external_url VARCHAR(1000),
    scorm_package_url VARCHAR(1000),
    quiz_id UUID,
    assignment_instructions TEXT,
    is_mandatory BOOLEAN DEFAULT FALSE,
    completion_required BOOLEAN DEFAULT FALSE
);

-- lms_quiz_questions
CREATE TABLE IF NOT EXISTS lms_quiz_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
quiz_id UUID NOT NULL,
    question_type VARCHAR(30) NOT NULL,
    question_text TEXT NOT NULL,
    question_image_url VARCHAR(500),
    options TEXT,
    correct_answer BOOLEAN DEFAULT FALSE,
    correct_answers TEXT,
    keywords TEXT,
    explanation TEXT,
    points INTEGER,
    order_index INTEGER,
    is_mandatory BOOLEAN DEFAULT FALSE
);

-- lms_quizzes
CREATE TABLE IF NOT EXISTS lms_quizzes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
course_id UUID,
    module_id UUID,
    title VARCHAR(255) NOT NULL,
    instructions TEXT,
    time_limit_minutes INTEGER,
    passing_score INTEGER,
    max_attempts INTEGER,
    shuffle_questions BOOLEAN DEFAULT FALSE,
    shuffle_options BOOLEAN DEFAULT FALSE,
    show_correct_answers BOOLEAN DEFAULT FALSE,
    show_score_immediately BOOLEAN DEFAULT FALSE,
    questions_per_attempt INTEGER,
    is_active BOOLEAN DEFAULT FALSE
);

-- loan_repayments
CREATE TABLE IF NOT EXISTS loan_repayments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
loan_id UUID NOT NULL,
    employee_id UUID NOT NULL,
    installment_number INTEGER,
    due_date DATE,
    payment_date DATE,
    principal_amount NUMERIC(12,2),
    interest_amount NUMERIC(12,2),
    total_amount NUMERIC(12,2),
    paid_amount NUMERIC(12,2),
    outstanding_after_payment NUMERIC(12,2),
    status VARCHAR(50),
    payment_mode VARCHAR(50),
    payment_reference VARCHAR(255),
    payroll_run_id UUID,
    is_prepayment BOOLEAN DEFAULT FALSE,
    late_fee NUMERIC(10,2),
    remarks VARCHAR(255)
);

-- meeting_action_items
CREATE TABLE IF NOT EXISTS meeting_action_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
meeting_id UUID NOT NULL,
    title VARCHAR(300) NOT NULL,
    description TEXT,
    assignee_id UUID NOT NULL,
    assignee_role VARCHAR(20),
    due_date DATE,
    status VARCHAR(20) NOT NULL,
    priority VARCHAR(20),
    completed_at TIMESTAMPTZ,
    completion_notes TEXT,
    is_carried_over BOOLEAN DEFAULT FALSE,
    carried_from_meeting_id UUID,
    reminder_sent BOOLEAN DEFAULT FALSE
);

-- meeting_agenda_items
CREATE TABLE IF NOT EXISTS meeting_agenda_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
meeting_id UUID NOT NULL,
    title VARCHAR(300) NOT NULL,
    description TEXT,
    item_order INTEGER NOT NULL,
    added_by VARCHAR(20) NOT NULL,
    added_by_id UUID NOT NULL,
    is_discussed BOOLEAN DEFAULT FALSE,
    discussion_notes TEXT,
    duration_minutes INTEGER,
    priority VARCHAR(20),
    category VARCHAR(30)
);

-- milestones
CREATE TABLE IF NOT EXISTS milestones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
employee_id UUID NOT NULL,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT
);

-- monthly_statutory_contributions
CREATE TABLE IF NOT EXISTS monthly_statutory_contributions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
employee_id UUID NOT NULL,
    payslip_id UUID NOT NULL,
    month INTEGER NOT NULL,
    year INTEGER NOT NULL,
    pf_employee_contribution NUMERIC(10,2),
    pf_employer_contribution NUMERIC(10,2),
    eps_contribution NUMERIC(10,2),
    vpf_contribution NUMERIC(10,2),
    pf_wage NUMERIC(10,2),
    esi_employee_contribution NUMERIC(10,2),
    esi_employer_contribution NUMERIC(10,2),
    esi_wage NUMERIC(10,2),
    professional_tax NUMERIC(10,2),
    tds_deducted NUMERIC(10,2),
    gross_salary NUMERIC(12,2)
);

-- multi_channel_notifications
CREATE TABLE IF NOT EXISTS multi_channel_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
template_id UUID,
    recipient_id UUID NOT NULL,
    channel VARCHAR(50) NOT NULL,
    priority VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL,
    subject VARCHAR(500),
    body TEXT,
    context_data TEXT
);

-- notification_channel_configs
CREATE TABLE IF NOT EXISTS notification_channel_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
channel VARCHAR(50) NOT NULL,
    config_json TEXT,
    webhook_headers TEXT,
    CONSTRAINT uc_notification_channel_configs_tenantId_channel UNIQUE (tenant_id, channel)
);

-- notification_templates
CREATE TABLE IF NOT EXISTS notification_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
code VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(255) NOT NULL,
    event_type VARCHAR(255) NOT NULL,
    email_subject VARCHAR(500),
    email_body TEXT,
    sms_body VARCHAR(500),
    push_title VARCHAR(200),
    push_body VARCHAR(500),
    in_app_title VARCHAR(200),
    in_app_body VARCHAR(1000),
    slack_message TEXT,
    teams_message TEXT,
    whatsapp_body TEXT,
    webhook_payload TEXT,
    default_priority VARCHAR(50) NOT NULL,
    channel VARCHAR(50)
);

-- notifications
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
user_id UUID NOT NULL,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    related_entity_id UUID,
    related_entity_type VARCHAR(100),
    action_url VARCHAR(500),
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    priority VARCHAR(20) NOT NULL,
    metadata TEXT
);

-- nu_applications
CREATE TABLE IF NOT EXISTS nu_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
code VARCHAR(20) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    description VARCHAR(1000),
    icon_url VARCHAR(200),
    base_url VARCHAR(200),
    api_base_path VARCHAR(100),
    status VARCHAR(20) NOT NULL,
    display_order INTEGER,
    is_system_app BOOLEAN NOT NULL DEFAULT FALSE,
    app_version VARCHAR(20)
);

-- objectives
CREATE TABLE IF NOT EXISTS objectives (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
owner_id UUID NOT NULL,
    cycle_id UUID,
    parent_objective_id UUID,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    objective_level VARCHAR(30),
    status VARCHAR(30),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    progress_percentage NUMERIC(5,2),
    weight INTEGER,
    is_stretch_goal BOOLEAN DEFAULT FALSE,
    aligned_to_company_objective UUID,
    department_id UUID,
    team_id UUID,
    visibility VARCHAR(20),
    approved_by UUID,
    check_in_frequency VARCHAR(20),
    last_check_in_date DATE
);

-- office_locations
CREATE TABLE IF NOT EXISTS office_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
location_name VARCHAR(100) NOT NULL,
    location_code VARCHAR(50) NOT NULL,
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100),
    zip_code VARCHAR(20),
    latitude NUMERIC(10,8) NOT NULL,
    longitude NUMERIC(11,8) NOT NULL,
    geofence_radius_meters INTEGER NOT NULL,
    is_geofence_enabled BOOLEAN DEFAULT FALSE,
    allow_remote_checkin BOOLEAN DEFAULT FALSE,
    is_headquarters BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT FALSE,
    timezone VARCHAR(50),
    working_days VARCHAR(50)
);

-- okr_check_ins
CREATE TABLE IF NOT EXISTS okr_check_ins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
objective_id UUID,
    key_result_id UUID,
    employee_id UUID NOT NULL,
    check_in_date TIMESTAMPTZ NOT NULL,
    previous_value NUMERIC(19,2),
    new_value NUMERIC(19,2),
    previous_progress NUMERIC(5,2),
    new_progress NUMERIC(5,2),
    confidence_level INTEGER,
    notes TEXT,
    blockers TEXT,
    next_steps TEXT,
    check_in_type VARCHAR(30)
);

-- onboarding_checklist_templates
CREATE TABLE IF NOT EXISTS onboarding_checklist_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
name VARCHAR(255) NOT NULL,
    description TEXT,
    applicable_for VARCHAR(50),
    department_id UUID,
    job_level VARCHAR(255),
    is_active BOOLEAN DEFAULT FALSE,
    is_default BOOLEAN DEFAULT FALSE,
    estimated_days INTEGER
);

-- onboarding_documents
CREATE TABLE IF NOT EXISTS onboarding_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
process_id UUID NOT NULL,
    employee_id UUID NOT NULL,
    document_name VARCHAR(255) NOT NULL,
    document_type VARCHAR(50) NOT NULL,
    is_mandatory BOOLEAN DEFAULT FALSE,
    file_path VARCHAR(255),
    file_name VARCHAR(255),
    file_size BIGINT,
    mime_type VARCHAR(255),
    status VARCHAR(50),
    uploaded_date DATE,
    verified_by UUID,
    verified_date DATE,
    rejection_reason VARCHAR(255),
    expiry_date DATE,
    remarks TEXT
);

-- onboarding_processes
CREATE TABLE IF NOT EXISTS onboarding_processes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
employee_id UUID NOT NULL,
    process_type VARCHAR(20),
    start_date DATE,
    expected_completion_date DATE,
    actual_completion_date DATE,
    status VARCHAR(20),
    assigned_buddy_id UUID,
    completion_percentage INTEGER,
    notes TEXT
);

-- onboarding_tasks
CREATE TABLE IF NOT EXISTS onboarding_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
process_id UUID NOT NULL,
    employee_id UUID NOT NULL,
    task_name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(50),
    assigned_to UUID,
    due_date DATE,
    completed_date DATE,
    status VARCHAR(50),
    priority VARCHAR(50),
    is_mandatory BOOLEAN DEFAULT FALSE,
    order_sequence INTEGER,
    completed_by UUID,
    remarks TEXT,
    dependent_on_task_id UUID
);

-- onboarding_template_tasks
CREATE TABLE IF NOT EXISTS onboarding_template_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
template_id UUID NOT NULL,
    task_name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(50),
    is_mandatory BOOLEAN DEFAULT FALSE,
    order_sequence INTEGER,
    priority VARCHAR(50),
    estimated_days_from_start INTEGER
);

-- one_on_one_meetings
CREATE TABLE IF NOT EXISTS one_on_one_meetings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
manager_id UUID NOT NULL,
    employee_id UUID NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    meeting_date DATE NOT NULL,
    start_time VARCHAR(50) NOT NULL,
    end_time VARCHAR(50),
    duration_minutes INTEGER,
    status VARCHAR(20) NOT NULL,
    meeting_type VARCHAR(30),
    location VARCHAR(200),
    meeting_link VARCHAR(500),
    is_recurring BOOLEAN DEFAULT FALSE,
    recurrence_pattern VARCHAR(20),
    recurrence_end_date DATE,
    parent_meeting_id UUID,
    manager_notes TEXT,
    shared_notes TEXT,
    employee_notes TEXT,
    meeting_summary TEXT,
    reminder_sent BOOLEAN DEFAULT FALSE,
    reminder_minutes_before INTEGER,
    actual_start_time TIMESTAMPTZ,
    actual_end_time TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    cancelled_by UUID,
    cancellation_reason VARCHAR(500),
    rescheduled_from UUID,
    employee_rating INTEGER,
    employee_feedback TEXT
);

-- organization_units
CREATE TABLE IF NOT EXISTS organization_units (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
name VARCHAR(255) NOT NULL,
    code VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    type VARCHAR(50) NOT NULL
);

-- overtime_policies
CREATE TABLE IF NOT EXISTS overtime_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
policy_name VARCHAR(100) NOT NULL,
    policy_code VARCHAR(50) NOT NULL,
    description TEXT,
    department_id UUID,
    is_default BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT FALSE,
    daily_threshold_hours NUMERIC(5,2),
    daily_ot_multiplier NUMERIC(3,2),
    daily_max_ot_hours NUMERIC(5,2),
    weekly_threshold_hours NUMERIC(5,2),
    weekly_ot_multiplier NUMERIC(3,2),
    weekly_max_ot_hours NUMERIC(5,2),
    weekend_ot_multiplier NUMERIC(3,2),
    holiday_ot_multiplier NUMERIC(3,2),
    night_shift_ot_multiplier NUMERIC(3,2),
    requires_pre_approval BOOLEAN DEFAULT FALSE,
    auto_approve_limit_hours NUMERIC(5,2),
    round_to_nearest_minutes INTEGER,
    minimum_ot_minutes INTEGER,
    count_break_time BOOLEAN DEFAULT FALSE,
    comp_time_allowed BOOLEAN DEFAULT FALSE,
    comp_time_multiplier NUMERIC(3,2),
    max_comp_time_balance NUMERIC(5,2),
    comp_time_expiry_days INTEGER,
    double_time_threshold_hours NUMERIC(5,2),
    double_time_multiplier NUMERIC(3,2),
    consecutive_day_threshold INTEGER,
    consecutive_day_multiplier NUMERIC(3,2)
);

-- overtime_rate_tiers
CREATE TABLE IF NOT EXISTS overtime_rate_tiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
policy_id UUID NOT NULL,
    tier_order INTEGER NOT NULL,
    tier_name VARCHAR(255) NOT NULL,
    hours_threshold INTEGER NOT NULL,
    multiplier NUMERIC(19,4) NOT NULL,
    tier_type VARCHAR(50)
);

-- overtime_records
CREATE TABLE IF NOT EXISTS overtime_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
employee_id UUID NOT NULL,
    attendance_record_id UUID,
    overtime_date DATE NOT NULL,
    shift_id UUID,
    regular_hours NUMERIC(5,2) NOT NULL,
    actual_hours NUMERIC(5,2) NOT NULL,
    overtime_hours NUMERIC(5,2) NOT NULL,
    overtime_type VARCHAR(20) NOT NULL,
    multiplier NUMERIC(3,2) NOT NULL,
    effective_hours NUMERIC(5,2) NOT NULL,
    status VARCHAR(20) NOT NULL,
    is_pre_approved BOOLEAN DEFAULT FALSE,
    approved_by UUID,
    approved_at TIMESTAMPTZ,
    rejected_by UUID,
    rejected_at TIMESTAMPTZ,
    rejection_reason TEXT,
    payroll_run_id UUID,
    processed_in_payroll BOOLEAN DEFAULT FALSE,
    processed_at TIMESTAMPTZ,
    notes TEXT,
    auto_calculated BOOLEAN DEFAULT FALSE
);

-- overtime_requests
CREATE TABLE IF NOT EXISTS overtime_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
employee_id UUID NOT NULL,
    policy_id UUID,
    request_number VARCHAR(255) NOT NULL UNIQUE,
    request_type VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL,
    overtime_date DATE NOT NULL,
    reason VARCHAR(255) NOT NULL
);

-- payroll_locations
CREATE TABLE IF NOT EXISTS payroll_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
location_code VARCHAR(255) NOT NULL,
    location_name VARCHAR(255) NOT NULL,
    country_code VARCHAR(2) NOT NULL,
    country_name VARCHAR(255),
    region VARCHAR(255),
    local_currency VARCHAR(3) NOT NULL,
    timezone VARCHAR(255),
    income_tax_applicable BOOLEAN DEFAULT FALSE,
    social_security_applicable BOOLEAN DEFAULT FALSE,
    statutory_bonus_applicable BOOLEAN DEFAULT FALSE,
    base_income_tax_rate NUMERIC(5,2),
    social_security_employee_rate NUMERIC(5,2),
    social_security_employer_rate NUMERIC(5,2),
    pay_frequency VARCHAR(50),
    pay_day INTEGER,
    min_wage NUMERIC(12,2),
    min_wage_unit VARCHAR(255),
    max_working_hours_week INTEGER,
    overtime_multiplier NUMERIC(3,2),
    is_active BOOLEAN DEFAULT FALSE,
    compliance_notes TEXT
);

-- payroll_runs
CREATE TABLE IF NOT EXISTS payroll_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
pay_period_month INTEGER NOT NULL,
    pay_period_year INTEGER NOT NULL,
    payroll_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL,
    total_employees INTEGER,
    processed_by UUID,
    processed_at TIMESTAMPTZ,
    approved_by UUID,
    approved_at TIMESTAMPTZ,
    remarks TEXT
);

-- payslips
CREATE TABLE IF NOT EXISTS payslips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
payroll_run_id UUID NOT NULL,
    employee_id UUID NOT NULL,
    pay_period_month INTEGER NOT NULL,
    pay_period_year INTEGER NOT NULL,
    pay_date DATE NOT NULL,
    basic_salary NUMERIC(12,2) NOT NULL,
    hra NUMERIC(12,2),
    conveyance_allowance NUMERIC(12,2),
    medical_allowance NUMERIC(12,2),
    special_allowance NUMERIC(12,2),
    other_allowances NUMERIC(12,2),
    gross_salary NUMERIC(12,2) NOT NULL,
    provident_fund NUMERIC(12,2),
    professional_tax NUMERIC(12,2),
    income_tax NUMERIC(12,2),
    other_deductions NUMERIC(12,2),
    total_deductions NUMERIC(12,2) NOT NULL,
    net_salary NUMERIC(12,2) NOT NULL,
    working_days INTEGER,
    present_days INTEGER,
    leave_days INTEGER,
    pdf_file_id UUID,
    employee_pf NUMERIC(10,2),
    employer_pf NUMERIC(10,2),
    employee_esi NUMERIC(10,2),
    employer_esi NUMERIC(10,2),
    tds_monthly NUMERIC(10,2),
    statutory_calculated_at TIMESTAMPTZ
);

-- peer_recognitions
CREATE TABLE IF NOT EXISTS peer_recognitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE
);

-- performance_improvement_plans
CREATE TABLE IF NOT EXISTS performance_improvement_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
employee_id UUID NOT NULL,
    manager_id UUID NOT NULL,
    status VARCHAR(20),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    goals TEXT,
    check_in_frequency VARCHAR(20),
    reason TEXT,
    close_notes TEXT
);

-- performance_reviews
CREATE TABLE IF NOT EXISTS performance_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
employee_id UUID NOT NULL,
    reviewer_id UUID NOT NULL,
    review_cycle_id UUID,
    review_type VARCHAR(50),
    review_period_start DATE,
    review_period_end DATE,
    status VARCHAR(50),
    overall_rating NUMERIC(3,2),
    strengths TEXT,
    areas_for_improvement TEXT,
    achievements TEXT,
    goals_for_next_period TEXT,
    manager_comments TEXT,
    employee_comments TEXT,
    self_rating INTEGER,
    manager_rating INTEGER,
    final_rating INTEGER,
    increment_recommendation NUMERIC(5,2),
    promotion_recommended BOOLEAN DEFAULT FALSE,
    overall_comments TEXT,
    goal_achievement_percent INTEGER,
    submitted_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
);

-- pip_check_ins
CREATE TABLE IF NOT EXISTS pip_check_ins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
pip_id UUID NOT NULL,
    check_in_date DATE NOT NULL,
    progress_notes TEXT,
    manager_comments TEXT,
    goal_updates TEXT
);

-- policy_acknowledgments
CREATE TABLE IF NOT EXISTS policy_acknowledgments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
policy_id UUID NOT NULL,
    employee_id UUID NOT NULL,
    policy_version INTEGER NOT NULL,
    digital_signature TEXT,
    CONSTRAINT uc_policy_acknowledgments_policy_id_employee_id UNIQUE (policy_id, employee_id, policy_version)
);

-- poll_options
CREATE TABLE IF NOT EXISTS poll_options (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
post_id UUID NOT NULL,
    option_text VARCHAR(255) NOT NULL,
    display_order INTEGER
);

-- poll_votes
CREATE TABLE IF NOT EXISTS poll_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
poll_option_id UUID NOT NULL,
    employee_id UUID NOT NULL,
    CONSTRAINT uc_poll_votes_tenant_id_poll_option_id UNIQUE (tenant_id, poll_option_id, employee_id)
);

-- positions
CREATE TABLE IF NOT EXISTS positions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
title VARCHAR(255) NOT NULL,
    code VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    level VARCHAR(50),
    job_family VARCHAR(50),
    required_skills TEXT,
    responsibilities TEXT
);

-- post_comments
CREATE TABLE IF NOT EXISTS post_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
post_id UUID NOT NULL,
    author_id UUID NOT NULL,
    content TEXT NOT NULL,
    parent_comment_id UUID,
    likes_count INTEGER
);

-- post_reactions
CREATE TABLE IF NOT EXISTS post_reactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
post_id UUID,
    comment_id UUID,
    employee_id UUID NOT NULL,
    reaction_type VARCHAR(50) NOT NULL
);

-- preboarding_candidates
CREATE TABLE IF NOT EXISTS preboarding_candidates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100),
    email VARCHAR(200) NOT NULL,
    phone_number VARCHAR(20),
    expected_joining_date DATE NOT NULL,
    designation VARCHAR(100),
    department_id UUID,
    reporting_manager_id UUID,
    access_token VARCHAR(255) NOT NULL UNIQUE,
    token_expires_at TIMESTAMPTZ,
    status VARCHAR(20) NOT NULL,
    completion_percentage INTEGER,
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(100),
    emergency_contact_number VARCHAR(20),
    emergency_contact_name VARCHAR(100),
    bank_account_number VARCHAR(100),
    bank_name VARCHAR(100),
    bank_ifsc_code VARCHAR(50),
    tax_id VARCHAR(50),
    photo_uploaded BOOLEAN DEFAULT FALSE,
    id_proof_uploaded BOOLEAN DEFAULT FALSE,
    address_proof_uploaded BOOLEAN DEFAULT FALSE,
    education_docs_uploaded BOOLEAN DEFAULT FALSE,
    offer_letter_signed BOOLEAN DEFAULT FALSE,
    employee_id UUID
);

-- probation_evaluations
CREATE TABLE IF NOT EXISTS probation_evaluations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
probation_period_id UUID NOT NULL,
    evaluation_date DATE NOT NULL,
    evaluator_id UUID NOT NULL,
    evaluation_type VARCHAR(50) NOT NULL,
    performance_rating DOUBLE PRECISION,
    attendance_rating DOUBLE PRECISION,
    communication_rating DOUBLE PRECISION,
    teamwork_rating DOUBLE PRECISION,
    technical_skills_rating DOUBLE PRECISION,
    overall_rating DOUBLE PRECISION,
    strengths VARCHAR(2000),
    areas_for_improvement VARCHAR(2000),
    goals_for_next_period VARCHAR(2000),
    manager_comments VARCHAR(2000),
    employee_comments VARCHAR(2000),
    recommendation VARCHAR(50) NOT NULL,
    recommendation_reason VARCHAR(1000),
    is_final_evaluation BOOLEAN DEFAULT FALSE,
    employee_acknowledged BOOLEAN DEFAULT FALSE,
    acknowledged_date DATE
);

-- probation_periods
CREATE TABLE IF NOT EXISTS probation_periods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
employee_id UUID NOT NULL,
    start_date DATE NOT NULL,
    original_end_date DATE NOT NULL,
    end_date DATE NOT NULL,
    duration_months INTEGER NOT NULL,
    status VARCHAR(50) NOT NULL,
    extension_count INTEGER,
    total_extension_days INTEGER,
    confirmation_date DATE,
    termination_date DATE,
    final_rating DOUBLE PRECISION,
    manager_id UUID,
    hr_id UUID,
    notes VARCHAR(2000),
    confirmation_letter_id UUID,
    termination_reason VARCHAR(1000),
    next_evaluation_date DATE,
    evaluation_frequency_days INTEGER
);

-- professional_tax_slabs
CREATE TABLE IF NOT EXISTS professional_tax_slabs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
state_code VARCHAR(5) NOT NULL,
    effective_from DATE NOT NULL,
    effective_to DATE,
    min_salary NUMERIC(10,2) NOT NULL,
    max_salary NUMERIC(10,2),
    tax_amount NUMERIC(10,2) NOT NULL,
    deduction_month INTEGER,
    is_active BOOLEAN NOT NULL DEFAULT FALSE
);

-- profile_update_requests
CREATE TABLE IF NOT EXISTS profile_update_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
employee_id UUID NOT NULL,
    category VARCHAR(50) NOT NULL,
    field_name VARCHAR(255) NOT NULL,
    current_value TEXT,
    requested_value TEXT,
    reason TEXT,
    supporting_document_url TEXT,
    status VARCHAR(50) NOT NULL,
    review_comments TEXT,
    rejection_reason TEXT
);

-- project_employees
CREATE TABLE IF NOT EXISTS project_employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
project_id UUID NOT NULL,
    employee_id UUID NOT NULL,
    role VARCHAR(100),
    allocation_percentage INTEGER,
    start_date DATE NOT NULL,
    end_date DATE,
    is_active BOOLEAN NOT NULL DEFAULT FALSE
);

-- project_members
CREATE TABLE IF NOT EXISTS project_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
project_id UUID NOT NULL,
    employee_id UUID NOT NULL,
    role VARCHAR(30) NOT NULL,
    allocation_percentage NUMERIC(5,2),
    billing_rate NUMERIC(10,2),
    cost_rate NUMERIC(10,2),
    start_date DATE NOT NULL,
    end_date DATE,
    is_active BOOLEAN NOT NULL DEFAULT FALSE,
    can_approve_time BOOLEAN NOT NULL DEFAULT FALSE,
    notes TEXT
);

-- project_time_entries
CREATE TABLE IF NOT EXISTS project_time_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
project_id UUID NOT NULL,
    employee_id UUID NOT NULL,
    work_date DATE NOT NULL,
    hours_worked NUMERIC(5,2) NOT NULL,
    description TEXT,
    task_name VARCHAR(200),
    entry_type VARCHAR(20) NOT NULL,
    is_billable BOOLEAN NOT NULL DEFAULT FALSE,
    billing_rate NUMERIC(10,2),
    billed_amount NUMERIC(15,2),
    status VARCHAR(20) NOT NULL,
    approved_by UUID,
    approved_at TIMESTAMPTZ,
    submitted_at TIMESTAMPTZ,
    rejected_reason TEXT
);

-- projects
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
project_code VARCHAR(50) NOT NULL,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    start_date DATE NOT NULL,
    end_date DATE,
    expected_end_date DATE,
    status VARCHAR(20) NOT NULL,
    priority VARCHAR(20) NOT NULL,
    project_manager_id UUID,
    client_name VARCHAR(200),
    budget NUMERIC(15,2),
    currency VARCHAR(3)
);

-- provident_fund_configs
CREATE TABLE IF NOT EXISTS provident_fund_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
effective_from DATE NOT NULL,
    effective_to DATE,
    employee_contribution_percentage NUMERIC(5,2) NOT NULL,
    employer_contribution_percentage NUMERIC(5,2) NOT NULL,
    eps_contribution_percentage NUMERIC(5,2),
    wage_ceiling NUMERIC(10,2),
    is_vpf_allowed BOOLEAN DEFAULT FALSE,
    max_vpf_percentage NUMERIC(5,2),
    is_active BOOLEAN NOT NULL DEFAULT FALSE
);

-- psa_invoices
CREATE TABLE IF NOT EXISTS psa_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
invoice_number VARCHAR(50) NOT NULL UNIQUE,
    project_id UUID NOT NULL,
    client_id UUID NOT NULL,
    invoice_date DATE NOT NULL,
    due_date DATE,
    billing_period_start DATE NOT NULL,
    billing_period_end DATE NOT NULL,
    total_hours DOUBLE PRECISION,
    billable_amount NUMERIC(15,2) NOT NULL,
    tax_amount NUMERIC(15,2),
    total_amount NUMERIC(15,2) NOT NULL,
    status VARCHAR(30) NOT NULL,
    paid_at TIMESTAMPTZ,
    notes TEXT
);

-- psa_project_allocations
CREATE TABLE IF NOT EXISTS psa_project_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
project_id UUID NOT NULL,
    employee_id UUID NOT NULL,
    role_name VARCHAR(100),
    allocation_percentage INTEGER,
    start_date DATE NOT NULL,
    end_date DATE,
    billing_rate NUMERIC(10,2),
    is_active BOOLEAN NOT NULL DEFAULT FALSE
);

-- psa_projects
CREATE TABLE IF NOT EXISTS psa_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
project_code VARCHAR(50) NOT NULL UNIQUE,
    project_name VARCHAR(200) NOT NULL,
    client_id UUID,
    project_manager_id UUID,
    start_date DATE,
    end_date DATE,
    billing_type VARCHAR(30) NOT NULL,
    billing_rate NUMERIC(10,2),
    budget NUMERIC(15,2),
    is_billable BOOLEAN NOT NULL DEFAULT FALSE,
    status VARCHAR(30) NOT NULL,
    description TEXT
);

-- psa_time_entries
CREATE TABLE IF NOT EXISTS psa_time_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
timesheet_id UUID NOT NULL,
    employee_id UUID NOT NULL,
    project_id UUID NOT NULL,
    task_id UUID,
    entry_date DATE NOT NULL,
    hours DOUBLE PRECISION NOT NULL,
    is_billable BOOLEAN NOT NULL DEFAULT FALSE,
    work_description TEXT,
    activity_type VARCHAR(50),
    is_overtime BOOLEAN DEFAULT FALSE
);

-- psa_timesheets
CREATE TABLE IF NOT EXISTS psa_timesheets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
employee_id UUID NOT NULL,
    week_start_date DATE NOT NULL,
    week_end_date DATE NOT NULL,
    total_hours DOUBLE PRECISION NOT NULL,
    billable_hours DOUBLE PRECISION,
    non_billable_hours DOUBLE PRECISION,
    status VARCHAR(30) NOT NULL,
    submitted_at TIMESTAMPTZ,
    approved_at TIMESTAMPTZ,
    approved_by UUID,
    rejection_reason TEXT
);

-- pulse_survey_answers
CREATE TABLE IF NOT EXISTS pulse_survey_answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
survey_id UUID NOT NULL,
    response_id UUID NOT NULL,
    question_id UUID NOT NULL,
    numeric_value INTEGER,
    text_value TEXT,
    selected_options TEXT,
    boolean_value BOOLEAN DEFAULT FALSE,
    is_skipped BOOLEAN DEFAULT FALSE
);

-- pulse_survey_questions
CREATE TABLE IF NOT EXISTS pulse_survey_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
survey_id UUID NOT NULL,
    question_text TEXT NOT NULL,
    question_type VARCHAR(30) NOT NULL,
    question_order INTEGER NOT NULL,
    is_required BOOLEAN DEFAULT FALSE,
    options TEXT,
    min_value INTEGER,
    max_value INTEGER,
    min_label VARCHAR(100),
    max_label VARCHAR(100),
    category VARCHAR(30),
    help_text VARCHAR(500),
    is_active BOOLEAN DEFAULT FALSE
);

-- pulse_survey_responses
CREATE TABLE IF NOT EXISTS pulse_survey_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
survey_id UUID NOT NULL,
    employee_id UUID,
    status VARCHAR(20) NOT NULL,
    started_at TIMESTAMPTZ,
    submitted_at TIMESTAMPTZ,
    time_spent_seconds INTEGER,
    overall_score DOUBLE PRECISION,
    device_type VARCHAR(30),
    browser VARCHAR(100),
    ip_address VARCHAR(50),
    CONSTRAINT uc_pulse_survey_responses_survey_id_employee_id UNIQUE (survey_id, employee_id)
);

-- pulse_surveys
CREATE TABLE IF NOT EXISTS pulse_surveys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
title VARCHAR(200) NOT NULL,
    description TEXT,
    status VARCHAR(20) NOT NULL,
    survey_type VARCHAR(30) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_anonymous BOOLEAN DEFAULT FALSE,
    is_mandatory BOOLEAN DEFAULT FALSE,
    frequency VARCHAR(20),
    next_occurrence_date DATE,
    target_departments TEXT,
    target_locations TEXT,
    reminder_enabled BOOLEAN DEFAULT FALSE,
    reminder_days_before INTEGER,
    total_questions INTEGER,
    total_responses INTEGER,
    total_invited INTEGER,
    average_score DOUBLE PRECISION,
    published_at TIMESTAMPTZ,
    published_by UUID,
    closed_at TIMESTAMPTZ,
    closed_by UUID
);

-- recognition_badges
CREATE TABLE IF NOT EXISTS recognition_badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
badge_name VARCHAR(255) NOT NULL,
    code VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    icon_url VARCHAR(500),
    level VARCHAR(50),
    category VARCHAR(50)
);

-- recognition_reactions
CREATE TABLE IF NOT EXISTS recognition_reactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
recognition_id UUID NOT NULL,
    employee_id UUID NOT NULL,
    reaction_type VARCHAR(50) NOT NULL,
    CONSTRAINT uc_recognition_reactions_recognition_id_employee_id UNIQUE (recognition_id, employee_id, reaction_type)
);

-- recognitions
CREATE TABLE IF NOT EXISTS recognitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
giver_id UUID NOT NULL,
    receiver_id UUID NOT NULL,
    type VARCHAR(50) NOT NULL,
    category VARCHAR(50),
    title VARCHAR(255) NOT NULL,
    message TEXT
);

-- referral_policies
CREATE TABLE IF NOT EXISTS referral_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
name VARCHAR(255) NOT NULL,
    description TEXT,
    applicable_for VARCHAR(50),
    department_id UUID,
    job_level VARCHAR(255),
    base_bonus_amount NUMERIC(12,2),
    joining_bonus_percentage NUMERIC(5,2),
    retention_bonus_percentage NUMERIC(5,2),
    retention_period_months INTEGER,
    min_service_months INTEGER,
    probation_eligible BOOLEAN DEFAULT FALSE,
    max_referrals_per_month INTEGER,
    self_referral_allowed BOOLEAN DEFAULT FALSE,
    same_department_allowed BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT FALSE,
    effective_from VARCHAR(50),
    effective_to VARCHAR(50)
);

-- report_definitions
CREATE TABLE IF NOT EXISTS report_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
report_code VARCHAR(50) NOT NULL UNIQUE,
    report_name VARCHAR(200) NOT NULL,
    category VARCHAR(50) NOT NULL,
    description TEXT,
    query_template TEXT,
    parameters TEXT,
    output_format VARCHAR(20),
    is_system_report BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT FALSE,
    access_level VARCHAR(30)
);

-- report_executions
CREATE TABLE IF NOT EXISTS report_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
report_definition_id UUID NOT NULL,
    scheduled_report_id UUID,
    executed_by UUID,
    execution_type VARCHAR(20) NOT NULL,
    parameters TEXT,
    status VARCHAR(20) NOT NULL,
    file_path VARCHAR(255),
    file_size BIGINT,
    row_count INTEGER,
    execution_time_ms BIGINT,
    error_message TEXT,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- report_templates
CREATE TABLE IF NOT EXISTS report_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
name VARCHAR(100) NOT NULL,
    description VARCHAR(500),
    module VARCHAR(50) NOT NULL,
    selected_columns TEXT NOT NULL,
    filters TEXT,
    sort_by VARCHAR(50),
    sort_direction VARCHAR(4)
);

-- resume_parsing_results
CREATE TABLE IF NOT EXISTS resume_parsing_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
candidate_id UUID,
    job_application_id UUID,
    file_path VARCHAR(500),
    parsed_data TEXT,
    full_name VARCHAR(200),
    email VARCHAR(200),
    phone VARCHAR(50),
    total_experience_years INTEGER,
    skills TEXT,
    education TEXT,
    work_experience TEXT,
    certifications TEXT,
    confidence_score DOUBLE PRECISION,
    parsing_model VARCHAR(100)
);

-- review_competencies
CREATE TABLE IF NOT EXISTS review_competencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
review_id UUID NOT NULL,
    competency_name VARCHAR(200) NOT NULL,
    category VARCHAR(100),
    rating NUMERIC(3,2),
    comments TEXT
);

-- review_cycles
CREATE TABLE IF NOT EXISTS review_cycles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
cycle_name VARCHAR(200) NOT NULL,
    cycle_type VARCHAR(50),
    self_review_deadline DATE,
    manager_review_deadline DATE,
    status VARCHAR(50),
    description TEXT
);

-- role_permissions
CREATE TABLE IF NOT EXISTS role_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
role_id UUID NOT NULL,
    permission_id UUID NOT NULL,
    scope VARCHAR(20) NOT NULL
);

-- roster_entries
CREATE TABLE IF NOT EXISTS roster_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
roster_id UUID NOT NULL,
    employee_id UUID NOT NULL,
    shift_id UUID NOT NULL,
    work_date DATE NOT NULL,
    day_type VARCHAR(50),
    is_overtime BOOLEAN DEFAULT FALSE,
    notes VARCHAR(255),
    is_published BOOLEAN DEFAULT FALSE,
    is_acknowledged BOOLEAN DEFAULT FALSE,
    acknowledged_date DATE
);

-- rosters
CREATE TABLE IF NOT EXISTS rosters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
name VARCHAR(255) NOT NULL,
    department_id UUID,
    team_id UUID,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(50),
    pattern_type VARCHAR(50),
    published_by UUID,
    published_date DATE,
    notes TEXT,
    is_recurring BOOLEAN DEFAULT FALSE,
    recurrence_weeks INTEGER
);

-- salary_revisions
CREATE TABLE IF NOT EXISTS salary_revisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
employee_id UUID NOT NULL,
    review_cycle_id UUID,
    revision_type VARCHAR(50) NOT NULL,
    previous_salary NUMERIC(12,2) NOT NULL,
    new_salary NUMERIC(12,2) NOT NULL,
    increment_amount NUMERIC(12,2),
    increment_percentage NUMERIC(5,2),
    previous_designation VARCHAR(100),
    new_designation VARCHAR(100),
    previous_level VARCHAR(50),
    new_level VARCHAR(50),
    effective_date DATE NOT NULL,
    status VARCHAR(50) NOT NULL,
    justification VARCHAR(2000),
    performance_rating DOUBLE PRECISION,
    proposed_by UUID,
    proposed_date DATE,
    reviewed_by UUID,
    reviewed_date DATE,
    reviewer_comments VARCHAR(1000),
    approved_by UUID,
    approved_date DATE,
    approver_comments VARCHAR(1000),
    rejection_reason VARCHAR(1000),
    letter_generated BOOLEAN DEFAULT FALSE,
    letter_id UUID,
    payroll_processed BOOLEAN DEFAULT FALSE,
    currency VARCHAR(3)
);

-- salary_structures
CREATE TABLE IF NOT EXISTS salary_structures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
employee_id UUID NOT NULL,
    effective_date DATE NOT NULL,
    end_date DATE,
    basic_salary NUMERIC(12,2) NOT NULL,
    hra NUMERIC(12,2),
    conveyance_allowance NUMERIC(12,2),
    medical_allowance NUMERIC(12,2),
    special_allowance NUMERIC(12,2),
    other_allowances NUMERIC(12,2),
    provident_fund NUMERIC(12,2),
    professional_tax NUMERIC(12,2),
    income_tax NUMERIC(12,2),
    other_deductions NUMERIC(12,2),
    is_active BOOLEAN NOT NULL DEFAULT FALSE
);

-- scheduled_reports
CREATE TABLE IF NOT EXISTS scheduled_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
report_definition_id UUID NOT NULL,
    schedule_name VARCHAR(200) NOT NULL,
    frequency VARCHAR(20) NOT NULL,
    day_of_week INTEGER,
    day_of_month INTEGER,
    time_of_day VARCHAR(50),
    recipients TEXT,
    parameters TEXT,
    is_active BOOLEAN NOT NULL DEFAULT FALSE,
    last_run_at TIMESTAMPTZ,
    next_run_at TIMESTAMPTZ
);

-- sentiment_analysis
CREATE TABLE IF NOT EXISTS sentiment_analysis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
source_type VARCHAR(50) NOT NULL,
    source_id UUID NOT NULL,
    text_content TEXT,
    sentiment VARCHAR(20) NOT NULL,
    sentiment_score DOUBLE PRECISION,
    confidence_score DOUBLE PRECISION,
    emotions TEXT,
    key_phrases TEXT,
    topics TEXT,
    ai_model_version VARCHAR(50)
);

-- shift_assignments
CREATE TABLE IF NOT EXISTS shift_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
employee_id UUID NOT NULL,
    shift_id UUID NOT NULL,
    assignment_date DATE NOT NULL,
    effective_from DATE NOT NULL,
    effective_to DATE,
    assignment_type VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL,
    is_recurring BOOLEAN DEFAULT FALSE,
    recurrence_pattern VARCHAR(50),
    assigned_by UUID,
    notes TEXT
);

-- shift_swap_requests
CREATE TABLE IF NOT EXISTS shift_swap_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
requester_employee_id UUID NOT NULL,
    requester_assignment_id UUID NOT NULL,
    requester_shift_date DATE NOT NULL,
    target_employee_id UUID,
    target_assignment_id UUID,
    target_shift_date DATE,
    swap_type VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL,
    reason TEXT,
    requested_at TIMESTAMPTZ NOT NULL,
    target_employee_response TIMESTAMPTZ,
    target_employee_action VARCHAR(20),
    approver_id UUID,
    approved_at TIMESTAMPTZ,
    rejected_at TIMESTAMPTZ,
    rejection_reason TEXT,
    completed_at TIMESTAMPTZ
);

-- shifts
CREATE TABLE IF NOT EXISTS shifts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
shift_code VARCHAR(50) NOT NULL,
    shift_name VARCHAR(100) NOT NULL,
    description TEXT,
    start_time VARCHAR(50) NOT NULL,
    end_time VARCHAR(50) NOT NULL,
    grace_period_in_minutes INTEGER,
    late_mark_after_minutes INTEGER,
    half_day_after_minutes INTEGER,
    full_day_hours NUMERIC(4,2),
    break_duration_minutes INTEGER,
    is_night_shift BOOLEAN DEFAULT FALSE,
    working_days VARCHAR(50) NOT NULL,
    is_active BOOLEAN DEFAULT FALSE,
    shift_type VARCHAR(20),
    color_code VARCHAR(7),
    allows_overtime BOOLEAN DEFAULT FALSE,
    overtime_multiplier NUMERIC(3,2)
);

-- signature_approvals
CREATE TABLE IF NOT EXISTS signature_approvals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
signature_request_id UUID NOT NULL,
    signer_id UUID,
    signer_email VARCHAR(255) NOT NULL,
    signer_role VARCHAR(100),
    signing_order INTEGER,
    status VARCHAR(50) NOT NULL,
    is_required BOOLEAN DEFAULT FALSE,
    signed_at TIMESTAMPTZ,
    signature_ip VARCHAR(45),
    signature_device VARCHAR(255),
    signature_method VARCHAR(50),
    signature_data TEXT,
    declined_at TIMESTAMPTZ,
    decline_reason TEXT,
    sent_at TIMESTAMPTZ,
    viewed_at TIMESTAMPTZ,
    reminder_count INTEGER,
    last_reminded_at TIMESTAMPTZ,
    comments TEXT,
    authentication_token VARCHAR(500),
    token_expires_at TIMESTAMPTZ
);

-- signature_requests
CREATE TABLE IF NOT EXISTS signature_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
title VARCHAR(500) NOT NULL,
    description TEXT,
    document_type VARCHAR(100) NOT NULL,
    document_url VARCHAR(1000),
    document_name VARCHAR(500),
    document_size BIGINT,
    mime_type VARCHAR(100),
    status VARCHAR(50) NOT NULL,
    required_signatures INTEGER,
    received_signatures INTEGER,
    signature_order BOOLEAN NOT NULL DEFAULT FALSE,
    expires_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    cancelled_by UUID,
    cancellation_reason TEXT,
    reminder_frequency_days INTEGER,
    last_reminder_sent_at TIMESTAMPTZ,
    is_template BOOLEAN DEFAULT FALSE,
    template_name VARCHAR(255),
    metadata TEXT
);

-- skill_gaps
CREATE TABLE IF NOT EXISTS skill_gaps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
skill_name VARCHAR(255) NOT NULL,
    skill_category VARCHAR(255),
    department_id UUID,
    department_name VARCHAR(255),
    job_family VARCHAR(255),
    current_supply INTEGER,
    required_supply INTEGER,
    gap_count INTEGER,
    gap_severity NUMERIC(5,2),
    avg_proficiency_level NUMERIC(3,1),
    required_proficiency_level NUMERIC(3,1),
    proficiency_gap NUMERIC(3,1),
    projected_demand_growth NUMERIC(5,2),
    projection_date DATE,
    estimated_retirement_loss INTEGER,
    estimated_attrition_loss INTEGER,
    resolution_strategy VARCHAR(50),
    training_available BOOLEAN DEFAULT FALSE,
    estimated_training_cost NUMERIC(12,2),
    estimated_hiring_cost NUMERIC(12,2),
    time_to_close_months INTEGER,
    priority VARCHAR(50),
    analysis_date DATE NOT NULL
);

-- smart_recommendations
CREATE TABLE IF NOT EXISTS smart_recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
target_type VARCHAR(50) NOT NULL,
    target_id UUID NOT NULL,
    recommendation_type VARCHAR(50) NOT NULL,
    recommendation_data TEXT,
    confidence_score DOUBLE PRECISION,
    priority VARCHAR(20),
    is_acted_upon BOOLEAN DEFAULT FALSE,
    action_taken TEXT,
    was_useful BOOLEAN DEFAULT FALSE,
    ai_model_version VARCHAR(50),
    expires_at TIMESTAMPTZ
);

-- social_posts
CREATE TABLE IF NOT EXISTS social_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
post_type VARCHAR(50) NOT NULL,
    content TEXT,
    author_id UUID NOT NULL,
    celebrated_employee_id UUID,
    media_urls TEXT,
    is_pinned BOOLEAN DEFAULT FALSE,
    visibility VARCHAR(20),
    celebration_type VARCHAR(50),
    achievement_title VARCHAR(500),
    likes_count INTEGER,
    comments_count INTEGER
);

-- step_executions
CREATE TABLE IF NOT EXISTS step_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
workflow_execution_id UUID NOT NULL,
    approval_step_id UUID NOT NULL,
    status VARCHAR(50) NOT NULL,
    action VARCHAR(50),
    comments TEXT,
    attachments_json TEXT
);

-- succession_candidates
CREATE TABLE IF NOT EXISTS succession_candidates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
succession_plan_id UUID NOT NULL,
    candidate_id UUID NOT NULL,
    readiness VARCHAR(50) NOT NULL,
    performance_rating VARCHAR(50),
    potential_rating VARCHAR(50),
    development_needs TEXT,
    development_plan TEXT,
    strengths TEXT,
    gaps TEXT,
    notes TEXT,
    CONSTRAINT uc_succession_candidates_succession_plan_id_candidate_id UNIQUE (succession_plan_id, candidate_id)
);

-- succession_plans
CREATE TABLE IF NOT EXISTS succession_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
position_id UUID NOT NULL,
    status VARCHAR(50),
    risk_level VARCHAR(50),
    notes TEXT
);

-- survey_answers
CREATE TABLE IF NOT EXISTS survey_answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
response_id UUID NOT NULL,
    question_id UUID NOT NULL,
    text_answer TEXT,
    sentiment_level VARCHAR(50)
);

-- survey_insights
CREATE TABLE IF NOT EXISTS survey_insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
survey_id UUID,
    insight_type VARCHAR(50) NOT NULL,
    priority VARCHAR(50) NOT NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT NOT NULL,
    recommendation TEXT,
    category VARCHAR(50),
    trend VARCHAR(50),
    action_status VARCHAR(50)
);

-- survey_questions
CREATE TABLE IF NOT EXISTS survey_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
survey_id UUID NOT NULL,
    question_order INTEGER NOT NULL,
    question_text TEXT NOT NULL,
    question_type VARCHAR(50) NOT NULL,
    options TEXT,
    is_required BOOLEAN NOT NULL DEFAULT FALSE,
    engagement_category VARCHAR(50)
);

-- survey_responses
CREATE TABLE IF NOT EXISTS survey_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
survey_id UUID NOT NULL,
    status VARCHAR(50) NOT NULL,
    overall_sentiment VARCHAR(50)
);

-- surveys
CREATE TABLE IF NOT EXISTS surveys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
survey_code VARCHAR(50) NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    survey_type VARCHAR(50),
    is_anonymous BOOLEAN DEFAULT FALSE,
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    status VARCHAR(20),
    target_audience VARCHAR(50),
    total_responses INTEGER
);

-- talent_pool_members
CREATE TABLE IF NOT EXISTS talent_pool_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
talent_pool_id UUID NOT NULL,
    employee_id UUID NOT NULL,
    status VARCHAR(50),
    notes TEXT,
    CONSTRAINT uc_talent_pool_members_talent_pool_id_employee_id UNIQUE (talent_pool_id, employee_id)
);

-- talent_pools
CREATE TABLE IF NOT EXISTS talent_pools (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
name VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(50),
    criteria TEXT
);

-- tax_declarations
CREATE TABLE IF NOT EXISTS tax_declarations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
employee_id UUID NOT NULL,
    financial_year VARCHAR(10) NOT NULL,
    tax_regime VARCHAR(20) NOT NULL,
    status VARCHAR(50) NOT NULL,
    sec_80c_ppf NUMERIC(15,2),
    sec_80c_epf NUMERIC(15,2),
    sec_80c_life_insurance NUMERIC(15,2),
    sec_80c_elss NUMERIC(15,2),
    sec_80c_nsc NUMERIC(15,2),
    sec_80c_home_loan_principal NUMERIC(15,2),
    sec_80c_tuition_fees NUMERIC(15,2),
    sec_80c_sukanya_samriddhi NUMERIC(15,2),
    sec_80c_nps_employee NUMERIC(15,2),
    sec_80c_total NUMERIC(15,2),
    sec_80ccd_1b_nps_additional NUMERIC(15,2),
    sec_80d_self_family NUMERIC(15,2),
    sec_80d_parents NUMERIC(15,2),
    sec_80d_preventive_health NUMERIC(15,2),
    sec_80d_total NUMERIC(15,2),
    sec_80e_education_loan NUMERIC(15,2),
    sec_80g_donations NUMERIC(15,2),
    sec_80gg_rent_paid NUMERIC(15,2),
    sec_24_home_loan_interest NUMERIC(15,2),
    hra_metro_city BOOLEAN DEFAULT FALSE,
    hra_rent_paid NUMERIC(15,2),
    hra_exemption NUMERIC(15,2),
    other_income_interest NUMERIC(15,2),
    other_income_rental NUMERIC(15,2),
    other_income_capital_gains NUMERIC(15,2),
    other_income_total NUMERIC(15,2),
    previous_employer_name VARCHAR(255),
    previous_employer_pan VARCHAR(10),
    previous_employer_income NUMERIC(15,2),
    previous_employer_tax NUMERIC(15,2),
    total_deductions NUMERIC(15,2),
    taxable_income NUMERIC(15,2),
    estimated_tax NUMERIC(15,2),
    submitted_at TIMESTAMPTZ,
    approved_by UUID,
    approved_at TIMESTAMPTZ,
    rejected_by UUID,
    rejected_at TIMESTAMPTZ,
    rejection_reason TEXT,
    locked_at TIMESTAMPTZ,
    notes TEXT
);

-- tax_proofs
CREATE TABLE IF NOT EXISTS tax_proofs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
tax_declaration_id UUID NOT NULL,
    employee_id UUID NOT NULL,
    proof_type VARCHAR(100) NOT NULL,
    investment_section VARCHAR(50),
    proof_description VARCHAR(500),
    declared_amount NUMERIC(15,2),
    approved_amount NUMERIC(15,2),
    document_name VARCHAR(500),
    document_url VARCHAR(1000),
    document_type VARCHAR(50),
    document_size BIGINT,
    issuer_name VARCHAR(255),
    policy_number VARCHAR(100),
    certificate_number VARCHAR(100),
    start_date DATE,
    end_date DATE,
    status VARCHAR(50) NOT NULL,
    submitted_at TIMESTAMPTZ,
    verified_by UUID,
    verified_at TIMESTAMPTZ,
    verification_notes TEXT,
    rejected_by UUID,
    rejected_at TIMESTAMPTZ,
    rejection_reason TEXT
);

-- tax_regime_comparisons
CREATE TABLE IF NOT EXISTS tax_regime_comparisons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
employee_id UUID NOT NULL,
    financial_year VARCHAR(10) NOT NULL,
    gross_salary NUMERIC(15,2),
    standard_deduction NUMERIC(15,2),
    old_regime_total_deductions NUMERIC(15,2),
    old_regime_taxable_income NUMERIC(15,2),
    old_regime_tax NUMERIC(15,2),
    old_regime_cess NUMERIC(15,2),
    old_regime_total_tax NUMERIC(15,2),
    new_regime_taxable_income NUMERIC(15,2),
    new_regime_tax NUMERIC(15,2),
    new_regime_cess NUMERIC(15,2),
    new_regime_rebate NUMERIC(15,2),
    new_regime_total_tax NUMERIC(15,2),
    tax_savings NUMERIC(15,2),
    recommended_regime VARCHAR(20),
    selected_regime VARCHAR(20),
    calculation_details TEXT
);

-- tds_slabs
CREATE TABLE IF NOT EXISTS tds_slabs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
assessment_year VARCHAR(10) NOT NULL,
    tax_regime VARCHAR(20) NOT NULL,
    min_income NUMERIC(12,2) NOT NULL,
    max_income NUMERIC(12,2),
    tax_percentage NUMERIC(5,2) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT FALSE
);

-- tenant_applications
CREATE TABLE IF NOT EXISTS tenant_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
application_id UUID NOT NULL,
    status VARCHAR(20) NOT NULL,
    activated_at TIMESTAMPTZ,
    expires_at DATE,
    subscription_tier VARCHAR(50),
    max_users INTEGER,
    configuration TEXT,
    CONSTRAINT uc_tenant_applications_tenantId_application_id UNIQUE (tenant_id, application_id)
);

-- ticket_categories
CREATE TABLE IF NOT EXISTS ticket_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
name VARCHAR(100) NOT NULL,
    code VARCHAR(50),
    description VARCHAR(500),
    parent_category_id UUID,
    department_type VARCHAR(30),
    default_assignee_id UUID,
    default_assignee_role VARCHAR(100),
    sla_id UUID,
    sla_hours INTEGER,
    icon VARCHAR(50),
    color VARCHAR(20),
    is_active BOOLEAN NOT NULL DEFAULT FALSE,
    requires_approval BOOLEAN DEFAULT FALSE,
    approval_workflow_id UUID,
    auto_close_after_days INTEGER,
    display_order INTEGER,
    is_visible_to_employees BOOLEAN DEFAULT FALSE
);

-- ticket_comments
CREATE TABLE IF NOT EXISTS ticket_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
ticket_id UUID NOT NULL,
    commenter_id UUID NOT NULL,
    comment TEXT NOT NULL,
    is_internal BOOLEAN NOT NULL DEFAULT FALSE,
    attachment_urls TEXT
);

-- ticket_escalations
CREATE TABLE IF NOT EXISTS ticket_escalations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
ticket_id UUID NOT NULL,
    escalation_level VARCHAR(20),
    escalation_reason VARCHAR(30),
    escalated_from UUID,
    escalated_to UUID NOT NULL,
    escalated_at TIMESTAMPTZ NOT NULL,
    is_auto_escalated BOOLEAN DEFAULT FALSE,
    notes TEXT,
    acknowledged_at TIMESTAMPTZ,
    acknowledged_by UUID
);

-- ticket_metrics
CREATE TABLE IF NOT EXISTS ticket_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
ticket_id UUID NOT NULL UNIQUE,
    sla_id UUID,
    first_response_at TIMESTAMPTZ,
    first_response_minutes INTEGER,
    first_response_sla_breached BOOLEAN DEFAULT FALSE,
    resolution_at TIMESTAMPTZ,
    resolution_minutes INTEGER,
    resolution_sla_breached BOOLEAN DEFAULT FALSE,
    total_handle_time_minutes INTEGER,
    total_wait_time_minutes INTEGER,
    reopen_count INTEGER,
    reassignment_count INTEGER,
    escalation_count INTEGER,
    comment_count INTEGER,
    csat_rating INTEGER,
    csat_feedback TEXT,
    csat_submitted_at TIMESTAMPTZ,
    first_contact_resolution BOOLEAN DEFAULT FALSE,
    sla_met BOOLEAN DEFAULT FALSE
);

-- ticket_slas
CREATE TABLE IF NOT EXISTS ticket_slas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
name VARCHAR(100) NOT NULL,
    description TEXT,
    category_id UUID,
    priority VARCHAR(20),
    first_response_minutes INTEGER NOT NULL,
    resolution_minutes INTEGER NOT NULL,
    escalation_after_minutes INTEGER,
    escalation_to UUID,
    second_escalation_minutes INTEGER,
    second_escalation_to UUID,
    is_business_hours_only BOOLEAN DEFAULT FALSE,
    business_start_hour INTEGER,
    business_end_hour INTEGER,
    working_days VARCHAR(50),
    is_active BOOLEAN DEFAULT FALSE,
    apply_to_all_categories BOOLEAN DEFAULT FALSE
);

-- tickets
CREATE TABLE IF NOT EXISTS tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
ticket_number VARCHAR(50) NOT NULL,
    employee_id UUID NOT NULL,
    category_id UUID,
    subject VARCHAR(500) NOT NULL,
    description TEXT,
    priority VARCHAR(20) NOT NULL,
    status VARCHAR(30) NOT NULL,
    assigned_to UUID,
    assigned_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,
    closed_at TIMESTAMPTZ,
    resolution_notes TEXT,
    due_date TIMESTAMPTZ,
    tags VARCHAR(500),
    attachment_urls TEXT,
    sla_id UUID,
    first_response_due TIMESTAMPTZ,
    first_response_at TIMESTAMPTZ,
    first_response_breached BOOLEAN DEFAULT FALSE,
    resolution_due TIMESTAMPTZ,
    resolution_breached BOOLEAN DEFAULT FALSE,
    current_escalation_level INTEGER,
    is_escalated BOOLEAN DEFAULT FALSE,
    source VARCHAR(30),
    satisfaction_rating INTEGER,
    satisfaction_feedback TEXT,
    CONSTRAINT uc_tickets_tenant_id_ticket_number UNIQUE (tenant_id, ticket_number)
);

-- time_entries
CREATE TABLE IF NOT EXISTS time_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
employee_id UUID NOT NULL,
    project_id UUID,
    task_id UUID,
    entry_date DATE NOT NULL,
    start_time VARCHAR(50),
    end_time VARCHAR(50),
    hours_worked NUMERIC(5,2) NOT NULL,
    billable_hours NUMERIC(5,2),
    is_billable BOOLEAN DEFAULT FALSE,
    hourly_rate NUMERIC(10,2),
    billing_amount NUMERIC(12,2),
    entry_type VARCHAR(50),
    description TEXT,
    notes TEXT,
    status VARCHAR(50),
    submitted_date DATE,
    approved_by UUID,
    approved_date DATE,
    rejection_reason VARCHAR(255),
    client_id UUID,
    client_name VARCHAR(255),
    external_ref VARCHAR(255)
);

-- training_enrollments
CREATE TABLE IF NOT EXISTS training_enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
program_id UUID NOT NULL,
    employee_id UUID NOT NULL,
    enrollment_date DATE,
    completion_date DATE,
    status VARCHAR(20),
    score_percentage INTEGER,
    feedback TEXT,
    notes TEXT,
    certificate_url VARCHAR(500),
    enrolled_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    attendance_percentage INTEGER,
    assessment_score INTEGER,
    certificate_issued BOOLEAN DEFAULT FALSE
);

-- training_programs
CREATE TABLE IF NOT EXISTS training_programs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
program_code VARCHAR(50) NOT NULL,
    program_name VARCHAR(200) NOT NULL,
    description TEXT,
    category VARCHAR(50),
    delivery_mode VARCHAR(30),
    instructor_id UUID,
    duration_hours INTEGER,
    start_date DATE,
    end_date DATE,
    trainer_name VARCHAR(100),
    trainer_email VARCHAR(100),
    location VARCHAR(200),
    max_participants INTEGER,
    cost_per_participant NUMERIC(10,2),
    cost NUMERIC(10,2),
    prerequisites TEXT,
    learning_objectives TEXT,
    is_mandatory BOOLEAN DEFAULT FALSE,
    status VARCHAR(20),
    materials_url VARCHAR(500),
    certificate_template_url VARCHAR(500)
);

-- travel_expenses
CREATE TABLE IF NOT EXISTS travel_expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
travel_request_id UUID NOT NULL,
    employee_id UUID NOT NULL,
    expense_type VARCHAR(50) NOT NULL,
    description VARCHAR(255),
    expense_date DATE,
    amount NUMERIC(12,2) NOT NULL,
    currency VARCHAR(255),
    exchange_rate NUMERIC(10,4),
    amount_in_base_currency NUMERIC(12,2),
    receipt_path VARCHAR(255),
    receipt_number VARCHAR(255),
    status VARCHAR(50),
    approved_amount NUMERIC(12,2),
    approved_by UUID,
    approved_date DATE,
    rejection_reason VARCHAR(255),
    remarks VARCHAR(255)
);

-- travel_requests
CREATE TABLE IF NOT EXISTS travel_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
employee_id UUID NOT NULL,
    request_number VARCHAR(255) UNIQUE,
    travel_type VARCHAR(50) NOT NULL,
    purpose TEXT NOT NULL,
    project_id UUID,
    client_name VARCHAR(255),
    origin_city VARCHAR(255),
    destination_city VARCHAR(255),
    departure_date DATE,
    return_date DATE,
    departure_time TIMESTAMPTZ,
    return_time TIMESTAMPTZ,
    accommodation_required BOOLEAN DEFAULT FALSE,
    hotel_preference VARCHAR(255),
    check_in_date DATE,
    check_out_date DATE,
    transport_mode VARCHAR(50),
    transport_class VARCHAR(255),
    cab_required BOOLEAN DEFAULT FALSE,
    estimated_cost NUMERIC(12,2),
    advance_required NUMERIC(12,2),
    advance_approved NUMERIC(12,2),
    advance_disbursed_date DATE,
    status VARCHAR(50),
    submitted_date DATE,
    approved_by UUID,
    approved_date DATE,
    rejection_reason VARCHAR(255),
    special_instructions TEXT,
    is_international BOOLEAN DEFAULT FALSE,
    visa_required BOOLEAN DEFAULT FALSE
);

-- user_app_access
CREATE TABLE IF NOT EXISTS user_app_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
user_id UUID NOT NULL,
    application_id UUID NOT NULL,
    status VARCHAR(20) NOT NULL,
    granted_at TIMESTAMPTZ NOT NULL,
    granted_by VARCHAR(50),
    last_accessed_at TIMESTAMPTZ,
    CONSTRAINT uc_user_app_access_user_id_application_id UNIQUE (user_id, application_id)
);

-- user_basic_notification_preferences
CREATE TABLE IF NOT EXISTS user_basic_notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
user_id UUID,
    email_notifications BOOLEAN NOT NULL DEFAULT FALSE,
    push_notifications BOOLEAN NOT NULL DEFAULT FALSE,
    sms_notifications BOOLEAN NOT NULL DEFAULT FALSE,
    security_alerts BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT uc_user_basic_notification_preferences_user_id_tenant_id UNIQUE (user_id, tenant_id)
);

-- user_notification_preferences
CREATE TABLE IF NOT EXISTS user_notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
user_id UUID NOT NULL,
    category VARCHAR(255) NOT NULL,
    day_of_week JSONB,
    minimum_priority VARCHAR(50),
    CONSTRAINT uc_user_notification_preferences_userId_category UNIQUE (user_id, category)
);

-- verification_checks
CREATE TABLE IF NOT EXISTS verification_checks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
bgv_id UUID NOT NULL,
    employee_id UUID NOT NULL,
    check_type VARCHAR(50) NOT NULL,
    check_name VARCHAR(255),
    status VARCHAR(50),
    result VARCHAR(50),
    institution_name VARCHAR(255),
    verification_date DATE,
    verifier_name VARCHAR(255),
    verifier_contact VARCHAR(255),
    remarks TEXT,
    discrepancy_details TEXT,
    document_reference VARCHAR(255),
    is_critical BOOLEAN DEFAULT FALSE
);

-- webhook_deliveries
CREATE TABLE IF NOT EXISTS webhook_deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
webhook_id UUID NOT NULL,
    event_type VARCHAR(50) NOT NULL,
    event_id VARCHAR(50) NOT NULL,
    payload TEXT,
    status VARCHAR(20) NOT NULL,
    attempts INTEGER NOT NULL,
    response_body VARCHAR(2000),
    error_message VARCHAR(1000)
);

-- webhooks
CREATE TABLE IF NOT EXISTS webhooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
name VARCHAR(100) NOT NULL,
    description VARCHAR(500),
    url VARCHAR(2048) NOT NULL,
    secret VARCHAR(256),
    event_type VARCHAR(50),
    status VARCHAR(20) NOT NULL,
    consecutive_failures INTEGER NOT NULL,
    last_error_message VARCHAR(1000),
    include_payload BOOLEAN NOT NULL DEFAULT FALSE,
    custom_headers TEXT,
    max_retries INTEGER NOT NULL,
    timeout_seconds INTEGER NOT NULL
);

-- wellness_challenges
CREATE TABLE IF NOT EXISTS wellness_challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
program_id UUID,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    challenge_type VARCHAR(50) NOT NULL,
    tracking_type VARCHAR(50) NOT NULL,
    target_value DOUBLE PRECISION,
    target_unit VARCHAR(255),
    daily_target DOUBLE PRECISION,
    points_per_completion INTEGER,
    bonus_points_for_goal INTEGER,
    min_participants INTEGER,
    max_participants INTEGER,
    is_team_based BOOLEAN DEFAULT FALSE,
    team_size INTEGER,
    is_active BOOLEAN DEFAULT FALSE,
    leaderboard_enabled BOOLEAN DEFAULT FALSE,
    badge_id UUID
);

-- wellness_points
CREATE TABLE IF NOT EXISTS wellness_points (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
employee_id UUID NOT NULL,
    total_points INTEGER,
    redeemable_points INTEGER,
    lifetime_points INTEGER,
    current_level INTEGER,
    points_to_next_level INTEGER,
    challenges_completed INTEGER,
    current_streak INTEGER,
    longest_streak INTEGER,
    badges_earned INTEGER,
    last_activity_at TIMESTAMPTZ
);

-- wellness_points_transactions
CREATE TABLE IF NOT EXISTS wellness_points_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
employee_id UUID NOT NULL,
    transaction_type VARCHAR(50) NOT NULL,
    points INTEGER NOT NULL,
    balance_after INTEGER,
    description VARCHAR(255) NOT NULL,
    reference_type VARCHAR(255),
    reference_id UUID,
    transaction_at TIMESTAMPTZ
);

-- wellness_programs
CREATE TABLE IF NOT EXISTS wellness_programs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
name VARCHAR(255) NOT NULL,
    description TEXT,
    program_type VARCHAR(50) NOT NULL,
    category VARCHAR(50) NOT NULL,
    max_participants INTEGER,
    points_reward INTEGER,
    budget_amount NUMERIC(12,2),
    is_active BOOLEAN DEFAULT FALSE,
    is_featured BOOLEAN DEFAULT FALSE,
    image_url VARCHAR(255),
    external_link VARCHAR(255),
    instructions TEXT
);

-- workflow_definitions
CREATE TABLE IF NOT EXISTS workflow_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
name VARCHAR(255) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    workflow_type VARCHAR(50) NOT NULL,
    workflow_version INTEGER NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT FALSE,
    is_default BOOLEAN NOT NULL DEFAULT FALSE
);

-- workflow_executions
CREATE TABLE IF NOT EXISTS workflow_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
workflow_definition_id UUID NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    reference_number VARCHAR(255) UNIQUE,
    requester_id UUID NOT NULL,
    status VARCHAR(50) NOT NULL,
    priority VARCHAR(50),
    context_json TEXT
);

-- workflow_rules
CREATE TABLE IF NOT EXISTS workflow_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
name VARCHAR(255) NOT NULL,
    rule_type VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    rule_expression TEXT NOT NULL,
    priority INTEGER NOT NULL,
    action VARCHAR(50) NOT NULL,
    target_priority VARCHAR(50),
    notification_recipients TEXT,
    is_active BOOLEAN NOT NULL DEFAULT FALSE
);

-- workforce_trends
CREATE TABLE IF NOT EXISTS workforce_trends (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
period_year INTEGER NOT NULL,
    period_month INTEGER NOT NULL,
    trend_type VARCHAR(50) NOT NULL,
    department_id UUID,
    department_name VARCHAR(255),
    total_headcount INTEGER,
    new_hires INTEGER,
    terminations INTEGER,
    voluntary_attrition INTEGER,
    involuntary_attrition INTEGER,
    internal_transfers_in INTEGER,
    internal_transfers_out INTEGER,
    attrition_rate NUMERIC(5,2),
    voluntary_attrition_rate NUMERIC(5,2),
    hiring_rate NUMERIC(5,2),
    growth_rate NUMERIC(5,2),
    total_compensation NUMERIC(15,2),
    avg_salary NUMERIC(12,2),
    avg_salary_increase NUMERIC(5,2),
    cost_per_hire NUMERIC(12,2),
    training_cost NUMERIC(12,2),
    avg_engagement_score NUMERIC(5,2),
    avg_performance_rating NUMERIC(3,1),
    high_performers_count INTEGER,
    low_performers_count INTEGER,
    gender_diversity_ratio NUMERIC(5,2),
    avg_tenure_months NUMERIC(6,1),
    avg_age NUMERIC(4,1),
    avg_time_to_fill_days NUMERIC(6,1),
    open_positions INTEGER
);


-- ─── tenant_id indexes (query performance) ─────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_attendance_records_tenant ON attendance_records(tenant_id);
CREATE INDEX IF NOT EXISTS idx_attendance_time_entries_tenant ON attendance_time_entries(tenant_id);
CREATE INDEX IF NOT EXISTS idx_holidays_tenant ON holidays(tenant_id);
CREATE INDEX IF NOT EXISTS idx_office_locations_tenant ON office_locations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_organization_units_tenant ON organization_units(tenant_id);
CREATE INDEX IF NOT EXISTS idx_positions_tenant ON positions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_succession_candidates_tenant ON succession_candidates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_succession_plans_tenant ON succession_plans(tenant_id);
CREATE INDEX IF NOT EXISTS idx_talent_pools_tenant ON talent_pools(tenant_id);
CREATE INDEX IF NOT EXISTS idx_talent_pool_members_tenant ON talent_pool_members(tenant_id);
CREATE INDEX IF NOT EXISTS idx_webhooks_tenant ON webhooks(tenant_id);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_tenant ON webhook_deliveries(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenants_tenant ON tenants(tenant_id);
CREATE INDEX IF NOT EXISTS idx_probation_evaluations_tenant ON probation_evaluations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_probation_periods_tenant ON probation_periods(tenant_id);
CREATE INDEX IF NOT EXISTS idx_expense_claims_tenant ON expense_claims(tenant_id);
CREATE INDEX IF NOT EXISTS idx_employee_referrals_tenant ON employee_referrals(tenant_id);
CREATE INDEX IF NOT EXISTS idx_referral_policies_tenant ON referral_policies(tenant_id);
CREATE INDEX IF NOT EXISTS idx_poll_options_tenant ON poll_options(tenant_id);
CREATE INDEX IF NOT EXISTS idx_poll_votes_tenant ON poll_votes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_post_comments_tenant ON post_comments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_post_reactions_tenant ON post_reactions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_social_posts_tenant ON social_posts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_employee_loans_tenant ON employee_loans(tenant_id);
CREATE INDEX IF NOT EXISTS idx_loan_repayments_tenant ON loan_repayments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_document_requests_tenant ON document_requests(tenant_id);
CREATE INDEX IF NOT EXISTS idx_profile_update_requests_tenant ON profile_update_requests(tenant_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_tenant ON calendar_events(tenant_id);
CREATE INDEX IF NOT EXISTS idx_assets_tenant ON assets(tenant_id);
CREATE INDEX IF NOT EXISTS idx_file_metadata_tenant ON file_metadata(tenant_id);
CREATE INDEX IF NOT EXISTS idx_challenge_participants_tenant ON challenge_participants(tenant_id);
CREATE INDEX IF NOT EXISTS idx_health_logs_tenant ON health_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_wellness_points_transactions_tenant ON wellness_points_transactions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_wellness_challenges_tenant ON wellness_challenges(tenant_id);
CREATE INDEX IF NOT EXISTS idx_wellness_points_tenant ON wellness_points(tenant_id);
CREATE INDEX IF NOT EXISTS idx_wellness_programs_tenant ON wellness_programs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_custom_field_definitions_tenant ON custom_field_definitions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_custom_field_values_tenant ON custom_field_values(tenant_id);
CREATE INDEX IF NOT EXISTS idx_lms_certificates_tenant ON lms_certificates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_lms_content_progress_tenant ON lms_content_progress(tenant_id);
CREATE INDEX IF NOT EXISTS idx_lms_courses_tenant ON lms_courses(tenant_id);
CREATE INDEX IF NOT EXISTS idx_lms_course_enrollments_tenant ON lms_course_enrollments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_lms_course_modules_tenant ON lms_course_modules(tenant_id);
CREATE INDEX IF NOT EXISTS idx_lms_module_contents_tenant ON lms_module_contents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_lms_quizzes_tenant ON lms_quizzes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_lms_quiz_questions_tenant ON lms_quiz_questions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_email_notifications_tenant ON email_notifications(tenant_id);
CREATE INDEX IF NOT EXISTS idx_multi_channel_notifications_tenant ON multi_channel_notifications(tenant_id);
CREATE INDEX IF NOT EXISTS idx_notifications_tenant ON notifications(tenant_id);
CREATE INDEX IF NOT EXISTS idx_notification_channel_configs_tenant ON notification_channel_configs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_notification_templates_tenant ON notification_templates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_notification_preferences_tenant ON user_notification_preferences(tenant_id);
CREATE INDEX IF NOT EXISTS idx_training_enrollments_tenant ON training_enrollments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_training_programs_tenant ON training_programs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_app_permissions_tenant ON app_permissions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_app_roles_tenant ON app_roles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_nu_applications_tenant ON nu_applications(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_applications_tenant ON tenant_applications(tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_app_access_tenant ON user_app_access(tenant_id);
CREATE INDEX IF NOT EXISTS idx_applicants_tenant ON applicants(tenant_id);
CREATE INDEX IF NOT EXISTS idx_candidates_tenant ON candidates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_interviews_tenant ON interviews(tenant_id);
CREATE INDEX IF NOT EXISTS idx_job_openings_tenant ON job_openings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_preboarding_candidates_tenant ON preboarding_candidates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_rosters_tenant ON rosters(tenant_id);
CREATE INDEX IF NOT EXISTS idx_roster_entries_tenant ON roster_entries(tenant_id);
CREATE INDEX IF NOT EXISTS idx_shifts_tenant ON shifts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_shift_assignments_tenant ON shift_assignments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_shift_swap_requests_tenant ON shift_swap_requests(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tax_declarations_tenant ON tax_declarations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tax_proofs_tenant ON tax_proofs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tax_regime_comparisons_tenant ON tax_regime_comparisons(tenant_id);
CREATE INDEX IF NOT EXISTS idx_generated_letters_tenant ON generated_letters(tenant_id);
CREATE INDEX IF NOT EXISTS idx_letter_templates_tenant ON letter_templates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_signature_approvals_tenant ON signature_approvals(tenant_id);
CREATE INDEX IF NOT EXISTS idx_signature_requests_tenant ON signature_requests(tenant_id);
CREATE INDEX IF NOT EXISTS idx_custom_scope_targets_tenant ON custom_scope_targets(tenant_id);
CREATE INDEX IF NOT EXISTS idx_permissions_tenant ON permissions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_roles_tenant ON roles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_tenant ON role_permissions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_users_tenant ON users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_basic_notification_preferences_tenant ON user_basic_notification_preferences(tenant_id);
CREATE INDEX IF NOT EXISTS idx_document_approvals_tenant ON document_approvals(tenant_id);
CREATE INDEX IF NOT EXISTS idx_document_categories_tenant ON document_categories(tenant_id);
CREATE INDEX IF NOT EXISTS idx_document_templates_tenant ON document_templates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_document_versions_tenant ON document_versions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_generated_documents_tenant ON generated_documents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_compliance_audit_logs_tenant ON compliance_audit_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_compliance_alerts_tenant ON compliance_alerts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_compliance_checklists_tenant ON compliance_checklists(tenant_id);
CREATE INDEX IF NOT EXISTS idx_compliance_policies_tenant ON compliance_policies(tenant_id);
CREATE INDEX IF NOT EXISTS idx_policy_acknowledgments_tenant ON policy_acknowledgments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_feature_flags_tenant ON feature_flags(tenant_id);
CREATE INDEX IF NOT EXISTS idx_projects_tenant ON projects(tenant_id);
CREATE INDEX IF NOT EXISTS idx_project_employees_tenant ON project_employees(tenant_id);
CREATE INDEX IF NOT EXISTS idx_project_members_tenant ON project_members(tenant_id);
CREATE INDEX IF NOT EXISTS idx_project_time_entries_tenant ON project_time_entries(tenant_id);
CREATE INDEX IF NOT EXISTS idx_meeting_action_items_tenant ON meeting_action_items(tenant_id);
CREATE INDEX IF NOT EXISTS idx_meeting_agenda_items_tenant ON meeting_agenda_items(tenant_id);
CREATE INDEX IF NOT EXISTS idx_one_on_one_meetings_tenant ON one_on_one_meetings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_pulse_surveys_tenant ON pulse_surveys(tenant_id);
CREATE INDEX IF NOT EXISTS idx_pulse_survey_answers_tenant ON pulse_survey_answers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_pulse_survey_questions_tenant ON pulse_survey_questions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_pulse_survey_responses_tenant ON pulse_survey_responses(tenant_id);
CREATE INDEX IF NOT EXISTS idx_compensation_review_cycles_tenant ON compensation_review_cycles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_salary_revisions_tenant ON salary_revisions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant ON audit_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_candidate_match_scores_tenant ON candidate_match_scores(tenant_id);
CREATE INDEX IF NOT EXISTS idx_chatbot_conversations_tenant ON chatbot_conversations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_resume_parsing_results_tenant ON resume_parsing_results(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sentiment_analysis_tenant ON sentiment_analysis(tenant_id);
CREATE INDEX IF NOT EXISTS idx_smart_recommendations_tenant ON smart_recommendations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_approval_delegates_tenant ON approval_delegates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_approval_steps_tenant ON approval_steps(tenant_id);
CREATE INDEX IF NOT EXISTS idx_step_executions_tenant ON step_executions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_workflow_definitions_tenant ON workflow_definitions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_tenant ON workflow_executions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_workflow_rules_tenant ON workflow_rules(tenant_id);
CREATE INDEX IF NOT EXISTS idx_allocation_requests_tenant ON allocation_requests(tenant_id);
CREATE INDEX IF NOT EXISTS idx_asset_recoveries_tenant ON asset_recoveries(tenant_id);
CREATE INDEX IF NOT EXISTS idx_exit_clearances_tenant ON exit_clearances(tenant_id);
CREATE INDEX IF NOT EXISTS idx_exit_interviews_tenant ON exit_interviews(tenant_id);
CREATE INDEX IF NOT EXISTS idx_exit_processes_tenant ON exit_processes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_full_and_final_settlements_tenant ON full_and_final_settlements(tenant_id);
CREATE INDEX IF NOT EXISTS idx_esi_configs_tenant ON esi_configs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_employee_esi_records_tenant ON employee_esi_records(tenant_id);
CREATE INDEX IF NOT EXISTS idx_employee_pf_records_tenant ON employee_pf_records(tenant_id);
CREATE INDEX IF NOT EXISTS idx_employee_tds_declarations_tenant ON employee_tds_declarations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_monthly_statutory_contributions_tenant ON monthly_statutory_contributions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_professional_tax_slabs_tenant ON professional_tax_slabs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_provident_fund_configs_tenant ON provident_fund_configs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tds_slabs_tenant ON tds_slabs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_report_templates_tenant ON report_templates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_benefit_claims_tenant ON benefit_claims(tenant_id);
CREATE INDEX IF NOT EXISTS idx_benefit_dependents_tenant ON benefit_dependents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_benefit_enrollments_tenant ON benefit_enrollments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_benefit_plans_tenant ON benefit_plans(tenant_id);
CREATE INDEX IF NOT EXISTS idx_benefit_plans_enhanced_tenant ON benefit_plans_enhanced(tenant_id);
CREATE INDEX IF NOT EXISTS idx_flex_benefit_allocations_tenant ON flex_benefit_allocations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_employee_points_tenant ON employee_points(tenant_id);
CREATE INDEX IF NOT EXISTS idx_milestones_tenant ON milestones(tenant_id);
CREATE INDEX IF NOT EXISTS idx_peer_recognitions_tenant ON peer_recognitions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_recognitions_tenant ON recognitions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_recognition_badges_tenant ON recognition_badges(tenant_id);
CREATE INDEX IF NOT EXISTS idx_recognition_reactions_tenant ON recognition_reactions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_background_verifications_tenant ON background_verifications(tenant_id);
CREATE INDEX IF NOT EXISTS idx_verification_checks_tenant ON verification_checks(tenant_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_tenant ON time_entries(tenant_id);
CREATE INDEX IF NOT EXISTS idx_currencies_tenant ON currencies(tenant_id);
CREATE INDEX IF NOT EXISTS idx_employee_payroll_records_tenant ON employee_payroll_records(tenant_id);
CREATE INDEX IF NOT EXISTS idx_exchange_rates_tenant ON exchange_rates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_global_payroll_runs_tenant ON global_payroll_runs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payroll_locations_tenant ON payroll_locations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payroll_runs_tenant ON payroll_runs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payslips_tenant ON payslips(tenant_id);
CREATE INDEX IF NOT EXISTS idx_salary_structures_tenant ON salary_structures(tenant_id);
CREATE INDEX IF NOT EXISTS idx_feedback_tenant ON feedback(tenant_id);
CREATE INDEX IF NOT EXISTS idx_feedback_360_cycles_tenant ON feedback_360_cycles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_feedback_360_requests_tenant ON feedback_360_requests(tenant_id);
CREATE INDEX IF NOT EXISTS idx_feedback_360_responses_tenant ON feedback_360_responses(tenant_id);
CREATE INDEX IF NOT EXISTS idx_feedback_360_summaries_tenant ON feedback_360_summaries(tenant_id);
CREATE INDEX IF NOT EXISTS idx_goals_tenant ON goals(tenant_id);
CREATE INDEX IF NOT EXISTS idx_key_results_tenant ON key_results(tenant_id);
CREATE INDEX IF NOT EXISTS idx_objectives_tenant ON objectives(tenant_id);
CREATE INDEX IF NOT EXISTS idx_okr_check_ins_tenant ON okr_check_ins(tenant_id);
CREATE INDEX IF NOT EXISTS idx_pip_check_ins_tenant ON pip_check_ins(tenant_id);
CREATE INDEX IF NOT EXISTS idx_performance_improvement_plans_tenant ON performance_improvement_plans(tenant_id);
CREATE INDEX IF NOT EXISTS idx_performance_reviews_tenant ON performance_reviews(tenant_id);
CREATE INDEX IF NOT EXISTS idx_review_competencies_tenant ON review_competencies(tenant_id);
CREATE INDEX IF NOT EXISTS idx_review_cycles_tenant ON review_cycles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_engagement_scores_tenant ON engagement_scores(tenant_id);
CREATE INDEX IF NOT EXISTS idx_surveys_tenant ON surveys(tenant_id);
CREATE INDEX IF NOT EXISTS idx_survey_answers_tenant ON survey_answers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_survey_insights_tenant ON survey_insights(tenant_id);
CREATE INDEX IF NOT EXISTS idx_survey_questions_tenant ON survey_questions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_survey_responses_tenant ON survey_responses(tenant_id);
CREATE INDEX IF NOT EXISTS idx_psa_invoices_tenant ON psa_invoices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_psa_projects_tenant ON psa_projects(tenant_id);
CREATE INDEX IF NOT EXISTS idx_psa_project_allocations_tenant ON psa_project_allocations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_psa_time_entries_tenant ON psa_time_entries(tenant_id);
CREATE INDEX IF NOT EXISTS idx_psa_timesheets_tenant ON psa_timesheets(tenant_id);
CREATE INDEX IF NOT EXISTS idx_announcements_tenant ON announcements(tenant_id);
CREATE INDEX IF NOT EXISTS idx_announcement_reads_tenant ON announcement_reads(tenant_id);
CREATE INDEX IF NOT EXISTS idx_departments_tenant ON departments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_employees_tenant ON employees(tenant_id);
CREATE INDEX IF NOT EXISTS idx_employee_skills_tenant ON employee_skills(tenant_id);
CREATE INDEX IF NOT EXISTS idx_employment_change_requests_tenant ON employment_change_requests(tenant_id);
CREATE INDEX IF NOT EXISTS idx_comp_time_balances_tenant ON comp_time_balances(tenant_id);
CREATE INDEX IF NOT EXISTS idx_comp_time_transactions_tenant ON comp_time_transactions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_overtime_policies_tenant ON overtime_policies(tenant_id);
CREATE INDEX IF NOT EXISTS idx_overtime_rate_tiers_tenant ON overtime_rate_tiers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_overtime_records_tenant ON overtime_records(tenant_id);
CREATE INDEX IF NOT EXISTS idx_overtime_requests_tenant ON overtime_requests(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tickets_tenant ON tickets(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ticket_categories_tenant ON ticket_categories(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ticket_comments_tenant ON ticket_comments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ticket_escalations_tenant ON ticket_escalations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ticket_metrics_tenant ON ticket_metrics(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ticket_slas_tenant ON ticket_slas(tenant_id);
CREATE INDEX IF NOT EXISTS idx_travel_expenses_tenant ON travel_expenses(tenant_id);
CREATE INDEX IF NOT EXISTS idx_travel_requests_tenant ON travel_requests(tenant_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_checklist_templates_tenant ON onboarding_checklist_templates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_documents_tenant ON onboarding_documents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_processes_tenant ON onboarding_processes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_tasks_tenant ON onboarding_tasks(tenant_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_template_tasks_tenant ON onboarding_template_tasks(tenant_id);
CREATE INDEX IF NOT EXISTS idx_leave_balances_tenant ON leave_balances(tenant_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_tenant ON leave_requests(tenant_id);
CREATE INDEX IF NOT EXISTS idx_leave_types_tenant ON leave_types(tenant_id);
CREATE INDEX IF NOT EXISTS idx_analytics_insights_tenant ON analytics_insights(tenant_id);
CREATE INDEX IF NOT EXISTS idx_analytics_metrics_tenant ON analytics_metrics(tenant_id);
CREATE INDEX IF NOT EXISTS idx_analytics_snapshots_tenant ON analytics_snapshots(tenant_id);
CREATE INDEX IF NOT EXISTS idx_attrition_predictions_tenant ON attrition_predictions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_dashboards_tenant ON dashboards(tenant_id);
CREATE INDEX IF NOT EXISTS idx_dashboard_widgets_tenant ON dashboard_widgets(tenant_id);
CREATE INDEX IF NOT EXISTS idx_report_definitions_tenant ON report_definitions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_report_executions_tenant ON report_executions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_reports_tenant ON scheduled_reports(tenant_id);
CREATE INDEX IF NOT EXISTS idx_skill_gaps_tenant ON skill_gaps(tenant_id);
CREATE INDEX IF NOT EXISTS idx_workforce_trends_tenant ON workforce_trends(tenant_id);
CREATE INDEX IF NOT EXISTS idx_budget_scenarios_tenant ON budget_scenarios(tenant_id);
CREATE INDEX IF NOT EXISTS idx_headcount_budgets_tenant ON headcount_budgets(tenant_id);
CREATE INDEX IF NOT EXISTS idx_headcount_positions_tenant ON headcount_positions(tenant_id);
-- app_role_permissions (junction table for AppRole and AppPermission many-to-many)
CREATE TABLE IF NOT EXISTS app_role_permissions (
    role_id UUID NOT NULL,
    permission_id UUID NOT NULL,
    PRIMARY KEY (role_id, permission_id)
);

CREATE INDEX IF NOT EXISTS idx_app_role_perm_role ON app_role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_app_role_perm_perm ON app_role_permissions(permission_id);
