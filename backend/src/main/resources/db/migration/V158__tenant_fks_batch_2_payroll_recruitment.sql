-- V158: Tenant FK batch 2 of N — Payroll & Recruitment tables.
--
-- Continuation of V157. Same idempotent pattern: each FK lives in its own DO block that
-- verifies (a) the constraint does not already exist and (b) the target table exists, so
-- a single missing table on a downstream branch will not abort the batch.
--
-- Scope: 23 payroll/recruitment tables (cap of 25 per batch). Subsequent batches will
-- cover performance/OKR, LMS/training, wiki/fluence, etc.

-- ============================================================================
-- PAYROLL
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. salary_structures
-- ----------------------------------------------------------------------------
DO
$$
BEGIN
    IF
NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = 'salary_structures' AND constraint_name = 'fk_salary_structures_tenant'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.tables WHERE table_name = 'salary_structures'
    ) THEN
ALTER TABLE salary_structures
  ADD CONSTRAINT fk_salary_structures_tenant
    FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE;
END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 2. salary_revisions
-- ----------------------------------------------------------------------------
DO
$$
BEGIN
    IF
NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = 'salary_revisions' AND constraint_name = 'fk_salary_revisions_tenant'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.tables WHERE table_name = 'salary_revisions'
    ) THEN
ALTER TABLE salary_revisions
  ADD CONSTRAINT fk_salary_revisions_tenant
    FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE;
END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 3. payroll_runs
-- ----------------------------------------------------------------------------
DO
$$
BEGIN
    IF
NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = 'payroll_runs' AND constraint_name = 'fk_payroll_runs_tenant'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.tables WHERE table_name = 'payroll_runs'
    ) THEN
ALTER TABLE payroll_runs
  ADD CONSTRAINT fk_payroll_runs_tenant
    FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE;
END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 4. global_payroll_runs
-- ----------------------------------------------------------------------------
DO
$$
BEGIN
    IF
NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = 'global_payroll_runs' AND constraint_name = 'fk_global_payroll_runs_tenant'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.tables WHERE table_name = 'global_payroll_runs'
    ) THEN
ALTER TABLE global_payroll_runs
  ADD CONSTRAINT fk_global_payroll_runs_tenant
    FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE;
END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 5. payslips
-- ----------------------------------------------------------------------------
DO
$$
BEGIN
    IF
NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = 'payslips' AND constraint_name = 'fk_payslips_tenant'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.tables WHERE table_name = 'payslips'
    ) THEN
ALTER TABLE payslips
  ADD CONSTRAINT fk_payslips_tenant
    FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE;
END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 6. employee_payroll_records
-- ----------------------------------------------------------------------------
DO
$$
BEGIN
    IF
NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = 'employee_payroll_records' AND constraint_name = 'fk_employee_payroll_records_tenant'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.tables WHERE table_name = 'employee_payroll_records'
    ) THEN
ALTER TABLE employee_payroll_records
  ADD CONSTRAINT fk_employee_payroll_records_tenant
    FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE;
END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 7. employee_loans  (replaces "loans")
-- ----------------------------------------------------------------------------
DO
$$
BEGIN
    IF
NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = 'employee_loans' AND constraint_name = 'fk_employee_loans_tenant'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.tables WHERE table_name = 'employee_loans'
    ) THEN
ALTER TABLE employee_loans
  ADD CONSTRAINT fk_employee_loans_tenant
    FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE;
END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 8. loan_repayments
-- ----------------------------------------------------------------------------
DO
$$
BEGIN
    IF
NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = 'loan_repayments' AND constraint_name = 'fk_loan_repayments_tenant'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.tables WHERE table_name = 'loan_repayments'
    ) THEN
ALTER TABLE loan_repayments
  ADD CONSTRAINT fk_loan_repayments_tenant
    FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE;
END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 9. tax_declarations
-- ----------------------------------------------------------------------------
DO
$$
BEGIN
    IF
NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = 'tax_declarations' AND constraint_name = 'fk_tax_declarations_tenant'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.tables WHERE table_name = 'tax_declarations'
    ) THEN
ALTER TABLE tax_declarations
  ADD CONSTRAINT fk_tax_declarations_tenant
    FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE;
END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 10. tax_proofs
-- ----------------------------------------------------------------------------
DO
$$
BEGIN
    IF
NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = 'tax_proofs' AND constraint_name = 'fk_tax_proofs_tenant'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.tables WHERE table_name = 'tax_proofs'
    ) THEN
ALTER TABLE tax_proofs
  ADD CONSTRAINT fk_tax_proofs_tenant
    FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE;
END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 11. employee_tds_declarations
-- ----------------------------------------------------------------------------
DO
$$
BEGIN
    IF
NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = 'employee_tds_declarations' AND constraint_name = 'fk_employee_tds_declarations_tenant'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.tables WHERE table_name = 'employee_tds_declarations'
    ) THEN
ALTER TABLE employee_tds_declarations
  ADD CONSTRAINT fk_employee_tds_declarations_tenant
    FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE;
END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 12. expense_claims
-- ----------------------------------------------------------------------------
DO
$$
BEGIN
    IF
NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = 'expense_claims' AND constraint_name = 'fk_expense_claims_tenant'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.tables WHERE table_name = 'expense_claims'
    ) THEN
ALTER TABLE expense_claims
  ADD CONSTRAINT fk_expense_claims_tenant
    FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE;
END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 13. travel_requests
-- ----------------------------------------------------------------------------
DO
$$
BEGIN
    IF
NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = 'travel_requests' AND constraint_name = 'fk_travel_requests_tenant'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.tables WHERE table_name = 'travel_requests'
    ) THEN
ALTER TABLE travel_requests
  ADD CONSTRAINT fk_travel_requests_tenant
    FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE;
END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 14. travel_expenses
-- ----------------------------------------------------------------------------
DO
$$
BEGIN
    IF
NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = 'travel_expenses' AND constraint_name = 'fk_travel_expenses_tenant'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.tables WHERE table_name = 'travel_expenses'
    ) THEN
ALTER TABLE travel_expenses
  ADD CONSTRAINT fk_travel_expenses_tenant
    FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE;
END IF;
END $$;

-- ============================================================================
-- RECRUITMENT
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 15. applicants
-- ----------------------------------------------------------------------------
DO
$$
BEGIN
    IF
NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = 'applicants' AND constraint_name = 'fk_applicants_tenant'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.tables WHERE table_name = 'applicants'
    ) THEN
ALTER TABLE applicants
  ADD CONSTRAINT fk_applicants_tenant
    FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE;
END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 16. candidates
-- ----------------------------------------------------------------------------
DO
$$
BEGIN
    IF
NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = 'candidates' AND constraint_name = 'fk_candidates_tenant'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.tables WHERE table_name = 'candidates'
    ) THEN
ALTER TABLE candidates
  ADD CONSTRAINT fk_candidates_tenant
    FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE;
END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 17. interviews
-- ----------------------------------------------------------------------------
DO
$$
BEGIN
    IF
NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = 'interviews' AND constraint_name = 'fk_interviews_tenant'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.tables WHERE table_name = 'interviews'
    ) THEN
ALTER TABLE interviews
  ADD CONSTRAINT fk_interviews_tenant
    FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE;
END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 18. job_openings (replaces "job_postings" / "job_boards" — actual table name)
-- ----------------------------------------------------------------------------
DO
$$
BEGIN
    IF
NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = 'job_openings' AND constraint_name = 'fk_job_openings_tenant'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.tables WHERE table_name = 'job_openings'
    ) THEN
ALTER TABLE job_openings
  ADD CONSTRAINT fk_job_openings_tenant
    FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE;
END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 19. preboarding_candidates
-- ----------------------------------------------------------------------------
DO
$$
BEGIN
    IF
NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = 'preboarding_candidates' AND constraint_name = 'fk_preboarding_candidates_tenant'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.tables WHERE table_name = 'preboarding_candidates'
    ) THEN
ALTER TABLE preboarding_candidates
  ADD CONSTRAINT fk_preboarding_candidates_tenant
    FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE;
END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 20. employee_referrals
-- ----------------------------------------------------------------------------
DO
$$
BEGIN
    IF
NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = 'employee_referrals' AND constraint_name = 'fk_employee_referrals_tenant'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.tables WHERE table_name = 'employee_referrals'
    ) THEN
ALTER TABLE employee_referrals
  ADD CONSTRAINT fk_employee_referrals_tenant
    FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE;
END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 21. recruitment_agencies (created in V118; replaces "agencies")
-- ----------------------------------------------------------------------------
DO
$$
BEGIN
    IF
NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = 'recruitment_agencies' AND constraint_name = 'fk_recruitment_agencies_tenant'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.tables WHERE table_name = 'recruitment_agencies'
    ) THEN
ALTER TABLE recruitment_agencies
  ADD CONSTRAINT fk_recruitment_agencies_tenant
    FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE;
END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 22. interview_scorecards (created in V116; replaces "scorecards")
-- ----------------------------------------------------------------------------
DO
$$
BEGIN
    IF
NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = 'interview_scorecards' AND constraint_name = 'fk_interview_scorecards_tenant'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.tables WHERE table_name = 'interview_scorecards'
    ) THEN
ALTER TABLE interview_scorecards
  ADD CONSTRAINT fk_interview_scorecards_tenant
    FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE;
END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 23. scorecard_templates (created in V116)
-- ----------------------------------------------------------------------------
DO
$$
BEGIN
    IF
NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = 'scorecard_templates' AND constraint_name = 'fk_scorecard_templates_tenant'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.tables WHERE table_name = 'scorecard_templates'
    ) THEN
ALTER TABLE scorecard_templates
  ADD CONSTRAINT fk_scorecard_templates_tenant
    FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE;
END IF;
END $$;
