-- =============================================================================
-- V147 — Widen high-sensitivity PII columns for AES-GCM ciphertext at rest
-- =============================================================================
-- Wave-3 compliance audit findings #3, #4 (PII at rest) and wall multi-tenant
-- audit finding M-MFA (TOTP secret unprotected).
--
-- Ciphertext format from EncryptedStringConverter is:
--   Base64(IV-12-bytes) ":" Base64(ciphertext + GCM-tag-16-bytes)
-- For an N-byte plaintext: ~ceil((N+16)/3)*4 + 17 (IV) + 1 (delim) chars.
-- We use 256 / 512 / 2048 / TEXT to give headroom for short, medium, and long
-- string fields respectively.
--
-- NOTE: Existing plaintext rows are read back through the converter, which
-- detects the missing "IV:" prefix and returns the raw value. A separate
-- one-time re-encrypt job (DataRetentionService / EncryptionMigrationService)
-- must scan and rewrite legacy rows under the new format. This migration only
-- widens the columns — same pattern as CryptoConverter already follows for
-- legacy ECB → GCM migrations.
-- =============================================================================

-- benefit_dependents: identification, contact, address, health
ALTER TABLE benefit_dependents
    ALTER COLUMN national_id              TYPE VARCHAR(512),
    ALTER COLUMN passport_number          TYPE VARCHAR(512),
    ALTER COLUMN phone                    TYPE VARCHAR(512),
    ALTER COLUMN email                    TYPE VARCHAR(512),
    ALTER COLUMN address                  TYPE VARCHAR(2048),
    ALTER COLUMN pre_existing_conditions  TYPE TEXT;

-- tax_declarations: previous-employer PAN (India ITA + GDPR)
ALTER TABLE tax_declarations
    ALTER COLUMN previous_employer_pan TYPE VARCHAR(256);

-- users: TOTP MFA seed
ALTER TABLE users
    ALTER COLUMN mfa_secret TYPE VARCHAR(256);

-- =============================================================================
-- Follow-up (NOT performed here):
--   1. Run one-time encrypt-pass for legacy plaintext rows. The converter
--      gracefully returns raw values when "IV:" delimiter is missing, so the
--      app stays functional pre-migration. Trigger via:
--        EncryptionMigrationService.reencryptLegacyRows("benefit_dependents", ...)
--   2. Add CHECK constraints once 100% of rows are confirmed encrypted:
--        CHECK (national_id ~ '^[A-Za-z0-9+/=]+:[A-Za-z0-9+/=]+$')
--   3. dateOfBirth (LocalDate) cannot use EncryptedStringConverter — needs a
--      shadow encrypted-string column or column-type migration in a future
--      version. See TODO(privacy) in BenefitDependent.java.
-- =============================================================================
