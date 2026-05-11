-- V159: GDPR DSR fulfilment — artefact metadata columns.
--
-- Context (S9-A, wave-? compliance follow-up to V153):
--   V153 created the dsr_requests intake queue. Once the automated Article
--   15 / 20 export pipeline ships (DsrExportService), every fulfilled
--   ACCESS or PORTABILITY request materialises a JSON artefact. We persist
--   the SHA-256 digest + byte size of that artefact onto the DSR row so:
--
--     1. The audit chain has a tamper-evident integrity anchor: a later
--        access to the same artefact bytes must recompute to the same
--        digest, and any mismatch is a clear forensic signal.
--
--     2. The admin queue can show payload size in the listing UI without
--        re-rendering / re-fetching the artefact from object storage.
--
-- Scope of this migration:
--   ALTER dsr_requests with two nullable columns:
--     * artifact_sha256  CHAR(64)   — lowercase hex of SHA-256(payload)
--     * artifact_size    BIGINT     — payload size in bytes
--
--   Both nullable because:
--     - Existing rows (created before this migration) have no artefact.
--     - ERASURE and RECTIFICATION requests never produce an artefact.
--     - PENDING / IN_PROGRESS rows haven't yet materialised the export.
--
-- Notes:
--   * No FK / referential integrity changes; this is purely additive
--     metadata. Existing indexes on dsr_requests are unaffected.
--   * No index on artifact_sha256 — it's not a lookup column; it's a
--     forensic anchor compared against the freshly recomputed digest of
--     the artefact bytes at access time.
--   * Slot reservation: V155 = tenant.country (S9-D), V156 = onboarding
--     task assignee (S9-E). V157/V158 are reserved for FK batches (S9-H).
--     This migration occupies V159 by sprint plan.

ALTER TABLE dsr_requests
    ADD COLUMN IF NOT EXISTS artifact_sha256 CHAR(64),
    ADD COLUMN IF NOT EXISTS artifact_size   BIGINT;

COMMENT ON COLUMN dsr_requests.artifact_sha256 IS
    'Lowercase hex SHA-256 of the exported artefact bytes (ACCESS / PORTABILITY fulfilment). Tamper-evident anchor for the audit chain.';
COMMENT ON COLUMN dsr_requests.artifact_size IS
    'Size in bytes of the exported artefact (ACCESS / PORTABILITY fulfilment). Surfaces payload size in the admin queue without re-rendering.';
