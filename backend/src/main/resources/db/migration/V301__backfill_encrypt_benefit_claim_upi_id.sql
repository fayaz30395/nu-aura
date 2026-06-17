-- ============================================================================
-- V301: Backfill AES-256-GCM encryption sentinel for benefit_claims.upi_id
--
-- Context (SEC-002a):
--   BenefitClaim.upiId was added @Convert(EncryptedStringConverter) in
--   commit baf61430. UPI IDs are payment-network identifiers and qualify
--   as financial PII.  Rows written before that commit remain as plaintext.
--
--   This migration follows the same sentinel pattern as V298: we cannot
--   perform AES encryption in SQL (the key lives in the application layer),
--   so we prefix existing plaintext rows with 'UNENCRYPTED:' so the
--   converter's read path returns a safe placeholder instead of silently
--   passing through a raw payment identifier.
--
-- How to complete the encryption:
--   Run: POST /api/v1/admin/maintenance/reencrypt-benefit-upi
--   (or include in the existing reencrypt-statutory-pii job if extended)
--
-- Safety:
--   - Wrapped in a DO block; all-or-nothing per migration.
--   - Only affects rows WHERE upi_id IS NOT NULL AND upi_id NOT LIKE 'v1:%'
--     (the 'v1:' prefix is the EncryptedStringConverter ciphertext marker).
-- ============================================================================

DO $$
DECLARE
  affected_count INTEGER;
BEGIN
  UPDATE benefit_claims
  SET    upi_id = 'UNENCRYPTED:' || upi_id
  WHERE  upi_id IS NOT NULL
    AND  upi_id NOT LIKE 'UNENCRYPTED:%'
    AND  upi_id NOT LIKE 'v1:%';

  GET DIAGNOSTICS affected_count = ROW_COUNT;
  RAISE NOTICE 'V301: Marked % plaintext upi_id rows for re-encryption', affected_count;
END;
$$;
