-- V33: Add missing indexes on FK columns in knowledge/fluence schema (PERF-04)
--
-- All 22 FK columns in the wiki/blog/knowledge tables created by V15 lack indexes.
-- Without these, JOINs and WHERE clauses filtering by created_by, updated_by, etc.
-- degrade to sequential scans as data grows.

-- blog_categories
CREATE INDEX IF NOT EXISTS idx_blog_categories_created_by ON blog_categories(created_by);
CREATE INDEX IF NOT EXISTS idx_blog_categories_updated_by ON blog_categories(updated_by);

-- blog_comments
CREATE INDEX IF NOT EXISTS idx_blog_comments_approved_by ON blog_comments(approved_by);
CREATE INDEX IF NOT EXISTS idx_blog_comments_created_by ON blog_comments(created_by);

-- blog_posts
CREATE INDEX IF NOT EXISTS idx_blog_posts_created_by ON blog_posts(created_by);
CREATE INDEX IF NOT EXISTS idx_blog_posts_published_by ON blog_posts(published_by);
CREATE INDEX IF NOT EXISTS idx_blog_posts_updated_by ON blog_posts(updated_by);

-- document_templates
CREATE INDEX IF NOT EXISTS idx_document_templates_created_by ON document_templates(created_by);
CREATE INDEX IF NOT EXISTS idx_document_templates_updated_by ON document_templates(updated_by);

-- knowledge_attachments
CREATE INDEX IF NOT EXISTS idx_knowledge_attachments_uploaded_by ON knowledge_attachments(uploaded_by);

-- knowledge_searches
CREATE INDEX IF NOT EXISTS idx_knowledge_searches_searched_by ON knowledge_searches(searched_by);

-- template_instantiations
CREATE INDEX IF NOT EXISTS idx_template_instantiations_created_by ON template_instantiations(created_by);
CREATE INDEX IF NOT EXISTS idx_template_instantiations_updated_by ON template_instantiations(updated_by);

-- wiki_page_approval_tasks
CREATE INDEX IF NOT EXISTS idx_wiki_page_approval_tasks_reviewed_by ON wiki_page_approval_tasks(reviewed_by);
CREATE INDEX IF NOT EXISTS idx_wiki_page_approval_tasks_submitted_by ON wiki_page_approval_tasks(submitted_by);

-- wiki_page_comments
CREATE INDEX IF NOT EXISTS idx_wiki_page_comments_created_by ON wiki_page_comments(created_by);

-- wiki_page_versions
CREATE INDEX IF NOT EXISTS idx_wiki_page_versions_created_by ON wiki_page_versions(created_by);

-- wiki_page_watches
CREATE INDEX IF NOT EXISTS idx_wiki_page_watches_page_id ON wiki_page_watches(page_id);

-- wiki_pages
CREATE INDEX IF NOT EXISTS idx_wiki_pages_created_by ON wiki_pages(created_by);
CREATE INDEX IF NOT EXISTS idx_wiki_pages_updated_by ON wiki_pages(updated_by);

-- wiki_spaces
CREATE INDEX IF NOT EXISTS idx_wiki_spaces_created_by ON wiki_spaces(created_by);
CREATE INDEX IF NOT EXISTS idx_wiki_spaces_updated_by ON wiki_spaces(updated_by);
