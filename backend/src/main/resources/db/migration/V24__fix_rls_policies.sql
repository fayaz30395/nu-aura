-- =============================================================================
-- V24 - Fix Row Level Security Policy Defects
-- =============================================================================
--
-- Defects found in pre-release RLS audit (2026-03-14):
--
-- DEFECT A (CRITICAL) — V15 Fluence tables:
--   15 tables had ENABLE ROW LEVEL SECURITY with ZERO CREATE POLICY statements.
--   PostgreSQL deny-by-default RLS means non-superuser DB connections are
--   completely locked out of all Fluence/Knowledge tables.
--   Fix: Add permissive (allow-all) policies. Tenant isolation for these tables
--   is enforced at the application layer (WHERE tenant_id = :tenantId in JPA
--   queries) plus Spring Security RBAC checks.
--
-- DEFECT B (HIGH) — V16 Contract tables:
--   Policies use current_setting('app.current_tenant_id') but the Spring Boot
--   TenantFilter only sets a Java ThreadLocal — it never issues
--   "SET LOCAL app.current_tenant_id = '<uuid>'" on the JDBC connection.
--   As a result, the current_setting() call either:
--     (a) throws ERROR if the variable is unset and no default given, or
--     (b) returns NULL causing the policy to reject all rows.
--   Fix: Replace the broken expression-based policies with permissive policies.
--   Application-layer isolation via TenantContext + JPA WHERE clauses remains
--   the primary enforcement mechanism.
--   A proper Hibernate StatementInspector that sets the session var at
--   connection-borrow time is tracked as a follow-up for V25.
--
-- ARCHITECTURE NOTE:
--   This project uses shared-DB shared-schema multi-tenancy.  The primary
--   isolation layer is application-code: every JPA repository method filters
--   by tenant_id using Spring Data method names or explicit @Query annotations,
--   and DataScopeService enforces data-scope policies for non-admin users.
--   PostgreSQL RLS is a defence-in-depth layer, not the primary guard.
-- =============================================================================


-- =============================================================================
-- SECTION A — Fix Fluence / Knowledge tables (V15 deficit)
-- =============================================================================
-- All 15 tables had RLS enabled but no policies.  We add permissive policies
-- so that the DB role used by the connection pool can read/write rows.
-- The application layer provides tenant filtering.

CREATE
POLICY wiki_spaces_allow_all ON wiki_spaces
    AS PERMISSIVE FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE
POLICY wiki_pages_allow_all ON wiki_pages
    AS PERMISSIVE FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE
POLICY wiki_page_versions_allow_all ON wiki_page_versions
    AS PERMISSIVE FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE
POLICY wiki_page_comments_allow_all ON wiki_page_comments
    AS PERMISSIVE FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE
POLICY wiki_page_watches_allow_all ON wiki_page_watches
    AS PERMISSIVE FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE
POLICY blog_categories_allow_all ON blog_categories
    AS PERMISSIVE FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE
POLICY blog_posts_allow_all ON blog_posts
    AS PERMISSIVE FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE
POLICY blog_comments_allow_all ON blog_comments
    AS PERMISSIVE FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE
POLICY blog_likes_allow_all ON blog_likes
    AS PERMISSIVE FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE
POLICY document_templates_allow_all ON document_templates
    AS PERMISSIVE FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE
POLICY template_instantiations_allow_all ON template_instantiations
    AS PERMISSIVE FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE
POLICY knowledge_attachments_allow_all ON knowledge_attachments
    AS PERMISSIVE FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE
POLICY knowledge_views_allow_all ON knowledge_views
    AS PERMISSIVE FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE
POLICY knowledge_searches_allow_all ON knowledge_searches
    AS PERMISSIVE FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE
POLICY wiki_page_approval_tasks_allow_all ON wiki_page_approval_tasks
    AS PERMISSIVE FOR ALL
    USING (true)
    WITH CHECK (true);


-- =============================================================================
-- SECTION B — Fix Contract tables (V16 broken expression-based policies)
-- =============================================================================
-- Drop the existing policies that rely on current_setting('app.current_tenant_id')
-- (which is never set by the Java application) and replace with permissive
-- allow-all policies backed by application-layer isolation.

-- contracts
DROP
POLICY IF EXISTS contracts_tenant_isolation ON contracts;
CREATE
POLICY contracts_allow_all ON contracts
    AS PERMISSIVE FOR ALL
    USING (true)
    WITH CHECK (true);

-- contract_versions
DROP
POLICY IF EXISTS contract_versions_isolation ON contract_versions;
CREATE
POLICY contract_versions_allow_all ON contract_versions
    AS PERMISSIVE FOR ALL
    USING (true)
    WITH CHECK (true);

-- contract_signatures
DROP
POLICY IF EXISTS contract_signatures_isolation ON contract_signatures;
CREATE
POLICY contract_signatures_allow_all ON contract_signatures
    AS PERMISSIVE FOR ALL
    USING (true)
    WITH CHECK (true);

-- contract_templates
DROP
POLICY IF EXISTS contract_templates_tenant_isolation ON contract_templates;
CREATE
POLICY contract_templates_allow_all ON contract_templates
    AS PERMISSIVE FOR ALL
    USING (true)
    WITH CHECK (true);

-- contract_reminders  (tenant_id column added in V23)
DROP
POLICY IF EXISTS contract_reminders_isolation ON contract_reminders;
CREATE
POLICY contract_reminders_allow_all ON contract_reminders
    AS PERMISSIVE FOR ALL
    USING (true)
    WITH CHECK (true);


-- =============================================================================
-- FUTURE WORK (tracked as V25):
-- =============================================================================
-- Once the Hibernate StatementInspector sets
--   SET LOCAL app.current_tenant_id = '<uuid>'
-- on every connection-borrow, replace the allow-all policies above with
-- proper tenant-scoped policies, e.g.:
--
--   DROP POLICY contracts_allow_all ON contracts;
--   CREATE POLICY contracts_tenant_isolation ON contracts
--       USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid)
--       WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
--
-- Note: use current_setting('...', true) — the second argument `true` makes it
-- return NULL instead of throwing if the variable is not set, which gives a
-- safer fail-closed behaviour.
-- =============================================================================
