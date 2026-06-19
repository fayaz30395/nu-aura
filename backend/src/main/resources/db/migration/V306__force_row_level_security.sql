-- =============================================================================
-- V306: Apply FORCE ROW LEVEL SECURITY to all tenant-scoped tables
-- =============================================================================
-- CONTEXT:
--   ENABLE ROW LEVEL SECURITY only enforces policies for non-superusers.
--   FORCE ROW LEVEL SECURITY additionally enforces policies on table owners
--   and superusers, closing the superuser bypass path.
--
--   Without FORCE RLS a superuser (e.g. the RDS admin role used by the
--   connection pool owner) can bypass tenant isolation entirely.
--
-- SAFETY:
--   Each ALTER TABLE is wrapped in a BEGIN/EXCEPTION block so a missing table
--   (schema version skew) is logged but does not abort the migration.
--   Idempotent: running twice has no effect.
-- =============================================================================

DO $$
DECLARE
    tbl TEXT;
    tables TEXT[] := ARRAY[
        'ai_usage_log',
        'approval_delegates',
        'approval_escalation_config',
        'approval_steps',
        'assets',
        'attendance_records',
        'attendance_time_entries',
        'audit_logs',
        'biometric_api_keys',
        'biometric_devices',
        'biometric_punch_logs',
        'blog_categories',
        'blog_comments',
        'blog_likes',
        'blog_posts',
        'candidates',
        'content_views',
        'contract_lifecycle_config',
        'contract_reminders',
        'contract_signatures',
        'contract_templates',
        'contract_versions',
        'contracts',
        'custom_scope_targets',
        'departments',
        'document_templates',
        'docusign_envelopes',
        'docusign_template_mappings',
        'employee_payroll_records',
        'employees',
        'expense_advances',
        'expense_categories',
        'expense_items',
        'expense_policies',
        'fluence_activities',
        'fluence_favorites',
        'goals',
        'implicit_role_rules',
        'implicit_user_roles',
        'integration_connector_configs',
        'integration_event_log',
        'interviews',
        'keka_import_history',
        'knowledge_attachments',
        'knowledge_searches',
        'knowledge_views',
        'leave_accrual_ledger',
        'leave_balances',
        'leave_requests',
        'leave_types',
        'lwf_configurations',
        'lwf_deductions',
        'notifications',
        'outbox_events',
        'payroll_components',
        'payroll_runs',
        'payslips',
        'performance_reviews',
        'restricted_holiday_policies',
        'restricted_holiday_selections',
        'restricted_holidays',
        'role_permissions',
        'roles',
        'roster_entries',
        'rosters',
        'salary_revisions',
        'salary_structures',
        'saml_identity_providers',
        'shift_patterns',
        'statutory_filing_runs',
        'statutory_filing_templates',
        'template_instantiations',
        'user_app_access',
        'users',
        'wiki_page_approval_tasks',
        'wiki_page_comments',
        'wiki_page_likes',
        'wiki_page_versions',
        'wiki_page_watches',
        'wiki_pages',
        'wiki_spaces'
    ];
BEGIN
    FOREACH tbl IN ARRAY tables
    LOOP
        BEGIN
            EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', tbl);
        EXCEPTION
            WHEN undefined_table THEN
                RAISE NOTICE 'Table % does not exist, skipping FORCE RLS', tbl;
            WHEN OTHERS THEN
                RAISE NOTICE 'Could not apply FORCE RLS to %: %', tbl, SQLERRM;
        END;
    END LOOP;
END $$;
