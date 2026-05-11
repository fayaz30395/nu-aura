-- V145: Per-tenant, per-month claim-number sequences for expense + mileage flows.
--
-- HIGH-003 follow-up: ExpenseClaimService.generateClaimNumber and the analogous
-- mileage claim path previously used `private synchronized` blocks plus a
-- max-number query. That guards a single JVM only — under horizontal scale the
-- read-then-write race produces duplicate claim numbers. These tables back a
-- DB-level INSERT ... ON CONFLICT ... DO UPDATE ... RETURNING sequence that is
-- atomic across all pods.
--
-- Keyed by (tenant_id, year_month) so each tenant restarts the counter every
-- month, matching the existing claim-number format prefix (EXP-YYYYMM-NNNN /
-- MIL-YYYYMM-NNNN).

CREATE TABLE IF NOT EXISTS expense_claim_sequence (
    tenant_id     UUID        NOT NULL,
    year_month    VARCHAR(7)  NOT NULL,
    current_value BIGINT      NOT NULL DEFAULT 0,
    PRIMARY KEY (tenant_id, year_month)
);

CREATE TABLE IF NOT EXISTS mileage_claim_sequence (
    tenant_id     UUID        NOT NULL,
    year_month    VARCHAR(7)  NOT NULL,
    current_value BIGINT      NOT NULL DEFAULT 0,
    PRIMARY KEY (tenant_id, year_month)
);
