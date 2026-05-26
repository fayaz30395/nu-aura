-- Align user_notification_preferences with UserNotificationPreference mapping.
ALTER TABLE user_notification_preferences
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS email_enabled BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS sms_enabled BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS push_enabled BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS in_app_enabled BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS slack_enabled BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS teams_enabled BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS whatsapp_enabled BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS quiet_hours_enabled BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS quiet_hours_start TIME,
  ADD COLUMN IF NOT EXISTS quiet_hours_end TIME,
  ADD COLUMN IF NOT EXISTS digest_frequency VARCHAR(255),
  ADD COLUMN IF NOT EXISTS digest_time TIME,
  ADD COLUMN IF NOT EXISTS digest_day VARCHAR(255);

CREATE TABLE IF NOT EXISTS user_notification_quiet_days
(
  preference_id UUID NOT NULL,
  day_of_week VARCHAR(255)
);

CREATE INDEX IF NOT EXISTS idx_user_notification_quiet_days_preference
  ON user_notification_quiet_days(preference_id);
