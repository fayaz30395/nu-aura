# Customer Onboarding Runbook

**Audience:** Ops / Customer Success engineers
**Scope:** Provisioning a new tenant on NU-AURA HRMS (production or demo environment)
**Time estimate:** ~30 minutes for standard onboarding

---

## Prerequisites

Before starting, ensure the following are ready:

- [ ] Production environment is healthy (`GET /actuator/health` → all UP)
- [ ] PostgreSQL access (psql or DBeaver) with `hrms_user` credentials
- [ ] Customer's company details: legal name, short code (3–8 chars, lowercase, no spaces), admin email
- [ ] JWT admin token or access to the internal admin API

---

## Step 1: Create the Tenant Record

Connect to the production database and run the following. Replace all `<PLACEHOLDER>` values.

```sql
BEGIN;

-- 1a. Insert tenant
INSERT INTO tenants (
    id,
    code,
    name,
    subscription_plan,
    is_active,
    created_at,
    updated_at,
    is_deleted
) VALUES (
    gen_random_uuid(),              -- auto-generated, note this UUID for next steps
    '<TENANT_CODE>',                -- e.g. 'acme' — must be unique
    '<COMPANY_LEGAL_NAME>',         -- e.g. 'Acme Corporation Pvt. Ltd.'
    'PROFESSIONAL',                 -- STARTER | PROFESSIONAL | ENTERPRISE
    true,
    NOW(),
    NOW(),
    false
)
RETURNING id;  -- capture this UUID as $TENANT_ID

COMMIT;
```

> Note the returned `id` — this is the **TENANT_ID** used in all subsequent steps.

---

## Step 2: Create the Admin User

```sql
BEGIN;

-- 2a. Create the user account
INSERT INTO users (
    id,
    tenant_id,
    email,
    password_hash,          -- See note below about initial password
    role,
    is_active,
    email_verified,
    created_at,
    updated_at,
    is_deleted
) VALUES (
    gen_random_uuid(),
    '<TENANT_ID>',          -- from Step 1
    '<ADMIN_EMAIL>',        -- customer's admin email
    '$2a$10$PLACEHOLDER',   -- bcrypt hash; use Step 2b to generate
    'SUPER_ADMIN',
    true,
    true,                   -- mark verified; password reset email sent in Step 5
    NOW(),
    NOW(),
    false
)
RETURNING id;               -- capture as $USER_ID

COMMIT;
```

**Step 2b — Generate bcrypt hash for temporary password:**
```bash
# Install htpasswd (macOS: brew install httpd)
htpasswd -bnBC 10 "" 'TempPass@2026!' | tr -d ':\n'
# Or use Python:
python3 -c "import bcrypt; print(bcrypt.hashpw(b'TempPass@2026!', bcrypt.gensalt(10)).decode())"
```
Replace `$2a$10$PLACEHOLDER` with the generated hash.

---

## Step 3: Create the Employee Record for Admin

```sql
BEGIN;

INSERT INTO employees (
    id,
    tenant_id,
    user_id,
    employee_code,
    first_name,
    last_name,
    employment_type,
    status,
    joining_date,
    created_at,
    updated_at,
    is_deleted
) VALUES (
    gen_random_uuid(),
    '<TENANT_ID>',
    '<USER_ID>',            -- from Step 2
    '<TENANT_CODE>-001',    -- e.g. 'acme-001'
    '<FIRST_NAME>',
    '<LAST_NAME>',
    'FULL_TIME',
    'ACTIVE',
    CURRENT_DATE,
    NOW(),
    NOW(),
    false
);

COMMIT;
```

---

## Step 4: Seed Required Reference Data

Every tenant needs at minimum: leave types and office location.

```sql
BEGIN;

-- 4a. Default leave types
INSERT INTO leave_types (id, tenant_id, leave_code, leave_name, days_allowed, carry_forward, is_paid, is_active, created_at, updated_at, is_deleted)
VALUES
    (gen_random_uuid(), '<TENANT_ID>', 'CL',  'Casual Leave',  12, false, true, true, NOW(), NOW(), false),
    (gen_random_uuid(), '<TENANT_ID>', 'SL',  'Sick Leave',    12, false, true, true, NOW(), NOW(), false),
    (gen_random_uuid(), '<TENANT_ID>', 'PL',  'Paid Leave',    18, true,  true, true, NOW(), NOW(), false),
    (gen_random_uuid(), '<TENANT_ID>', 'UPL', 'Unpaid Leave',  0,  false, false,true, NOW(), NOW(), false);

-- 4b. Default office location (HQ)
INSERT INTO office_locations (id, tenant_id, name, code, is_active, created_at, updated_at, is_deleted)
VALUES (
    gen_random_uuid(),
    '<TENANT_ID>',
    'Head Office',
    'HQ',
    true,
    NOW(), NOW(), false
);

-- 4c. Default department
INSERT INTO departments (id, tenant_id, name, code, is_active, created_at, updated_at, is_deleted)
VALUES (
    gen_random_uuid(),
    '<TENANT_ID>',
    'General',
    'GEN',
    true,
    NOW(), NOW(), false
);

COMMIT;
```

---

## Step 5: Send Welcome / Password-Reset Email

Use the internal API to trigger the password-reset flow (requires a service admin token):

```bash
# Option A: Trigger password reset email via API
curl -s -X POST https://api.yourdomain.com/api/v1/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email": "<ADMIN_EMAIL>"}'

# Expected response: {"message": "Password reset email sent"}
```

Alternatively, use the admin panel at `/admin/users` to send a "Set Password" invite.

---

## Step 6: Verify Tenant Isolation

Run a quick sanity check to confirm tenant data is isolated:

```sql
-- Confirm all rows for this tenant exist
SELECT 'tenants' as tbl, COUNT(*) FROM tenants WHERE id = '<TENANT_ID>'
UNION ALL
SELECT 'users',     COUNT(*) FROM users     WHERE tenant_id = '<TENANT_ID>'
UNION ALL
SELECT 'employees', COUNT(*) FROM employees WHERE tenant_id = '<TENANT_ID>'
UNION ALL
SELECT 'leave_types',COUNT(*) FROM leave_types WHERE tenant_id = '<TENANT_ID>'
UNION ALL
SELECT 'office_locations', COUNT(*) FROM office_locations WHERE tenant_id = '<TENANT_ID>';
```

Expected: all counts ≥ 1.

---

## Step 7: Post-Provisioning Smoke Test

Ask the customer's admin to:

1. Log in at `https://app.yourdomain.com/auth/login` with the temporary password
2. Be prompted to set a new password (password-reset flow from Step 5)
3. Land on the dashboard without errors
4. Navigate to **Organization → Departments** — should show "General" department
5. Navigate to **Leave → Leave Types** — should show 4 default leave types

If any step fails, check:
```bash
# Backend logs for this tenant's requests
kubectl logs -n hrms deployment/hrms-backend --tail=100 | grep '<TENANT_ID>'
```

---

## Step 8: Handover Checklist

- [ ] Admin user created and password-reset email sent
- [ ] Admin has successfully logged in and changed password
- [ ] Basic reference data seeded (leave types, office location, department)
- [ ] Customer acknowledged: `X-Tenant-ID` header must be set to `<TENANT_CODE>` for API calls
- [ ] Customer given links to: API docs (`/swagger-ui.html`), user guide
- [ ] Slack/email alert channel configured (optional — see `SLACK_*` env vars)
- [ ] CRM updated with tenant record and go-live date

---

## Rollback Procedure

If provisioning fails after partial completion:

```sql
BEGIN;

-- Delete in reverse FK order
DELETE FROM employees        WHERE tenant_id = '<TENANT_ID>';
DELETE FROM leave_types      WHERE tenant_id = '<TENANT_ID>';
DELETE FROM office_locations WHERE tenant_id = '<TENANT_ID>';
DELETE FROM departments      WHERE tenant_id = '<TENANT_ID>';
DELETE FROM users            WHERE tenant_id = '<TENANT_ID>';
DELETE FROM tenants          WHERE id        = '<TENANT_ID>';

COMMIT;
```

Verify with: `SELECT COUNT(*) FROM tenants WHERE id = '<TENANT_ID>';` — should return 0.

---

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| Login returns 403 | `is_active = false` on user or tenant | `UPDATE users SET is_active = true WHERE email = '<email>'` |
| Dashboard shows "No data" | Leave types / departments not seeded | Re-run Step 4 |
| Emails not delivered | SMTP creds wrong, or quota exceeded | Check MAIL_* env vars; check SMTP provider logs |
| `X-Tenant-ID` header errors | Tenant code mismatch | Confirm `code` in tenants table matches header value |
| Redis errors on login | Redis not reachable | Check `SPRING_REDIS_HOST` and `SPRING_REDIS_PASSWORD` |
| `tenant_id` FK violations | Steps executed out of order | Rollback and restart from Step 1 |
