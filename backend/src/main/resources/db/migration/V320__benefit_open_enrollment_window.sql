-- US-2FZ935RGM35F: open-enrollment window (plan) + qualifying-life-event bypass (enrollment)
ALTER TABLE benefit_plans_enhanced
    ADD COLUMN IF NOT EXISTS enrollment_window_start DATE,
    ADD COLUMN IF NOT EXISTS enrollment_window_end DATE;

ALTER TABLE benefit_enrollments
    ADD COLUMN IF NOT EXISTS qualifying_life_event BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS qle_reason TEXT;
