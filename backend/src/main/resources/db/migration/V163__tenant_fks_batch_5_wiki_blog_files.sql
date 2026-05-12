-- =============================================================================
-- V163 — Tenant FK Batch 5: Wiki + Blog + Files + Comments (25 FKs)
-- =============================================================================
-- Cumulative after this batch: V157(22) + V158(23) + V161(25) + V162(23) +
-- V163(25) = 118 of ~208 legacy tables (~57%).
--
-- Idempotent DO-block pattern matches V157/V158/V161/V162 — guarded by
-- information_schema lookups for both the constraint AND the table, so reruns
-- are safe and a missing table on a downstream branch does not abort the batch.
-- All FKs use ON DELETE CASCADE for clean tenant offboarding.
-- =============================================================================

-- Wiki core --------------------------------------------------------------------
DO
$$
BEGIN
    IF
NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'wiki_pages' AND constraint_name = 'fk_wiki_pages_tenant')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'wiki_pages') THEN
ALTER TABLE wiki_pages
  ADD CONSTRAINT fk_wiki_pages_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE;
END IF;
END $$;
DO
$$
BEGIN
    IF
NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'wiki_spaces' AND constraint_name = 'fk_wiki_spaces_tenant')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'wiki_spaces') THEN
ALTER TABLE wiki_spaces
  ADD CONSTRAINT fk_wiki_spaces_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE;
END IF;
END $$;
DO
$$
BEGIN
    IF
NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'wiki_space_members' AND constraint_name = 'fk_wiki_space_members_tenant')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'wiki_space_members') THEN
ALTER TABLE wiki_space_members
  ADD CONSTRAINT fk_wiki_space_members_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE;
END IF;
END $$;
DO
$$
BEGIN
    IF
NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'wiki_page_versions' AND constraint_name = 'fk_wiki_page_versions_tenant')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'wiki_page_versions') THEN
ALTER TABLE wiki_page_versions
  ADD CONSTRAINT fk_wiki_page_versions_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE;
END IF;
END $$;

-- Wiki engagement --------------------------------------------------------------
DO
$$
BEGIN
    IF
NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'wiki_page_comments' AND constraint_name = 'fk_wiki_page_comments_tenant')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'wiki_page_comments') THEN
ALTER TABLE wiki_page_comments
  ADD CONSTRAINT fk_wiki_page_comments_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE;
END IF;
END $$;
DO
$$
BEGIN
    IF
NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'wiki_inline_comments' AND constraint_name = 'fk_wiki_inline_comments_tenant')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'wiki_inline_comments') THEN
ALTER TABLE wiki_inline_comments
  ADD CONSTRAINT fk_wiki_inline_comments_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE;
END IF;
END $$;
DO
$$
BEGIN
    IF
NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'wiki_page_likes' AND constraint_name = 'fk_wiki_page_likes_tenant')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'wiki_page_likes') THEN
ALTER TABLE wiki_page_likes
  ADD CONSTRAINT fk_wiki_page_likes_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE;
END IF;
END $$;
DO
$$
BEGIN
    IF
NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'wiki_page_watches' AND constraint_name = 'fk_wiki_page_watches_tenant')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'wiki_page_watches') THEN
ALTER TABLE wiki_page_watches
  ADD CONSTRAINT fk_wiki_page_watches_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE;
END IF;
END $$;
DO
$$
BEGIN
    IF
NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'wiki_page_approval_tasks' AND constraint_name = 'fk_wiki_page_approval_tasks_tenant')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'wiki_page_approval_tasks') THEN
ALTER TABLE wiki_page_approval_tasks
  ADD CONSTRAINT fk_wiki_page_approval_tasks_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE;
END IF;
END $$;

-- Blog -------------------------------------------------------------------------
DO
$$
BEGIN
    IF
NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'blog_posts' AND constraint_name = 'fk_blog_posts_tenant')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'blog_posts') THEN
ALTER TABLE blog_posts
  ADD CONSTRAINT fk_blog_posts_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE;
END IF;
END $$;
DO
$$
BEGIN
    IF
NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'blog_categories' AND constraint_name = 'fk_blog_categories_tenant')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'blog_categories') THEN
ALTER TABLE blog_categories
  ADD CONSTRAINT fk_blog_categories_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE;
END IF;
END $$;
DO
$$
BEGIN
    IF
NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'blog_comments' AND constraint_name = 'fk_blog_comments_tenant')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'blog_comments') THEN
ALTER TABLE blog_comments
  ADD CONSTRAINT fk_blog_comments_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE;
END IF;
END $$;
DO
$$
BEGIN
    IF
NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'blog_likes' AND constraint_name = 'fk_blog_likes_tenant')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'blog_likes') THEN
ALTER TABLE blog_likes
  ADD CONSTRAINT fk_blog_likes_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE;
END IF;
END $$;

-- Letters + Drive --------------------------------------------------------------
DO
$$
BEGIN
    IF
NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'generated_letters' AND constraint_name = 'fk_generated_letters_tenant')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'generated_letters') THEN
ALTER TABLE generated_letters
  ADD CONSTRAINT fk_generated_letters_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE;
END IF;
END $$;
DO
$$
BEGIN
    IF
NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'letter_templates' AND constraint_name = 'fk_letter_templates_tenant')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'letter_templates') THEN
ALTER TABLE letter_templates
  ADD CONSTRAINT fk_letter_templates_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE;
END IF;
END $$;
DO
$$
BEGIN
    IF
NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'drive_file_mapping' AND constraint_name = 'fk_drive_file_mapping_tenant')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'drive_file_mapping') THEN
ALTER TABLE drive_file_mapping
  ADD CONSTRAINT fk_drive_file_mapping_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE;
END IF;
END $$;

-- Document workflow ------------------------------------------------------------
DO
$$
BEGIN
    IF
NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'document_versions' AND constraint_name = 'fk_document_versions_tenant')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'document_versions') THEN
ALTER TABLE document_versions
  ADD CONSTRAINT fk_document_versions_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE;
END IF;
END $$;
DO
$$
BEGIN
    IF
NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'document_approvals' AND constraint_name = 'fk_document_approvals_tenant')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'document_approvals') THEN
ALTER TABLE document_approvals
  ADD CONSTRAINT fk_document_approvals_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE;
END IF;
END $$;
DO
$$
BEGIN
    IF
NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'document_approval_tasks' AND constraint_name = 'fk_document_approval_tasks_tenant')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'document_approval_tasks') THEN
ALTER TABLE document_approval_tasks
  ADD CONSTRAINT fk_document_approval_tasks_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE;
END IF;
END $$;
DO
$$
BEGIN
    IF
NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'document_approval_workflows' AND constraint_name = 'fk_document_approval_workflows_tenant')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'document_approval_workflows') THEN
ALTER TABLE document_approval_workflows
  ADD CONSTRAINT fk_document_approval_workflows_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE;
END IF;
END $$;
DO
$$
BEGIN
    IF
NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'document_access' AND constraint_name = 'fk_document_access_tenant')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'document_access') THEN
ALTER TABLE document_access
  ADD CONSTRAINT fk_document_access_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE;
END IF;
END $$;
DO
$$
BEGIN
    IF
NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'document_tags' AND constraint_name = 'fk_document_tags_tenant')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'document_tags') THEN
ALTER TABLE document_tags
  ADD CONSTRAINT fk_document_tags_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE;
END IF;
END $$;
DO
$$
BEGIN
    IF
NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'document_expiry_tracking' AND constraint_name = 'fk_document_expiry_tracking_tenant')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'document_expiry_tracking') THEN
ALTER TABLE document_expiry_tracking
  ADD CONSTRAINT fk_document_expiry_tracking_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE;
END IF;
END $$;
DO
$$
BEGIN
    IF
NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'document_requests' AND constraint_name = 'fk_document_requests_tenant')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'document_requests') THEN
ALTER TABLE document_requests
  ADD CONSTRAINT fk_document_requests_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE;
END IF;
END $$;

-- Knowledge --------------------------------------------------------------------
DO
$$
BEGIN
    IF
NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'knowledge_attachments' AND constraint_name = 'fk_knowledge_attachments_tenant')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'knowledge_attachments') THEN
ALTER TABLE knowledge_attachments
  ADD CONSTRAINT fk_knowledge_attachments_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE;
END IF;
END $$;
