-- ============================================================================
-- V76: Seed Projects, Employee Allocations & Technology Lead Designation
--
-- 1. Fix reporting chain (manager_id) per updated org chart
-- 2. Create new employee: Priya K (Technology Lead)
-- 3. Update Gokul R designation to Technology Lead
-- 4. Create 5 projects
-- 5. Allocate employees to projects via project_members
--
-- Tenant: NuLogic (660e8400-e29b-41d4-a716-446655440001)
-- Idempotent via ON CONFLICT DO NOTHING / conditional UPDATEs.
-- ============================================================================

-- ============================================================================
-- Constants (referenced throughout):
--   Tenant ID:       660e8400-e29b-41d4-a716-446655440001
--   SuperAdmin User: 550e8400-e29b-41d4-a716-446655440031  (Fayaz user)
--   Fayaz Employee:  550e8400-e29b-41d4-a716-446655440040
--
--   Sumit Employee:     48000000-e001-0000-0000-000000000001
--   Saran Employee:     48000000-e001-0000-0000-000000000002
--   Mani Employee:      48000000-e001-0000-0000-000000000003
--   Raj Employee:       48000000-e001-0000-0000-000000000004
--   Gokul Employee:     48000000-e001-0000-0000-000000000005
--   Anshuman Employee:  48000000-e001-0000-0000-000000000006
--   Jagadeesh Employee: 48000000-e001-0000-0000-000000000007
--   Suresh Employee:    48000000-e001-0000-0000-000000000008
--   Arun Employee:      48000000-e001-0000-0000-000000000009
--   Bharath Employee:   48000000-e001-0000-0000-000000000010
--   Dhanush Employee:   48000000-e001-0000-0000-000000000011
--   Chitra Employee:    48000000-e001-0000-0000-000000000012
--   Deepak Employee:    48000000-e001-0000-0000-000000000013
--   Priya Employee:     48000000-e001-0000-0000-000000000014  [NEW]
--
--   Engineering Dept:   48000000-de00-0000-0000-000000000001
--   HR Dept:            48000000-de00-0000-0000-000000000002
--   Recruitment Dept:   48000000-de00-0000-0000-000000000003
-- ============================================================================

-- ============================================================================
-- 1. FIX REPORTING CHAIN (manager_id updates)
-- ============================================================================
-- Target hierarchy:
--   Fayaz (CEO)
--   ├─ Sumit (Engineering Manager)       → reports to Fayaz
--   │  ├─ Mani (Team Lead)               → reports to Sumit  (already correct in V49)
--   │  ├─ Gokul (Technology Lead)        → reports to Sumit  (was: Mani in V49)
--   │  └─ Priya (Technology Lead)        → reports to Sumit  [NEW]
--   │
--   Mani (Team Lead)
--   │  ├─ Raj (Software Engineer)        → reports to Mani   (already correct in V49)
--   │  └─ Saran (Software Engineer)      → reports to Mani   (was: Sumit in V49)
--   │
--   Gokul (Technology Lead)
--   │  └─ Anshuman (Software Engineer)   → reports to Gokul  (already correct in V49)

-- Saran: move from Sumit → Mani
UPDATE employees
SET manager_id = '48000000-e001-0000-0000-000000000003',  -- Mani
    updated_at = NOW()
WHERE id = '48000000-e001-0000-0000-000000000002'         -- Saran
  AND tenant_id = '660e8400-e29b-41d4-a716-446655440001';

-- Gokul: move from Mani → Sumit
UPDATE employees
SET manager_id = '48000000-e001-0000-0000-000000000001',  -- Sumit
    updated_at = NOW()
WHERE id = '48000000-e001-0000-0000-000000000005'         -- Gokul
  AND tenant_id = '660e8400-e29b-41d4-a716-446655440001';

-- Suresh: move from Jagadeesh → Fayaz (per org chart: direct CEO report)
UPDATE employees
SET manager_id = '550e8400-e29b-41d4-a716-446655440040',  -- Fayaz
    updated_at = NOW()
WHERE id = '48000000-e001-0000-0000-000000000008'         -- Suresh
  AND tenant_id = '660e8400-e29b-41d4-a716-446655440001';

-- ============================================================================
-- 2. UPDATE GOKUL → Technology Lead designation
-- ============================================================================
UPDATE employees
SET designation = 'Technology Lead',
    job_role    = 'TECH_LEAD',
    level       = 'LEAD',
    updated_at  = NOW()
WHERE id = '48000000-e001-0000-0000-000000000005'
  AND tenant_id = '660e8400-e29b-41d4-a716-446655440001';

-- ============================================================================
-- 3. CREATE NEW EMPLOYEE: Priya K (Technology Lead)
-- ============================================================================

-- 3a. User account for Priya
INSERT INTO users (id, tenant_id, email, first_name, last_name, password_hash, status, failed_login_attempts, mfa_enabled, created_at, updated_at, version, is_deleted)
VALUES (
    '48000000-0e02-0000-0000-000000000014',
    '660e8400-e29b-41d4-a716-446655440001',
    'priya@nulogic.io',
    'Priya', 'K',
    '$2a$10$D7mb1w2eljWfrBF3i8iZCu5A/H4mUXe8.3rHyWvgYy2j8eC3ghqD2',  -- Welcome@123
    'ACTIVE', 0, false,
    NOW(), NOW(), 0, false
) ON CONFLICT (id) DO NOTHING;

-- 3b. Employee record for Priya
INSERT INTO employees (id, tenant_id, employee_code, user_id, first_name, last_name, designation, level, job_role, department_id, manager_id, employment_type, status, joining_date, created_at, updated_at, version, is_deleted)
VALUES (
    '48000000-e001-0000-0000-000000000014',
    '660e8400-e29b-41d4-a716-446655440001',
    'EMP-0015',
    '48000000-0e02-0000-0000-000000000014',
    'Priya', 'K',
    'Technology Lead', 'LEAD', 'TECH_LEAD',
    '48000000-de00-0000-0000-000000000001',              -- Engineering dept
    '48000000-e001-0000-0000-000000000001',              -- reports to Sumit
    'FULL_TIME', 'ACTIVE', '2025-06-01',
    NOW(), NOW(), 0, false
) ON CONFLICT (id) DO NOTHING;

-- 3c. Assign TEAM_LEAD role to Priya
INSERT INTO user_roles (user_id, role_id)
VALUES ('48000000-0e02-0000-0000-000000000014', '48000000-0e01-0000-0000-000000000001')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 4. CREATE 5 PROJECTS
-- ============================================================================

-- Project 1: NU-AURA Platform V2.0
INSERT INTO projects (id, tenant_id, project_code, name, description, start_date, expected_end_date, status, priority, project_manager_id, client_name, budget, currency, created_at, updated_at, created_by, updated_by, version, is_deleted)
VALUES (
    '48000000-0e03-0000-0000-000000000001',
    '660e8400-e29b-41d4-a716-446655440001',
    'PROJ-001',
    'NU-AURA Platform V2.0',
    'Major platform upgrade including new modules, performance improvements, and design system overhaul. Covers NU-HRMS, NU-Hire, NU-Grow frontend and backend enhancements.',
    '2026-01-15',
    '2026-06-30',
    'IN_PROGRESS',
    'CRITICAL',
    '48000000-e001-0000-0000-000000000001',  -- Sumit (PM)
    'NuLogic (Internal)',
    500000.00,
    'INR',
    NOW(), NOW(),
    '550e8400-e29b-41d4-a716-446655440031',  -- created by Fayaz
    '550e8400-e29b-41d4-a716-446655440031',
    0, false
) ON CONFLICT (id) DO NOTHING;

-- Project 2: Mobile App Development
INSERT INTO projects (id, tenant_id, project_code, name, description, start_date, expected_end_date, status, priority, project_manager_id, client_name, budget, currency, created_at, updated_at, created_by, updated_by, version, is_deleted)
VALUES (
    '48000000-0e03-0000-0000-000000000002',
    '660e8400-e29b-41d4-a716-446655440001',
    'PROJ-002',
    'Mobile App Development',
    'React Native mobile application for NU-AURA platform. Employee self-service, attendance tracking, and leave management on mobile devices.',
    '2026-04-01',
    '2026-09-30',
    'PLANNED',
    'HIGH',
    '48000000-e001-0000-0000-000000000003',  -- Mani (PM)
    'NuLogic (Internal)',
    300000.00,
    'INR',
    NOW(), NOW(),
    '550e8400-e29b-41d4-a716-446655440031',
    '550e8400-e29b-41d4-a716-446655440031',
    0, false
) ON CONFLICT (id) DO NOTHING;

-- Project 3: Client Portal - TechCorp
INSERT INTO projects (id, tenant_id, project_code, name, description, start_date, expected_end_date, status, priority, project_manager_id, client_name, budget, currency, created_at, updated_at, created_by, updated_by, version, is_deleted)
VALUES (
    '48000000-0e03-0000-0000-000000000003',
    '660e8400-e29b-41d4-a716-446655440001',
    'PROJ-003',
    'Client Portal - TechCorp',
    'Custom client-facing portal for TechCorp Solutions. Includes employee directory, project tracking, and reporting dashboards.',
    '2026-02-01',
    '2026-08-31',
    'IN_PROGRESS',
    'HIGH',
    '48000000-e001-0000-0000-000000000005',  -- Gokul (PM)
    'TechCorp Solutions',
    800000.00,
    'INR',
    NOW(), NOW(),
    '550e8400-e29b-41d4-a716-446655440031',
    '550e8400-e29b-41d4-a716-446655440031',
    0, false
) ON CONFLICT (id) DO NOTHING;

-- Project 4: HR Analytics Dashboard
INSERT INTO projects (id, tenant_id, project_code, name, description, start_date, expected_end_date, status, priority, project_manager_id, client_name, budget, currency, created_at, updated_at, created_by, updated_by, version, is_deleted)
VALUES (
    '48000000-0e03-0000-0000-000000000004',
    '660e8400-e29b-41d4-a716-446655440001',
    'PROJ-004',
    'HR Analytics Dashboard',
    'Advanced analytics dashboard for HR metrics. Attrition prediction, headcount forecasting, compensation benchmarking, and diversity reporting.',
    '2026-03-01',
    '2026-05-31',
    'IN_PROGRESS',
    'MEDIUM',
    '48000000-e001-0000-0000-000000000001',  -- Sumit (PM)
    'NuLogic (Internal)',
    150000.00,
    'INR',
    NOW(), NOW(),
    '550e8400-e29b-41d4-a716-446655440031',
    '550e8400-e29b-41d4-a716-446655440031',
    0, false
) ON CONFLICT (id) DO NOTHING;

-- Project 5: API Integration Suite
INSERT INTO projects (id, tenant_id, project_code, name, description, start_date, expected_end_date, status, priority, project_manager_id, client_name, budget, currency, created_at, updated_at, created_by, updated_by, version, is_deleted)
VALUES (
    '48000000-0e03-0000-0000-000000000005',
    '660e8400-e29b-41d4-a716-446655440001',
    'PROJ-005',
    'API Integration Suite',
    'Third-party API integration framework for DataFlow Inc. REST/GraphQL adapters, webhook management, and data transformation pipelines.',
    '2026-05-01',
    '2026-10-31',
    'DRAFT',
    'MEDIUM',
    '48000000-e001-0000-0000-000000000003',  -- Mani (PM)
    'DataFlow Inc',
    250000.00,
    'INR',
    NOW(), NOW(),
    '550e8400-e29b-41d4-a716-446655440031',
    '550e8400-e29b-41d4-a716-446655440031',
    0, false
) ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 5. CREATE PROJECT MEMBER ALLOCATIONS
-- ============================================================================

-- ── PROJ-001: NU-AURA Platform V2.0 ──────────────────────────────────────

-- Sumit → PROJECT_MANAGER, 30%
INSERT INTO project_members (id, tenant_id, project_id, employee_id, role, allocation_percentage, start_date, is_active, can_approve_time, notes, created_at, updated_at)
VALUES (
    '48000000-0e04-0000-0001-000000000001',
    '660e8400-e29b-41d4-a716-446655440001',
    '48000000-0e03-0000-0000-000000000001',
    '48000000-e001-0000-0000-000000000001',
    'PROJECT_MANAGER', 30.00,
    '2026-01-15', true, true,
    'Engineering Manager overseeing platform upgrade',
    NOW(), NOW()
) ON CONFLICT (id) DO NOTHING;

-- Mani → TEAM_LEAD, 50%
INSERT INTO project_members (id, tenant_id, project_id, employee_id, role, allocation_percentage, start_date, is_active, can_approve_time, notes, created_at, updated_at)
VALUES (
    '48000000-0e04-0000-0001-000000000002',
    '660e8400-e29b-41d4-a716-446655440001',
    '48000000-0e03-0000-0000-000000000001',
    '48000000-e001-0000-0000-000000000003',
    'TEAM_LEAD', 50.00,
    '2026-01-15', true, false,
    'Leading frontend module development',
    NOW(), NOW()
) ON CONFLICT (id) DO NOTHING;

-- Raj → DEVELOPER, 80%
INSERT INTO project_members (id, tenant_id, project_id, employee_id, role, allocation_percentage, start_date, is_active, can_approve_time, notes, created_at, updated_at)
VALUES (
    '48000000-0e04-0000-0001-000000000003',
    '660e8400-e29b-41d4-a716-446655440001',
    '48000000-0e03-0000-0000-000000000001',
    '48000000-e001-0000-0000-000000000004',
    'DEVELOPER', 80.00,
    '2026-01-15', true, false,
    'Full-stack development on core modules',
    NOW(), NOW()
) ON CONFLICT (id) DO NOTHING;

-- Saran → DEVELOPER, 60%
INSERT INTO project_members (id, tenant_id, project_id, employee_id, role, allocation_percentage, start_date, is_active, can_approve_time, notes, created_at, updated_at)
VALUES (
    '48000000-0e04-0000-0001-000000000004',
    '660e8400-e29b-41d4-a716-446655440001',
    '48000000-0e03-0000-0000-000000000001',
    '48000000-e001-0000-0000-000000000002',
    'DEVELOPER', 60.00,
    '2026-01-15', true, false,
    'Backend service development and API work',
    NOW(), NOW()
) ON CONFLICT (id) DO NOTHING;

-- Anshuman → SENIOR_DEVELOPER, 70%
INSERT INTO project_members (id, tenant_id, project_id, employee_id, role, allocation_percentage, start_date, is_active, can_approve_time, notes, created_at, updated_at)
VALUES (
    '48000000-0e04-0000-0001-000000000005',
    '660e8400-e29b-41d4-a716-446655440001',
    '48000000-0e03-0000-0000-000000000001',
    '48000000-e001-0000-0000-000000000006',
    'SENIOR_DEVELOPER', 70.00,
    '2026-01-15', true, false,
    'Frontend component development and testing',
    NOW(), NOW()
) ON CONFLICT (id) DO NOTHING;

-- ── PROJ-002: Mobile App Development ──────────────────────────────────────

-- Mani → PROJECT_MANAGER, 30%
INSERT INTO project_members (id, tenant_id, project_id, employee_id, role, allocation_percentage, start_date, is_active, can_approve_time, notes, created_at, updated_at)
VALUES (
    '48000000-0e04-0000-0002-000000000001',
    '660e8400-e29b-41d4-a716-446655440001',
    '48000000-0e03-0000-0000-000000000002',
    '48000000-e001-0000-0000-000000000003',
    'PROJECT_MANAGER', 30.00,
    '2026-04-01', true, true,
    'Leading mobile app initiative',
    NOW(), NOW()
) ON CONFLICT (id) DO NOTHING;

-- Gokul → TEAM_LEAD, 40%
INSERT INTO project_members (id, tenant_id, project_id, employee_id, role, allocation_percentage, start_date, is_active, can_approve_time, notes, created_at, updated_at)
VALUES (
    '48000000-0e04-0000-0002-000000000002',
    '660e8400-e29b-41d4-a716-446655440001',
    '48000000-0e03-0000-0000-000000000002',
    '48000000-e001-0000-0000-000000000005',
    'TEAM_LEAD', 40.00,
    '2026-04-01', true, false,
    'Mobile architecture and team coordination',
    NOW(), NOW()
) ON CONFLICT (id) DO NOTHING;

-- Anshuman → DEVELOPER, 30% (shared with PROJ-001)
INSERT INTO project_members (id, tenant_id, project_id, employee_id, role, allocation_percentage, start_date, is_active, can_approve_time, notes, created_at, updated_at)
VALUES (
    '48000000-0e04-0000-0002-000000000003',
    '660e8400-e29b-41d4-a716-446655440001',
    '48000000-0e03-0000-0000-000000000002',
    '48000000-e001-0000-0000-000000000006',
    'DEVELOPER', 30.00,
    '2026-04-01', true, false,
    'Mobile UI development (shared allocation with PROJ-001)',
    NOW(), NOW()
) ON CONFLICT (id) DO NOTHING;

-- ── PROJ-003: Client Portal - TechCorp ────────────────────────────────────

-- Gokul → PROJECT_MANAGER, 40%
INSERT INTO project_members (id, tenant_id, project_id, employee_id, role, allocation_percentage, start_date, is_active, can_approve_time, notes, created_at, updated_at)
VALUES (
    '48000000-0e04-0000-0003-000000000001',
    '660e8400-e29b-41d4-a716-446655440001',
    '48000000-0e03-0000-0000-000000000003',
    '48000000-e001-0000-0000-000000000005',
    'PROJECT_MANAGER', 40.00,
    '2026-02-01', true, true,
    'Client-facing project manager for TechCorp engagement',
    NOW(), NOW()
) ON CONFLICT (id) DO NOTHING;

-- Saran → DEVELOPER, 40% (shared with PROJ-001)
INSERT INTO project_members (id, tenant_id, project_id, employee_id, role, allocation_percentage, start_date, is_active, can_approve_time, notes, created_at, updated_at)
VALUES (
    '48000000-0e04-0000-0003-000000000002',
    '660e8400-e29b-41d4-a716-446655440001',
    '48000000-0e03-0000-0000-000000000003',
    '48000000-e001-0000-0000-000000000002',
    'DEVELOPER', 40.00,
    '2026-02-01', true, false,
    'Backend API development for client portal (shared with PROJ-001)',
    NOW(), NOW()
) ON CONFLICT (id) DO NOTHING;

-- Priya → ARCHITECT, 50%
INSERT INTO project_members (id, tenant_id, project_id, employee_id, role, allocation_percentage, start_date, is_active, can_approve_time, notes, created_at, updated_at)
VALUES (
    '48000000-0e04-0000-0003-000000000003',
    '660e8400-e29b-41d4-a716-446655440001',
    '48000000-0e03-0000-0000-000000000003',
    '48000000-e001-0000-0000-000000000014',
    'ARCHITECT', 50.00,
    '2026-02-01', true, false,
    'Solution architecture and technical design for client portal',
    NOW(), NOW()
) ON CONFLICT (id) DO NOTHING;

-- ── PROJ-004: HR Analytics Dashboard ──────────────────────────────────────

-- Sumit → PROJECT_MANAGER, 20%
INSERT INTO project_members (id, tenant_id, project_id, employee_id, role, allocation_percentage, start_date, is_active, can_approve_time, notes, created_at, updated_at)
VALUES (
    '48000000-0e04-0000-0004-000000000001',
    '660e8400-e29b-41d4-a716-446655440001',
    '48000000-0e03-0000-0000-000000000004',
    '48000000-e001-0000-0000-000000000001',
    'PROJECT_MANAGER', 20.00,
    '2026-03-01', true, true,
    'Overseeing analytics dashboard development',
    NOW(), NOW()
) ON CONFLICT (id) DO NOTHING;

-- Raj → DEVELOPER, 20% (shared with PROJ-001)
INSERT INTO project_members (id, tenant_id, project_id, employee_id, role, allocation_percentage, start_date, is_active, can_approve_time, notes, created_at, updated_at)
VALUES (
    '48000000-0e04-0000-0004-000000000002',
    '660e8400-e29b-41d4-a716-446655440001',
    '48000000-0e03-0000-0000-000000000004',
    '48000000-e001-0000-0000-000000000004',
    'DEVELOPER', 20.00,
    '2026-03-01', true, false,
    'Dashboard frontend and data visualization (shared with PROJ-001)',
    NOW(), NOW()
) ON CONFLICT (id) DO NOTHING;

-- ── PROJ-005: API Integration Suite ───────────────────────────────────────

-- Mani → PROJECT_MANAGER, 20%
INSERT INTO project_members (id, tenant_id, project_id, employee_id, role, allocation_percentage, start_date, is_active, can_approve_time, notes, created_at, updated_at)
VALUES (
    '48000000-0e04-0000-0005-000000000001',
    '660e8400-e29b-41d4-a716-446655440001',
    '48000000-0e03-0000-0000-000000000005',
    '48000000-e001-0000-0000-000000000003',
    'PROJECT_MANAGER', 20.00,
    '2026-05-01', true, true,
    'Managing API integration deliverables for DataFlow Inc',
    NOW(), NOW()
) ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- DONE — V76 Seed Data Summary
-- ============================================================================
--
-- Reporting Chain (updated):
--   Fayaz (CEO/SuperAdmin)
--   ├── Sumit Kumar (Engineering Manager) → reports to Fayaz
--   │   ├── Mani S (Team Lead) → reports to Sumit
--   │   │   ├── Raj P (Software Engineer) → reports to Mani
--   │   │   └── Saran V (Software Engineer) → reports to Mani  [UPDATED]
--   │   ├── Gokul R (Technology Lead) → reports to Sumit  [UPDATED]
--   │   │   └── Anshuman K (Software Engineer) → reports to Gokul
--   │   └── Priya K (Technology Lead) → reports to Sumit  [NEW]
--   ├── Jagadeesh N (HR Manager) → reports to Fayaz
--   │   ├── Dhanush A (HR Lead) → reports to Jagadeesh
--   │   │   ├── Chitra S (HR Executive) → reports to Dhanush
--   │   │   └── Deepak V (HR Executive) → reports to Dhanush
--   │   └── Arun T (HR Executive - Recruitment) → reports to Jagadeesh
--   └── Suresh M (Recruitment Lead) → reports to Fayaz  [UPDATED]
--       └── Bharath R (HR Executive - Recruitment) → reports to Suresh
--
-- Projects Created:
--   PROJ-001: NU-AURA Platform V2.0     (IN_PROGRESS, CRITICAL, PM: Sumit)
--   PROJ-002: Mobile App Development    (PLANNED, HIGH, PM: Mani)
--   PROJ-003: Client Portal - TechCorp  (IN_PROGRESS, HIGH, PM: Gokul)
--   PROJ-004: HR Analytics Dashboard    (IN_PROGRESS, MEDIUM, PM: Sumit)
--   PROJ-005: API Integration Suite     (DRAFT, MEDIUM, PM: Mani)
--
-- Allocations (15 project_members):
--   PROJ-001: Sumit(30%), Mani(50%), Raj(80%), Saran(60%), Anshuman(70%)
--   PROJ-002: Mani(30%), Gokul(40%), Anshuman(30%)
--   PROJ-003: Gokul(40%), Saran(40%), Priya(50%)
--   PROJ-004: Sumit(20%), Raj(20%)
--   PROJ-005: Mani(20%)
-- ============================================================================
