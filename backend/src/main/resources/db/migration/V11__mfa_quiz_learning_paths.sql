-- ========== MFA Fields for Users ==========
ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_enabled BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_secret VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_backup_codes TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_setup_at TIMESTAMPTZ;

-- ========== Quiz Attempts Table ==========
CREATE TABLE IF NOT EXISTS lms_quiz_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    quiz_id UUID NOT NULL,
    enrollment_id UUID,
    employee_id UUID NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'IN_PROGRESS',
    score INTEGER,
    max_score INTEGER,
    passing_score INTEGER,
    passed BOOLEAN,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    time_taken_seconds INTEGER,
    attempt_number INTEGER NOT NULL DEFAULT 1,
    answers TEXT,
    feedback TEXT,
    attempted_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    last_modified_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_quiz_attempt_quiz ON lms_quiz_attempts(quiz_id, tenant_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempt_employee ON lms_quiz_attempts(employee_id, tenant_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempt_enrollment ON lms_quiz_attempts(enrollment_id);

-- ========== Quiz Enhancement Columns (tables created in V1) ==========
-- Add any missing columns to lms_quizzes that V1 may not have included
ALTER TABLE lms_quizzes ADD COLUMN IF NOT EXISTS shuffle_options BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE lms_quizzes ADD COLUMN IF NOT EXISTS show_correct_answers BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE lms_quizzes ADD COLUMN IF NOT EXISTS show_score_immediately BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE lms_quizzes ADD COLUMN IF NOT EXISTS questions_per_attempt INTEGER;

-- Add any missing columns to lms_quiz_questions
ALTER TABLE lms_quiz_questions ADD COLUMN IF NOT EXISTS question_image_url VARCHAR(500);
ALTER TABLE lms_quiz_questions ADD COLUMN IF NOT EXISTS correct_answers TEXT;
ALTER TABLE lms_quiz_questions ADD COLUMN IF NOT EXISTS keywords TEXT;
ALTER TABLE lms_quiz_questions ADD COLUMN IF NOT EXISTS is_mandatory BOOLEAN NOT NULL DEFAULT TRUE;

CREATE INDEX IF NOT EXISTS idx_lms_quiz_tenant ON lms_quizzes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_lms_quiz_course ON lms_quizzes(course_id, tenant_id);
CREATE INDEX IF NOT EXISTS idx_lms_question_quiz ON lms_quiz_questions(quiz_id, tenant_id);

-- ========== Learning Paths Tables ==========
CREATE TABLE IF NOT EXISTS lms_learning_paths (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    thumbnail_url VARCHAR(500),
    difficulty_level VARCHAR(30) DEFAULT 'BEGINNER',
    estimated_hours INTEGER,
    is_published BOOLEAN NOT NULL DEFAULT FALSE,
    is_mandatory BOOLEAN NOT NULL DEFAULT FALSE,
    target_roles TEXT,
    prerequisite_path_id UUID,
    total_courses INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    last_modified_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS lms_learning_path_courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    path_id UUID NOT NULL REFERENCES lms_learning_paths(id) ON DELETE CASCADE,
    course_id UUID NOT NULL,
    order_index INTEGER NOT NULL DEFAULT 0,
    is_required BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    last_modified_by UUID,
    version BIGINT DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_lp_tenant ON lms_learning_paths(tenant_id);
CREATE INDEX IF NOT EXISTS idx_lpc_path ON lms_learning_path_courses(path_id);
CREATE INDEX IF NOT EXISTS idx_lpc_course ON lms_learning_path_courses(course_id);

-- ========== Employee Self-Service Profile Updates ==========
CREATE TABLE IF NOT EXISTS employee_profile_update_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    employee_id UUID NOT NULL,
    requested_by UUID NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    changes JSONB NOT NULL,
    review_comment TEXT,
    reviewed_by UUID,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    last_modified_by UUID,
    version BIGINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_profile_update_employee ON employee_profile_update_requests(employee_id, tenant_id);
CREATE INDEX IF NOT EXISTS idx_profile_update_status ON employee_profile_update_requests(tenant_id, status);
