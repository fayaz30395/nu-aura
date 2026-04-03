-- V98: Add template support columns to pulse_surveys for survey consolidation
-- Templates allow surveys to be saved and reused, supporting the consolidation
-- of the standard survey module into the pulse survey module.

ALTER TABLE pulse_surveys
  ADD COLUMN IF NOT EXISTS is_template BOOLEAN DEFAULT FALSE;
ALTER TABLE pulse_surveys
  ADD COLUMN IF NOT EXISTS template_name VARCHAR (200);
ALTER TABLE pulse_surveys
  ADD COLUMN IF NOT EXISTS template_category VARCHAR (50);

CREATE INDEX IF NOT EXISTS idx_pulse_surveys_template
  ON pulse_surveys(tenant_id, is_template) WHERE is_template = TRUE;
