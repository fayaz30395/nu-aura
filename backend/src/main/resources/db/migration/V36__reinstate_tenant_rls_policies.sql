-- =============================================================================
-- V36 - Reinstate Tenant-Scoped RLS Policies (Graceful Mode)
-- =============================================================================
--
-- PREREQUISITE: TenantRlsTransactionManager (re-enabled in JpaConfig) now sets
--   SET LOCAL app.current_tenant_id = '<uuid>'
-- on every JDBC transaction, making current_setting() available to RLS policies.
--
-- STRATEGY: "Graceful defence-in-depth"
--   We replace the V24 allow-all policies with RESTRICTIVE policies that enforce
--   tenant isolation WHEN the session variable is set, but gracefully allow all
--   rows WHEN it is not set (e.g., Flyway migrations, background jobs, startup).
--
--   How PostgreSQL evaluates combined PERMISSIVE + RESTRICTIVE policies:
--     A row is visible IF:
--       (passes at least one PERMISSIVE policy)
--       AND (passes ALL RESTRICTIVE policies)
--
--   We keep the existing PERMISSIVE allow-all from V24 (USING true) and add a
--   RESTRICTIVE policy per table:
--     USING (
--       tenant_id = current_setting('app.current_tenant_id', true)::uuid
--       OR current_setting('app.current_tenant_id', true) IS NULL
--       OR current_setting('app.current_tenant_id', true) = ''
--     )
--
--   Result:
--     - Session var SET to a UUID → only matching tenant rows visible (enforced)
--     - Session var NOT SET (NULL) → all rows visible (graceful fallback)
--     - Session var EMPTY STRING   → all rows visible (graceful fallback)
--
--   This means:
--     ✅ Normal request flow (TenantRlsTransactionManager active): RLS enforced
--     ✅ Flyway migrations: not affected (no session var, falls through to allow-all)
--     ✅ Background jobs without tenant: not affected (falls through to allow-all)
--     ✅ If TenantRlsTransactionManager is disabled via config: app-layer isolation
--        still works, RLS falls through to allow-all
-- =============================================================================


-- =============================================================================
-- SECTION A — Fluence / Knowledge tables (15 tables from V15)
-- =============================================================================
-- V24 added PERMISSIVE allow-all policies. We now add RESTRICTIVE tenant-scoped
-- policies on top. The PERMISSIVE policies remain as the baseline.

CREATE POLICY wiki_spaces_tenant_rls ON wiki_spaces
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
    );

CREATE POLICY wiki_pages_tenant_rls ON wiki_pages
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
    );

CREATE POLICY wiki_page_versions_tenant_rls ON wiki_page_versions
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
    );

CREATE POLICY wiki_page_comments_tenant_rls ON wiki_page_comments
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
    );

CREATE POLICY wiki_page_watches_tenant_rls ON wiki_page_watches
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
    );

CREATE POLICY blog_categories_tenant_rls ON blog_categories
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
    );

CREATE POLICY blog_posts_tenant_rls ON blog_posts
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
    );

CREATE POLICY blog_comments_tenant_rls ON blog_comments
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
    );

CREATE POLICY blog_likes_tenant_rls ON blog_likes
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
    );

CREATE POLICY document_templates_tenant_rls ON document_templates
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
    );

CREATE POLICY template_instantiations_tenant_rls ON template_instantiations
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
    );

CREATE POLICY knowledge_attachments_tenant_rls ON knowledge_attachments
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
    );

CREATE POLICY knowledge_views_tenant_rls ON knowledge_views
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
    );

CREATE POLICY knowledge_searches_tenant_rls ON knowledge_searches
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
    );

CREATE POLICY wiki_page_approval_tasks_tenant_rls ON wiki_page_approval_tasks
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
    );


-- =============================================================================
-- SECTION B — Contract tables (5 tables from V16)
-- =============================================================================
-- V24 replaced the broken current_setting policies with allow-all.
-- We now add RESTRICTIVE tenant-scoped policies on top of the V24 allow-all.

CREATE POLICY contracts_tenant_rls ON contracts
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
    );

CREATE POLICY contract_versions_tenant_rls ON contract_versions
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
    );

CREATE POLICY contract_signatures_tenant_rls ON contract_signatures
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
    );

CREATE POLICY contract_templates_tenant_rls ON contract_templates
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
    );

CREATE POLICY contract_reminders_tenant_rls ON contract_reminders
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
    );


-- =============================================================================
-- VERIFICATION QUERY (run manually after migration to confirm RLS is active)
-- =============================================================================
-- SELECT schemaname, tablename, policyname, permissive, cmd, qual
-- FROM pg_policies
-- WHERE tablename IN ('contracts', 'wiki_spaces', 'blog_posts')
-- ORDER BY tablename, policyname;
--
-- Expected: each table should have TWO policies:
--   1. *_allow_all (PERMISSIVE) from V24
--   2. *_tenant_rls (RESTRICTIVE) from V36
-- =============================================================================
