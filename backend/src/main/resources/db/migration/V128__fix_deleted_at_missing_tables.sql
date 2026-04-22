-- V128__fix_deleted_at_missing_tables.sql
-- Fix: V51 referenced wrong table names (okr_objectives, okr_key_results, performance_goals)
-- and missed several tables created after V51 that inherit deleted_at from BaseEntity.
-- This migration adds deleted_at TIMESTAMPTZ to all affected tables using IF NOT EXISTS guards.

DO
$$
DECLARE
tbl TEXT;
BEGIN
FOR tbl IN
SELECT unnest(ARRAY[
                -- Tables with wrong names in V51 (actual table names)
                'objectives', -- V51 used 'okr_objectives'
              'key_results', -- V51 used 'okr_key_results'
              'goals', -- V51 used 'performance_goals'

  -- Wellness module (entirely missing from V51)
              'wellness_challenges',
              'health_logs',
              'wellness_programs',
              'wellness_points',
              'wellness_points_transactions',
              'challenge_participants',

         -- Training module (missing from V51)
              'training_enrollments',
              'training_skill_mappings',

         -- Performance module (missing sub-tables from V51)
              'feedback_360_responses',
              'feedback_360_requests',
              'feedback_360_summaries',
              'performance_improvement_plans',
              'pip_check_ins',
              'review_competencies',
              'review_cycles',
              'okr_check_ins',

         -- LMS (missing from V51)
              'lms_course_enrollments'
                ])
         LOOP
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = tbl) THEN
            EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ', tbl);
END IF;
END LOOP;
END $$;
