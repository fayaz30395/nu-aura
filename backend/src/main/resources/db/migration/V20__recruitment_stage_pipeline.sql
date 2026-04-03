-- V20: Align recruitment stages with NU-Hire 13-stage pipeline
-- Old stages: APPLICATION_RECEIVED, SCREENING, TECHNICAL_ROUND, HR_ROUND, MANAGER_ROUND, FINAL_ROUND, OFFER, JOINED
-- New stages: RECRUITERS_PHONE_CALL, PANEL_REVIEW, PANEL_REJECT, PANEL_SHORTLISTED,
--             TECHNICAL_INTERVIEW_SCHEDULED, TECHNICAL_INTERVIEW_COMPLETED,
--             MANAGEMENT_INTERVIEW_SCHEDULED, MANAGEMENT_INTERVIEW_COMPLETED,
--             CLIENT_INTERVIEW_SCHEDULED, CLIENT_INTERVIEW_COMPLETED,
--             HR_FINAL_INTERVIEW_COMPLETED, CANDIDATE_REJECTED, OFFER_NDA_TO_BE_RELEASED

-- 1. Drop old Hibernate-generated CHECK constraints on current_stage, status, and source
-- (Hibernate will regenerate them from the updated enum on next startup)
ALTER TABLE candidates DROP CONSTRAINT IF EXISTS candidates_current_stage_check;
ALTER TABLE candidates DROP CONSTRAINT IF EXISTS candidates_status_check;
ALTER TABLE candidates DROP CONSTRAINT IF EXISTS candidates_source_check;

-- Also drop employment_type check on job_openings (Hibernate will regenerate)
ALTER TABLE job_openings DROP CONSTRAINT IF EXISTS job_openings_employment_type_check;
ALTER TABLE job_openings DROP CONSTRAINT IF EXISTS job_openings_status_check;
ALTER TABLE job_openings DROP CONSTRAINT IF EXISTS job_openings_priority_check;

-- Drop interview check constraints too
ALTER TABLE interviews DROP CONSTRAINT IF EXISTS interviews_status_check;
ALTER TABLE interviews DROP CONSTRAINT IF EXISTS interviews_interview_type_check;
ALTER TABLE interviews DROP CONSTRAINT IF EXISTS interviews_result_check;

-- 2. Widen current_stage column to accommodate longer enum names
ALTER TABLE candidates ALTER COLUMN current_stage TYPE VARCHAR(60);

-- 3. Re-add CHECK constraint with new 13-stage pipeline values
ALTER TABLE candidates
  ADD CONSTRAINT candidates_current_stage_check
    CHECK (current_stage IN (
                             'RECRUITERS_PHONE_CALL', 'PANEL_REVIEW', 'PANEL_REJECT', 'PANEL_SHORTLISTED',
                             'TECHNICAL_INTERVIEW_SCHEDULED', 'TECHNICAL_INTERVIEW_COMPLETED',
                             'MANAGEMENT_INTERVIEW_SCHEDULED', 'MANAGEMENT_INTERVIEW_COMPLETED',
                             'CLIENT_INTERVIEW_SCHEDULED', 'CLIENT_INTERVIEW_COMPLETED',
                             'HR_FINAL_INTERVIEW_COMPLETED', 'CANDIDATE_REJECTED', 'OFFER_NDA_TO_BE_RELEASED'
      ));

-- Re-add other CHECK constraints with their valid values
ALTER TABLE candidates
  ADD CONSTRAINT candidates_status_check
    CHECK (status IN ('NEW', 'SCREENING', 'INTERVIEW', 'SELECTED', 'OFFER_EXTENDED', 'OFFER_ACCEPTED', 'OFFER_DECLINED',
                      'REJECTED', 'WITHDRAWN'));

ALTER TABLE candidates
  ADD CONSTRAINT candidates_source_check
    CHECK (source IS NULL OR source IN ('JOB_PORTAL', 'REFERRAL', 'LINKEDIN', 'COMPANY_WEBSITE', 'WALK_IN', 'CAMPUS',
                                        'CONSULTANT', 'OTHER'));

ALTER TABLE job_openings
  ADD CONSTRAINT job_openings_employment_type_check
    CHECK (employment_type IS NULL OR
           employment_type IN ('FULL_TIME', 'PART_TIME', 'CONTRACT', 'TEMPORARY', 'INTERNSHIP'));

ALTER TABLE job_openings
  ADD CONSTRAINT job_openings_status_check
    CHECK (status IN ('DRAFT', 'OPEN', 'ON_HOLD', 'CLOSED', 'CANCELLED'));

ALTER TABLE job_openings
  ADD CONSTRAINT job_openings_priority_check
    CHECK (priority IS NULL OR priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT'));

ALTER TABLE interviews
  ADD CONSTRAINT interviews_status_check
    CHECK (status IN ('SCHEDULED', 'RESCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'));

ALTER TABLE interviews
  ADD CONSTRAINT interviews_interview_type_check
    CHECK (interview_type IS NULL OR interview_type IN ('PHONE', 'VIDEO', 'IN_PERSON'));

ALTER TABLE interviews
  ADD CONSTRAINT interviews_result_check
    CHECK (result IS NULL OR result IN ('SELECTED', 'REJECTED', 'ON_HOLD', 'PENDING'));

-- 4. Migrate existing stage values to new pipeline stages
UPDATE candidates
SET current_stage = 'RECRUITERS_PHONE_CALL'
WHERE current_stage = 'APPLICATION_RECEIVED';
UPDATE candidates
SET current_stage = 'PANEL_REVIEW'
WHERE current_stage = 'SCREENING';
UPDATE candidates
SET current_stage = 'TECHNICAL_INTERVIEW_SCHEDULED'
WHERE current_stage = 'TECHNICAL_ROUND';
UPDATE candidates
SET current_stage = 'HR_FINAL_INTERVIEW_COMPLETED'
WHERE current_stage = 'HR_ROUND';
UPDATE candidates
SET current_stage = 'MANAGEMENT_INTERVIEW_SCHEDULED'
WHERE current_stage = 'MANAGER_ROUND';
UPDATE candidates
SET current_stage = 'CLIENT_INTERVIEW_COMPLETED'
WHERE current_stage = 'FINAL_ROUND';
UPDATE candidates
SET current_stage = 'OFFER_NDA_TO_BE_RELEASED'
WHERE current_stage = 'OFFER';
UPDATE candidates
SET current_stage = 'OFFER_NDA_TO_BE_RELEASED'
WHERE current_stage = 'JOINED';
