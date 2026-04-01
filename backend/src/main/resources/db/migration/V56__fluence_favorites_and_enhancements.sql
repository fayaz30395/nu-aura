-- V56: Fluence favorites, activities, comment enhancements, wiki page likes, space approval config

-- =============================================================================
-- 1. fluence_favorites table
-- =============================================================================
CREATE TABLE IF NOT EXISTS fluence_favorites (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL,
    user_id         UUID NOT NULL,
    content_id      UUID NOT NULL,
    content_type    VARCHAR(20) NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_deleted      BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at      TIMESTAMPTZ,
    CONSTRAINT uq_fluence_favorites UNIQUE (tenant_id, user_id, content_id, content_type)
);

CREATE INDEX IF NOT EXISTS idx_fluence_favorites_tenant_user
    ON fluence_favorites (tenant_id, user_id);
CREATE INDEX IF NOT EXISTS idx_fluence_favorites_tenant_content
    ON fluence_favorites (tenant_id, content_id, content_type);

-- =============================================================================
-- 2. Comment enhancements: mentions JSONB + parent_comment_id
-- =============================================================================
ALTER TABLE wiki_page_comments ADD COLUMN IF NOT EXISTS mentions JSONB DEFAULT '[]';
ALTER TABLE wiki_page_comments ADD COLUMN IF NOT EXISTS parent_comment_id UUID REFERENCES wiki_page_comments(id);

ALTER TABLE blog_comments ADD COLUMN IF NOT EXISTS mentions JSONB DEFAULT '[]';
ALTER TABLE blog_comments ADD COLUMN IF NOT EXISTS parent_comment_id UUID REFERENCES blog_comments(id);

-- =============================================================================
-- 3. fluence_activities table
-- =============================================================================
CREATE TABLE IF NOT EXISTS fluence_activities (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL,
    actor_id        UUID NOT NULL,
    action          VARCHAR(50) NOT NULL,
    content_type    VARCHAR(20) NOT NULL,
    content_id      UUID NOT NULL,
    content_title   VARCHAR(500),
    content_excerpt TEXT,
    metadata        JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_deleted      BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_fluence_activities_tenant_created
    ON fluence_activities (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_fluence_activities_tenant_actor
    ON fluence_activities (tenant_id, actor_id);

-- =============================================================================
-- 4. Wiki space approval configuration
-- =============================================================================
ALTER TABLE wiki_spaces ADD COLUMN IF NOT EXISTS approval_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE wiki_spaces ADD COLUMN IF NOT EXISTS approver_employee_id UUID;

-- =============================================================================
-- 5. wiki_page_likes table
-- =============================================================================
CREATE TABLE IF NOT EXISTS wiki_page_likes (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL,
    wiki_page_id    UUID NOT NULL REFERENCES wiki_pages(id),
    liked_by        UUID NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_deleted      BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at      TIMESTAMPTZ,
    CONSTRAINT uq_wiki_page_likes UNIQUE (tenant_id, wiki_page_id, liked_by)
);

CREATE INDEX IF NOT EXISTS idx_wiki_page_likes_tenant_page
    ON wiki_page_likes (tenant_id, wiki_page_id);

-- =============================================================================
-- 6. Row Level Security
-- =============================================================================
ALTER TABLE fluence_favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY fluence_favorites_tenant_isolation ON fluence_favorites
    USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

ALTER TABLE fluence_activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY fluence_activities_tenant_isolation ON fluence_activities
    USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

ALTER TABLE wiki_page_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY wiki_page_likes_tenant_isolation ON wiki_page_likes
    USING (tenant_id = current_setting('app.current_tenant_id')::UUID);
