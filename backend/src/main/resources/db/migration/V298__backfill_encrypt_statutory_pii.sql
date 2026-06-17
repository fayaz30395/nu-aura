-- ============================================================================
-- V298: Backfill AES-256-GCM encryption for existing plaintext statutory PII
--
-- Context (SEC-002 follow-up from d29ec59a):
--   The EncryptedStringConverter added in d29ec59a protects NEW writes to:
--     - employee_pf_records.uan_number
--     - employee_pf_records.pf_number
--     - employee_esi_records.esi_number
--     - employee_esi_records.ip_number
--     - candidates.resume_url
--
--   Rows that existed BEFORE that commit remain as plaintext. This migration
--   cannot encrypt them in SQL (the cipher is keyed — only the application
--   layer knows the AES key). Instead we:
--     1. Mark every unencrypted row with a sentinel prefix so the converter's
--        read path can distinguish legacy rows from corrupted ciphertext and
--        return a meaningful placeholder rather than silently passing through
--        a raw government ID.
--     2. Produce a deterministic count of affected rows that the DBA can
--        reconcile after running the application-layer re-encryption job.
--
-- How to complete the encryption:
--   Run the Spring Boot admin endpoint (or standalone job):
--     POST /api/v1/admin/maintenance/reencrypt-statutory-pii
--   This endpoint reads each row through JPA (triggering convertToEntityAttribute),
--   then persists it back (triggering convertToDatabaseColumn → encrypted ciphertext).
--   The sentinel prefix is cleared automatically when the value is re-saved.
--
-- Safety:
--   - All UPDATEs are wrapped in a DO block so they either all succeed or all
--     roll back as one transaction.
--   - The WHERE clause matches only rows whose value does NOT look like the
--     EncryptedStringConverter output format (Base64:Base64), so rows already
--     encrypted by the converter are never touched.
--   - resume_url is excluded from the sentinel pass: URLs already contain ":"
--     (e.g. "https://..."), which causes the converter to attempt decryption and
--     fall through to the legacy passthrough path with a WARN — acceptable until
--     the re-encryption job runs. The job handles resume_url via the same
--     application-layer round-trip.
-- ============================================================================

DO $$
DECLARE
    pf_uan_count   INTEGER;
    pf_pf_count    INTEGER;
    esi_esi_count  INTEGER;
    esi_ip_count   INTEGER;
BEGIN
    -- employee_pf_records.uan_number
    UPDATE employee_pf_records
       SET uan_number = 'PLAINTEXT_PENDING_ENCRYPTION:' || COALESCE(uan_number, '')
     WHERE uan_number IS NOT NULL
       AND uan_number NOT LIKE 'PLAINTEXT_PENDING_ENCRYPTION:%'
       -- Not an encrypted blob: converter output is Base64(12B IV) + ':' + Base64(ciphertext)
       -- Base64 of 12 bytes is always 16 chars; exclude values whose first segment is exactly 16
       -- chars of valid Base64 (i.e., already encrypted).
       AND NOT (
           length(split_part(uan_number, ':', 1)) = 16
           AND uan_number LIKE '%:%'
       );
    GET DIAGNOSTICS pf_uan_count = ROW_COUNT;

    -- employee_pf_records.pf_number
    UPDATE employee_pf_records
       SET pf_number = 'PLAINTEXT_PENDING_ENCRYPTION:' || COALESCE(pf_number, '')
     WHERE pf_number IS NOT NULL
       AND pf_number NOT LIKE 'PLAINTEXT_PENDING_ENCRYPTION:%'
       AND NOT (
           length(split_part(pf_number, ':', 1)) = 16
           AND pf_number LIKE '%:%'
       );
    GET DIAGNOSTICS pf_pf_count = ROW_COUNT;

    -- employee_esi_records.esi_number
    UPDATE employee_esi_records
       SET esi_number = 'PLAINTEXT_PENDING_ENCRYPTION:' || COALESCE(esi_number, '')
     WHERE esi_number IS NOT NULL
       AND esi_number NOT LIKE 'PLAINTEXT_PENDING_ENCRYPTION:%'
       AND NOT (
           length(split_part(esi_number, ':', 1)) = 16
           AND esi_number LIKE '%:%'
       );
    GET DIAGNOSTICS esi_esi_count = ROW_COUNT;

    -- employee_esi_records.ip_number
    UPDATE employee_esi_records
       SET ip_number = 'PLAINTEXT_PENDING_ENCRYPTION:' || COALESCE(ip_number, '')
     WHERE ip_number IS NOT NULL
       AND ip_number NOT LIKE 'PLAINTEXT_PENDING_ENCRYPTION:%'
       AND NOT (
           length(split_part(ip_number, ':', 1)) = 16
           AND ip_number LIKE '%:%'
       );
    GET DIAGNOSTICS esi_ip_count = ROW_COUNT;

    RAISE NOTICE 'V298 PII sentinel pass complete:';
    RAISE NOTICE '  employee_pf_records.uan_number: % row(s) marked', pf_uan_count;
    RAISE NOTICE '  employee_pf_records.pf_number:  % row(s) marked', pf_pf_count;
    RAISE NOTICE '  employee_esi_records.esi_number: % row(s) marked', esi_esi_count;
    RAISE NOTICE '  employee_esi_records.ip_number:  % row(s) marked', esi_ip_count;
    RAISE NOTICE 'Run POST /api/v1/admin/maintenance/reencrypt-statutory-pii to complete encryption.';
END $$;
