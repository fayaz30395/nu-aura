-- V117: Create wiki_space_members table for per-space permissions
-- The wiki_pages.parent_page_id column and index already exist (no change needed).

CREATE TABLE IF NOT EXISTS wiki_space_members (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL,
    space_id        UUID NOT NULL REFERENCES wiki_spaces(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL,
    role            VARCHAR(20) NOT NULL DEFAULT 'VIEWER',
    added_by        UUID,
    added_at        TIMESTAMP,
    created_at      TIMESTAMP NOT NULL DEFAULT now(),
    updated_at      TIMESTAMP NOT NULL DEFAULT now(),
    created_by      UUID,
    updated_by      UUID,
    version         BIGINT DEFAULT 0,
    is_deleted      BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at      TIMESTAMP,
    CONSTRAINT uk_space_member_tenant_space_user UNIQUE (tenant_id, space_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_space_members_tenant ON wiki_space_members (tenant_id);
CREATE INDEX IF NOT EXISTS idx_space_members_space  ON wiki_space_members (space_id);
CREATE INDEX IF NOT EXISTS idx_space_members_user   ON wiki_space_members (user_id);

-- Seed the KNOWLEDGE:SPACE_MANAGE permission
INSERT INTO permissions (id, code, name, description, resource, action)
VALUES (gen_random_uuid(), 'KNOWLEDGE:SPACE_MANAGE', 'Manage Wiki Spaces',
        'Manage space members and settings', 'knowledge', 'space_manage')
ON CONFLICT (code) DO NOTHING;
