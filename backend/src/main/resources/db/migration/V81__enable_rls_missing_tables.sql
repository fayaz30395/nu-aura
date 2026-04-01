-- =============================================================================
-- V81 - Enable RLS on 115 Tenant-Scoped Tables Missing Row Level Security
-- =============================================================================
--
-- PURPOSE:
--   Forensic analysis (2026-03-26) found that only 59 of 174 tenant-scoped
--   tables have RLS policies. This migration closes the gap by enabling RLS
--   on the remaining 115 tables that have a tenant_id column but lack policies.
--
-- STRATEGY (matches V36/V37/V38 pattern):
--   1. Explicitly list all 115 tables identified in the forensic report
--   2. For each table: ENABLE RLS, create PERMISSIVE allow-all policy,
--      create RESTRICTIVE tenant-scoped policy
--   3. FORCE RLS on all tables so it applies even to table owners
--   4. Fully idempotent — skips tables that already have policies
--
-- POLICY PATTERN:
--   - PERMISSIVE allow-all: allows all rows (baseline)
--   - RESTRICTIVE tenant_rls: restricts to current tenant via session var
--   - Graceful fallback: when app.current_tenant_id is NULL or empty
--     (migrations, background jobs), all rows are visible
--
-- REFERENCE: Appendix A of /tmp/nu-aura-analysis/database-integrity.md
-- =============================================================================


-- =============================================================================
-- SECTION A: Enable RLS and create policies for all 115 missing tables
-- =============================================================================

DO $$
DECLARE
    -- Full list of 115 tables from forensic report Appendix A
    -- Grouped by module for readability
    missing_tables TEXT[] := ARRAY[

        -- Analytics & Dashboards
        'analytics_metrics',
        'dashboard_widgets',
        'dashboards',

        -- Application & Platform
        'app_roles',
        'feature_flags',
        'tenant_applications',

        -- Recruitment (NU-Hire)
        'applicants',
        'candidate_match_scores',
        'job_board_postings',
        'job_openings',
        'preboarding_candidates',
        'resume_parsing_results',

        -- Benefits & Compensation
        'benefit_plans',
        'comp_off_requests',

        -- Calendar & Scheduling
        'calendar_events',
        'holidays',
        'office_locations',
        'shift_assignments',
        'shift_swap_requests',
        'shifts',

        -- Chatbot & AI
        'chatbot_conversations',
        'smart_recommendations',

        -- Content & Knowledge (NU-Fluence)
        'content_views',
        'knowledge_templates',

        -- Custom Fields
        'custom_field_definitions',
        'custom_field_values',

        -- Documents
        'document_access',
        'document_approval_tasks',
        'document_approval_workflows',
        'document_approvals',
        'document_categories',
        'document_expiry_tracking',
        'document_versions',
        'file_metadata',
        'generated_documents',
        'signature_approvals',
        'signature_requests',

        -- Employee Records
        'employee_esi_records',
        'employee_loans',
        'employee_pf_records',
        'employee_skills',
        'employee_tds_declarations',

        -- Engagement & Social
        'engagement_scores',
        'peer_recognitions',
        'poll_options',
        'poll_votes',
        'post_comments',
        'post_reactions',
        'sentiment_analysis',
        'social_posts',

        -- Exit & Offboarding
        'exit_clearances',
        'exit_processes',

        -- Expense & Finance
        'expense_claims',

        -- Feedback & Performance (NU-Grow)
        'feedback_360_cycles',
        'feedback_360_requests',
        'feedback_360_responses',
        'feedback_360_summaries',
        'key_results',
        'objectives',
        'okr_check_ins',
        'performance_improvement_plans',
        'pip_check_ins',

        -- Import & Integration
        'keka_import_history',
        'webhooks',

        -- LMS / Training (NU-Grow)
        'lms_certificates',
        'lms_content_progress',
        'lms_course_enrollments',
        'lms_course_modules',
        'lms_courses',
        'lms_learning_path_courses',
        'lms_learning_paths',
        'lms_module_contents',
        'lms_quiz_attempts',
        'lms_quiz_questions',
        'lms_quizzes',
        'training_enrollments',
        'training_programs',

        -- Notifications & Email
        'email_notifications',
        'notification_channel_configs',
        'user_basic_notification_preferences',

        -- Onboarding
        'onboarding_processes',

        -- Overtime & Attendance
        'overtime_policies',
        'overtime_records',

        -- Payments & Transactions
        'payment_batches',
        'payment_configs',
        'payment_refunds',
        'payment_transactions',
        'payment_webhooks',

        -- Payroll & Statutory
        'esi_configs',
        'monthly_statutory_contributions',
        'professional_tax_slabs',
        'provident_fund_configs',
        'tds_slabs',

        -- Projects & PSA
        'project_employees',
        'project_members',
        'project_time_entries',
        'psa_invoices',
        'psa_project_allocations',
        'psa_projects',
        'psa_time_entries',
        'psa_timesheets',

        -- Reporting
        'report_definitions',
        'report_executions',
        'report_templates',
        'scheduled_reports',

        -- Surveys
        'survey_answers',
        'survey_insights',
        'survey_questions',
        'survey_responses',
        'surveys',

        -- Tax
        'tax_declarations',
        'tax_proofs',
        'tax_regime_comparisons',

        -- Tickets & Helpdesk
        'ticket_categories',
        'ticket_comments',
        'ticket_escalations',
        'ticket_metrics',
        'ticket_slas',
        'tickets'
    ];

    tbl_name TEXT;
    rls_enabled BOOLEAN;
    policy_exists BOOLEAN;
    processed_count INT := 0;
    skipped_count INT := 0;
    error_count INT := 0;
BEGIN
    RAISE NOTICE 'V81: Processing % tables for RLS enablement', array_length(missing_tables, 1);

    FOREACH tbl_name IN ARRAY missing_tables
    LOOP
        BEGIN
            -- Verify the table exists before attempting RLS
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.tables
                WHERE table_schema = 'public'
                  AND table_name = tbl_name
                  AND table_type = 'BASE TABLE'
            ) THEN
                RAISE NOTICE 'Skipping % (table does not exist)', tbl_name;
                skipped_count := skipped_count + 1;
                CONTINUE;
            END IF;

            -- Verify the table has a tenant_id column
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_schema = 'public'
                  AND table_name = tbl_name
                  AND column_name = 'tenant_id'
            ) THEN
                RAISE NOTICE 'Skipping % (no tenant_id column)', tbl_name;
                skipped_count := skipped_count + 1;
                CONTINUE;
            END IF;

            -- Check if RLS is already enabled
            SELECT relrowsecurity INTO rls_enabled
            FROM pg_class
            WHERE relname = tbl_name AND relnamespace = 'public'::regnamespace;

            -- Check if tenant_rls policy already exists
            SELECT EXISTS (
                SELECT 1 FROM pg_policies
                WHERE tablename = tbl_name
                  AND policyname = tbl_name || '_tenant_rls'
            ) INTO policy_exists;

            -- Skip if already fully configured
            IF rls_enabled AND policy_exists THEN
                RAISE NOTICE 'Skipping % (already configured)', tbl_name;
                skipped_count := skipped_count + 1;
                CONTINUE;
            END IF;

            -- Enable RLS if not already enabled
            IF NOT rls_enabled THEN
                EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl_name);
                RAISE NOTICE 'Enabled RLS on %', tbl_name;
            END IF;

            -- Create PERMISSIVE allow-all policy if not exists
            IF NOT EXISTS (
                SELECT 1 FROM pg_policies
                WHERE tablename = tbl_name
                  AND policyname = tbl_name || '_allow_all'
            ) THEN
                EXECUTE format(
                    'CREATE POLICY %I ON %I AS PERMISSIVE FOR ALL USING (true) WITH CHECK (true)',
                    tbl_name || '_allow_all',
                    tbl_name
                );
                RAISE NOTICE 'Created allow_all policy on %', tbl_name;
            END IF;

            -- Create RESTRICTIVE tenant-scoped policy if not exists
            IF NOT policy_exists THEN
                EXECUTE format($policy$
                    CREATE POLICY %I ON %I
                        AS RESTRICTIVE FOR ALL
                        USING (
                            tenant_id = current_setting('app.current_tenant_id', true)::uuid
                            OR current_setting('app.current_tenant_id', true) IS NULL
                            OR current_setting('app.current_tenant_id', true) = ''
                        )
                        WITH CHECK (
                            tenant_id = current_setting('app.current_tenant_id', true)::uuid
                            OR current_setting('app.current_tenant_id', true) IS NULL
                            OR current_setting('app.current_tenant_id', true) = ''
                        )
                $policy$,
                    tbl_name || '_tenant_rls',
                    tbl_name
                );
                RAISE NOTICE 'Created tenant_rls policy on %', tbl_name;
            END IF;

            processed_count := processed_count + 1;

        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'Error processing table %: %', tbl_name, SQLERRM;
            error_count := error_count + 1;
        END;
    END LOOP;

    RAISE NOTICE 'V81 Section A complete: % processed, % skipped, % errors',
        processed_count, skipped_count, error_count;
END $$;


-- =============================================================================
-- SECTION B: Force RLS on all 115 tables
-- =============================================================================
-- FORCE means RLS applies even to table owners (superusers still bypass)

DO $$
DECLARE
    missing_tables TEXT[] := ARRAY[
        'analytics_metrics', 'app_roles', 'applicants', 'benefit_plans',
        'calendar_events', 'candidate_match_scores', 'chatbot_conversations',
        'comp_off_requests', 'content_views', 'custom_field_definitions',
        'custom_field_values', 'dashboard_widgets', 'dashboards',
        'document_access', 'document_approval_tasks', 'document_approval_workflows',
        'document_approvals', 'document_categories', 'document_expiry_tracking',
        'document_versions', 'email_notifications', 'employee_esi_records',
        'employee_loans', 'employee_pf_records', 'employee_skills',
        'employee_tds_declarations', 'engagement_scores', 'esi_configs',
        'exit_clearances', 'exit_processes', 'expense_claims', 'feature_flags',
        'feedback_360_cycles', 'feedback_360_requests', 'feedback_360_responses',
        'feedback_360_summaries', 'file_metadata', 'generated_documents',
        'holidays', 'job_board_postings', 'job_openings', 'keka_import_history',
        'key_results', 'knowledge_templates', 'lms_certificates',
        'lms_content_progress', 'lms_course_enrollments', 'lms_course_modules',
        'lms_courses', 'lms_learning_path_courses', 'lms_learning_paths',
        'lms_module_contents', 'lms_quiz_attempts', 'lms_quiz_questions',
        'lms_quizzes', 'monthly_statutory_contributions',
        'notification_channel_configs', 'objectives', 'office_locations',
        'okr_check_ins', 'onboarding_processes', 'overtime_policies',
        'overtime_records', 'payment_batches', 'payment_configs',
        'payment_refunds', 'payment_transactions', 'payment_webhooks',
        'peer_recognitions', 'performance_improvement_plans', 'pip_check_ins',
        'poll_options', 'poll_votes', 'post_comments', 'post_reactions',
        'preboarding_candidates', 'professional_tax_slabs', 'project_employees',
        'project_members', 'project_time_entries', 'provident_fund_configs',
        'psa_invoices', 'psa_project_allocations', 'psa_projects',
        'psa_time_entries', 'psa_timesheets', 'report_definitions',
        'report_executions', 'report_templates', 'resume_parsing_results',
        'scheduled_reports', 'sentiment_analysis', 'shift_assignments',
        'shift_swap_requests', 'shifts', 'signature_approvals',
        'signature_requests', 'smart_recommendations', 'social_posts',
        'survey_answers', 'survey_insights', 'survey_questions',
        'survey_responses', 'surveys', 'tax_declarations', 'tax_proofs',
        'tax_regime_comparisons', 'tds_slabs', 'tenant_applications',
        'ticket_categories', 'ticket_comments', 'ticket_escalations',
        'ticket_metrics', 'ticket_slas', 'tickets', 'training_enrollments',
        'training_programs', 'user_basic_notification_preferences', 'webhooks'
    ];
    tbl_name TEXT;
BEGIN
    FOREACH tbl_name IN ARRAY missing_tables
    LOOP
        BEGIN
            -- Only FORCE if the table exists
            IF EXISTS (
                SELECT 1 FROM information_schema.tables
                WHERE table_schema = 'public'
                  AND table_name = tbl_name
                  AND table_type = 'BASE TABLE'
            ) THEN
                EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', tbl_name);
            END IF;
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'Could not force RLS on %: %', tbl_name, SQLERRM;
        END;
    END LOOP;

    RAISE NOTICE 'V81 Section B complete: FORCE RLS applied.';
END $$;


-- =============================================================================
-- VERIFICATION QUERY (run manually after migration)
-- =============================================================================
--
-- Count of tenant tables WITHOUT RLS (should be 0 after this migration):
--
-- SELECT count(*)
-- FROM information_schema.columns c
-- JOIN information_schema.tables t
--     ON c.table_name = t.table_name AND c.table_schema = t.table_schema
-- JOIN pg_class pc ON pc.relname = c.table_name
-- WHERE c.column_name = 'tenant_id'
--   AND c.table_schema = 'public'
--   AND t.table_type = 'BASE TABLE'
--   AND NOT pc.relrowsecurity;
--
-- Full coverage report:
--
-- SELECT
--     t.table_name,
--     CASE WHEN c.relrowsecurity THEN 'YES' ELSE 'NO' END AS rls_enabled,
--     CASE WHEN c.relforcerowsecurity THEN 'YES' ELSE 'NO' END AS rls_forced,
--     COUNT(p.policyname) AS policy_count,
--     STRING_AGG(p.policyname, ', ') AS policies
-- FROM information_schema.tables t
-- JOIN pg_class c ON c.relname = t.table_name
-- LEFT JOIN pg_policies p ON p.tablename = t.table_name
-- WHERE t.table_schema = 'public'
--   AND t.table_type = 'BASE TABLE'
--   AND EXISTS (
--       SELECT 1 FROM information_schema.columns col
--       WHERE col.table_name = t.table_name
--         AND col.column_name = 'tenant_id'
--   )
-- GROUP BY t.table_name, c.relrowsecurity, c.relforcerowsecurity
-- ORDER BY rls_enabled, t.table_name;
--
-- Expected: ALL 174 tenant-aware tables should have:
--   - rls_enabled = YES
--   - rls_forced = YES
--   - policy_count >= 2 (allow_all + tenant_rls)
-- =============================================================================
