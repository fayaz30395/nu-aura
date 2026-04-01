-- V48__fix_soft_delete_unique_constraints.sql
--
-- Problem: Soft-deleted records occupy unique constraint space. If a record is
-- soft-deleted (is_deleted = true), a new record with the same unique value
-- cannot be created. For example, if employee with code "EMP001" is deleted,
-- a new employee with the same code cannot be created in the same tenant.
--
-- Solution: Replace absolute unique constraints with partial unique indexes
-- that only enforce uniqueness among non-deleted (active) records.
-- PostgreSQL partial indexes: CREATE UNIQUE INDEX ... WHERE is_deleted = false;
--
-- Approach:
--   1. Drop JPA-generated unique indexes (created by Hibernate ddl-auto=update)
--   2. Drop inline UNIQUE column constraints from V0 (requires ALTER TABLE)
--   3. Create partial unique indexes with WHERE is_deleted = false
--
-- Note: Named table constraints (e.g., CONSTRAINT uc_xxx UNIQUE (...)) are
-- junction/composite constraints that typically don't conflict with soft deletes
-- (they involve entity relationships, not re-creatable business identifiers).
-- We only fix constraints on re-creatable business identifier columns.

-- ============================================================================
-- 1. EMPLOYEES — employee_code per tenant
-- ============================================================================
-- JPA defines: @Index(name = "idx_employee_code_tenant", columnList = "employeeCode,tenantId", unique = true)
ALTER TABLE employees DROP CONSTRAINT IF EXISTS idx_employee_code_tenant;
CREATE UNIQUE INDEX idx_employee_code_tenant
    ON employees (employee_code, tenant_id) WHERE is_deleted = false;

-- ============================================================================
-- 2. USERS — email per tenant
-- ============================================================================
-- JPA defines: @Index(name = "idx_user_email_tenant", columnList = "email,tenantId", unique = true)
ALTER TABLE users DROP CONSTRAINT IF EXISTS idx_user_email_tenant;
CREATE UNIQUE INDEX idx_user_email_tenant
    ON users (email, tenant_id) WHERE is_deleted = false;

-- ============================================================================
-- 3. TENANTS — code (globally unique)
-- ============================================================================
-- V0: code VARCHAR(50) NOT NULL UNIQUE  (inline constraint)
-- JPA defines: @Index(name = "idx_tenant_code", columnList = "code", unique = true)
ALTER TABLE tenants DROP CONSTRAINT IF EXISTS idx_tenant_code;
ALTER TABLE tenants DROP CONSTRAINT IF EXISTS tenants_code_key;
CREATE UNIQUE INDEX idx_tenant_code
    ON tenants (code) WHERE is_deleted = false;

-- ============================================================================
-- 4. DEPARTMENTS — code per tenant
-- ============================================================================
-- JPA defines: @Index(name = "idx_department_code_tenant", columnList = "code,tenantId", unique = true)
ALTER TABLE departments DROP CONSTRAINT IF EXISTS idx_department_code_tenant;
CREATE UNIQUE INDEX idx_department_code_tenant
    ON departments (code, tenant_id) WHERE is_deleted = false;

-- ============================================================================
-- 5. ROLES — code per tenant
-- ============================================================================
-- JPA defines: @Index(name = "idx_role_code_tenant", columnList = "code,tenantId", unique = true)
-- V0: code VARCHAR(50) NOT NULL (no inline UNIQUE on roles table, only on permissions)
ALTER TABLE roles DROP CONSTRAINT IF EXISTS idx_role_code_tenant;
CREATE UNIQUE INDEX idx_role_code_tenant
    ON roles (code, tenant_id) WHERE is_deleted = false;

-- ============================================================================
-- 6. PERMISSIONS — code (globally unique)
-- ============================================================================
-- V0: code VARCHAR(100) NOT NULL UNIQUE  (inline constraint)
-- JPA defines: @Index(name = "idx_permission_code", columnList = "code", unique = true)
ALTER TABLE permissions DROP CONSTRAINT IF EXISTS idx_permission_code;
ALTER TABLE permissions DROP CONSTRAINT IF EXISTS permissions_code_key;
CREATE UNIQUE INDEX idx_permission_code
    ON permissions (code) WHERE is_deleted = false;

-- ============================================================================
-- 7. LEAVE_TYPES — leave_code (globally unique in V0, should be per-tenant)
-- ============================================================================
-- V0: leave_code not marked UNIQUE in CREATE TABLE, but no harm adding partial
-- No inline unique constraint exists — skip ALTER TABLE

-- ============================================================================
-- 8. JOB_OPENINGS — job_code
-- ============================================================================
-- V0: job_code VARCHAR(50) NOT NULL UNIQUE
ALTER TABLE job_openings DROP CONSTRAINT IF EXISTS job_openings_job_code_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_job_openings_code_tenant_active
    ON job_openings (job_code, tenant_id) WHERE is_deleted = false;

-- ============================================================================
-- 9. PROJECTS (PSA) — project_code
-- ============================================================================
-- V0: project_code VARCHAR(50) NOT NULL UNIQUE
-- JPA defines: @Index(name = "idx_project_code_tenant", columnList = "project_code,tenant_id", unique = true)
ALTER TABLE projects DROP CONSTRAINT IF EXISTS idx_project_code_tenant;
ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_project_code_key;
CREATE UNIQUE INDEX idx_project_code_tenant
    ON projects (project_code, tenant_id) WHERE is_deleted = false;

-- ============================================================================
-- 9b. PSA_PROJECTS — project_code
-- ============================================================================
-- V0: project_code VARCHAR(50) NOT NULL UNIQUE
ALTER TABLE psa_projects DROP CONSTRAINT IF EXISTS psa_projects_project_code_key;
-- psa_projects has no is_deleted column — use regular unique index
CREATE UNIQUE INDEX IF NOT EXISTS idx_psa_projects_code_tenant_active
    ON psa_projects (project_code, tenant_id);

-- ============================================================================
-- 10. REPORT_DEFINITIONS — report_code
-- ============================================================================
-- V0: report_code VARCHAR(50) NOT NULL UNIQUE
ALTER TABLE report_definitions DROP CONSTRAINT IF EXISTS report_definitions_report_code_key;
-- report_definitions has no is_deleted column — use regular unique index
CREATE UNIQUE INDEX IF NOT EXISTS idx_report_definitions_code_active
    ON report_definitions (report_code, tenant_id);

-- ============================================================================
-- 11. DOCUMENT_CATEGORIES — category_code
-- ============================================================================
-- V0: category_code VARCHAR(50) NOT NULL UNIQUE
ALTER TABLE document_categories DROP CONSTRAINT IF EXISTS document_categories_category_code_key;
-- document_categories has no is_deleted column — use regular unique index
CREATE UNIQUE INDEX IF NOT EXISTS idx_document_categories_code_active
    ON document_categories (category_code, tenant_id);

-- ============================================================================
-- 12. DOCUMENT_TEMPLATES — template_code
-- ============================================================================
-- V0: template_code VARCHAR(50) NOT NULL UNIQUE
ALTER TABLE document_templates DROP CONSTRAINT IF EXISTS document_templates_template_code_key;
-- document_templates has no is_deleted column — use regular unique index
CREATE UNIQUE INDEX IF NOT EXISTS idx_document_templates_code_active
    ON document_templates (template_code, tenant_id);

-- ============================================================================
-- 13. LETTER_TEMPLATES — code
-- ============================================================================
-- V0: code VARCHAR(255) NOT NULL UNIQUE
ALTER TABLE letter_templates DROP CONSTRAINT IF EXISTS letter_templates_code_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_letter_templates_code_active
    ON letter_templates (code, tenant_id) WHERE is_deleted = false;

-- ============================================================================
-- 14. NOTIFICATION_TEMPLATES — code
-- ============================================================================
-- V0: code VARCHAR(255) NOT NULL UNIQUE
ALTER TABLE notification_templates DROP CONSTRAINT IF EXISTS notification_templates_code_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_notification_templates_code_active
    ON notification_templates (code, tenant_id) WHERE is_deleted = false;

-- ============================================================================
-- 15. COMPLIANCE_POLICIES — code
-- ============================================================================
-- V0: code VARCHAR(255) NOT NULL UNIQUE
ALTER TABLE compliance_policies DROP CONSTRAINT IF EXISTS compliance_policies_code_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_compliance_policies_code_active
    ON compliance_policies (code, tenant_id) WHERE is_deleted = false;

-- ============================================================================
-- 16. POSITIONS — code
-- ============================================================================
-- V0: code VARCHAR(255) NOT NULL UNIQUE
ALTER TABLE positions DROP CONSTRAINT IF EXISTS positions_code_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_positions_code_active
    ON positions (code, tenant_id) WHERE is_deleted = false;

-- ============================================================================
-- 17. RECOGNITION_BADGES — code
-- ============================================================================
-- V0: code VARCHAR(255) NOT NULL UNIQUE
ALTER TABLE recognition_badges DROP CONSTRAINT IF EXISTS recognition_badges_code_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_recognition_badges_code_active
    ON recognition_badges (code, tenant_id) WHERE is_deleted = false;

-- ============================================================================
-- 18. APP_PERMISSIONS — code
-- ============================================================================
-- V0: code VARCHAR(100) NOT NULL UNIQUE
-- JPA defines: @Index(name = "idx_app_perm_code", columnList = "code", unique = true)
ALTER TABLE app_permissions DROP CONSTRAINT IF EXISTS idx_app_perm_code;
ALTER TABLE app_permissions DROP CONSTRAINT IF EXISTS app_permissions_code_key;
CREATE UNIQUE INDEX idx_app_perm_code
    ON app_permissions (code) WHERE is_deleted = false;

-- ============================================================================
-- 19. NU_APPLICATIONS — code
-- ============================================================================
-- V0: code VARCHAR(20) NOT NULL UNIQUE
-- JPA defines: @Index(name = "idx_nu_app_code", columnList = "code", unique = true)
ALTER TABLE nu_applications DROP CONSTRAINT IF EXISTS idx_nu_app_code;
ALTER TABLE nu_applications DROP CONSTRAINT IF EXISTS nu_applications_code_key;
CREATE UNIQUE INDEX idx_nu_app_code
    ON nu_applications (code) WHERE is_deleted = false;

-- ============================================================================
-- 20. APP_ROLES — (code, tenant_id, application_id)
-- ============================================================================
-- V0: CONSTRAINT uc_app_roles_code_tenantId UNIQUE (code, tenant_id, application_id)
ALTER TABLE app_roles DROP CONSTRAINT IF EXISTS uc_app_roles_code_tenantid;
CREATE UNIQUE INDEX IF NOT EXISTS idx_app_roles_code_tenant_app_active
    ON app_roles (code, tenant_id, application_id) WHERE is_deleted = false;

-- ============================================================================
-- 21. PSA_INVOICES — invoice_number
-- ============================================================================
-- V0: invoice_number VARCHAR(50) NOT NULL UNIQUE
ALTER TABLE psa_invoices DROP CONSTRAINT IF EXISTS psa_invoices_invoice_number_key;
-- psa_invoices has no is_deleted column — use regular unique index
CREATE UNIQUE INDEX IF NOT EXISTS idx_psa_invoices_number_active
    ON psa_invoices (invoice_number, tenant_id);

-- ============================================================================
-- 22. CUSTOM_FIELD_DEFINITIONS — fieldCode per tenant
-- ============================================================================
-- JPA defines: @Index(name = "idx_cfd_code_tenant", columnList = "fieldCode,tenantId", unique = true)
ALTER TABLE custom_field_definitions DROP CONSTRAINT IF EXISTS idx_cfd_code_tenant;
CREATE UNIQUE INDEX idx_cfd_code_tenant
    ON custom_field_definitions (field_code, tenant_id) WHERE is_deleted = false;

-- ============================================================================
-- 23. WIKI_SPACES — slug per tenant (V15)
-- ============================================================================
-- V15: UNIQUE(tenant_id, slug)
ALTER TABLE wiki_spaces DROP CONSTRAINT IF EXISTS wiki_spaces_tenant_id_slug_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_wiki_spaces_slug_tenant_active
    ON wiki_spaces (tenant_id, slug) WHERE is_deleted = false;

-- ============================================================================
-- 24. BLOG_CATEGORIES — slug per tenant (V15)
-- ============================================================================
-- V15: UNIQUE(tenant_id, slug)
ALTER TABLE blog_categories DROP CONSTRAINT IF EXISTS blog_categories_tenant_id_slug_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_blog_categories_slug_tenant_active
    ON blog_categories (tenant_id, slug) WHERE is_deleted = false;

-- ============================================================================
-- 25. BLOG_POSTS — slug per tenant (V15)
-- ============================================================================
-- V15: UNIQUE(tenant_id, slug)
ALTER TABLE blog_posts DROP CONSTRAINT IF EXISTS blog_posts_tenant_id_slug_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_blog_posts_slug_tenant_active
    ON blog_posts (tenant_id, slug) WHERE is_deleted = false;

-- ============================================================================
-- CONSTRAINTS INTENTIONALLY NOT CHANGED:
-- ============================================================================
-- The following unique constraints are NOT modified because they enforce
-- referential integrity on junction/relationship tables (not re-creatable
-- business identifiers), or are on tables without soft-delete semantics:
--
-- - uc_announcement_reads_announcement_id_employee_id (junction)
-- - uc_candidates_tenant_id_candidate_code (recruitment candidates)
-- - uc_employee_loans_tenantId_loan_number (loan numbers — sequential, never reused)
-- - uc_employee_points_employee_id_tenant_id (1:1 relationship)
-- - uc_expense_claims_tenantId_claim_number (claim numbers — sequential, never reused)
-- - uc_feature_flags_tenant_id_feature_key (config data, not soft-deleted)
-- - uc_lms_content_progress_enrollmentId_contentId (junction)
-- - uc_lms_course_enrollments_courseId_employeeId (junction)
-- - uc_notification_channel_configs_tenantId_channel (config data)
-- - uc_policy_acknowledgments_policy_id_employee_id (junction)
-- - uc_poll_votes_tenant_id_poll_option_id (junction)
-- - uc_pulse_survey_responses_survey_id_employee_id (junction)
-- - uc_recognition_reactions_recognition_id_employee_id (junction)
-- - uc_succession_candidates_succession_plan_id_candidate_id (junction)
-- - uc_talent_pool_members_talent_pool_id_employee_id (junction)
-- - uc_tenant_applications_tenantId_application_id (junction)
-- - uc_tickets_tenant_id_ticket_number (ticket numbers — sequential, never reused)
-- - uc_user_app_access_user_id_application_id (junction)
-- - uc_user_basic_notification_preferences_user_id_tenant_id (1:1)
-- - uc_user_notification_preferences_userId_category (config)
-- - unique_contract_version (version numbering)
-- - uq_comp_off_employee_date (junction)
-- - uq_job_board_unique (junction)
-- - uq_fke_topic_partition_offset (Kafka DLT dedup — infrastructure)
-- - leave_balances unique (V26 — accrual data, not soft-deleted)
-- - exit_interviews.public_token (nullable, access token)
-- - generated_documents.document_number (sequential)
-- - fnf_settlements.reference_number (sequential)
-- - benefit_claims.claim_number (sequential)
-- - overtime_requests.request_number (sequential)
-- - travel_requests.request_number (sequential)
-- - lms_certificates.certificate_number (sequential)
-- - preboarding_candidates.access_token (access token)
-- - payment configs/transactions/batches/refunds (V17 — financial, never reused)
-- - wiki_pages UNIQUE(tenant_id, space_id, slug) — pages have is_deleted but slug
--   reuse within a space is uncommon; can be added later if needed
-- - wiki_page_watches UNIQUE(page_id, user_id) — junction
-- - blog_likes UNIQUE(post_id, user_id) — junction
-- - document workflow tables (V18) — version/tag uniqueness, not business identifiers
