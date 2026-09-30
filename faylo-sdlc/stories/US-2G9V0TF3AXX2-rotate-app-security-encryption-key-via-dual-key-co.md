# US-2G9V0TF3AXX2: Rotate APP_SECURITY_ENCRYPTION_KEY via dual-key converter + controlled re-encryption backfill (exposed in git history; naive rotation destroys encrypted PII across 13 data areas)

> **Epic:** EP-2G4FWY5JGW6W
> **Tier:** hard-gate
> **Status:** Draft
> **Created:** 2026-09-24
> **Created-by:** faylo new

## User Story

**As a** ...
**I want** ...
**So that** ...

## Acceptance Criteria

- **AC1:** EncryptedStringConverter accepts a previous-key decrypt fallback while encrypting with the current key, proven by a test that decrypts old-key ciphertext and re-encrypts under the new key
  - **Verify:** shell bash -c "cd backend && mvn -q -Dtest=EncryptedStringConverterTest test"
  - **Verified:** yes (2026-09-25)
- **AC2:** Re-encryption backfill covers every @Convert(EncryptedStringConverter/EncryptedLocalDateConverter) column and reports zero rows remaining on the old key before the old key is retired
  - **Verify:** manual
  - **Verified:** pending
