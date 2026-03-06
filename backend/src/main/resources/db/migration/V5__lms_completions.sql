-- V5: Add completion_date and certificate_url columns to lms_course_enrollments
-- These fields support certificate delivery and external completion tracking.

ALTER TABLE lms_course_enrollments
    ADD COLUMN IF NOT EXISTS completion_date DATE,
    ADD COLUMN IF NOT EXISTS certificate_url  VARCHAR(500);

-- Backfill completion_date from existing completed_at timestamps
UPDATE lms_course_enrollments
SET completion_date = completed_at::DATE
WHERE completed_at IS NOT NULL
  AND completion_date IS NULL;

-- Composite index for common query pattern: look up enrollment by course + employee
CREATE INDEX IF NOT EXISTS idx_lms_enroll_course_employee
    ON lms_course_enrollments (course_id, employee_id);

COMMENT ON COLUMN lms_course_enrollments.completion_date  IS 'Calendar date the course was completed';
COMMENT ON COLUMN lms_course_enrollments.certificate_url  IS 'URL to the issued certificate PDF/image (MinIO or external)';
