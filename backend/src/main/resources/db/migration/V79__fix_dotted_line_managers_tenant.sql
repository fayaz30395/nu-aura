-- V78: Set up dotted-line managers and promote Saran V to Technology Lead
-- Demonstrates matrix reporting: every employee is an employee first, roles are additive

-- ============================================================
-- 1. PROMOTE Saran V: Software Engineer → Technology Lead
-- ============================================================
-- Saran moves from reporting to Mani S → reports to Sumit Kumar (peer with Mani)
-- Dotted line to Mani S for day-to-day project coordination
UPDATE employees SET
    designation = 'Technology Lead',
    level = 'LEAD',
    job_role = 'TECH_LEAD',
    manager_id = '48000000-e001-0000-0000-000000000001',          -- Sumit Kumar (Engineering Manager)
    dotted_line_manager1_id = '48000000-e001-0000-0000-000000000003', -- Mani S (Team Lead, former direct manager)
    updated_at = NOW()
WHERE id = '48000000-e001-0000-0000-000000000002'                 -- Saran V (EMP-0003)
  AND tenant_id = '660e8400-e29b-41d4-a716-446655440001';

-- ============================================================
-- 2. DOTTED-LINE MANAGERS across the org
-- ============================================================
-- Real orgs have matrix reporting. Let's set it up:

-- Raj P (Software Engineer under Mani S):
--   Primary: Mani S (Team Lead)
--   Dotted 1: Gokul R (Technology Lead) — cross-team code reviews
--   Dotted 2: Sumit Kumar — skip-level visibility
UPDATE employees SET
    dotted_line_manager1_id = '48000000-e001-0000-0000-000000000005', -- Gokul R (Technology Lead)
    dotted_line_manager2_id = '48000000-e001-0000-0000-000000000001', -- Sumit Kumar (Eng Manager)
    updated_at = NOW()
WHERE id = '48000000-e001-0000-0000-000000000004'                    -- Raj P (EMP-0005)
  AND tenant_id = '660e8400-e29b-41d4-a716-446655440001';

-- Anshuman K (Software Engineer under Gokul R):
--   Primary: Gokul R (Technology Lead)
--   Dotted 1: Mani S (Team Lead) — sprint coordination
UPDATE employees SET
    dotted_line_manager1_id = '48000000-e001-0000-0000-000000000003', -- Mani S (Team Lead)
    updated_at = NOW()
WHERE id = '48000000-e001-0000-0000-000000000006'                    -- Anshuman K (EMP-0007)
  AND tenant_id = '660e8400-e29b-41d4-a716-446655440001';

-- Priya K (Technology Lead under Sumit Kumar):
--   Primary: Sumit Kumar (Eng Manager)
--   Dotted 1: Gokul R (Technology Lead) — architecture alignment
--   Dotted 2: Mani S (Team Lead) — delivery coordination
UPDATE employees SET
    dotted_line_manager1_id = '48000000-e001-0000-0000-000000000005', -- Gokul R (Technology Lead)
    dotted_line_manager2_id = '48000000-e001-0000-0000-000000000003', -- Mani S (Team Lead)
    updated_at = NOW()
WHERE id = '48000000-e001-0000-0000-000000000014'                    -- Priya K (EMP-0015)
  AND tenant_id = '660e8400-e29b-41d4-a716-446655440001';

-- Dhanush A (HR Lead under Jagadeesh N):
--   Primary: Jagadeesh N (HR Manager)
--   Dotted 1: Fayaz M (CEO) — strategic HR initiatives
UPDATE employees SET
    dotted_line_manager1_id = '48000000-e001-0000-0000-000000000000', -- Fayaz M (CEO)
    updated_at = NOW()
WHERE id = '48000000-e001-0000-0000-000000000011'                    -- Dhanush A (EMP-0012)
  AND tenant_id = '660e8400-e29b-41d4-a716-446655440001';

-- Suresh M (Recruitment Lead):
--   Primary: Fayaz M (CEO)
--   Dotted 1: Jagadeesh N (HR Manager) — HR process alignment
UPDATE employees SET
    dotted_line_manager1_id = '48000000-e001-0000-0000-000000000007', -- Jagadeesh N (HR Manager)
    updated_at = NOW()
WHERE id = '48000000-e001-0000-0000-000000000008'                    -- Suresh M (EMP-0009)
  AND tenant_id = '660e8400-e29b-41d4-a716-446655440001';

-- ============================================================
-- 3. Update project_members role constraint to include TECHNOLOGY_LEAD
-- ============================================================
ALTER TABLE project_members DROP CONSTRAINT IF EXISTS project_members_role_check;
ALTER TABLE project_members ADD CONSTRAINT project_members_role_check
    CHECK (role IN ('PROJECT_MANAGER','TEAM_LEAD','TECHNOLOGY_LEAD','DEVELOPER','SENIOR_DEVELOPER','JUNIOR_DEVELOPER','QA_ENGINEER','DESIGNER','BUSINESS_ANALYST','ARCHITECT','CONSULTANT','MEMBER'));

-- ============================================================
-- 4. Update Saran's project allocation role to TECHNOLOGY_LEAD
-- ============================================================
UPDATE project_members SET
    role = 'TECHNOLOGY_LEAD',
    allocation_percentage = 50.00,
    can_approve_time = true,
    updated_at = NOW()
WHERE employee_id = '48000000-e001-0000-0000-000000000002'           -- Saran V
  AND project_id = '48000000-0e03-0000-0000-000000000001'            -- NU-AURA V2.0
  AND tenant_id = '660e8400-e29b-41d4-a716-446655440001';

-- ============================================================
-- RESULTING ORG STRUCTURE:
-- ============================================================
--
-- Fayaz M (CEO, CXO)
-- ├── Sumit Kumar (Engineering Manager, MANAGER)
-- │   ├── Mani S (Team Lead, LEAD)
-- │   │   ├── Raj P (Software Engineer, MID)
-- │   │   │   └── dotted: Gokul R, Sumit Kumar
-- │   │   └── [Saran V moved out — now peer]
-- │   ├── Gokul R (Technology Lead, LEAD)
-- │   │   └── Anshuman K (Software Engineer, ENTRY)
-- │   │       └── dotted: Mani S
-- │   ├── Saran V (Technology Lead, LEAD) ← PROMOTED, peer with Mani & Gokul
-- │   │   └── dotted: Mani S (former manager, now coordinator)
-- │   └── Priya K (Technology Lead, LEAD)
-- │       └── dotted: Gokul R, Mani S
-- ├── Jagadeesh N (HR Manager, MANAGER)
-- │   ├── Dhanush A (HR Lead, LEAD)
-- │   │   └── dotted: Fayaz M (CEO strategic)
-- │   │   ├── Chitra S (HR Executive, MID)
-- │   │   └── Deepak V (HR Executive, ENTRY)
-- │   └── Arun T (HR Executive - Recruitment, MID)
-- └── Suresh M (Recruitment Lead, LEAD)
--     └── dotted: Jagadeesh N (HR alignment)
--     ├── Bharath R (HR Executive - Recruitment, MID)
--     └── Arun T (HR Executive - Recruitment, MID)
