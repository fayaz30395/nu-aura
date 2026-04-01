-- V51__add_deleted_at_column.sql
-- Phase 1: Data Integrity — Add deleted_at TIMESTAMPTZ column to all tables
-- that have is_deleted but lack a deletion timestamp.
-- This enables full soft-delete audit trails and future recovery workflows.
-- Uses DO blocks to safely skip tables that may not exist yet.

DO $$
DECLARE
    tbl TEXT;
BEGIN
    FOR tbl IN
        SELECT unnest(ARRAY[
            'tenants', 'users', 'departments', 'employees', 'roles', 'permissions', 'office_locations',
            'leave_types', 'leave_requests', 'leave_balances', 'attendance_records', 'attendance_time_entries',
            'holidays', 'shifts', 'overtime_records',
            'salary_structures', 'payroll_runs', 'payslips', 'tax_declarations',
            'contracts', 'contract_versions', 'contract_templates',
            'performance_reviews', 'performance_goals', 'okr_objectives', 'okr_key_results',
            'feedback', 'feedback_360_cycles', 'pulse_surveys', 'surveys',
            'job_openings', 'candidates', 'interviews', 'applicants',
            'assets', 'expense_claims', 'projects', 'project_members',
            'training_programs', 'courses', 'course_modules', 'quizzes',
            'wiki_spaces', 'wiki_pages', 'blog_posts', 'blog_categories', 'document_templates',
            'onboarding_templates', 'onboarding_template_tasks', 'onboarding_processes',
            'exit_processes', 'exit_clearances',
            'helpdesk_tickets', 'helpdesk_ticket_comments', 'helpdesk_ticket_categories',
            'calendar_events', 'announcements',
            'benefit_plans', 'budget_plans', 'budget_positions', 'budget_scenarios',
            'webhooks', 'wall_posts', 'post_comments',
            'signature_requests', 'signature_approvals',
            'scheduled_reports', 'report_templates',
            'one_on_one_meetings', 'meeting_agenda_items'
        ])
    LOOP
        IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = tbl) THEN
            EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ', tbl);
        END IF;
    END LOOP;
END $$;

-- ============================================================
-- Partial indexes on critical tables for deleted_at IS NULL
-- These complement the is_deleted = false indexes from V46.
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_employees_not_deleted
  ON employees (tenant_id, id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_departments_not_deleted
  ON departments (tenant_id, id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_payslips_not_deleted
  ON payslips (tenant_id, employee_id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_payroll_runs_not_deleted
  ON payroll_runs (tenant_id, id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_salary_structures_not_deleted
  ON salary_structures (tenant_id, employee_id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_leave_types_not_deleted
  ON leave_types (tenant_id, id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_holidays_not_deleted
  ON holidays (tenant_id, id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_contracts_not_deleted
  ON contracts (tenant_id, id) WHERE deleted_at IS NULL;
