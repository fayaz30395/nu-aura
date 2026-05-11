-- V149: Restore FTS search_vector columns + GIN indexes for wiki_pages and blog_posts.
--
-- Context (S3-F sprint 3, wave-3 W5-B + NU-Fluence search):
--   V15__knowledge_fluence_schema.sql originally declared `search_vector TSVECTOR
--   GENERATED ALWAYS AS (...) STORED` on `wiki_pages` and `blog_posts`, together with
--   GIN indexes on those columns. Both were commented out at the time (see the TODOs
--   at V15 lines 179-183, 227-228, 568-572, 615-616). NU-Fluence wiki and blog search
--   currently fall back to ILIKE scans, which (a) does not scale beyond a few thousand
--   rows and (b) cannot rank by relevance.
--
-- Scope of this migration: idempotently add the generated columns and the GIN indexes
-- only. Repositories that switch from ILIKE to `search_vector @@ websearch_to_tsquery(...)`
-- are tracked as a follow-up — leaving them on ILIKE means the indexes simply sit unused
-- until the repositories are updated, which is safe.
--
-- Note: PostgreSQL requires the table to be empty of incompatible existing rows, but
-- `ADD COLUMN ... GENERATED ALWAYS AS (...) STORED` will populate retroactively, so
-- this migration is safe to run against tenant data already present.

-- ============================================================================
-- WIKI_PAGES
-- ============================================================================
ALTER TABLE wiki_pages
    ADD COLUMN IF NOT EXISTS search_vector tsvector
        GENERATED ALWAYS AS (
            setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
            setweight(to_tsvector('english', coalesce(excerpt, '')), 'B')
        ) STORED;

CREATE INDEX IF NOT EXISTS idx_wiki_pages_search_vector
    ON wiki_pages USING gin (search_vector);

COMMENT ON COLUMN wiki_pages.search_vector
    IS 'Tsvector for full-text search on title (weight A) and excerpt (weight B).';

-- ============================================================================
-- BLOG_POSTS
-- ============================================================================
ALTER TABLE blog_posts
    ADD COLUMN IF NOT EXISTS search_vector tsvector
        GENERATED ALWAYS AS (
            setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
            setweight(to_tsvector('english', coalesce(excerpt, '')), 'B')
        ) STORED;

CREATE INDEX IF NOT EXISTS idx_blog_posts_search_vector
    ON blog_posts USING gin (search_vector);

COMMENT ON COLUMN blog_posts.search_vector
    IS 'Tsvector for full-text search on title (weight A) and excerpt (weight B).';
