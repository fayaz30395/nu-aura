-- ========== Default Workflow Definition for Recruitment Offers ==========
-- This migration seeds a default approval workflow for recruitment offers.
-- Each tenant that uses recruitment offers should have this workflow activated.
-- The workflow requires two approval steps: Hiring Manager → HR Head.

-- Note: This is a template workflow. Actual tenant-specific workflows should be
-- created through the admin UI. This provides a fallback default.

-- No data is inserted here because workflow definitions are tenant-specific.
-- Tenants create their own workflow definitions via the admin API:
--   POST /api/v1/workflow/definitions
-- with entity_type = 'RECRUITMENT_OFFER'

-- The entity_type 'RECRUITMENT_OFFER' is now supported in the Java enum
-- (WorkflowDefinition.EntityType.RECRUITMENT_OFFER) and since entity_type
-- is VARCHAR(50) in the database, no column alteration is needed.

-- Add a comment to document the supported entity types for reference
COMMENT
ON COLUMN workflow_definitions.entity_type IS 'Supported types: LEAVE_REQUEST, EXPENSE_CLAIM, TRAVEL_REQUEST, ASSET_REQUEST, LOAN_REQUEST, SALARY_ADVANCE, TIMESHEET, OVERTIME, ONBOARDING, OFFBOARDING, LETTER_REQUEST, REGULARIZATION, COMP_OFF, WORK_FROM_HOME, RECRUITMENT_OFFER, CUSTOM';
