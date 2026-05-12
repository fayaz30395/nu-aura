-- V148: Race-condition closure for wave-3 audit findings.
--
-- 1. wiki_page_versions — NU-Fluence 1.2 fix.
--    createPageVersion previously read count() then inserted count+1, which is racy.
--    A unique index on (tenant_id, page_id, version_number) lets the service
--    catch DataIntegrityViolationException and retry with a fresh count.
--
-- 2. post_reactions — NU-Fluence 3.2 fix.
--    addReaction previously did an in-memory existence check then INSERT;
--    two concurrent likes could insert two rows for the same (post, employee).
--    Enforce one row per (tenant, post, employee) at the DB layer.
--
-- 3. employee_code_sequence — business-logic F10.1 fix.
--    createEmployee previously generated codes with a count++/existsBy loop
--    that is not safe under concurrent writes or horizontal scale.
--    Mirrors V145 expense_claim_sequence — atomic INSERT ... ON CONFLICT
--    ... DO UPDATE ... RETURNING upsert keyed by (tenant_id, year_month).

-- ---------------------------------------------------------------------------
-- 1. WikiPageVersion uniqueness
-- ---------------------------------------------------------------------------
ALTER TABLE wiki_page_versions
DROP
CONSTRAINT IF EXISTS uq_wiki_page_version;
ALTER TABLE wiki_page_versions
  ADD CONSTRAINT uq_wiki_page_version
    UNIQUE (tenant_id, page_id, version_number);

-- ---------------------------------------------------------------------------
-- 2. PostReaction uniqueness
-- ---------------------------------------------------------------------------
-- Pre-clean duplicate rows (keep oldest) so the ADD CONSTRAINT cannot fail
-- on existing data. Without this, a duplicate that escaped the in-memory
-- check before V148 deploys would block the migration entirely.
DELETE
FROM post_reactions a USING post_reactions b
WHERE a.ctid
    < b.ctid
  AND a.tenant_id = b.tenant_id
  AND a.post_id = b.post_id
  AND a.employee_id = b.employee_id;

ALTER TABLE post_reactions
DROP
CONSTRAINT IF EXISTS uq_post_reaction_user;
ALTER TABLE post_reactions
  ADD CONSTRAINT uq_post_reaction_user
    UNIQUE (tenant_id, post_id, employee_id);

-- ---------------------------------------------------------------------------
-- 3. Employee-code sequence (mirrors V145 claim sequences)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS employee_code_sequence
(
  tenant_id
  UUID
  NOT
  NULL,
  year_month
  VARCHAR
(
  7
) NOT NULL,
  current_value BIGINT NOT NULL DEFAULT 0,
  PRIMARY KEY
(
  tenant_id,
  year_month
)
  );
