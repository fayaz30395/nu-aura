-- ============================================================================
-- V188: Align benefit_claims and claim document collection table
-- ============================================================================

ALTER TABLE benefit_claims
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS description VARCHAR(255),
  ADD COLUMN IF NOT EXISTS service_date DATE,
  ADD COLUMN IF NOT EXISTS claim_date DATE,
  ADD COLUMN IF NOT EXISTS diagnosis_code VARCHAR(255),
  ADD COLUMN IF NOT EXISTS procedure_code VARCHAR(255),
  ADD COLUMN IF NOT EXISTS provider_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS provider_type VARCHAR(255),
  ADD COLUMN IF NOT EXISTS hospital_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS is_hospitalization BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS admission_date DATE,
  ADD COLUMN IF NOT EXISTS discharge_date DATE,
  ADD COLUMN IF NOT EXISTS number_of_days INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS dependent_id UUID,
  ADD COLUMN IF NOT EXISTS claimant_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS claimant_relationship VARCHAR(255),
  ADD COLUMN IF NOT EXISTS eligible_amount NUMERIC(38, 2),
  ADD COLUMN IF NOT EXISTS approved_amount NUMERIC(38, 2),
  ADD COLUMN IF NOT EXISTS copay_amount NUMERIC(38, 2),
  ADD COLUMN IF NOT EXISTS deductible_applied NUMERIC(38, 2),
  ADD COLUMN IF NOT EXISTS rejected_amount NUMERIC(38, 2),
  ADD COLUMN IF NOT EXISTS rejection_reason VARCHAR(255),
  ADD COLUMN IF NOT EXISTS pre_authorization_required BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS pre_authorization_number VARCHAR(255),
  ADD COLUMN IF NOT EXISTS pre_authorization_approved BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS bill_number VARCHAR(255),
  ADD COLUMN IF NOT EXISTS prescription_number VARCHAR(255),
  ADD COLUMN IF NOT EXISTS bank_account_number VARCHAR(255),
  ADD COLUMN IF NOT EXISTS ifsc_code VARCHAR(255),
  ADD COLUMN IF NOT EXISTS upi_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS payment_date DATE,
  ADD COLUMN IF NOT EXISTS payment_reference VARCHAR(255),
  ADD COLUMN IF NOT EXISTS processed_by UUID,
  ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS processing_comments VARCHAR(255),
  ADD COLUMN IF NOT EXISTS approved_by UUID,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approval_comments VARCHAR(255),
  ADD COLUMN IF NOT EXISTS is_appealed BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS appeal_reason VARCHAR(255),
  ADD COLUMN IF NOT EXISTS appeal_date DATE;

ALTER TABLE benefit_claims
  ALTER COLUMN claimed_amount TYPE NUMERIC(38, 2)
  USING claimed_amount::NUMERIC(38, 2);

CREATE TABLE IF NOT EXISTS benefit_claim_documents
(
  claim_id UUID NOT NULL,
  document_url VARCHAR(255),
  CONSTRAINT fk_benefit_claim_documents_claim
    FOREIGN KEY (claim_id) REFERENCES benefit_claims (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_benefit_claim_documents_claim
  ON benefit_claim_documents(claim_id);
