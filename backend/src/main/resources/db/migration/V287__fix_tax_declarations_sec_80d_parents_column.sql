-- V287: Repair corrupted tax_declarations column name.
--
-- On some restored/legacy databases the Section 80D "parents" column was
-- materialized as the malformed identifier "sec d_parents" (embedded space,
-- missing "80") instead of the canonical sec_80d_parents that the
-- TaxDeclaration JPA entity maps to. The mismatch makes every
-- GET /api/v1/tax-declarations request fail with:
--   org.postgresql.util.PSQLException: column td1_0.sec_80d_parents does not exist
--
-- This migration is idempotent and self-guarding:
--   * If the canonical column already exists (clean V0 apply) -> no-op.
--   * If only the corrupted column exists -> rename it (data preserved).
--   * If neither exists -> create the canonical column.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'tax_declarations' AND column_name = 'sec_80d_parents'
    ) THEN
        -- Canonical column already present; nothing to do.
        RETURN;
    ELSIF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'tax_declarations' AND column_name = 'sec d_parents'
    ) THEN
        ALTER TABLE tax_declarations RENAME COLUMN "sec d_parents" TO sec_80d_parents;
    ELSE
        ALTER TABLE tax_declarations ADD COLUMN sec_80d_parents NUMERIC(15, 2);
    END IF;
END
$$;
