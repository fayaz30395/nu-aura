-- Align onboarding task templates with BaseEntity audit fields.

ALTER TABLE onboarding_task_templates
  ADD COLUMN IF NOT EXISTS created_by UUID,
  ADD COLUMN IF NOT EXISTS updated_by UUID;
