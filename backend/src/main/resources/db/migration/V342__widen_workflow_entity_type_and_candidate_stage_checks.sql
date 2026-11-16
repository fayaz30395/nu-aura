-- DEF-HIRE-01: V95 re-created the entity_type CHECK with only 8 values, so RECRUITMENT_OFFER
-- (and 12 other WorkflowDefinition.EntityType values) could never be stored.
ALTER TABLE workflow_definitions DROP CONSTRAINT IF EXISTS workflow_definitions_entity_type_check;
ALTER TABLE workflow_definitions
  ADD CONSTRAINT workflow_definitions_entity_type_check
    CHECK (entity_type IN ('LEAVE_REQUEST', 'EXPENSE_CLAIM', 'TRAVEL_REQUEST', 'LOAN_REQUEST', 'ASSET_REQUEST',
                           'TIMESHEET', 'RESIGNATION', 'SALARY_REVISION', 'PROMOTION', 'TRANSFER', 'ONBOARDING',
                           'OFFBOARDING', 'DOCUMENT_REQUEST', 'POLICY_ACKNOWLEDGMENT', 'TRAINING_REQUEST',
                           'REIMBURSEMENT', 'OVERTIME', 'SHIFT_CHANGE', 'WORK_FROM_HOME', 'RECRUITMENT_OFFER',
                           'PERFORMANCE_REVIEW', 'CUSTOM'));

-- DEF-HIRE-02: V20 CHECK omitted 5 Candidate.RecruitmentStage values.
ALTER TABLE candidates DROP CONSTRAINT IF EXISTS candidates_current_stage_check;
ALTER TABLE candidates
  ADD CONSTRAINT candidates_current_stage_check
    CHECK (current_stage IS NULL OR current_stage IN (
                             'APPLICATION_RECEIVED', 'SCREENING', 'INTERVIEW', 'OFFER', 'JOINED',
                             'RECRUITERS_PHONE_CALL', 'PANEL_REVIEW', 'PANEL_REJECT', 'PANEL_SHORTLISTED',
                             'TECHNICAL_INTERVIEW_SCHEDULED', 'TECHNICAL_INTERVIEW_COMPLETED',
                             'MANAGEMENT_INTERVIEW_SCHEDULED', 'MANAGEMENT_INTERVIEW_COMPLETED',
                             'CLIENT_INTERVIEW_SCHEDULED', 'CLIENT_INTERVIEW_COMPLETED',
                             'HR_FINAL_INTERVIEW_COMPLETED', 'CANDIDATE_REJECTED', 'OFFER_NDA_TO_BE_RELEASED'));
