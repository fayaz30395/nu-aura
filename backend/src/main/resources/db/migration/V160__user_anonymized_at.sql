-- V160: User.anonymized_at column for GDPR Article 17 fulfilment (S9-B sprint).
--
-- Context:
--   The DSR scaffold (V153) created the request queue; this column records
--   *on the User row itself* when an Article 17 erasure was fulfilled by
--   anonymisation. We do not delete the User row because:
--     a) FK integrity — many entities (audit_logs, employees, payroll_runs)
--        carry user_id as a logical reference; hard-deleting orphans them.
--     b) Legal hold — Indian Income Tax Act §139A requires payroll-linked
--        identity records for 7 years; we anonymise the PII fields instead
--        of removing the row.
--   The anonymised_at timestamp is the single source of truth for "this user
--   has been forgotten". Per-tenant compliance dashboards query for it; the
--   AccountLockoutService and JwtAuthenticationFilter also treat any row with
--   a non-null anonymised_at as terminally inactive (status=INACTIVE is set
--   in the same transaction by UserAnonymizer).
--
-- Notes:
--   * Nullable on purpose — only erased users carry a non-null value.
--   * No index here: the column is written once per user lifetime and the
--     hot read paths use status=INACTIVE (already indexed) for filtering.
--     If a future compliance report needs WHERE anonymized_at IS NOT NULL
--     it can add a partial index then.
--   * No tenant_id duplication — the existing users.tenant_id already scopes
--     anonymisation queries.

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS anonymized_at TIMESTAMP WITH TIME ZONE;

COMMENT ON COLUMN users.anonymized_at IS
    'GDPR Article 17 fulfilment timestamp. Non-null means PII fields (email, firstName, lastName, profilePictureUrl, mfaSecret, mfaBackupCodes) have been replaced with anonymised values and the row retained only for FK integrity / legal-hold (Indian Income Tax Act §139A, 7-year payroll retention). Written by UserAnonymizer in a single transaction with status=INACTIVE.';
