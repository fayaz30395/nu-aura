-- V326: recognition_comments table for recognition/kudos comment support
-- Mirrors recognition_reactions' shape (TenantAware base columns).

CREATE TABLE IF NOT EXISTS recognition_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    recognition_id UUID NOT NULL,
    employee_id UUID NOT NULL,
    content TEXT NOT NULL,
    commented_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_recognition_comment_recognition ON recognition_comments(recognition_id);
CREATE INDEX IF NOT EXISTS idx_recognition_comment_author ON recognition_comments(employee_id);
CREATE INDEX IF NOT EXISTS idx_recognition_comment_tenant ON recognition_comments(tenant_id);
