-- V155: Add ISO 3166-1 alpha-2 country column to tenants for multi-jurisdiction payroll (i18n-#14).
-- Backfills existing rows to 'IN' (India), matching the platform's historical single-country behaviour,
-- then enforces NOT NULL + DEFAULT + a regex check constraint and indexes for jurisdiction routing.
ALTER TABLE tenants
  ADD COLUMN country VARCHAR(2);

-- Backfill: default existing tenants to 'IN' since NU-AURA is India-first
UPDATE tenants
SET country = 'IN'
WHERE country IS NULL;

ALTER TABLE tenants
  ALTER COLUMN country SET NOT NULL;
ALTER TABLE tenants
  ALTER COLUMN country SET DEFAULT 'IN';
ALTER TABLE tenants
  ADD CONSTRAINT chk_tenants_country_iso CHECK (country ~ '^[A-Z]{2}$');

CREATE INDEX idx_tenants_country ON tenants (country);
