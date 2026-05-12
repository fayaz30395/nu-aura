-- V152: Extract body_text from JSONB content for wiki_pages + blog_posts.
--
-- Context (S6-A sprint 6, wave-3 W5-B perf audit):
--   FluenceContentRetriever.searchByTenantBroad currently runs:
--     LOWER(CAST(content AS TEXT)) LIKE LOWER(CONCAT('%', :query, '%'))
--   against the ProseMirror/TipTap JSONB content column. PostgreSQL must
--   serialise the JSONB to text and run a leading-wildcard ILIKE on every
--   row in the tenant — a guaranteed sequential scan, and the cast is
--   re-evaluated per-row per-query. As Fluence corpora grow past a few
--   thousand pages the retriever path becomes the dominant latency in
--   the Fluence chat / RAG endpoint.
--
-- Strategy:
--   1. Add a plain TEXT column body_text that holds the flattened plain
--      text extracted from the JSONB tree (populated by the application
--      layer on every save — see WikiPageService / BlogPostService).
--   2. Index it with a pg_trgm GIN index so substring ILIKE / similarity
--      queries can use an index scan instead of seq-scan.
--   3. Partial index where is_deleted = false to keep the index small
--      and aligned with the @Where(is_deleted = false) JPA filter.
--
-- pg_trgm note:
--   V151 (employee_search_trgm) already installs pg_trgm idempotently.
--   We repeat CREATE EXTENSION IF NOT EXISTS here so this migration is
--   self-contained — if V151 is ever reverted, V152 still works.
--
-- Backfill:
--   This migration leaves the new column NULL for existing rows. The
--   application layer will populate it lazily on the next save of each
--   page / post. A one-shot backfill is intentionally deferred — the
--   indexes are partial (is_deleted = false) and ILIKE on NULL returns
--   NULL (treated as false), so unpopulated rows are simply invisible
--   to the broad-retriever path until they are next edited. ES indexing
--   (FluenceIndexingService) keeps the same content available via the
--   Elasticsearch path in the interim. A follow-up out-of-band backfill
--   job can populate historical rows without blocking deploy.
--
-- Flyway transaction note:
--   No CONCURRENTLY — same rationale as V151: stay inside Flyway's
--   default per-migration transaction. ALTER TABLE ADD COLUMN is
--   metadata-only on PG 11+; the GIN build does the work but on an
--   empty column it is effectively instant.

-- ============================================================================
-- pg_trgm extension (idempotent — V151 also installs this)
-- ============================================================================
CREATE
EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================================================
-- WIKI_PAGES — body_text column + trigram GIN
-- ============================================================================
ALTER TABLE wiki_pages
  ADD COLUMN IF NOT EXISTS body_text TEXT;

CREATE INDEX IF NOT EXISTS idx_wiki_pages_body_text_trgm
  ON wiki_pages USING gin (body_text gin_trgm_ops)
  WHERE is_deleted = false;

COMMENT
ON COLUMN wiki_pages.body_text
    IS 'Plain-text projection of the TipTap JSONB content column, populated by WikiPageService.{createPage,updatePage}. Indexed by idx_wiki_pages_body_text_trgm for substring search from the RAG retriever (FluenceContentRetriever).';

COMMENT
ON INDEX idx_wiki_pages_body_text_trgm
    IS 'Trigram GIN for RAG retriever ILIKE / %>% queries against wiki body text. Replaces seq-scan on CAST(content AS TEXT).';

-- ============================================================================
-- BLOG_POSTS — body_text column + trigram GIN
-- ============================================================================
ALTER TABLE blog_posts
  ADD COLUMN IF NOT EXISTS body_text TEXT;

CREATE INDEX IF NOT EXISTS idx_blog_posts_body_text_trgm
  ON blog_posts USING gin (body_text gin_trgm_ops)
  WHERE is_deleted = false;

COMMENT
ON COLUMN blog_posts.body_text
    IS 'Plain-text projection of the TipTap JSONB content column, populated by BlogPostService.{createPost,updatePost}. Indexed by idx_blog_posts_body_text_trgm for substring search from the RAG retriever (FluenceContentRetriever).';

COMMENT
ON INDEX idx_blog_posts_body_text_trgm
    IS 'Trigram GIN for RAG retriever ILIKE / %>% queries against blog body text. Replaces seq-scan on CAST(content AS TEXT).';
