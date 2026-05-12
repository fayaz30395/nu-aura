# Key & Secret Rotation Runbook

## Purpose

Procedures for rotating every credential, secret, and signing key used by NU-AURA. Rotation
is **quarterly** by default, with an emergency path triggered by suspected compromise.

Aligned with the platform password policy: 90-day max age applies to credentials as well as
user passwords. Document each rotation in the audit log.

---

## 1. Rotation Cadence

| Secret                                          | Quarterly  | Emergency Trigger                   |
|-------------------------------------------------|------------|-------------------------------------|
| `JWT_SECRET`                                    | Yes        | Token leak, JWT signing compromise  |
| `APP_SECURITY_ENCRYPTION_KEY` (CryptoConverter) | Yes        | Hex key leak, suspicious decryption |
| Google OAuth client secret                      | Yes        | Suspicious sign-in pattern          |
| SAML signing certificate                        | Annually   | Cert near expiry, IdP key rotation  |
| Per-tenant API keys                             | On request | Tenant suspects leak                |
| Webhook signing secret                          | Yes        | Public exposure suspected           |
| Slack signing secret                            | Yes        | Slack notifies of key compromise    |
| Database password (Neon)                        | Yes        | DBA password leak                   |
| Redis password                                  | Yes        | Connection-string leak              |
| Kafka SASL credentials                          | Yes        | Broker-side rotation                |

Calendar the rotation cycle on Jan 15 / Apr 15 / Jul 15 / Oct 15 each year.

---

## 2. Prerequisites

- SYSTEM_ADMIN role for app-level rotations
- `kubectl` access to the `hrms` namespace
- Access to GCP Secret Manager (or whatever vault holds the source-of-truth values)
- DBA contact reachable for DB password rotations
- 1-hour low-traffic window for non-zero-downtime rotations

---

## 3. JWT_SECRET Rotation (Zero-Downtime, Overlap Window)

The backend supports an overlap window: sign all new tokens with `JWT_SECRET_NEW` and
verify with both `JWT_SECRET_NEW` and `JWT_SECRET_OLD` for 1 hour, then drop the old.

This avoids invalidating active sessions.

### Step 1: Generate the new secret

```bash
# 256-bit random base64 value
openssl rand -base64 64 | tr -d '\n'
```

Store in GCP Secret Manager:

```bash
echo -n "<new-value>" | gcloud secrets versions add hrms-jwt-secret --data-file=- --project=<prod-project>
```

### Step 2: Configure the overlap window

Update the K8s secret to expose both values:

```bash
kubectl create secret generic hrms-jwt-secret \
  --from-literal=JWT_SECRET="<new-value>" \
  --from-literal=JWT_SECRET_OLD="<previous-value>" \
  -n hrms --dry-run=client -o yaml | kubectl apply -f -

# Rolling restart so all pods see both values
kubectl rollout restart deployment/hrms-backend -n hrms
kubectl rollout status deployment/hrms-backend -n hrms --timeout=300s
```

The `JwtTokenProvider` reads both values: signs with `JWT_SECRET`, falls through to
`JWT_SECRET_OLD` for verification. Tokens issued before the rotation continue to work
until their natural expiry or the 1-hour window closes (whichever comes first).

### Step 3: Wait for the overlap window

```bash
# Default JWT TTL is 60 min, so 1 hour matches naturally
sleep 3600
```

During this window monitor:

- Auth error rate (Grafana > API Metrics > "401 Rate") — should not spike
- Token-blacklist hit rate — should remain steady

### Step 4: Drop the old secret

```bash
kubectl create secret generic hrms-jwt-secret \
  --from-literal=JWT_SECRET="<new-value>" \
  -n hrms --dry-run=client -o yaml | kubectl apply -f -

kubectl rollout restart deployment/hrms-backend -n hrms
```

### Step 5: Audit

```sql
INSERT INTO audit_logs (id, tenant_id, user_id, event_type, entity_type, entity_id,
                        description, created_at)
VALUES (gen_random_uuid(), NULL, '<admin-user-id>',
        'JWT_SECRET_ROTATED', 'Secret', NULL,
        'Quarterly JWT secret rotation. Overlap window <start> to <end>. Old version: <vault-version-id>.',
        NOW());
```

---

## 4. APP_SECURITY_ENCRYPTION_KEY Rotation

This key powers the `CryptoConverter` JPA attribute converter used to encrypt PII at rest.
Affected columns include:

- `users.mfa_secret`
- `tax_declarations.pan_number`, `tax_declarations.aadhaar_number`
- `benefit_dependents.ssn`
- Bank account fields under `payroll_bank_details`
- Any other column annotated with `@Convert(converter = CryptoConverter.class)` — grep
  the backend codebase for the converter to enumerate.

**Rotating this key requires a re-encrypt sweep.** You cannot do an overlap window because
historical ciphertexts are bound to a single key.

### Procedure (planned downtime: 30-60 min)

```bash
# Step 1: Announce a maintenance window via status page and email (T-24h)

# Step 2: Generate the new key (32 random bytes hex-encoded for AES-256-GCM)
openssl rand -hex 32

# Step 3: Stop writes — drain traffic by scaling to 0 replicas
kubectl scale deployment/hrms-backend --replicas=0 -n hrms
```

```sql
-- Step 4: Snapshot encrypted columns (so you can resume if the script breaks halfway)
CREATE TABLE _crypto_rotation_backup AS
SELECT id, mfa_secret FROM users WHERE mfa_secret IS NOT NULL;
-- Repeat for every affected table.
```

```bash
# Step 5: Run the re-encrypt sweep script
# (Standalone Java utility, lives at nu-aura-be/src/main/java/.../tools/CryptoReencryptTool.java)
java -jar tools/crypto-reencrypt.jar \
  --db-url="$PROD_DB_URL" \
  --old-key="$OLD_KEY_HEX" \
  --new-key="$NEW_KEY_HEX" \
  --batch-size=500 \
  --dry-run=false

# Step 6: Update the K8s secret to the new key
kubectl create secret generic hrms-crypto-key \
  --from-literal=APP_SECURITY_ENCRYPTION_KEY="<new-key-hex>" \
  -n hrms --dry-run=client -o yaml | kubectl apply -f -

# Step 7: Restore replicas and verify
kubectl scale deployment/hrms-backend --replicas=3 -n hrms
kubectl rollout status deployment/hrms-backend -n hrms --timeout=300s
```

### Verify decryption works

```bash
# Pick a known user with MFA and confirm their `mfa_secret` decrypts cleanly
curl -s "https://api.nu-aura.io/api/v1/users/<test-user-id>/mfa/status" \
  -H "Authorization: Bearer <admin-jwt>" | jq .
```

If decryption fails for any row, restore from `_crypto_rotation_backup` and revert the
K8s secret to the old key, then investigate offline.

Once verified for 24 hours:

```sql
DROP TABLE _crypto_rotation_backup;
```

---

## 5. OAuth Client Secret Rotation (Google, SAML)

### Google OAuth

1. In Google Cloud Console > APIs & Services > Credentials, find the OAuth 2.0 client
2. Add a new secret (Google allows multiple secrets active simultaneously)
3. Update the K8s secret:
   ```bash
   kubectl create secret generic hrms-google-oauth \
     --from-literal=GOOGLE_OAUTH_CLIENT_SECRET="<new-secret>" \
     -n hrms --dry-run=client -o yaml | kubectl apply -f -
   kubectl rollout restart deployment/hrms-backend -n hrms
   ```
4. Wait 24h, verify no `OAUTH_INVALID_CLIENT` errors in logs
5. Delete the old secret in Google Cloud Console

### SAML certificate (per-tenant)

Each tenant may have its own SAML IdP cert. Rotate via:

```bash
curl -X PUT "https://api.nu-aura.io/api/v1/admin/tenants/<tenant-id>/saml-config" \
  -H "Authorization: Bearer <super-admin-jwt>" \
  -H "Content-Type: application/json" \
  -d '{ "certificate": "<new-cert-pem>", "validUntil": "2027-05-12" }'
```

Coordinate with the tenant admin so they update their IdP before the old cert is revoked.

---

## 6. Per-Tenant API Key Rotation

Tenant admins can rotate their own API keys via the UI. Engineering rotation is rare — only
needed when:

- A key is leaked publicly (GitHub gist, error log on a customer site)
- A tenant is offboarded

```bash
# List active keys for a tenant
curl -s "https://api.nu-aura.io/api/v1/admin/tenants/<tenant-id>/api-keys" \
  -H "Authorization: Bearer <super-admin-jwt>" | jq .

# Revoke a specific key
curl -X DELETE "https://api.nu-aura.io/api/v1/admin/tenants/<tenant-id>/api-keys/<key-id>" \
  -H "Authorization: Bearer <super-admin-jwt>"

# Generate a replacement (returns the plaintext key once; store immediately)
curl -X POST "https://api.nu-aura.io/api/v1/admin/tenants/<tenant-id>/api-keys" \
  -H "Authorization: Bearer <super-admin-jwt>" \
  -H "Content-Type: application/json" \
  -d '{ "name": "rotated-2026-q2", "scopes": ["employees:read", "payroll:read"] }'
```

Notify the tenant admin immediately so they can re-configure their integrations.

---

## 7. Webhook Signing Secret Rotation

Webhook secrets sign outbound payloads with HMAC-SHA256. Receivers verify the signature.

```bash
# Rotate via API (creates a new active secret; old one stays valid for 24h)
curl -X POST "https://api.nu-aura.io/api/v1/admin/tenants/<tenant-id>/webhooks/<webhook-id>/rotate-secret" \
  -H "Authorization: Bearer <super-admin-jwt>"

# Response contains both the new secret and the cutover time
```

The platform sends both `X-Hrms-Signature` (new) and `X-Hrms-Signature-Old` (legacy)
headers during the 24h overlap. Receivers should verify either is valid.

---

## 8. Slack Signing Secret Rotation

The Slack signing secret verifies inbound webhook callbacks from Slack. **Sprint 3 added a
fail-fast check in prod startup** — if `SLACK_SIGNING_SECRET` is missing or matches the
dev placeholder, the backend refuses to start. This was added after a near-miss where the
secret silently fell back to the dev value.

### Rotation procedure

1. In Slack App config (api.slack.com/apps/<app-id>/general), regenerate the signing secret
2. Copy the new value immediately (Slack shows it once)
3. Update K8s and restart:
   ```bash
   kubectl create secret generic hrms-slack-secret \
     --from-literal=SLACK_SIGNING_SECRET="<new-secret>" \
     -n hrms --dry-run=client -o yaml | kubectl apply -f -

   kubectl rollout restart deployment/hrms-backend -n hrms
   ```
4. Verify startup did not fail — check logs for `SLACK_SIGNING_SECRET validation passed`
5. Send a test webhook from Slack and confirm 200 response in `/actuator/metrics`

---

## 9. Database & Infra Credentials

### Neon (Postgres) password

```bash
# 1. Generate new password and update via Neon console or CLI
neonctl roles update <role-name> --password="<new-password>"

# 2. Update K8s secret
kubectl create secret generic hrms-db-secret \
  --from-literal=DB_PASSWORD="<new-password>" \
  --from-literal=DB_URL="postgresql://<user>:<new-password>@<host>/<db>?sslmode=require" \
  -n hrms --dry-run=client -o yaml | kubectl apply -f -

# 3. Rolling restart (Hikari will reconnect; brief connection storm expected)
kubectl rollout restart deployment/hrms-backend -n hrms
```

### Redis password

Same pattern — update Redis ACL in the managed console, then update `REDIS_PASSWORD` in
the K8s secret and rolling-restart.

### Kafka SASL

Coordinate with the Confluent Cloud admin (or whoever runs the brokers). Update the K8s
secret with the new SASL username/password and rolling-restart. Consumer groups will
reconnect automatically.

---

## 10. Future: Secret Manager / External Secrets Operator (Recommended)

We currently manage K8s secrets manually via `kubectl create secret`. The recommended
target state:

- All source-of-truth values live in **GCP Secret Manager**
- **External Secrets Operator** (ESO) syncs them into K8s secrets automatically
- Rotation is performed once in Secret Manager; ESO propagates to K8s within 60s
- Audit log of rotations is centralized in GCP

This is tracked in the platform backlog but not yet wired. Until then, document every
manual rotation in the audit log (see step 5 of section 3 as the template).

---

## 11. Emergency Rotation (Suspected Compromise)

Skip the overlap window — rotate **immediately** and accept the user-visible impact.

1. Generate new secret value
2. Update K8s secret directly (no overlap)
3. `kubectl rollout restart deployment/hrms-backend -n hrms`
4. For JWT: every user is force-logged-out; push status-page notice
5. For DB / Redis: brief connection storm during reconnect
6. Audit log the emergency rotation with a link to the incident ticket
7. Trigger post-incident review per `incident-response.md`
