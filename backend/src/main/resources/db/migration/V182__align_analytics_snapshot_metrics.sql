-- ============================================================================
-- V182: Align analytics_snapshots metric columns with AnalyticsSnapshot entity
-- ============================================================================

DO
$$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'analytics_snapshots'
  ) THEN
    ALTER TABLE analytics_snapshots
      ADD COLUMN IF NOT EXISTS snapshot_date DATE,
      ADD COLUMN IF NOT EXISTS year INTEGER,
      ADD COLUMN IF NOT EXISTS month INTEGER,
      ADD COLUMN IF NOT EXISTS quarter INTEGER,
      ADD COLUMN IF NOT EXISTS week INTEGER,
      ADD COLUMN IF NOT EXISTS total_headcount INTEGER,
      ADD COLUMN IF NOT EXISTS active_employees INTEGER,
      ADD COLUMN IF NOT EXISTS on_leave_count INTEGER,
      ADD COLUMN IF NOT EXISTS new_joinees INTEGER,
      ADD COLUMN IF NOT EXISTS separations INTEGER,
      ADD COLUMN IF NOT EXISTS attrition_rate DOUBLE PRECISION,
      ADD COLUMN IF NOT EXISTS retention_rate DOUBLE PRECISION,
      ADD COLUMN IF NOT EXISTS male_count INTEGER,
      ADD COLUMN IF NOT EXISTS female_count INTEGER,
      ADD COLUMN IF NOT EXISTS other_gender_count INTEGER,
      ADD COLUMN IF NOT EXISTS average_age DOUBLE PRECISION,
      ADD COLUMN IF NOT EXISTS average_tenure DOUBLE PRECISION,
      ADD COLUMN IF NOT EXISTS open_positions INTEGER,
      ADD COLUMN IF NOT EXISTS applications_received INTEGER,
      ADD COLUMN IF NOT EXISTS candidates_shortlisted INTEGER,
      ADD COLUMN IF NOT EXISTS offers_extended INTEGER,
      ADD COLUMN IF NOT EXISTS offers_accepted INTEGER,
      ADD COLUMN IF NOT EXISTS offer_acceptance_rate DOUBLE PRECISION,
      ADD COLUMN IF NOT EXISTS average_time_to_hire DOUBLE PRECISION,
      ADD COLUMN IF NOT EXISTS cost_per_hire DOUBLE PRECISION,
      ADD COLUMN IF NOT EXISTS average_attendance_rate DOUBLE PRECISION,
      ADD COLUMN IF NOT EXISTS average_late_percentage DOUBLE PRECISION,
      ADD COLUMN IF NOT EXISTS total_leaves_taken INTEGER,
      ADD COLUMN IF NOT EXISTS average_leaves_per_employee DOUBLE PRECISION,
      ADD COLUMN IF NOT EXISTS average_performance_rating DOUBLE PRECISION,
      ADD COLUMN IF NOT EXISTS high_performers_count INTEGER,
      ADD COLUMN IF NOT EXISTS low_performers_count INTEGER,
      ADD COLUMN IF NOT EXISTS total_payroll_cost DOUBLE PRECISION,
      ADD COLUMN IF NOT EXISTS average_salary DOUBLE PRECISION,
      ADD COLUMN IF NOT EXISTS median_salary DOUBLE PRECISION,
      ADD COLUMN IF NOT EXISTS salary_range_min DOUBLE PRECISION,
      ADD COLUMN IF NOT EXISTS salary_range_max DOUBLE PRECISION,
      ADD COLUMN IF NOT EXISTS training_sessions_conducted INTEGER,
      ADD COLUMN IF NOT EXISTS employees_trained INTEGER,
      ADD COLUMN IF NOT EXISTS average_training_hours DOUBLE PRECISION,
      ADD COLUMN IF NOT EXISTS training_cost DOUBLE PRECISION,
      ADD COLUMN IF NOT EXISTS engagement_score DOUBLE PRECISION,
      ADD COLUMN IF NOT EXISTS satisfaction_score DOUBLE PRECISION,
      ADD COLUMN IF NOT EXISTS enps DOUBLE PRECISION,
      ADD COLUMN IF NOT EXISTS computed_at TIMESTAMPTZ;
  END IF;
END $$;
