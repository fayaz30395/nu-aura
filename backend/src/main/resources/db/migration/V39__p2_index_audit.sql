-- =============================================================================
-- V39: P2 Stabilization — Comprehensive Index Audit
-- =============================================================================
-- Addresses remaining performance gaps in frequently-queried tables:
--   1. Recruitment pipeline queries (candidates, interviews, applications)
--   2. Workflow and approval queries (delegates, steps ordering)
--   3. Asset management queries (assignments, handovers)
--   4. Expense management queries (claims, receipts)
--   5. Document management queries (access, versions)
--   6. Time tracking queries (multi-check entries)
--   7. Onboarding/Offboarding queries (tasks, checklists)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. RECRUITMENT TABLES
-- ---------------------------------------------------------------------------

-- candidates: queried by status, job_opening, and created_at for pipeline views
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_candidates_tenant_status
    ON candidates (tenant_id, status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_candidates_tenant_job
    ON candidates (tenant_id, job_opening_id, status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_candidates_tenant_created
    ON candidates (tenant_id, created_at DESC);

-- interviews: queried by candidate, scheduled_at, and status
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_interviews_tenant_candidate
    ON interviews (tenant_id, candidate_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_interviews_tenant_scheduled
    ON interviews (tenant_id, scheduled_at);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_interviews_tenant_interviewer
    ON interviews (tenant_id, interviewer_id, scheduled_at);

-- job_openings: queried by status and department
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_job_openings_tenant_status
    ON job_openings (tenant_id, status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_job_openings_tenant_dept
    ON job_openings (tenant_id, department_id, status);

-- applicants: queried by candidate and job
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_applicants_tenant_candidate
    ON applicants (tenant_id, candidate_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_applicants_tenant_job_status
    ON applicants (tenant_id, job_opening_id, status);

-- ---------------------------------------------------------------------------
-- 2. WORKFLOW AND APPROVAL TABLES
-- ---------------------------------------------------------------------------

-- approval_delegates: queried by delegator and active status
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_approval_delegates_tenant_delegator
    ON approval_delegates (tenant_id, delegator_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_approval_delegates_tenant_delegate
    ON approval_delegates (tenant_id, delegate_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_approval_delegates_active
    ON approval_delegates (tenant_id, delegator_id, start_date, end_date)
    WHERE is_active = true;

-- approval_steps: queried by workflow_def_id and order
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_approval_steps_tenant_workflow
    ON approval_steps (tenant_id, workflow_def_id, step_order);

-- workflow_definitions: queried by entity_type
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workflow_defs_tenant_entity
    ON workflow_definitions (tenant_id, entity_type);

-- ---------------------------------------------------------------------------
-- 3. ASSET MANAGEMENT TABLES
-- ---------------------------------------------------------------------------

-- assets: queried by status, category, and assigned employee
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_assets_tenant_status
    ON assets (tenant_id, status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_assets_tenant_category
    ON assets (tenant_id, category_id, status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_assets_tenant_assigned
    ON assets (tenant_id, assigned_to_id)
    WHERE assigned_to_id IS NOT NULL;

-- asset_recoveries: queried by asset and employee
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_asset_recoveries_tenant_asset
    ON asset_recoveries (tenant_id, asset_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_asset_recoveries_tenant_emp
    ON asset_recoveries (tenant_id, employee_id, status);

-- ---------------------------------------------------------------------------
-- 4. EXPENSE MANAGEMENT TABLES
-- ---------------------------------------------------------------------------

-- expense_claims: queried by employee, status, and date
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_expense_claims_tenant_emp
    ON expense_claims (tenant_id, employee_id, status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_expense_claims_tenant_status
    ON expense_claims (tenant_id, status, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_expense_claims_tenant_date
    ON expense_claims (tenant_id, claim_date);

-- expense_receipts: queried by claim
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_expense_receipts_claim
    ON expense_receipts (expense_claim_id);

-- ---------------------------------------------------------------------------
-- 5. DOCUMENT MANAGEMENT TABLES
-- ---------------------------------------------------------------------------

-- document_access: queried by document and user
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_doc_access_document
    ON document_access (document_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_doc_access_tenant_user
    ON document_access (tenant_id, user_id);

-- document_versions: queried by document and version number
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_doc_versions_document
    ON document_versions (document_id, version_number DESC);

-- employee_documents: queried by employee and category
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_emp_documents_tenant_emp
    ON employee_documents (tenant_id, employee_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_emp_documents_tenant_category
    ON employee_documents (tenant_id, category, employee_id);

-- ---------------------------------------------------------------------------
-- 6. TIME TRACKING (ATTENDANCE TIME ENTRIES)
-- ---------------------------------------------------------------------------

-- attendance_time_entries: queried by attendance_record and type
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_time_entries_record
    ON attendance_time_entries (attendance_record_id, sequence_number);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_time_entries_tenant_date
    ON attendance_time_entries (tenant_id, check_in_time);

-- ---------------------------------------------------------------------------
-- 7. ONBOARDING/OFFBOARDING TABLES
-- ---------------------------------------------------------------------------

-- onboarding_tasks: queried by employee and status
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_onboarding_tasks_tenant_emp
    ON onboarding_tasks (tenant_id, employee_id, status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_onboarding_tasks_tenant_status
    ON onboarding_tasks (tenant_id, status, due_date);

-- offboarding_tasks: queried by employee and status
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_offboarding_tasks_tenant_emp
    ON offboarding_tasks (tenant_id, employee_id, status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_offboarding_tasks_tenant_status
    ON offboarding_tasks (tenant_id, status, due_date);

-- exit_interviews: queried by employee
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_exit_interviews_tenant_emp
    ON exit_interviews (tenant_id, employee_id);

-- ---------------------------------------------------------------------------
-- 8. EMPLOYEE LOANS AND BENEFITS
-- ---------------------------------------------------------------------------

-- employee_loans: queried by employee and status
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_employee_loans_tenant_emp
    ON employee_loans (tenant_id, employee_id, status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_employee_loans_tenant_status
    ON employee_loans (tenant_id, status);

-- loan_repayments: queried by loan
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_loan_repayments_loan
    ON loan_repayments (loan_id, repayment_date);

-- benefit_enrollments: queried by employee and plan
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_benefit_enrollments_tenant_emp
    ON benefit_enrollments (tenant_id, employee_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_benefit_enrollments_tenant_plan
    ON benefit_enrollments (tenant_id, benefit_plan_id, status);

-- ---------------------------------------------------------------------------
-- 9. CALENDAR AND NOTIFICATIONS
-- ---------------------------------------------------------------------------

-- calendar_events: queried by organizer, date range, and attendees
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_calendar_events_tenant_organizer
    ON calendar_events (tenant_id, organizer_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_calendar_events_tenant_dates
    ON calendar_events (tenant_id, start_time, end_time);

-- ---------------------------------------------------------------------------
-- 10. TRAINING AND LMS
-- ---------------------------------------------------------------------------

-- lms_course_completions: queried by employee and course
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_lms_completions_tenant_emp
    ON lms_course_completions (tenant_id, employee_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_lms_completions_tenant_course
    ON lms_course_completions (tenant_id, course_id, completed_at DESC);

-- training_sessions: queried by date and trainer
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_training_sessions_tenant_dates
    ON training_sessions (tenant_id, start_date, end_date);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_training_sessions_tenant_trainer
    ON training_sessions (tenant_id, trainer_id);

-- ---------------------------------------------------------------------------
-- 11. WALL/SOCIAL FEED
-- ---------------------------------------------------------------------------

-- wall_posts: queried by author and created_at for feed pagination
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_wall_posts_tenant_created
    ON wall_posts (tenant_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_wall_posts_tenant_author
    ON wall_posts (tenant_id, author_id, created_at DESC);

-- wall_comments: queried by post for comment threading
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_wall_comments_post
    ON wall_comments (post_id, created_at);

-- wall_reactions: queried by post for reaction counts
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_wall_reactions_post
    ON wall_reactions (post_id, reaction_type);

-- ---------------------------------------------------------------------------
-- 12. HOLIDAYS AND LEAVE TYPES
-- ---------------------------------------------------------------------------

-- holidays: queried by date range
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_holidays_tenant_date
    ON holidays (tenant_id, date);

-- leave_types: rarely changes but frequently joined
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leave_types_tenant_active
    ON leave_types (tenant_id, is_active);
