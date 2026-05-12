-- V151: Trigram extension + GIN indexes for substring search on employees / candidates.
--
-- Context (S5-D sprint 4, wave-3 perf audit H9 + W4-A load audit):
--   Current /employees/search and candidate name search use LIKE/ILIKE with
--   leading wildcards (e.g. `LOWER(first_name) LIKE '%foo%'`). B-tree indexes
--   cannot serve leading-wildcard predicates, so the planner falls back to a
--   sequential scan, which degrades sharply as tenants grow past ~10k employees.
--   The pg_trgm extension exposes a GIN index that handles arbitrary substring
--   matches in O(log n) once the planner picks it up (it does so automatically
--   for `column ILIKE '%foo%'` and for the `%>%` similarity operator).
--
-- Scope of this migration:
--   Idempotently install pg_trgm and add expression GIN indexes that combine the
--   commonly searched columns. Repositories currently issue Spring Data
--   derived queries / JPA Specifications against the raw columns; the indexes
--   sit unused until a follow-up sprint migrates those queries to either
--   `ILIKE '%:q%'` against the combined expression or `%>%`. Leaving the index
--   unused is safe — it costs storage but no query plan regressions.
--
-- Flyway transaction note:
--   We intentionally do NOT use `CREATE INDEX CONCURRENTLY` here. CONCURRENTLY
--   cannot run inside Flyway's default per-migration transaction, and the
--   established project pattern (see V149__restore_fts_gin_indexes.sql) is
--   plain `CREATE INDEX IF NOT EXISTS`. The tables targeted here are within an
--   acceptable size range for a transactional rebuild during deploy; if a
--   future tenant outgrows that, this migration can be re-issued out-of-band
--   with `CONCURRENTLY` after running `--mixed=true`.

-- ============================================================================
-- pg_trgm extension
-- ============================================================================
CREATE
EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================================================
-- EMPLOYEES — name + employee_code substring search
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_employees_search_trgm
  ON employees USING gin (
  (LOWER (first_name) || ' ' || LOWER (COALESCE (last_name, '')) || ' ' || LOWER (employee_code)) gin_trgm_ops
  )
  WHERE is_deleted = false;

COMMENT
ON INDEX idx_employees_search_trgm
    IS 'Trigram GIN for /employees/search substring matches. Used by ILIKE and %>% queries against the combined name + code expression.';

-- ============================================================================
-- CANDIDATES — name + email substring search
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_candidates_search_trgm
  ON candidates USING gin (
  (LOWER (first_name) || ' ' || LOWER (COALESCE (last_name, '')) || ' ' || LOWER (email)) gin_trgm_ops
  )
  WHERE is_deleted = false;

COMMENT
ON INDEX idx_candidates_search_trgm
    IS 'Trigram GIN for recruitment candidate substring matches. Used by ILIKE and %>% queries against the combined name + email expression.';
