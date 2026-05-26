-- Align notification templates and enabled channels with NotificationTemplate entity.

ALTER TABLE notification_templates
  ADD COLUMN IF NOT EXISTS description VARCHAR(255),
  ADD COLUMN IF NOT EXISTS email_html BOOLEAN,
  ADD COLUMN IF NOT EXISTS push_icon VARCHAR(255),
  ADD COLUMN IF NOT EXISTS push_action VARCHAR(255),
  ADD COLUMN IF NOT EXISTS in_app_icon VARCHAR(255),
  ADD COLUMN IF NOT EXISTS in_app_action_url VARCHAR(255),
  ADD COLUMN IF NOT EXISTS whatsapp_template_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN,
  ADD COLUMN IF NOT EXISTS is_system_template BOOLEAN,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS notification_template_channels
(
  template_id UUID NOT NULL,
  channel VARCHAR(255)
);

CREATE INDEX IF NOT EXISTS idx_notification_template_channels_template
  ON notification_template_channels (template_id);
