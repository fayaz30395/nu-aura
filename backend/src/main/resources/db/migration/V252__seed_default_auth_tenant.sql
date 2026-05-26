INSERT INTO tenants (
  id,
  code,
  name,
  status,
  description,
  contact_email,
  contact_phone,
  settings,
  country,
  timezone,
  created_at,
  updated_at,
  version,
  is_deleted
)
VALUES (
  '550e8400-e29b-41d4-a716-446655440000',
  'default',
  'Default Tenant',
  'ACTIVE',
  'Default tenant used by application auth and integration tests',
  'admin@nulogic.io',
  '+91-9876543210',
  '{}',
  'IN',
  'Asia/Kolkata',
  NOW(),
  NOW(),
  0,
  false
)
ON CONFLICT (id) DO UPDATE
SET status = EXCLUDED.status,
    country = EXCLUDED.country,
    timezone = EXCLUDED.timezone,
    updated_at = NOW(),
    is_deleted = false;
