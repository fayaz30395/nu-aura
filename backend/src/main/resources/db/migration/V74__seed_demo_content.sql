-- ============================================================================
-- V74: Seed demo content — Announcements, Wall Posts, Job Openings
-- Tenant: NuLogic (660e8400-e29b-41d4-a716-446655440001)
-- Idempotent via ON CONFLICT (id) DO NOTHING.
-- ============================================================================

-- ============================================================================
-- 1. ANNOUNCEMENTS
-- ============================================================================

-- Announcement 1: Welcome to NU-AURA Platform (by Fayaz, HIGH priority)
INSERT INTO announcements (id, tenant_id, title, content, category, priority, status, target_audience, published_at, is_pinned, send_email, read_count, accepted_count, requires_acceptance, published_by, published_by_name, created_by, updated_by, created_at, updated_at, version, is_deleted)
VALUES (
    '74000000-a000-0000-0000-000000000001',
    '660e8400-e29b-41d4-a716-446655440001',
    'Welcome to NU-AURA Platform',
    'We are excited to announce the launch of NU-AURA — our unified platform for HR management, recruitment, performance, and knowledge sharing. Explore the platform and reach out to your HR team for any questions.',
    'GENERAL',
    'HIGH',
    'PUBLISHED',
    'ALL',
    NOW(),
    true,
    false,
    0,
    0,
    false,
    '550e8400-e29b-41d4-a716-446655440031',
    'Fayaz M',
    '550e8400-e29b-41d4-a716-446655440031',
    '550e8400-e29b-41d4-a716-446655440031',
    NOW(), NOW(), 0, false
) ON CONFLICT (id) DO NOTHING;

-- Announcement 2: Q1 2026 Performance Review Cycle Opens (by Jagadeesh, MEDIUM priority)
INSERT INTO announcements (id, tenant_id, title, content, category, priority, status, target_audience, published_at, is_pinned, send_email, read_count, accepted_count, requires_acceptance, published_by, published_by_name, created_by, updated_by, created_at, updated_at, version, is_deleted)
VALUES (
    '74000000-a000-0000-0000-000000000002',
    '660e8400-e29b-41d4-a716-446655440001',
    'Q1 2026 Performance Review Cycle Opens',
    'The Q1 2026 performance review cycle is now open. All managers are requested to complete self-assessments and team reviews by March 31, 2026. Please log into NU-Grow to begin your reviews.',
    'HR',
    'MEDIUM',
    'PUBLISHED',
    'ALL',
    NOW(),
    false,
    true,
    0,
    0,
    false,
    '48000000-0e02-0000-0000-000000000007',
    'Jagadeesh N',
    '48000000-0e02-0000-0000-000000000007',
    '48000000-0e02-0000-0000-000000000007',
    NOW(), NOW(), 0, false
) ON CONFLICT (id) DO NOTHING;

-- Announcement 3: New Office Location - Bengaluru (by Fayaz, LOW priority)
INSERT INTO announcements (id, tenant_id, title, content, category, priority, status, target_audience, published_at, is_pinned, send_email, read_count, accepted_count, requires_acceptance, published_by, published_by_name, created_by, updated_by, created_at, updated_at, version, is_deleted)
VALUES (
    '74000000-a000-0000-0000-000000000003',
    '660e8400-e29b-41d4-a716-446655440001',
    'New Office Location - Bengaluru',
    'We are pleased to share that NuLogic is opening a new office in Bengaluru, Karnataka. The office will be operational starting April 2026. More details on seating and logistics will follow soon.',
    'GENERAL',
    'LOW',
    'PUBLISHED',
    'ALL',
    NOW(),
    false,
    false,
    0,
    0,
    false,
    '550e8400-e29b-41d4-a716-446655440031',
    'Fayaz M',
    '550e8400-e29b-41d4-a716-446655440031',
    '550e8400-e29b-41d4-a716-446655440031',
    NOW(), NOW(), 0, false
) ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 2. SOCIAL WALL POSTS
-- ============================================================================

-- Post 1: Text post — project management module launch (by Fayaz)
INSERT INTO social_posts (id, tenant_id, post_type, content, author_id, is_pinned, visibility, likes_count, comments_count, created_by, updated_by, created_at, updated_at, version, is_deleted)
VALUES (
    '74000000-b000-0000-0000-000000000001',
    '660e8400-e29b-41d4-a716-446655440001',
    'TEXT',
    'Excited to launch our new project management module! This has been months in the making and I am proud of the entire team for making it happen.',
    '550e8400-e29b-41d4-a716-446655440040',
    false,
    'PUBLIC',
    0,
    0,
    '550e8400-e29b-41d4-a716-446655440031',
    '550e8400-e29b-41d4-a716-446655440031',
    NOW(), NOW(), 0, false
) ON CONFLICT (id) DO NOTHING;

-- Post 2: Poll — work arrangement preference (by Jagadeesh)
INSERT INTO social_posts (id, tenant_id, post_type, content, author_id, is_pinned, visibility, likes_count, comments_count, created_by, updated_by, created_at, updated_at, version, is_deleted)
VALUES (
    '74000000-b000-0000-0000-000000000002',
    '660e8400-e29b-41d4-a716-446655440001',
    'POLL',
    'What''s your preferred work arrangement?',
    '48000000-e001-0000-0000-000000000007',
    false,
    'PUBLIC',
    0,
    0,
    '48000000-0e02-0000-0000-000000000007',
    '48000000-0e02-0000-0000-000000000007',
    NOW(), NOW(), 0, false
) ON CONFLICT (id) DO NOTHING;

-- Poll options for Post 2
INSERT INTO poll_options (id, tenant_id, post_id, option_text, display_order, created_by, updated_by, created_at, updated_at, version, is_deleted)
VALUES
    ('74000000-c000-0000-0000-000000000001', '660e8400-e29b-41d4-a716-446655440001', '74000000-b000-0000-0000-000000000002', 'Remote', 1, '48000000-0e02-0000-0000-000000000007', '48000000-0e02-0000-0000-000000000007', NOW(), NOW(), 0, false),
    ('74000000-c000-0000-0000-000000000002', '660e8400-e29b-41d4-a716-446655440001', '74000000-b000-0000-0000-000000000002', 'Hybrid', 2, '48000000-0e02-0000-0000-000000000007', '48000000-0e02-0000-0000-000000000007', NOW(), NOW(), 0, false),
    ('74000000-c000-0000-0000-000000000003', '660e8400-e29b-41d4-a716-446655440001', '74000000-b000-0000-0000-000000000002', 'Office', 3, '48000000-0e02-0000-0000-000000000007', '48000000-0e02-0000-0000-000000000007', NOW(), NOW(), 0, false)
ON CONFLICT (id) DO NOTHING;

-- Post 3: Praise — shout out to Saran V (by Sumit)
INSERT INTO social_posts (id, tenant_id, post_type, content, author_id, celebrated_employee_id, is_pinned, visibility, celebration_type, achievement_title, likes_count, comments_count, created_by, updated_by, created_at, updated_at, version, is_deleted)
VALUES (
    '74000000-b000-0000-0000-000000000003',
    '660e8400-e29b-41d4-a716-446655440001',
    'CELEBRATION',
    'Shout out to Saran V for excellent debugging skills! Your persistence in tracking down that production issue saved us hours of downtime.',
    '48000000-e001-0000-0000-000000000001',
    '48000000-e001-0000-0000-000000000002',
    false,
    'PUBLIC',
    'SHOUTOUT',
    'Excellent Debugging Skills',
    0,
    0,
    '48000000-0e02-0000-0000-000000000001',
    '48000000-0e02-0000-0000-000000000001',
    NOW(), NOW(), 0, false
) ON CONFLICT (id) DO NOTHING;

-- Post 4: Text post — team offsite photos (by Mani)
INSERT INTO social_posts (id, tenant_id, post_type, content, author_id, is_pinned, visibility, likes_count, comments_count, created_by, updated_by, created_at, updated_at, version, is_deleted)
VALUES (
    '74000000-b000-0000-0000-000000000004',
    '660e8400-e29b-41d4-a716-446655440001',
    'TEXT',
    'Team offsite photos from last weekend! Had an amazing time bonding with the engineering crew. Looking forward to the next one.',
    '48000000-e001-0000-0000-000000000003',
    false,
    'PUBLIC',
    0,
    0,
    '48000000-0e02-0000-0000-000000000003',
    '48000000-0e02-0000-0000-000000000003',
    NOW(), NOW(), 0, false
) ON CONFLICT (id) DO NOTHING;

-- Post 5: Text post — welcome new team members (by Jagadeesh)
INSERT INTO social_posts (id, tenant_id, post_type, content, author_id, is_pinned, visibility, likes_count, comments_count, created_by, updated_by, created_at, updated_at, version, is_deleted)
VALUES (
    '74000000-b000-0000-0000-000000000005',
    '660e8400-e29b-41d4-a716-446655440001',
    'TEXT',
    'Welcome to our new team members joining this quarter! We are thrilled to have you on board. Please do not hesitate to reach out to HR or your managers for anything you need.',
    '48000000-e001-0000-0000-000000000007',
    false,
    'PUBLIC',
    0,
    0,
    '48000000-0e02-0000-0000-000000000007',
    '48000000-0e02-0000-0000-000000000007',
    NOW(), NOW(), 0, false
) ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 3. JOB OPENINGS
-- ============================================================================

-- Job Opening 1: Senior Frontend Engineer (Engineering, OPEN, Sumit as hiring manager)
INSERT INTO job_openings (id, tenant_id, job_code, job_title, department_id, location, employment_type, experience_required, number_of_openings, job_description, requirements, skills_required, hiring_manager_id, status, posted_date, closing_date, priority, is_active, created_by, updated_by, created_at, updated_at, version, is_deleted)
VALUES (
    '74000000-d000-0000-0000-000000000001',
    '660e8400-e29b-41d4-a716-446655440001',
    'JOB-2026-001',
    'Senior Frontend Engineer',
    '48000000-de00-0000-0000-000000000001',
    'Bengaluru, India',
    'FULL_TIME',
    '5+ years',
    2,
    'We are looking for a Senior Frontend Engineer to join our engineering team. You will work on building and maintaining our Next.js-based platform with a focus on performance, accessibility, and user experience.',
    'Strong experience with React, TypeScript, and Next.js. Familiarity with Tailwind CSS and component libraries. Experience with state management (React Query, Zustand). Good understanding of web performance and accessibility.',
    'React, TypeScript, Next.js, Tailwind CSS, React Query',
    '48000000-e001-0000-0000-000000000001',
    'OPEN',
    '2026-03-01',
    '2026-04-30',
    'HIGH',
    true,
    '48000000-0e02-0000-0000-000000000001',
    '48000000-0e02-0000-0000-000000000001',
    NOW(), NOW(), 0, false
) ON CONFLICT (id) DO NOTHING;

-- Job Opening 2: HR Business Partner (HR, OPEN, Jagadeesh as hiring manager)
INSERT INTO job_openings (id, tenant_id, job_code, job_title, department_id, location, employment_type, experience_required, number_of_openings, job_description, requirements, skills_required, hiring_manager_id, status, posted_date, closing_date, priority, is_active, created_by, updated_by, created_at, updated_at, version, is_deleted)
VALUES (
    '74000000-d000-0000-0000-000000000002',
    '660e8400-e29b-41d4-a716-446655440001',
    'JOB-2026-002',
    'HR Business Partner',
    '48000000-de00-0000-0000-000000000002',
    'Bengaluru, India',
    'FULL_TIME',
    '4+ years',
    1,
    'We are seeking an HR Business Partner to support our growing team. You will partner with department heads to drive people strategy, employee engagement, and organizational development.',
    'Experience in HR business partnering. Strong knowledge of labor laws and HR best practices. Excellent communication and stakeholder management skills. Experience with HRIS platforms.',
    'HR Strategy, Employee Relations, Talent Management, HRIS',
    '48000000-e001-0000-0000-000000000007',
    'OPEN',
    '2026-03-10',
    '2026-05-15',
    'MEDIUM',
    true,
    '48000000-0e02-0000-0000-000000000007',
    '48000000-0e02-0000-0000-000000000007',
    NOW(), NOW(), 0, false
) ON CONFLICT (id) DO NOTHING;

-- Job Opening 3: DevOps Engineer (Engineering, OPEN, Mani as hiring manager)
INSERT INTO job_openings (id, tenant_id, job_code, job_title, department_id, location, employment_type, experience_required, number_of_openings, job_description, requirements, skills_required, hiring_manager_id, status, posted_date, closing_date, priority, is_active, created_by, updated_by, created_at, updated_at, version, is_deleted)
VALUES (
    '74000000-d000-0000-0000-000000000003',
    '660e8400-e29b-41d4-a716-446655440001',
    'JOB-2026-003',
    'DevOps Engineer',
    '48000000-de00-0000-0000-000000000001',
    'Remote, India',
    'FULL_TIME',
    '3+ years',
    1,
    'Join our infrastructure team as a DevOps Engineer. You will be responsible for CI/CD pipelines, container orchestration, monitoring, and ensuring high availability of our platform services.',
    'Experience with Docker, Kubernetes, and CI/CD tools. Familiarity with cloud platforms (GCP preferred). Knowledge of monitoring tools (Prometheus, Grafana). Scripting skills (Bash, Python).',
    'Docker, Kubernetes, GCP, Terraform, Prometheus, Grafana',
    '48000000-e001-0000-0000-000000000003',
    'OPEN',
    '2026-03-15',
    '2026-05-01',
    'HIGH',
    true,
    '48000000-0e02-0000-0000-000000000003',
    '48000000-0e02-0000-0000-000000000003',
    NOW(), NOW(), 0, false
) ON CONFLICT (id) DO NOTHING;
