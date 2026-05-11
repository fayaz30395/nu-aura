# Tenant Lifecycle Runbook

## Purpose

Procedures for onboarding, suspending, activating, and (where supported) deleting tenants on
the NU-AURA platform. Also covers GDPR Article 15 / 17 / 20 data subject requests, which
are currently handled manually pending DSR endpoint delivery.

---

## Prerequisites

- SUPER_ADMIN role (only)
- Direct DB access for onboarding seed data
- Slack `#tenant-ops` channel for broadcast notifications
- Access to support@nulogic.io for GDPR correspondence

---

## 1. Tenant Onboarding

A new tenant requires three things to be fully usable: the tenant row, default
configuration data (leave types, roles, permissions), and a seed admin user.

### Step 1: Create the tenant record

```sql
INSERT INTO tenants (id, name, subdomain, status, plan_tier,
                     contact_email, contact_phone, billing_email,
                     created_at, updated_at)
VALUES (gen_random_uuid(),
        '<Tenant Display Name>',
        '<subdomain>',           -- lowercase, alphanumeric + hyphen, unique
        'ACTIVE',
        'STANDARD',              -- or PREMIUM / ENTERPRISE
        'admin@<tenant>.com',
        '+91-XXXXX-XXXXX',
        'billing@<tenant>.com',
        NOW(), NOW())
RETURNING id;
-- Capture the returned <tenant_id> for subsequent steps
```

### Step 2: Seed default LeaveTypes

The platform expects each tenant to have these standard leave types. Adjust per region.

```sql
INSERT INTO leave_types (id, tenant_id, name, code, days_per_year, accrual_type,
                         carry_forward_allowed, max_carry_forward, is_paid, is_active,
                         created_at, updated_at)
VALUES
  (gen_random_uuid(), '<tenant_id>', 'Casual Leave',    'CL', 12, 'MONTHLY', true,  5, true, true, NOW(), NOW()),
  (gen_random_uuid(), '<tenant_id>', 'Sick Leave',      'SL', 12, 'YEARLY',  false, 0, true, true, NOW(), NOW()),
  (gen_random_uuid(), '<tenant_id>', 'Earned Leave',    'EL', 18, 'MONTHLY', true, 30, true, true, NOW(), NOW()),
  (gen_random_uuid(), '<tenant_id>', 'Maternity Leave', 'ML', 182, 'EVENT', false,  0, true, true, NOW(), NOW()),
  (gen_random_uuid(), '<tenant_id>', 'Paternity Leave', 'PL', 15,  'EVENT', false,  0, true, true, NOW(), NOW()),
  (gen_random_uuid(), '<tenant_id>', 'Comp Off',        'CO', 0,   'EVENT', true,  10, true, true, NOW(), NOW());
```

### Step 3: Seed default Roles

The platform ships with 6 baseline roles. Create them per tenant — permissions are
inherited from the system role catalog.

```sql
INSERT INTO roles (id, tenant_id, name, description, is_system_role, is_active, created_at, updated_at)
VALUES
  (gen_random_uuid(), '<tenant_id>', 'TENANT_ADMIN',    'Full access within the tenant',     true, true, NOW(), NOW()),
  (gen_random_uuid(), '<tenant_id>', 'HR_MANAGER',      'Manages employee lifecycle + leave',true, true, NOW(), NOW()),
  (gen_random_uuid(), '<tenant_id>', 'PAYROLL_MANAGER', 'Runs and approves payroll',         true, true, NOW(), NOW()),
  (gen_random_uuid(), '<tenant_id>', 'MANAGER',         'Team manager — approvals + reports',true, true, NOW(), NOW()),
  (gen_random_uuid(), '<tenant_id>', 'EMPLOYEE',        'Standard employee access',          true, true, NOW(), NOW()),
  (gen_random_uuid(), '<tenant_id>', 'AUDITOR',         'Read-only audit access',            true, true, NOW(), NOW());

-- Attach default permissions to each role (uses the system role-permission template)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.is_default_for_role = r.name
WHERE r.tenant_id = '<tenant_id>';
```

### Step 4: Create the seed admin user

```sql
INSERT INTO users (id, tenant_id, email, password_hash, first_name, last_name,
                   status, must_change_password, mfa_enabled,
                   created_at, updated_at)
VALUES (gen_random_uuid(),
        '<tenant_id>',
        'admin@<tenant>.com',
        crypt('<temp-password>', gen_salt('bf', 12)),  -- 12+ chars, mixed case, digit, special
        'Admin', 'User',
        'ACTIVE', true, false,
        NOW(), NOW())
RETURNING id;

-- Assign TENANT_ADMIN role
INSERT INTO user_roles (user_id, role_id, assigned_at)
SELECT '<seed_user_id>', id, NOW()
FROM roles
WHERE tenant_id = '<tenant_id>' AND name = 'TENANT_ADMIN';
```

### Step 5: Trigger CacheWarmUpService

```bash
# Warm caches for the new tenant (avoids cold-start on first login)
curl -X POST "https://api.nu-aura.io/api/v1/admin/system/tenants/<tenant_id>/warm-cache" \
  -H "Authorization: Bearer <super-admin-jwt>"
```

### Step 6: Notify the tenant admin

Send the welcome email with the temporary password (single-use; user is forced to reset on
first login due to `must_change_password = true`). Use a secure channel — never paste
passwords in Slack.

### Step 7: Audit

```sql
INSERT INTO audit_logs (id, tenant_id, user_id, event_type, entity_type, entity_id,
                        description, created_at)
VALUES (gen_random_uuid(), '<tenant_id>', '<super-admin-user-id>',
        'TENANT_ONBOARDED', 'Tenant', '<tenant_id>',
        'Onboarded tenant <name>. Seed admin: admin@<tenant>.com. Plan: STANDARD.',
        NOW());
```

---

## 2. Tenant Suspension

Suspends all access for the tenant. Existing JWTs are rejected at the auth layer; cached
permissions are invalidated; UI returns a "Suspended" page.

### Why this is multi-layered

- **JWT filter** (sprint 2): Inspects `tenant_id` in every request and rejects if the
  tenant is suspended. This stops requests at the perimeter even if local caches are stale.
- **TenantStatusCache** (sprint 3): 30-second TTL in-memory cache. On suspend/activate,
  the cache is **explicitly evicted** so all pods reload from DB on the next request.
- **Sprint 3 + 4 wiring**: `TenantStatusCache.evict(tenantId)` is called on every
  status-change transaction commit. This is the change that closed the 30-second propagation
  gap.

### Suspension command

```bash
curl -X POST "https://api.nu-aura.io/api/v1/admin/system/tenants/<tenant_id>/suspend" \
  -H "Authorization: Bearer <super-admin-jwt>" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "<billing overdue / TOS violation / customer request>",
    "notify_tenant_admin": true
  }'
```

The endpoint:

1. Updates `tenants.status = 'SUSPENDED'`
2. Evicts `TenantStatusCache.evict(<tenant_id>)` on the local pod
3. Publishes a Kafka event `tenant.status.changed` so other pods evict their caches
4. Returns `{ "status": "SUSPENDED", "effective_at": "<UTC>" }`

### Verify propagation

```bash
# Hit /me endpoint as a user of that tenant; expect 403 SUSPENDED
curl -s "https://api.nu-aura.io/api/v1/me" \
  -H "Authorization: Bearer <tenant-user-jwt>" | jq .

# Check the tenant status cache on each pod
for pod in $(kubectl get pods -n hrms -l app=hrms-backend -o jsonpath='{.items[*].metadata.name}'); do
  echo "=== $pod ==="
  kubectl exec -n hrms "$pod" -- curl -s localhost:8080/actuator/caches/tenantStatus | jq .
done
```

If any pod still reports the tenant as ACTIVE after 35 seconds (30s TTL + 5s grace), force-evict:

```bash
kubectl exec -n hrms <pod-name> -- curl -X DELETE \
  localhost:8080/actuator/caches/tenantStatus
```

### Audit

```sql
INSERT INTO audit_logs (id, tenant_id, user_id, event_type, entity_type, entity_id,
                        description, created_at)
VALUES (gen_random_uuid(), '<tenant_id>', '<super-admin-user-id>',
        'TENANT_SUSPENDED', 'Tenant', '<tenant_id>',
        'Suspended tenant. Reason: <reason>. Triggered by: <admin-email>.',
        NOW());
```

---

## 3. Tenant Activation

Reverses suspension. Same controller, status flips to ACTIVE.

```bash
curl -X POST "https://api.nu-aura.io/api/v1/admin/system/tenants/<tenant_id>/activate" \
  -H "Authorization: Bearer <super-admin-jwt>" \
  -H "Content-Type: application/json" \
  -d '{ "notify_tenant_admin": true }'
```

Cache propagation: same 30-second TTL applies. Tell the tenant admin to wait 60 seconds
before retrying login if they hit a 403 immediately after.

```sql
-- Audit
INSERT INTO audit_logs (id, tenant_id, user_id, event_type, entity_type, entity_id,
                        description, created_at)
VALUES (gen_random_uuid(), '<tenant_id>', '<super-admin-user-id>',
        'TENANT_ACTIVATED', 'Tenant', '<tenant_id>',
        'Reactivated tenant. Suspension lasted <duration>.',
        NOW());
```

---

## 4. Tenant Deletion

**Hard deletion is not supported.** Wave-3 audit flagged FK coverage gaps — several child
tables (audit_logs, payslips, attendance_records) lack cascading deletes against
`tenants.id`. Until the FK gap is closed, deletion is **soft-only**.

### Soft delete (supported)

```sql
UPDATE tenants
SET status = 'DELETED',
    deleted_at = NOW(),
    updated_at = NOW()
WHERE id = '<tenant_id>'
AND status IN ('SUSPENDED', 'ACTIVE');

-- All user access is revoked through the same JWT-layer check as suspension
```

This preserves all historical data for audit and potential reactivation.

### Hard delete (manual procedure, NOT for routine use)

If a tenant explicitly requests hard delete under GDPR Article 17 and legal sign-off is
obtained:

1. Open a ticket and require sign-off from Legal + Engineering Lead
2. Engineer runs a manual cascading delete script in a transaction:
   ```sql
   BEGIN;
   -- Order matters; child tables first
   DELETE FROM audit_logs WHERE tenant_id = '<tenant_id>';
   DELETE FROM payslip_components WHERE payslip_id IN (
     SELECT id FROM payslips WHERE tenant_id = '<tenant_id>'
   );
   DELETE FROM payslips WHERE tenant_id = '<tenant_id>';
   -- ... 350+ more tables ...
   DELETE FROM users WHERE tenant_id = '<tenant_id>';
   DELETE FROM tenants WHERE id = '<tenant_id>';
   COMMIT;
   ```
3. Verify by counting orphaned rows across all `tenant_id`-bearing tables
4. Document the deletion in the **separate** GDPR audit log (preserved indefinitely even
   when the source data is deleted)

The FK gap is tracked as a sprint-5 task: add `ON DELETE CASCADE` to every
`tenant_id` FK so hard delete becomes a one-line `DELETE FROM tenants` operation.

---

## 5. GDPR Article 17 — Right to Erasure

DSR (Data Subject Request) endpoints for erasure are **not yet implemented**. Until then,
handle requests manually via support@nulogic.io.

### Manual erasure process

1. Tenant admin or end user emails support@nulogic.io requesting erasure
2. Verify identity (must match the registered email + answer a security question)
3. Confirm legal basis: standard 30-day SLA per GDPR
4. Engineering executes targeted SQL:
   ```sql
   -- Anonymize PII on the user record (preserves referential integrity for audit / payroll)
   UPDATE users
   SET first_name = 'Deleted',
       last_name = 'User',
       email = 'deleted-' || id || '@anonymized.local',
       phone = NULL,
       date_of_birth = NULL,
       mfa_secret = NULL,
       erasure_requested_at = NOW(),
       status = 'ERASED'
   WHERE id = '<user_id>' AND tenant_id = '<tenant_id>';

   -- Anonymize related PII tables
   UPDATE employees SET ssn = NULL, pan = NULL, aadhaar = NULL,
                        personal_email = NULL, personal_phone = NULL,
                        emergency_contact_name = NULL, emergency_contact_phone = NULL,
                        bank_account_number = NULL, bank_ifsc = NULL
   WHERE user_id = '<user_id>';

   UPDATE tax_declarations SET pan_number = NULL, aadhaar_number = NULL
   WHERE user_id = '<user_id>';

   UPDATE benefit_dependents SET ssn = NULL, name = 'Anonymized'
   WHERE user_id = '<user_id>';
   ```
5. Audit the erasure to the **dsr_audit_log** table (preserved indefinitely even after data is
   removed):
   ```sql
   INSERT INTO dsr_audit_log (id, request_type, subject_email_hash, executed_by,
                              executed_at, tenant_id, justification)
   VALUES (gen_random_uuid(), 'ERASURE',
           encode(digest('<original-email>', 'sha256'), 'hex'),
           '<admin-user-id>', NOW(), '<tenant_id>',
           'GDPR Article 17 request. Ticket: <ticket-id>.');
   ```
6. Email the requester confirming completion within 30 days

---

## 6. GDPR Article 15 / 20 — Access / Portability

DSR endpoints not yet implemented. Manual process:

1. Tenant admin or end user emails support@nulogic.io requesting their data
2. Verify identity (same as erasure)
3. Engineering runs an export script:
   ```bash
   # CLI utility (lives at scripts/dsr-export.py)
   python scripts/dsr-export.py \
     --user-id=<user_id> \
     --tenant-id=<tenant_id> \
     --output=/tmp/dsr-<user_id>.json \
     --format=json  # also supports csv-bundle
   ```
4. Encrypt the export with the requester's PGP key (or via password-protected zip if PGP is
   not available)
5. Send via secure channel (SFTP or password-protected download link with 7-day expiry)
6. Audit the access request:
   ```sql
   INSERT INTO dsr_audit_log (id, request_type, subject_email_hash, executed_by,
                              executed_at, tenant_id, justification)
   VALUES (gen_random_uuid(), 'ACCESS',
           encode(digest('<original-email>', 'sha256'), 'hex'),
           '<admin-user-id>', NOW(), '<tenant_id>',
           'GDPR Article 15 access request. Ticket: <ticket-id>.');
   ```
7. Complete within 30 days of the request

---

## 7. Notes on Future DSR Endpoints (Tracked)

Sprint-5 / sprint-6 work items:

- `POST /api/v1/dsr/erasure` — initiates the erasure workflow with email verification
- `GET /api/v1/dsr/export` — initiates portable-export workflow
- `GET /api/v1/dsr/status/{request-id}` — request status for tenants
- Admin dashboard for DSR queue management
- Automated 30-day SLA enforcement with email reminders

Until these ship, the manual processes in sections 5 and 6 are the only paths.
