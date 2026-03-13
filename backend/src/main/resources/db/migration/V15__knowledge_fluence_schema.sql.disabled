-- NU-Fluence Knowledge Management Schema (Wiki, Blogs, Templates)

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable JSONB and full-text search capabilities
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- For trigram similarity searches

-- ============================================================================
-- WIKI SPACES (Folder structure for organizing wiki pages)
-- ============================================================================
CREATE TABLE IF NOT EXISTS wiki_spaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,

    name VARCHAR(200) NOT NULL,
    description TEXT,
    slug VARCHAR(200) NOT NULL,
    icon VARCHAR(50),
    visibility VARCHAR(50) NOT NULL CHECK (visibility IN ('PUBLIC', 'ORGANIZATION', 'TEAM', 'PRIVATE', 'RESTRICTED')),
    color VARCHAR(7),
    order_index INT DEFAULT 0,
    is_archived BOOLEAN NOT NULL DEFAULT FALSE,
    archived_at TIMESTAMPTZ,
    archived_by UUID,

    UNIQUE(tenant_id, slug),
    CONSTRAINT fk_wiki_spaces_created_by FOREIGN KEY (created_by) REFERENCES users(id),
    CONSTRAINT fk_wiki_spaces_updated_by FOREIGN KEY (updated_by) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_wiki_spaces_tenant ON wiki_spaces(tenant_id);
CREATE INDEX IF NOT EXISTS idx_wiki_spaces_visibility ON wiki_spaces(visibility);
CREATE INDEX IF NOT EXISTS idx_wiki_spaces_is_archived ON wiki_spaces(is_archived);

COMMENT ON TABLE wiki_spaces IS 'Wiki spaces for organizing pages hierarchically';
COMMENT ON COLUMN wiki_spaces.slug IS 'URL-friendly identifier for the space';
COMMENT ON COLUMN wiki_spaces.visibility IS 'Access level: PUBLIC, ORGANIZATION, TEAM, PRIVATE, RESTRICTED';

-- ============================================================================
-- WIKI PAGES (Main wiki content with versioning and full-text search)
-- ============================================================================
CREATE TABLE IF NOT EXISTS wiki_pages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,

    space_id UUID NOT NULL,
    parent_page_id UUID,
    title VARCHAR(500) NOT NULL,
    slug VARCHAR(500) NOT NULL,
    excerpt TEXT,
    content JSONB NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PUBLISHED', 'ARCHIVED')),
    visibility VARCHAR(50) NOT NULL CHECK (visibility IN ('PUBLIC', 'ORGANIZATION', 'TEAM', 'PRIVATE', 'RESTRICTED')),

    view_count INT NOT NULL DEFAULT 0,
    like_count INT NOT NULL DEFAULT 0,
    comment_count INT NOT NULL DEFAULT 0,
    last_viewed_at TIMESTAMPTZ,
    last_viewed_by UUID,

    is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
    pinned_at TIMESTAMPTZ,
    pinned_by UUID,

    published_at TIMESTAMPTZ,
    published_by UUID,

    -- TODO: Add back search_vector once full-text search is configured
    -- search_vector TSVECTOR GENERATED ALWAYS AS (
    --     setweight(to_tsvector('english', COALESCE(title, '')), 'A') ||
    --     setweight(to_tsvector('english', COALESCE(excerpt, '')), 'B')
    -- ) STORED,

    UNIQUE(tenant_id, space_id, slug),
    CONSTRAINT fk_wiki_pages_space FOREIGN KEY (space_id) REFERENCES wiki_spaces(id) ON DELETE CASCADE,
    CONSTRAINT fk_wiki_pages_parent FOREIGN KEY (parent_page_id) REFERENCES wiki_pages(id) ON DELETE SET NULL,
    CONSTRAINT fk_wiki_pages_created_by FOREIGN KEY (created_by) REFERENCES users(id),
    CONSTRAINT fk_wiki_pages_updated_by FOREIGN KEY (updated_by) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_wiki_pages_tenant ON wiki_pages(tenant_id);
CREATE INDEX IF NOT EXISTS idx_wiki_pages_space ON wiki_pages(space_id);
CREATE INDEX IF NOT EXISTS idx_wiki_pages_parent ON wiki_pages(parent_page_id);
CREATE INDEX IF NOT EXISTS idx_wiki_pages_status ON wiki_pages(status);
CREATE INDEX IF NOT EXISTS idx_wiki_pages_visibility ON wiki_pages(visibility);
-- TODO: Add back GIN index once search_vector column is restored
-- CREATE INDEX IF NOT EXISTS idx_wiki_pages_search ON wiki_pages USING GIN (search_vector);
CREATE INDEX IF NOT EXISTS idx_wiki_pages_slug ON wiki_pages(slug);
CREATE INDEX IF NOT EXISTS idx_wiki_pages_is_pinned ON wiki_pages(is_pinned);

COMMENT ON TABLE wiki_pages IS 'Wiki pages with hierarchical structure and full-text search';
COMMENT ON COLUMN wiki_pages.content IS 'Rich content stored as JSONB (editor state)';
-- TODO: Uncomment once search_vector column is restored
-- COMMENT ON COLUMN wiki_pages.search_vector IS 'Tsvector for full-text search on title and excerpt';

-- ============================================================================
-- WIKI PAGE VERSIONS (Version history for tracking changes)
-- ============================================================================
CREATE TABLE IF NOT EXISTS wiki_page_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    page_id UUID NOT NULL,
    version_number INT NOT NULL,
    title VARCHAR(500) NOT NULL,
    excerpt TEXT,
    content JSONB NOT NULL,
    change_summary VARCHAR(500),

    created_by UUID,

    CONSTRAINT fk_wiki_page_versions_page FOREIGN KEY (page_id) REFERENCES wiki_pages(id) ON DELETE CASCADE,
    CONSTRAINT fk_wiki_page_versions_created_by FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_wiki_page_versions_tenant ON wiki_page_versions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_wiki_page_versions_page ON wiki_page_versions(page_id, version_number DESC);

COMMENT ON TABLE wiki_page_versions IS 'Audit trail of wiki page changes';

-- ============================================================================
-- WIKI PAGE COMMENTS (Discussion/collaboration)
-- ============================================================================
CREATE TABLE IF NOT EXISTS wiki_page_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,

    page_id UUID NOT NULL,
    parent_comment_id UUID,
    content TEXT NOT NULL,

    like_count INT NOT NULL DEFAULT 0,
    is_pinned BOOLEAN NOT NULL DEFAULT FALSE,

    CONSTRAINT fk_wiki_page_comments_page FOREIGN KEY (page_id) REFERENCES wiki_pages(id) ON DELETE CASCADE,
    CONSTRAINT fk_wiki_page_comments_parent FOREIGN KEY (parent_comment_id) REFERENCES wiki_page_comments(id) ON DELETE CASCADE,
    CONSTRAINT fk_wiki_page_comments_created_by FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_wiki_page_comments_tenant ON wiki_page_comments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_wiki_page_comments_page ON wiki_page_comments(page_id);
CREATE INDEX IF NOT EXISTS idx_wiki_page_comments_parent ON wiki_page_comments(parent_comment_id);

COMMENT ON TABLE wiki_page_comments IS 'Comments and discussions on wiki pages';

-- ============================================================================
-- WIKI PAGE WATCHES (Notification subscriptions)
-- ============================================================================
CREATE TABLE IF NOT EXISTS wiki_page_watches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    page_id UUID NOT NULL,
    user_id UUID NOT NULL,
    watch_type VARCHAR(50) NOT NULL DEFAULT 'COMMENTS' CHECK (watch_type IN ('ALL', 'COMMENTS', 'NONE')),

    UNIQUE(page_id, user_id),
    CONSTRAINT fk_wiki_page_watches_page FOREIGN KEY (page_id) REFERENCES wiki_pages(id) ON DELETE CASCADE,
    CONSTRAINT fk_wiki_page_watches_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_wiki_page_watches_tenant ON wiki_page_watches(tenant_id);
CREATE INDEX IF NOT EXISTS idx_wiki_page_watches_user ON wiki_page_watches(user_id);

COMMENT ON TABLE wiki_page_watches IS 'User subscriptions to wiki page updates';

-- ============================================================================
-- BLOG CATEGORIES (Blog organization)
-- ============================================================================
CREATE TABLE IF NOT EXISTS blog_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,

    name VARCHAR(200) NOT NULL,
    slug VARCHAR(200) NOT NULL,
    description TEXT,
    color VARCHAR(7),
    icon VARCHAR(50),
    order_index INT DEFAULT 0,

    UNIQUE(tenant_id, slug),
    CONSTRAINT fk_blog_categories_created_by FOREIGN KEY (created_by) REFERENCES users(id),
    CONSTRAINT fk_blog_categories_updated_by FOREIGN KEY (updated_by) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_blog_categories_tenant ON blog_categories(tenant_id);

COMMENT ON TABLE blog_categories IS 'Blog post categories';

-- ============================================================================
-- BLOG POSTS (Blog articles with content and metadata)
-- ============================================================================
CREATE TABLE IF NOT EXISTS blog_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,

    category_id UUID,
    title VARCHAR(500) NOT NULL,
    slug VARCHAR(500) NOT NULL,
    excerpt TEXT,
    featured_image_url VARCHAR(500),
    content JSONB NOT NULL,

    status VARCHAR(50) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PUBLISHED', 'SCHEDULED', 'ARCHIVED')),
    visibility VARCHAR(50) NOT NULL CHECK (visibility IN ('PUBLIC', 'ORGANIZATION', 'TEAM', 'PRIVATE', 'RESTRICTED')),

    view_count INT NOT NULL DEFAULT 0,
    like_count INT NOT NULL DEFAULT 0,
    comment_count INT NOT NULL DEFAULT 0,

    published_at TIMESTAMPTZ,
    published_by UUID,
    scheduled_for TIMESTAMPTZ,

    last_viewed_at TIMESTAMPTZ,
    last_viewed_by UUID,

    is_featured BOOLEAN NOT NULL DEFAULT FALSE,
    featured_until TIMESTAMPTZ,

    read_time_minutes INT,

    -- TODO: Add back search_vector once full-text search is configured
    -- search_vector TSVECTOR GENERATED ALWAYS AS (
    --     setweight(to_tsvector('english', COALESCE(title, '')), 'A') ||
    --     setweight(to_tsvector('english', COALESCE(excerpt, '')), 'B')
    -- ) STORED,

    UNIQUE(tenant_id, slug),
    CONSTRAINT fk_blog_posts_category FOREIGN KEY (category_id) REFERENCES blog_categories(id) ON DELETE SET NULL,
    CONSTRAINT fk_blog_posts_created_by FOREIGN KEY (created_by) REFERENCES users(id),
    CONSTRAINT fk_blog_posts_updated_by FOREIGN KEY (updated_by) REFERENCES users(id),
    CONSTRAINT fk_blog_posts_published_by FOREIGN KEY (published_by) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_blog_posts_tenant ON blog_posts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_blog_posts_category ON blog_posts(category_id);
CREATE INDEX IF NOT EXISTS idx_blog_posts_status ON blog_posts(status);
CREATE INDEX IF NOT EXISTS idx_blog_posts_visibility ON blog_posts(visibility);
CREATE INDEX IF NOT EXISTS idx_blog_posts_published ON blog_posts(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_blog_posts_featured ON blog_posts(is_featured, featured_until);
-- TODO: Add back GIN index once search_vector column is restored
-- CREATE INDEX IF NOT EXISTS idx_blog_posts_search ON blog_posts USING GIN (search_vector);
CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON blog_posts(slug);

COMMENT ON TABLE blog_posts IS 'Blog articles with rich content and metadata';
COMMENT ON COLUMN blog_posts.content IS 'Rich content stored as JSONB (editor state)';
-- TODO: Uncomment once search_vector column is restored
-- COMMENT ON COLUMN blog_posts.search_vector IS 'Tsvector for full-text search on title and excerpt';

-- ============================================================================
-- BLOG COMMENTS (Comments on blog posts)
-- ============================================================================
CREATE TABLE IF NOT EXISTS blog_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,

    post_id UUID NOT NULL,
    parent_comment_id UUID,
    content TEXT NOT NULL,

    like_count INT NOT NULL DEFAULT 0,
    is_approved BOOLEAN NOT NULL DEFAULT FALSE,
    approved_at TIMESTAMPTZ,
    approved_by UUID,

    CONSTRAINT fk_blog_comments_post FOREIGN KEY (post_id) REFERENCES blog_posts(id) ON DELETE CASCADE,
    CONSTRAINT fk_blog_comments_parent FOREIGN KEY (parent_comment_id) REFERENCES blog_comments(id) ON DELETE CASCADE,
    CONSTRAINT fk_blog_comments_created_by FOREIGN KEY (created_by) REFERENCES users(id),
    CONSTRAINT fk_blog_comments_approved_by FOREIGN KEY (approved_by) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_blog_comments_tenant ON blog_comments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_blog_comments_post ON blog_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_blog_comments_parent ON blog_comments(parent_comment_id);
CREATE INDEX IF NOT EXISTS idx_blog_comments_is_approved ON blog_comments(is_approved);

COMMENT ON TABLE blog_comments IS 'Comments on blog posts with moderation support';

-- ============================================================================
-- BLOG LIKES (User reactions to blog posts)
-- ============================================================================
CREATE TABLE IF NOT EXISTS blog_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    post_id UUID NOT NULL,
    user_id UUID NOT NULL,

    UNIQUE(post_id, user_id),
    CONSTRAINT fk_blog_likes_post FOREIGN KEY (post_id) REFERENCES blog_posts(id) ON DELETE CASCADE,
    CONSTRAINT fk_blog_likes_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_blog_likes_tenant ON blog_likes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_blog_likes_post ON blog_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_blog_likes_user ON blog_likes(user_id);

COMMENT ON TABLE blog_likes IS 'Likes on blog posts (denormalized to like_count in blog_posts)';

-- ============================================================================
-- DOCUMENT TEMPLATES (Reusable templates with JSONB content)
-- ============================================================================
CREATE TABLE IF NOT EXISTS document_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,

    name VARCHAR(200) NOT NULL,
    slug VARCHAR(200) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    content JSONB NOT NULL,

    template_variables JSONB,  -- Array of variable definitions
    sample_data JSONB,         -- Sample data for preview

    thumbnail_url VARCHAR(500),

    usage_count INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_featured BOOLEAN NOT NULL DEFAULT FALSE,

    tags VARCHAR(1000),        -- Comma-separated tags

    UNIQUE(tenant_id, slug),
    CONSTRAINT fk_document_templates_created_by FOREIGN KEY (created_by) REFERENCES users(id),
    CONSTRAINT fk_document_templates_updated_by FOREIGN KEY (updated_by) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_document_templates_tenant ON document_templates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_document_templates_category ON document_templates(category);
CREATE INDEX IF NOT EXISTS idx_document_templates_is_active ON document_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_document_templates_is_featured ON document_templates(is_featured);

COMMENT ON TABLE document_templates IS 'Reusable document templates with variable substitution';
COMMENT ON COLUMN document_templates.content IS 'Template content stored as JSONB';
COMMENT ON COLUMN document_templates.template_variables IS 'JSON array defining template variables';

-- ============================================================================
-- TEMPLATE INSTANTIATIONS (Documents created from templates)
-- ============================================================================
CREATE TABLE IF NOT EXISTS template_instantiations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,

    template_id UUID NOT NULL,
    title VARCHAR(500) NOT NULL,
    content JSONB NOT NULL,
    variable_values JSONB,  -- Variable values used in instantiation

    generated_document_url VARCHAR(500),

    CONSTRAINT fk_template_instantiations_template FOREIGN KEY (template_id) REFERENCES document_templates(id) ON DELETE SET NULL,
    CONSTRAINT fk_template_instantiations_created_by FOREIGN KEY (created_by) REFERENCES users(id),
    CONSTRAINT fk_template_instantiations_updated_by FOREIGN KEY (updated_by) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_template_instantiations_tenant ON template_instantiations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_template_instantiations_template ON template_instantiations(template_id);

COMMENT ON TABLE template_instantiations IS 'Documents created by instantiating templates';

-- ============================================================================
-- KNOWLEDGE ATTACHMENTS (Files attached to wiki/blog)
-- ============================================================================
CREATE TABLE IF NOT EXISTS knowledge_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    content_type VARCHAR(50) NOT NULL CHECK (content_type IN ('WIKI_PAGE', 'BLOG_POST', 'TEMPLATE')),
    content_id UUID NOT NULL,

    file_name VARCHAR(500) NOT NULL,
    file_size BIGINT NOT NULL,
    file_type VARCHAR(50),
    mime_type VARCHAR(100),
    storage_path VARCHAR(1000) NOT NULL,
    url VARCHAR(1000),

    uploaded_by UUID,

    CONSTRAINT fk_knowledge_attachments_uploaded_by FOREIGN KEY (uploaded_by) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_knowledge_attachments_tenant ON knowledge_attachments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_attachments_content ON knowledge_attachments(content_type, content_id);

COMMENT ON TABLE knowledge_attachments IS 'Files attached to knowledge management content (wiki, blog, templates)';

-- ============================================================================
-- KNOWLEDGE VIEWS (Analytics tracking)
-- ============================================================================
CREATE TABLE IF NOT EXISTS knowledge_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    content_type VARCHAR(50) NOT NULL CHECK (content_type IN ('WIKI_PAGE', 'BLOG_POST')),
    content_id UUID NOT NULL,

    user_id UUID,
    ip_address VARCHAR(45),
    user_agent VARCHAR(1000),
    duration_seconds INT,

    CONSTRAINT fk_knowledge_views_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_knowledge_views_tenant ON knowledge_views(tenant_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_views_content ON knowledge_views(content_type, content_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_views_user ON knowledge_views(user_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_views_created_at ON knowledge_views(created_at DESC);

COMMENT ON TABLE knowledge_views IS 'Analytics tracking for wiki pages and blog posts';

-- ============================================================================
-- KNOWLEDGE SEARCHES (Search analytics)
-- ============================================================================
CREATE TABLE IF NOT EXISTS knowledge_searches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    query VARCHAR(500) NOT NULL,
    results_count INT,

    searched_by UUID,

    CONSTRAINT fk_knowledge_searches_searched_by FOREIGN KEY (searched_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_knowledge_searches_tenant ON knowledge_searches(tenant_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_searches_query ON knowledge_searches(query);
CREATE INDEX IF NOT EXISTS idx_knowledge_searches_created_at ON knowledge_searches(created_at DESC);

COMMENT ON TABLE knowledge_searches IS 'Search analytics for knowledge management';

-- ============================================================================
-- WIKI PAGE APPROVAL TASKS (Approval workflow integration)
-- ============================================================================
CREATE TABLE IF NOT EXISTS wiki_page_approval_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    page_id UUID NOT NULL,
    approval_task_id UUID,  -- Reference to workflow_task if using workflow engine

    status VARCHAR(50) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'REVOKED')),
    change_summary TEXT,
    rejection_reason TEXT,

    submitted_by UUID NOT NULL,
    reviewed_by UUID,
    reviewed_at TIMESTAMPTZ,

    CONSTRAINT fk_wiki_page_approval_tasks_page FOREIGN KEY (page_id) REFERENCES wiki_pages(id) ON DELETE CASCADE,
    CONSTRAINT fk_wiki_page_approval_tasks_submitted_by FOREIGN KEY (submitted_by) REFERENCES users(id),
    CONSTRAINT fk_wiki_page_approval_tasks_reviewed_by FOREIGN KEY (reviewed_by) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_wiki_page_approval_tasks_tenant ON wiki_page_approval_tasks(tenant_id);
CREATE INDEX IF NOT EXISTS idx_wiki_page_approval_tasks_page ON wiki_page_approval_tasks(page_id);
CREATE INDEX IF NOT EXISTS idx_wiki_page_approval_tasks_status ON wiki_page_approval_tasks(status);

COMMENT ON TABLE wiki_page_approval_tasks IS 'Approval workflow integration for wiki pages';

-- Enable Row-Level Security for tenant isolation
ALTER TABLE wiki_spaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE wiki_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE wiki_page_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE wiki_page_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE wiki_page_watches ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_instantiations ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE wiki_page_approval_tasks ENABLE ROW LEVEL SECURITY;
