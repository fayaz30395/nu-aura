-- V119: Wiki inline comments (annotation-style comments anchored to content)
CREATE TABLE wiki_inline_comments
(
  id                UUID PRIMARY KEY     DEFAULT gen_random_uuid(),
  tenant_id         UUID        NOT NULL,
  page_id           UUID        NOT NULL REFERENCES wiki_pages (id) ON DELETE CASCADE,
  parent_comment_id UUID REFERENCES wiki_inline_comments (id) ON DELETE CASCADE,
  anchor_selector   VARCHAR(500),
  anchor_text       VARCHAR(500),
  anchor_offset     INTEGER,
  content           TEXT        NOT NULL,
  status            VARCHAR(20) NOT NULL DEFAULT 'OPEN',
  resolved_at       TIMESTAMP,
  resolved_by       UUID,
  created_by        UUID,
  updated_by        UUID,
  created_at        TIMESTAMP   NOT NULL DEFAULT now(),
  updated_at        TIMESTAMP   NOT NULL DEFAULT now(),
  deleted_at        TIMESTAMP,
  is_deleted        BOOLEAN     NOT NULL DEFAULT FALSE,
  version           BIGINT      NOT NULL DEFAULT 0,

  CONSTRAINT chk_wiki_inline_comment_status CHECK (status IN ('OPEN', 'RESOLVED', 'DELETED'))
);

CREATE INDEX idx_wiki_inline_comments_tenant_page ON wiki_inline_comments (tenant_id, page_id);
CREATE INDEX idx_wiki_inline_comments_tenant_page_status ON wiki_inline_comments (tenant_id, page_id, status);
CREATE INDEX idx_wiki_inline_comments_parent ON wiki_inline_comments (parent_comment_id);
