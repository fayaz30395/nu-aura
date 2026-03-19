-- =============================================================================
-- V39: P2 Stabilization — Comprehensive Index Audit
-- =============================================================================
-- Addresses remaining performance gaps in frequently-queried tables.
-- All indexes use IF NOT EXISTS for idempotency.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. RECRUITMENT TABLES
-- ---------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_candidates_tenant_status
    ON candidates (tenant_id, status);

CREATE INDEX IF NOT EXISTS idx_candidates_tenant_job
    ON candidates (tenant_id, job_opening_id, status);

CREATE INDEX IF NOT EXISTS idx_candidates_tenant_created
    ON candidates (tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_interviews_tenant_candidate
    ON interviews (tenant_id, candidate_id);

CREATE INDEX IF NOT EXISTS idx_interviews_tenant_scheduled
    ON interviews (tenant_id, scheduled_at);

CREATE INDEX IF NOT EXISTS idx_interviews_tenant_interviewer
    ON interviews (tenant_id, interviewer_id, scheduled_at);

CREATE INDEX IF NOT EXISTS idx_job_openings_tenant_status
    ON job_openings (tenant_id, status);

CREATE INDEX IF NOT EXISTS idx_job_openings_tenant_dept
    ON job_openings (tenant_id, department_id, status);

CREATE INDEX IF NOT EXISTS idx_applicants_tenant_candidate
    ON applicants (tenant_id, candidate_id);

CREATE INDEX IF NOT EXISTS idx_applicants_tenant_job_status
    ON applicants (tenant_id, job_opening_id, status);

-- ---------------------------------------------------------------------------
-- 2. WORKFLOW AND APPROVAL TABLES
-- ---------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_approval_delegates_tenant_delegator
    ON approval_delegates (tenant_id, delegator_id);

CREATE INDEX IF NOT EXISTS idx_approval_delegates_tenant_delegate
    ON approval_delegates (tenant_id, delegate_id);

CREATE INDEX IF NOT EXISTS idx_approval_delegates_active
    ON approval_delegates (tenant_id, delegator_id, start_date, end_date)
    WHERE is_active = true;

-- Column is workflow_definition_id (not workflow_def_id)
CREATE INDEX IF NOT EXISTS idx_approval_steps_tenant_workflow
    ON approval_steps (tenant_id, workflow_definition_id, step_order);

CREATE INDEX IF NOT EXISTS idx_workflow_defs_tenant_entity
    ON workflow_definitions (tenant_id, entity_type);

-- ---------------------------------------------------------------------------
-- 3. ASSET MANAGEMENT TABLES
-- ---------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_assets_tenant_status
    ON assets (tenant_id, status);

-- Column is category (varchar), not category_id
CREATE INDEX IF NOT EXISTS idx_assets_tenant_category
    ON assets (tenant_id, category, status);

-- Column is assigned_to (not assigned_to_id)
CREATE INDEX IF NOT EXISTS idx_assets_tenant_assigned
    ON assets (tenant_id, assigned_to)
    WHERE assigned_to IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_asset_recoveries_tenant_asset
    ON asset_recoveries (tenant_id, asset_id);

CREATE INDEX IF NOT EXISTS idx_asset_recoveries_tenant_emp
    ON asset_recoveries (tenant_id, employee_id, status);

-- ---------------------------------------------------------------------------
-- 4. EXPENSE MANAGEMENT TABLES
-- ---------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_expense_claims_tenant_emp
    ON expense_claims (tenant_id, employee_id, status);

CREATE INDEX IF NOT EXISTS idx_expense_claims_tenant_status
    ON expense_claims (tenant_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_expense_claims_tenant_date
    ON expense_claims (tenant_id, claim_date);

-- expense_receipts table does not exist — skipped

-- ---------------------------------------------------------------------------
-- 5. DOCUMENT MANAGEMENT TABLES
-- ---------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_doc_access_document
    ON document_access (document_id);

CREATE INDEX IF NOT EXISTS idx_doc_access_tenant_user
    ON document_access (tenant_id, user_id);

CREATE INDEX IF NOT EXISTS idx_doc_versions_document
    ON document_versions (document_id, version_number DESC);

-- employee_documents table does not exist — skipped

-- ---------------------------------------------------------------------------
-- 6. TIME TRACKING (ATTENDANCE TIME ENTRIES)
-- ---------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_time_entries_record
    ON attendance_time_entries (attendance_record_id, sequence_number);

-- attendance_time_entries does not have tenant_id — skipped tenant index

-- ---------------------------------------------------------------------------
-- 7. ONBOARDING/OFFBOARDING TABLES
-- ---------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_onboarding_tasks_tenant_emp
    ON onboarding_tasks (tenant_id, employee_id, status);

CREATE INDEX IF NOT EXISTS idx_onboarding_tasks_tenant_status
    ON onboarding_tasks (tenant_id, status, due_date);

-- offboarding_tasks table does not exist — skipped

CREATE INDEX IF NOT EXISTS idx_exit_interviews_tenant_emp
    ON exit_interviews (tenant_id, employee_id);

-- ---------------------------------------------------------------------------
-- 8. EMPLOYEE LOANS AND BENEFITS
-- ---------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_employee_loans_tenant_emp
    ON employee_loans (tenant_id, employee_id, status);

CREATE INDEX IF NOT EXISTS idx_employee_loans_tenant_status
    ON employee_loans (tenant_id, status);

CREATE INDEX IF NOT EXISTS idx_loan_repayments_loan
    ON loan_repayments (loan_id, due_date);

CREATE INDEX IF NOT EXISTS idx_benefit_enrollments_tenant_emp
    ON benefit_enrollments (tenant_id, employee_id);

CREATE INDEX IF NOT EXISTS idx_benefit_enrollments_tenant_plan
    ON benefit_enrollments (tenant_id, benefit_plan_id, status);

-- ---------------------------------------------------------------------------
-- 9. CALENDAR
-- ---------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_calendar_events_tenant_organizer
    ON calendar_events (tenant_id, organizer_id);

CREATE INDEX IF NOT EXISTS idx_calendar_events_tenant_dates
    ON calendar_events (tenant_id, start_time, end_time);

-- ---------------------------------------------------------------------------
-- 10. TRAINING AND LMS
-- lms_course_completions, training_sessions, training_courses tables
-- do not exist — skipped
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- 11. WALL/SOCIAL FEED
-- wall_posts, wall_comments, wall_reactions tables do not exist — skipped
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- 12. HOLIDAYS AND LEAVE TYPES
-- ---------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_holidays_tenant_date
    ON holidays (tenant_id, holiday_date);

CREATE INDEX IF NOT EXISTS idx_leave_types_tenant_active
    ON leave_types (tenant_id, is_active);
