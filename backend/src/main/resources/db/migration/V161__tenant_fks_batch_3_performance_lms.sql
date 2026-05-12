-- =============================================================================
-- V161 — Tenant FK Batch 3: Performance + LMS + Wellness (25 FKs)
-- =============================================================================
-- Wave-3 audit recommendation #1 — 25 more tables get explicit tenant_id FKs
-- referencing tenants(id) ON DELETE CASCADE for clean tenant offboarding.
--
-- Each constraint is wrapped in an idempotent DO block guarded by
-- information_schema lookups for both the constraint and the table, so reruns
-- are safe and a missing table on a downstream branch will not abort the batch.
--
-- Continues from V157 (core HR) + V158 (payroll + recruitment) — sprint-9 S9-H.
-- =============================================================================

-- Performance reviews + improvement plans + cycles -----------------------------
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'performance_reviews' AND constraint_name = 'fk_performance_reviews_tenant')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'performance_reviews') THEN
        ALTER TABLE performance_reviews ADD CONSTRAINT fk_performance_reviews_tenant
            FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'performance_improvement_plans' AND constraint_name = 'fk_performance_improvement_plans_tenant')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'performance_improvement_plans') THEN
        ALTER TABLE performance_improvement_plans ADD CONSTRAINT fk_performance_improvement_plans_tenant
            FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'review_cycles' AND constraint_name = 'fk_review_cycles_tenant')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'review_cycles') THEN
        ALTER TABLE review_cycles ADD CONSTRAINT fk_review_cycles_tenant
            FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'review_competencies' AND constraint_name = 'fk_review_competencies_tenant')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'review_competencies') THEN
        ALTER TABLE review_competencies ADD CONSTRAINT fk_review_competencies_tenant
            FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'compensation_review_cycles' AND constraint_name = 'fk_compensation_review_cycles_tenant')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'compensation_review_cycles') THEN
        ALTER TABLE compensation_review_cycles ADD CONSTRAINT fk_compensation_review_cycles_tenant
            FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Goals + OKRs ----------------------------------------------------------------
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'goals' AND constraint_name = 'fk_goals_tenant')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'goals') THEN
        ALTER TABLE goals ADD CONSTRAINT fk_goals_tenant
            FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'okr_check_ins' AND constraint_name = 'fk_okr_check_ins_tenant')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'okr_check_ins') THEN
        ALTER TABLE okr_check_ins ADD CONSTRAINT fk_okr_check_ins_tenant
            FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 360 Feedback ----------------------------------------------------------------
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'feedback' AND constraint_name = 'fk_feedback_tenant')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'feedback') THEN
        ALTER TABLE feedback ADD CONSTRAINT fk_feedback_tenant
            FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'feedback_360_cycles' AND constraint_name = 'fk_feedback_360_cycles_tenant')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'feedback_360_cycles') THEN
        ALTER TABLE feedback_360_cycles ADD CONSTRAINT fk_feedback_360_cycles_tenant
            FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'feedback_360_requests' AND constraint_name = 'fk_feedback_360_requests_tenant')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'feedback_360_requests') THEN
        ALTER TABLE feedback_360_requests ADD CONSTRAINT fk_feedback_360_requests_tenant
            FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'feedback_360_responses' AND constraint_name = 'fk_feedback_360_responses_tenant')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'feedback_360_responses') THEN
        ALTER TABLE feedback_360_responses ADD CONSTRAINT fk_feedback_360_responses_tenant
            FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'feedback_360_summaries' AND constraint_name = 'fk_feedback_360_summaries_tenant')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'feedback_360_summaries') THEN
        ALTER TABLE feedback_360_summaries ADD CONSTRAINT fk_feedback_360_summaries_tenant
            FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Skills + skill gaps ---------------------------------------------------------
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'employee_skills' AND constraint_name = 'fk_employee_skills_tenant')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'employee_skills') THEN
        ALTER TABLE employee_skills ADD CONSTRAINT fk_employee_skills_tenant
            FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'skill_gaps' AND constraint_name = 'fk_skill_gaps_tenant')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'skill_gaps') THEN
        ALTER TABLE skill_gaps ADD CONSTRAINT fk_skill_gaps_tenant
            FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
    END IF;
END $$;

-- LMS -------------------------------------------------------------------------
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'lms_courses' AND constraint_name = 'fk_lms_courses_tenant')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'lms_courses') THEN
        ALTER TABLE lms_courses ADD CONSTRAINT fk_lms_courses_tenant
            FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'lms_course_modules' AND constraint_name = 'fk_lms_course_modules_tenant')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'lms_course_modules') THEN
        ALTER TABLE lms_course_modules ADD CONSTRAINT fk_lms_course_modules_tenant
            FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'lms_course_enrollments' AND constraint_name = 'fk_lms_course_enrollments_tenant')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'lms_course_enrollments') THEN
        ALTER TABLE lms_course_enrollments ADD CONSTRAINT fk_lms_course_enrollments_tenant
            FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'lms_quizzes' AND constraint_name = 'fk_lms_quizzes_tenant')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'lms_quizzes') THEN
        ALTER TABLE lms_quizzes ADD CONSTRAINT fk_lms_quizzes_tenant
            FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'lms_quiz_questions' AND constraint_name = 'fk_lms_quiz_questions_tenant')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'lms_quiz_questions') THEN
        ALTER TABLE lms_quiz_questions ADD CONSTRAINT fk_lms_quiz_questions_tenant
            FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'lms_certificates' AND constraint_name = 'fk_lms_certificates_tenant')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'lms_certificates') THEN
        ALTER TABLE lms_certificates ADD CONSTRAINT fk_lms_certificates_tenant
            FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Training --------------------------------------------------------------------
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'training_programs' AND constraint_name = 'fk_training_programs_tenant')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'training_programs') THEN
        ALTER TABLE training_programs ADD CONSTRAINT fk_training_programs_tenant
            FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'training_enrollments' AND constraint_name = 'fk_training_enrollments_tenant')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'training_enrollments') THEN
        ALTER TABLE training_enrollments ADD CONSTRAINT fk_training_enrollments_tenant
            FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Wellness --------------------------------------------------------------------
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'wellness_programs' AND constraint_name = 'fk_wellness_programs_tenant')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'wellness_programs') THEN
        ALTER TABLE wellness_programs ADD CONSTRAINT fk_wellness_programs_tenant
            FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'wellness_challenges' AND constraint_name = 'fk_wellness_challenges_tenant')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'wellness_challenges') THEN
        ALTER TABLE wellness_challenges ADD CONSTRAINT fk_wellness_challenges_tenant
            FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'wellness_points' AND constraint_name = 'fk_wellness_points_tenant')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'wellness_points') THEN
        ALTER TABLE wellness_points ADD CONSTRAINT fk_wellness_points_tenant
            FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'wellness_points_transactions' AND constraint_name = 'fk_wellness_points_transactions_tenant')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'wellness_points_transactions') THEN
        ALTER TABLE wellness_points_transactions ADD CONSTRAINT fk_wellness_points_transactions_tenant
            FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
    END IF;
END $$;
