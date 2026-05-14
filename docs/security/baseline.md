# NU-AURA Security Baseline

**Owner:** Security Architecture
**Last reviewed:** 2026-05-14
**Cadence:** Quarterly review; per-release delta
**Companion:** `SECURITY.md` (vulnerability reporting policy), `docs/security/scan-checklist.md`

This is the **engineering baseline**: what controls exist, what we scan, what budget we
allow for findings, and where to look when something fires.

---

## Threat Model (Summary)

### Assets (in priority order)

1. **Tenant data isolation** — cross-tenant leakage is the existential threat for a
   multi-tenant SaaS HRMS
2. **PII and compensation data** — salary, SSN-equivalent IDs, bank details
3. **Authentication credentials** — passwords (hashed), JWTs in httpOnly cookies, refresh
   tokens
4. **Audit trail integrity** — non-repudiation of who-changed-what
5. **Payroll execution correctness** — wrong amount or wrong recipient is direct money loss

### Top threats (STRIDE-aligned)

| Threat                        | Vector                                          | Mitigation                                                |
|-------------------------------|-------------------------------------------------|-----------------------------------------------------------|
| Cross-tenant data leak        | Forgotten `WHERE tenant_id` in native query     | RLS at the DB (ADR-010) + app-layer filter                |
| IDOR (e.g., view payslip)     | Sequential resource IDs without authz check     | Scope-based `@RequiresPermission` + UUID resource IDs     |
| SQL injection                 | Dynamic SQL from user input                     | JPA + PreparedStatement only; no string concat            |
| XSS                           | Unsanitized HTML in wiki / wall posts           | DOMPurify on render; CSP edge headers                     |
| CSRF                          | Cross-origin form submission                    | Double-submit cookie; SameSite=Lax on session cookie      |
| SSRF                          | URL fetch in webhooks / file imports            | Allowlist-only domains; private-IP block at HTTP client   |
| Privilege escalation          | Manipulating roles in profile update            | Roles immutable from `/me` endpoints; admin-only path     |
| JWT theft                     | XSS, network sniff                              | httpOnly + Secure + SameSite cookies; short TTL           |
| Brute-force login             | Credential stuffing                             | `AccountLockoutService` 5/15min, `DistributedRateLimiter` |
| Webhook signature bypass      | Replay or HMAC stripping                        | Mandatory `X-Signature` + replay window check (ADR-004)   |
| RCE via SpEL                  | Untrusted input into `StandardEvaluationContext`| Fixed wave-12 — uses `SimpleEvaluationContext`            |
| Insider data dump             | Authorized user exports all employees           | Export rate-limit (5/5min), audit emission, alert on N>1k |

### Out of scope (documented in `SECURITY.md`)

- Social engineering of NULogic staff
- Physical attacks on infrastructure
- DoS attacks (Cloudflare + GCP DDoS protection at edge)
- Attacks requiring physical access to user device

---

## Defense Layers (per request)

```
[Client] → [Cloudflare / CDN]          ← rate limit, WAF rules, DDoS
        → [Next.js middleware]          ← OWASP headers (CSP, X-Frame, HSTS), origin check
        → [Spring Security filter]      ← JWT validation, CSRF (double-submit), session
        → [JwtAuthenticationFilter]     ← TenantContext + permission loading from cache
        → [Controller @RequiresPermission] ← RBAC check, scope check
        → [Service layer]               ← Business validation, audit emission
        → [Repository]                  ← App-layer tenant filter
        → [PostgreSQL RLS]              ← DB enforces tenant isolation (ADR-010)
        → [Audit emit on write]         ← Kafka outbox → audit_events
```

Each layer is independent. Failure of one does not breach the asset because the next layer
also enforces.

---

## Permission Matrix Quick Facts

- **500+ permissions** across 16 business modules — see
  `docs/architecture/rbac/permission-matrix.md`
- **Two formats supported**: `employee.read` (DB seed) and `EMPLOYEE:READ` (Java).
  `JwtAuthenticationFilter.normalizePermissionCode` reconciles.
- **SuperAdmin bypass**: enforced at three levels (filter, service, controller). Never
  block.
- **Implicit grants**: `MODULE:MANAGE` implies all actions; `VIEW_ALL > VIEW_TEAM >
  VIEW_DEPARTMENT > VIEW_SELF`

---

## Cryptography Inventory

| Use case                  | Algorithm                            | Key location                          |
|---------------------------|--------------------------------------|---------------------------------------|
| Password hashing          | bcrypt cost 12                       | n/a (one-way)                         |
| JWT signing               | HS256 (HMAC-SHA256)                  | env `JWT_SECRET`, rotated quarterly   |
| Webhook HMAC              | HMAC-SHA256                          | per-tenant `webhooks.secret`          |
| Field-level encryption    | AES-256-GCM                          | KMS-wrapped DEK per tenant            |
| Session cookie            | httpOnly + Secure + SameSite=Lax     | n/a                                   |
| TLS                       | TLS 1.2+ only                        | Cloudflare / GCP-managed              |

Rotation policy: see `docs/runbooks/key-rotation.md`.

---

## Scan Cadence

| Scan                                | Frequency  | Owner       | Threshold                                  |
|-------------------------------------|------------|-------------|--------------------------------------------|
| Dependency CVE (mvn dep-check + npm audit) | per PR + nightly | CI bot   | Block PR on Critical; Slack on High |
| Static analysis (SpotBugs + SonarQube) | per PR + nightly | CI bot   | Block PR on Security category; warn on Major |
| Container image (Trivy)             | per build  | CI bot      | Block on Critical                          |
| Secrets scan (gitleaks)             | per commit | pre-commit + CI | Block on any match                     |
| Dynamic / DAST (OWASP ZAP baseline) | weekly     | Security    | Triage within 5 business days              |
| Manual penetration test             | annually + major release | External | Findings logged as issues, P0 fixed before GA |
| RBAC drift detector                 | nightly    | App         | Alert on permissions not in matrix doc     |
| Cross-tenant query detector         | nightly    | App (admin connection) | Page on any result                |

The scheduled runs are wired in `.github/workflows/security.yml` (CI) and
`@Scheduled` jobs (app-side detectors).

---

## CVE Budget

- **Critical (CVSS 9.0+):** 0 tolerance. Patched within 24h or workaround deployed.
- **High (7.0–8.9):** Patched within 7 days. Workaround within 24h.
- **Medium (4.0–6.9):** Patched within 30 days or accepted with documented justification.
- **Low (0.1–3.9):** Reviewed quarterly.
- **Informational:** No action required; tracked.

Acceptance requires an ADR (e.g., "we accept CVE-XXXX-YYYY in transitive dep Z because the
vulnerable code path is unreachable in our usage"). Acceptance review every 6 months.

---

## Audit and Logging

- **All write paths on regulated entities** emit `AuditEvent` — see
  `docs/patterns/audit-trail-emission.md`
- **Authentication events** (login, logout, lockout, password change) emit to a separate
  `auth_audit` topic
- **Failed authorization** (`@RequiresPermission` check fails) logged at `warn` with actor,
  resource, action — feeds the "permission drift" detector

Retention:
- `audit_events`: 7 years (84 months), monthly partitions
- `auth_audit`: 1 year
- App logs: 90 days
- Security scan results: indefinite

---

## Incident Response Anchors

- Vulnerability report received → `SECURITY.md` policy
- Live incident (production breach suspected) → `docs/runbooks/incident-response.md`
- Disaster recovery (data loss, region failure) → `docs/runbooks/disaster-recovery.md`
- Key rotation (suspected key compromise) → `docs/runbooks/key-rotation.md`

---

## Open Findings (Wave-10)

| ID    | Title                                      | P  | Owner               | Target sprint |
|-------|--------------------------------------------|----|---------------------|---------------|
| P0-1  | Timezone ambiguity (855 callsites)         | P0 | Backend             | S11 (ADR-012) |
| P0-2  | useEffect deps lint not in CI              | P0 | Frontend            | S11           |
| P0-3  | `tenants.timezone` column missing          | P0 | Backend             | S11 (ADR-012) |
| P0-4  | LeaveAccrualScheduler multi-pod race       | P0 | Backend             | S11           |
| P0-5  | Webhook key rotation gap                   | P0 | Backend             | S11           |
| P1-1  | Kafka consumer idempotency audit           | P1 | Backend             | S11 (ADR-011) |
| ...   | (see audit doc for full list)              |    |                     |               |

Live list lives in `docs/audit/wave-10-deep-audit-report.md`.

---

## Compliance Posture

| Framework         | Status                | Evidence path                                |
|-------------------|-----------------------|----------------------------------------------|
| GDPR (EU)         | Compliant             | `docs/architecture/security-controls.md`     |
| SOC 2 Type II     | In progress           | `docs/audit/`                                |
| ISO 27001         | Roadmap               | n/a                                          |
| Indian DPDP Act   | Compliant             | `docs/architecture/security-controls.md`     |

---

## When in Doubt

1. **Tenant isolation question?** ADR-010 + `docs/patterns/rls-tenant-filter.md`
2. **Permission question?** `docs/architecture/rbac/permission-matrix.md`
3. **Audit-emit question?** `docs/patterns/audit-trail-emission.md`
4. **Crypto question?** This doc, "Cryptography Inventory" section. Don't roll your own.
5. **Found something concerning in code?** `SECURITY.md` reporting policy applies even
   for internal team.
