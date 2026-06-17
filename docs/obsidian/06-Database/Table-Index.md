---
title: Database Table Index — Complete Enumeration
tags: [database, schema, tables, postgresql, catalog, index]
---

# Database Table Index — Complete Enumeration

> Exhaustive companion to [[Schema]] (the curated, narrative view) and
> [[Migrations]]. Where [[Schema]] lists *representative* table groups, this
> note enumerates **every** distinct table created across the Flyway migration
> chain (`V0`–`V304`), grouped by domain cluster and assigned to a sub-app.
> Each distinct table appears **exactly once**.

## Purpose

Provide a flat, complete catalogue of every persistent table in the NU-AURA
PostgreSQL schema, extracted directly from the `CREATE TABLE` statements in
`backend/src/main/resources/db/migration/`. The cluster→sub-app mapping follows
the "Schema by domain" table in [[Schema]]; cluster membership is inferred from
table-name prefixes (e.g. `leave_*` → Leave/HRMS, `wiki_*`/`blog_*` →
Knowledge/Fluence). Tables that do not map cleanly to a named cluster are placed
in **Other / cross-cutting** and noted there rather than force-fit.

## Counts

| Metric | Value |
|--------|-------|
| **Distinct table names** | **331** |
| Total `CREATE TABLE` statements | 344 (across the migration chain) |
| Domain clusters | **18** (17 domain clusters + 1 "Other / cross-cutting") |

**How counted.** From the repository root:

```bash
grep -rhoiE 'CREATE TABLE (IF NOT EXISTS )?[a-z0-9_."]+' \
  backend/src/main/resources/db/migration/ \
  | sed -E 's/CREATE TABLE (IF NOT EXISTS )?//I' \
  | tr -d '"' | grep -vx 'above' | sort -u | wc -l
```

This yields **331** distinct names from **344** `CREATE TABLE` statements
(the 13-statement gap is repeated `CREATE TABLE IF NOT EXISTS` re-creations of
the same tables across migrations). The `above` artifact exclusion removes one
false positive from the SQL comment in `V15__knowledge_fluence_schema.sql`.
`outbox_events` was added by `V300__create_outbox_events.sql` (transactional
outbox table for the Railway/Kafka-fallback deploy) and is enumerated below.

## Tables by domain cluster

Every one of the 331 distinct tables appears in exactly one cluster below,
alphabetical within each cluster.

### Tenant & access control → [[Shared-Platform]]

- `app_permissions`
- `app_role_permissions`
- `app_roles`
- `custom_scope_targets`
- `implicit_role_rules`
- `implicit_user_roles`
- `nu_applications`
- `permissions`
- `role_permissions`
- `roles`
- `tenant_applications`
- `tenants`
- `user_app_access`
- `user_app_direct_permissions`
- `user_app_roles`
- `user_roles`
- `users`

### Org & staffing → [[Nu-HRMS]]

- `custom_field_definitions`
- `custom_field_values`
- `departments`
- `employee_code_sequence`
- `employee_profile_update_requests`
- `employee_skills`
- `employees`
- `employment_change_requests`
- `headcount_budgets`
- `headcount_positions`
- `office_locations`
- `organization_units`
- `positions`
- `profile_update_requests`

### Attendance & time → [[Nu-HRMS]]

- `attendance_records`
- `attendance_regularization_config`
- `attendance_time_entries`
- `biometric_api_keys`
- `biometric_devices`
- `biometric_punch_logs`
- `comp_off_requests`
- `comp_time_balances`
- `comp_time_transactions`
- `overtime_policies`
- `overtime_rate_tiers`
- `overtime_records`
- `overtime_requests`
- `roster_entries`
- `rosters`
- `shift_assignments`
- `shift_patterns`
- `shift_swap_requests`
- `shifts`
- `time_entries`

### Leave → [[Nu-HRMS]]

- `holidays`
- `leave_accrual_ledger`
- `leave_balances`
- `leave_requests`
- `leave_types`
- `restricted_holiday_policies`
- `restricted_holiday_selections`
- `restricted_holidays`

### Payroll, comp & statutory → [[Nu-HRMS]]

- `compensation_review_cycles`
- `compensation_revision_configs`
- `employee_esi_records`
- `employee_payroll_records`
- `employee_pf_records`
- `employee_tds_declarations`
- `esi_configs`
- `full_and_final_settlements`
- `global_payroll_runs`
- `lwf_configurations`
- `lwf_deductions`
- `monthly_statutory_contributions`
- `payroll_adjustments`
- `payroll_components`
- `payroll_locations`
- `payroll_runs`
- `payslips`
- `professional_tax_slabs`
- `provident_fund_configs`
- `salary_revisions`
- `salary_structures`
- `statutory_filing_runs`
- `statutory_filing_templates`
- `tax_declarations`
- `tax_proofs`
- `tax_regime_comparisons`
- `tds_slabs`

### Expenses, mileage & travel → [[Nu-HRMS]]

- `expense_advances`
- `expense_categories`
- `expense_claim_sequence`
- `expense_claims`
- `expense_items`
- `expense_policies`
- `mileage_claim_sequence`
- `mileage_logs`
- `mileage_policies`
- `travel_expenses`
- `travel_requests`

### Benefits, loans & wellness → [[Nu-HRMS]] / [[Nu-Grow]]

- `benefit_claim_documents`
- `benefit_claims`
- `benefit_dependents`
- `benefit_enrollments`
- `benefit_plans`
- `benefit_plans_enhanced`
- `employee_loans`
- `flex_benefit_allocations`
- `health_logs`
- `loan_repayments`
- `wellness_challenges`
- `wellness_points`
- `wellness_points_transactions`
- `wellness_programs`

### Performance, OKR & development → [[Nu-Grow]]

- `challenge_participants`
- `employee_points`
- `engagement_scores`
- `feedback`
- `feedback_360_cycles`
- `feedback_360_requests`
- `feedback_360_responses`
- `feedback_360_summaries`
- `goals`
- `key_results`
- `meeting_action_items`
- `meeting_agenda_items`
- `objectives`
- `okr_check_ins`
- `one_on_one_meetings`
- `peer_recognitions`
- `performance_improvement_plans`
- `performance_reviews`
- `pip_check_ins`
- `recognition_badges`
- `recognition_reactions`
- `recognitions`
- `review_competencies`
- `review_cycles`
- `skill_gaps`
- `succession_candidates`
- `succession_plans`

### Learning (LMS) & training → [[Nu-Grow]]

- `lms_certificates`
- `lms_content_progress`
- `lms_course_enrollments`
- `lms_course_modules`
- `lms_courses`
- `lms_learning_path_courses`
- `lms_learning_paths`
- `lms_module_contents`
- `lms_quiz_attempts`
- `lms_quiz_questions`
- `lms_quizzes`
- `training_enrollments`
- `training_programs`
- `training_skill_mappings`

### Surveys & sentiment → [[Nu-Grow]]

- `pulse_survey_answers`
- `pulse_survey_questions`
- `pulse_survey_responses`
- `pulse_surveys`
- `sentiment_analysis`
- `survey_answers`
- `survey_insights`
- `survey_questions`
- `survey_responses`
- `surveys`

### Recruitment, onboarding & exit → [[Nu-Hire]]

- `agency_submissions`
- `applicants`
- `background_verifications`
- `candidate_match_scores`
- `candidates`
- `exit_clearances`
- `exit_interviews`
- `exit_processes`
- `interview_scorecards`
- `interviews`
- `job_board_postings`
- `job_openings`
- `onboarding_checklist_templates`
- `onboarding_documents`
- `onboarding_processes`
- `onboarding_task_templates`
- `onboarding_tasks`
- `onboarding_template_tasks`
- `preboarding_candidates`
- `probation_evaluations`
- `probation_periods`
- `recruitment_agencies`
- `referral_policies`
- `employee_referrals`
- `resume_parsing_results`
- `scorecard_criteria`
- `scorecard_template_criteria`
- `scorecard_templates`
- `talent_pool_members`
- `talent_pools`
- `verification_checks`

### Contracts & e-signature → [[Nu-Hire]]

- `contract_lifecycle_config`
- `contract_reminders`
- `contract_signatures`
- `contract_templates`
- `contract_versions`
- `contracts`
- `docusign_envelopes`
- `docusign_template_mappings`
- `signature_approvals`
- `signature_requests`

### Knowledge, wiki & blog → [[Nu-Fluence]]

- `blog_categories`
- `blog_comments`
- `blog_likes`
- `blog_posts`
- `fluence_activities`
- `fluence_favorites`
- `knowledge_attachments`
- `knowledge_searches`
- `knowledge_templates`
- `knowledge_views`
- `wiki_inline_comments`
- `wiki_page_approval_tasks`
- `wiki_page_comments`
- `wiki_page_likes`
- `wiki_page_versions`
- `wiki_page_watches`
- `wiki_pages`
- `wiki_space_members`
- `wiki_spaces`

### Documents & templates → [[Nu-Fluence]]

- `document_access`
- `document_approval_tasks`
- `document_approval_workflows`
- `document_approvals`
- `document_categories`
- `document_expiry_tracking`
- `document_requests`
- `document_tags`
- `document_templates`
- `document_versions`
- `documents`
- `generated_documents`
- `generated_letters`
- `letter_templates`
- `template_instantiations`

### Engagement, social & announcements → [[Nu-Grow]] / [[Nu-Fluence]]

- `announcement_reads`
- `announcement_target_departments`
- `announcement_target_employees`
- `announcements`
- `calendar_events`
- `chatbot_conversations`
- `content_views`
- `poll_options`
- `poll_votes`
- `post_comments`
- `post_reactions`
- `social_posts`

### Compliance, audit & data subject rights → [[Shared-Platform]]

- `audit_logs`
- `compliance_alerts`
- `compliance_audit_logs`
- `compliance_checklists`
- `compliance_policies`
- `dsr_requests`
- `password_history`
- `policy_acknowledgments`

### Projects / PSA → [[Nu-HRMS]]

- `allocation_requests`
- `milestones`
- `project_employees`
- `project_members`
- `project_time_entries`
- `projects`
- `psa_invoices`
- `psa_project_allocations`
- `psa_projects`
- `psa_time_entries`
- `psa_timesheets`
- `resource_conflict_log`

### Integration, notifications, payments & analytics → [[Shared-Platform]]

- `ai_usage_log`
- `analytics_insights`
- `analytics_metrics`
- `analytics_snapshots`
- `api_key_scopes`
- `api_keys`
- `approval_delegates`
- `approval_escalation_config`
- `approval_steps`
- `attrition_predictions`
- `budget_scenarios`
- `currencies`
- `dashboard_widgets`
- `dashboards`
- `drive_file_mapping`
- `email_notifications`
- `exchange_rates`
- `failed_kafka_events`
- `feature_flags`
- `file_metadata`
- `integration_connector_configs`
- `integration_event_log`
- `keka_import_history`
- `multi_channel_notifications`
- `notification_channel_configs`
- `notification_template_channels`
- `notification_templates`
- `notifications`
- `payment_batch_transactions`
- `payment_batches`
- `payment_configs`
- `payment_refunds`
- `payment_transactions`
- `payment_webhooks`
- `report_definitions`
- `report_executions`
- `report_templates`
- `saml_identity_providers`
- `scheduled_reports`
- `smart_recommendations`
- `user_basic_notification_preferences`
- `user_notification_preferences`
- `user_notification_quiet_days`
- `webhook_deliveries`
- `webhook_events`
- `webhooks`
- `workflow_definitions`
- `workflow_executions`
- `workflow_rules`
- `workforce_trends`

### Other / cross-cutting

These tables do not map to a single named domain cluster — they are
infrastructure / framework / generic-platform tables (a distributed-lock table,
generic asset-management, generic ticketing/helpdesk, and step-execution
plumbing) — so they are listed here rather than guessed into a domain.

- `asset_maintenance_requests` — generic asset management
- `asset_recoveries` — generic asset management
- `assets` — generic asset management
- `outbox_events` — transactional outbox for Kafka fallback on Railway (added `V300`; RLS added `V303`; nullable `tenant_id` to support system/infra events)
- `shedlock` — ShedLock distributed scheduler-lock table (framework infra)
- `step_executions` — generic workflow/process step-execution plumbing
- `ticket_categories` — generic helpdesk/ticketing
- `ticket_comments` — generic helpdesk/ticketing
- `ticket_escalations` — generic helpdesk/ticketing
- `ticket_metrics` — generic helpdesk/ticketing
- `ticket_slas` — generic helpdesk/ticketing
- `tickets` — generic helpdesk/ticketing

## Related Links

- [[Schema]] · [[Data-Dictionary]] — per-column detail + FK map · [[ERD]] · [[Migrations]] · [[Data-Flows]]
- [[Nu-HRMS]] · [[Nu-Hire]] · [[Nu-Grow]] · [[Nu-Fluence]] · [[Shared-Platform]]
- [[00-Home]] — vault index
