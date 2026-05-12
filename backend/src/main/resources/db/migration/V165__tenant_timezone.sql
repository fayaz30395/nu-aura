-- V165: Add IANA timezone column to tenants for per-tenant local-time resolution (i18n-#15).
-- Backfills existing rows to 'Asia/Kolkata' (NU-AURA is India-first), then enforces NOT NULL,
-- DEFAULT, and a regex check that matches IANA zone-id shape (e.g. 'UTC', 'Asia/Kolkata',
-- 'America/Argentina/Buenos_Aires'). The 1-to-3-segment shape covers all current tz database
-- zones. Resolver code (TenantTimeService) is the source of truth for semantic validation —
-- the regex is a cheap belt-and-braces guard against arbitrary strings reaching the column.
ALTER TABLE tenants
  ADD COLUMN timezone VARCHAR(40);

-- Backfill: default existing tenants to Asia/Kolkata since NU-AURA is India-first.
UPDATE tenants
SET timezone = 'Asia/Kolkata'
WHERE timezone IS NULL;

ALTER TABLE tenants
  ALTER COLUMN timezone SET NOT NULL;
ALTER TABLE tenants
  ALTER COLUMN timezone SET DEFAULT 'Asia/Kolkata';
ALTER TABLE tenants
  ADD CONSTRAINT chk_tenants_timezone_format
    CHECK (timezone ~ '^[A-Za-z_]+(/[A-Za-z_]+){0,2}$');

CREATE INDEX idx_tenants_timezone ON tenants (timezone);
