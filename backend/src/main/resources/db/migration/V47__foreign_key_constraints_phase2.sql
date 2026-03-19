-- =============================================================================
-- V47: Foreign Key Constraints — Phase 2
-- =============================================================================
-- Extends V35 (Phase 1) to cover recruitment, assets, documents, expenses,
-- training, and onboarding modules.
--
-- All FKs use the same production-safe pattern as V35:
--   NOT VALID  — adds constraint without a full-table scan lock
--   VALIDATE   — validates data in a subsequent ShareUpdateExclusiveLock pass
--
-- Every ADD CONSTRAINT is wrapped in a DO block that checks pg_constraint
-- first, making this migration fully idempotent.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- RECRUITMENT MODULE
-- ---------------------------------------------------------------------------

-- job_openings → departments (SET NULL: if department deleted, opening survives)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_job_openings_department') THEN
    ALTER TABLE job_openings
      ADD CONSTRAINT fk_job_openings_department
      FOREIGN KEY (department_id) REFERENCES departments(id)
      ON DELETE SET NULL
      NOT VALID;
  END IF;
END $$;
ALTER TABLE job_openings VALIDATE CONSTRAINT fk_job_openings_department;

-- job_openings → users (SET NULL: audit field — if user deleted, record stays)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_job_openings_created_by') THEN
    ALTER TABLE job_openings
      ADD CONSTRAINT fk_job_openings_created_by
      FOREIGN KEY (created_by) REFERENCES users(id)
      ON DELETE SET NULL
      NOT VALID;
  END IF;
END $$;
ALTER TABLE job_openings VALIDATE CONSTRAINT fk_job_openings_created_by;

-- candidates → job_openings (CASCADE: if opening deleted, candidates are removed)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_candidates_job_opening') THEN
    ALTER TABLE candidates
      ADD CONSTRAINT fk_candidates_job_opening
      FOREIGN KEY (job_opening_id) REFERENCES job_openings(id)
      ON DELETE CASCADE
      NOT VALID;
  END IF;
END $$;
ALTER TABLE candidates VALIDATE CONSTRAINT fk_candidates_job_opening;

-- interviews → candidates (CASCADE: if candidate deleted, so are their interviews)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_interviews_candidate') THEN
    ALTER TABLE interviews
      ADD CONSTRAINT fk_interviews_candidate
      FOREIGN KEY (candidate_id) REFERENCES candidates(id)
      ON DELETE CASCADE
      NOT VALID;
  END IF;
END $$;
ALTER TABLE interviews VALIDATE CONSTRAINT fk_interviews_candidate;

-- interviews → job_openings (CASCADE: if opening deleted, its interviews are removed)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_interviews_job_opening') THEN
    ALTER TABLE interviews
      ADD CONSTRAINT fk_interviews_job_opening
      FOREIGN KEY (job_opening_id) REFERENCES job_openings(id)
      ON DELETE CASCADE
      NOT VALID;
  END IF;
END $$;
ALTER TABLE interviews VALIDATE CONSTRAINT fk_interviews_job_opening;

-- interviews → employees (SET NULL: if interviewer deleted, interview record stays)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_interviews_interviewer') THEN
    ALTER TABLE interviews
      ADD CONSTRAINT fk_interviews_interviewer
      FOREIGN KEY (interviewer_id) REFERENCES employees(id)
      ON DELETE SET NULL
      NOT VALID;
  END IF;
END $$;
ALTER TABLE interviews VALIDATE CONSTRAINT fk_interviews_interviewer;

-- applicants → candidates (CASCADE: if candidate deleted, remove their applicant records)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_applicants_candidate') THEN
    ALTER TABLE applicants
      ADD CONSTRAINT fk_applicants_candidate
      FOREIGN KEY (candidate_id) REFERENCES candidates(id)
      ON DELETE CASCADE
      NOT VALID;
  END IF;
END $$;
ALTER TABLE applicants VALIDATE CONSTRAINT fk_applicants_candidate;

-- applicants → job_openings (CASCADE: if opening deleted, remove applicant records)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_applicants_job_opening') THEN
    ALTER TABLE applicants
      ADD CONSTRAINT fk_applicants_job_opening
      FOREIGN KEY (job_opening_id) REFERENCES job_openings(id)
      ON DELETE CASCADE
      NOT VALID;
  END IF;
END $$;
ALTER TABLE applicants VALIDATE CONSTRAINT fk_applicants_job_opening;

-- ---------------------------------------------------------------------------
-- ASSETS MODULE
-- NOTE: assets.category is a VARCHAR text column (no category_id / asset_categories
--       table exists). No asset_assignments table exists in the schema.
--       Only the assigned_to → employees FK is added here.
-- ---------------------------------------------------------------------------

-- assets → employees (SET NULL: if employee deleted, asset becomes unassigned)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_assets_assigned_to') THEN
    ALTER TABLE assets
      ADD CONSTRAINT fk_assets_assigned_to
      FOREIGN KEY (assigned_to) REFERENCES employees(id)
      ON DELETE SET NULL
      NOT VALID;
  END IF;
END $$;
ALTER TABLE assets VALIDATE CONSTRAINT fk_assets_assigned_to;

-- ---------------------------------------------------------------------------
-- DOCUMENTS MODULE
-- NOTE: document_versions.document_id already has an inline FK defined in
--       V18 (FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE).
--       That constraint has no named CONSTRAINT clause so it uses a system-generated
--       name. We add a named version here only if neither the named nor unnamed
--       constraint already covers this column pair.
--
--       documents.uploaded_by — the documents table is altered (not created) in
--       V18; its full column list is not defined in any Flyway migration. We guard
--       with an existence check on both the table and the column before adding.
-- ---------------------------------------------------------------------------

-- document_versions → documents (CASCADE — add a named constraint if missing)
-- Guard with EXECUTE to avoid parse-time error when documents table does not exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'documents' AND table_schema = 'public')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'document_versions' AND table_schema = 'public')
     AND NOT EXISTS (
       SELECT 1 FROM pg_constraint c
       JOIN pg_class t ON t.oid = c.conrelid
       JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(c.conkey)
       WHERE t.relname = 'document_versions' AND c.contype = 'f' AND a.attname = 'document_id'
     )
  THEN
    EXECUTE 'ALTER TABLE document_versions ADD CONSTRAINT fk_document_versions_document FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE NOT VALID';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_document_versions_document') THEN
    EXECUTE 'ALTER TABLE document_versions VALIDATE CONSTRAINT fk_document_versions_document';
  END IF;
END $$;

-- documents.uploaded_by → users (SET NULL — guard on table + column existence)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'uploaded_by')
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_documents_uploaded_by')
  THEN
    EXECUTE 'ALTER TABLE documents ADD CONSTRAINT fk_documents_uploaded_by FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL NOT VALID';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_documents_uploaded_by') THEN
    EXECUTE 'ALTER TABLE documents VALIDATE CONSTRAINT fk_documents_uploaded_by';
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- EXPENSES MODULE
-- NOTE: No expense_receipts table exists in the schema. Only expense_claims FKs.
-- ---------------------------------------------------------------------------

-- expense_claims → employees (CASCADE: if employee deleted, remove their claims)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_expense_claims_employee') THEN
    ALTER TABLE expense_claims
      ADD CONSTRAINT fk_expense_claims_employee
      FOREIGN KEY (employee_id) REFERENCES employees(id)
      ON DELETE CASCADE
      NOT VALID;
  END IF;
END $$;
ALTER TABLE expense_claims VALIDATE CONSTRAINT fk_expense_claims_employee;

-- expense_claims → users (SET NULL: audit field — if approver deleted, claim survives)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_expense_claims_approved_by') THEN
    ALTER TABLE expense_claims
      ADD CONSTRAINT fk_expense_claims_approved_by
      FOREIGN KEY (approved_by) REFERENCES users(id)
      ON DELETE SET NULL
      NOT VALID;
  END IF;
END $$;
ALTER TABLE expense_claims VALIDATE CONSTRAINT fk_expense_claims_approved_by;

-- ---------------------------------------------------------------------------
-- TRAINING MODULE
-- NOTE: The schema uses training_programs (not training_courses) and the FK
--       column on training_enrollments is program_id (not course_id).
-- ---------------------------------------------------------------------------

-- training_enrollments → employees (CASCADE)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_training_enrollments_employee') THEN
    ALTER TABLE training_enrollments
      ADD CONSTRAINT fk_training_enrollments_employee
      FOREIGN KEY (employee_id) REFERENCES employees(id)
      ON DELETE CASCADE
      NOT VALID;
  END IF;
END $$;
ALTER TABLE training_enrollments VALIDATE CONSTRAINT fk_training_enrollments_employee;

-- training_enrollments → training_programs (CASCADE)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_training_enrollments_program') THEN
    ALTER TABLE training_enrollments
      ADD CONSTRAINT fk_training_enrollments_program
      FOREIGN KEY (program_id) REFERENCES training_programs(id)
      ON DELETE CASCADE
      NOT VALID;
  END IF;
END $$;
ALTER TABLE training_enrollments VALIDATE CONSTRAINT fk_training_enrollments_program;

-- ---------------------------------------------------------------------------
-- CONTRACTS MODULE
-- NOTE: contracts.employee_id and contract_versions.contract_id already have
--       named FK constraints added inline in V16 (fk_contracts_employee and
--       fk_contract_versions_contract). No action required here.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- ONBOARDING MODULE
-- ---------------------------------------------------------------------------

-- onboarding_processes → employees (CASCADE: if employee deleted, remove process)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_onboarding_processes_employee') THEN
    ALTER TABLE onboarding_processes
      ADD CONSTRAINT fk_onboarding_processes_employee
      FOREIGN KEY (employee_id) REFERENCES employees(id)
      ON DELETE CASCADE
      NOT VALID;
  END IF;
END $$;
ALTER TABLE onboarding_processes VALIDATE CONSTRAINT fk_onboarding_processes_employee;
