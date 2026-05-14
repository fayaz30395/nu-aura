# Security Scan Checklist

Tactical checklist that runs before any release tagged `vX.Y.0`. The full security baseline
lives in `docs/security/baseline.md`. The automated portion runs in CI; the manual portion
is owned by the on-call security engineer for the release.

---

## Automated (CI must pass)

- [ ] `mvn org.owasp:dependency-check-maven:check` — no Critical CVEs
- [ ] `npm audit --audit-level=high` (frontend) — no High+ CVEs
- [ ] `trivy image nu-aura-backend:<tag>` — no Critical
- [ ] `trivy image nu-aura-frontend:<tag>` — no Critical
- [ ] `gitleaks detect` — clean
- [ ] SonarQube quality gate — Security category passes
- [ ] SpotBugs (incl. custom rules: `IdempotencyMissingDetector`,
      `DateTimeNowWithoutZoneDetector`, `TenantFilterMissingDetector`) — clean
- [ ] OWASP ZAP baseline scan vs staging — no Medium+

Run via:

```bash
./scripts/security/baseline-scan.sh
```

## Manual (per release)

### RBAC
- [ ] Diff `permission-matrix.md` vs `V*__seed_permissions.sql` migrations — any drift?
- [ ] New controllers have `@RequiresPermission` on every method (grep for
      `@(Get|Post|Put|Patch|Delete)Mapping` lacking annotation)
- [ ] New endpoints accessible only to expected role(s) — manual probe with HR_MANAGER,
      EMPLOYEE, GUEST tokens

### Tenant Isolation
- [ ] New migrations: every tenant-aware table has RLS policy (ADR-010)
- [ ] Native queries added this release: each filters by `tenant_id` OR has a documented
      reason it doesn't
- [ ] Cross-tenant query detector log — 0 hits this week

### Crypto / Secrets
- [ ] No new env vars added without entry in `.env.example`
- [ ] No secrets in code (gitleaks confirms; spot-check `grep -rn "secret\|password\|key" src/`)
- [ ] If `JWT_SECRET` was rotated this quarter, the rotation runbook was followed

### Audit Trail
- [ ] New write paths on regulated entities emit `AuditEvent` (grep for new
      `@Transactional` writes; trace to `AuditService.emit`)
- [ ] New `action` names follow `<domain>.<verb>` convention

### Authentication / Authorization
- [ ] Login rate limit (5/min) untouched in `application.yml`
- [ ] Account lockout (5/15min) untouched in `AccountLockoutService`
- [ ] JWT TTL untouched (15min access, 7d refresh)
- [ ] `/me/*` endpoints accessible without admin permissions
- [ ] SuperAdmin bypass works on a new admin-only endpoint added this release

### Dependencies
- [ ] No new dependencies from unknown publishers
- [ ] License audit: no GPL/AGPL pulled in transitively
- [ ] Lockfile changes reviewed in PR (especially `package-lock.json` and `pom.xml`
      version pinning)

### Headers / Edge
- [ ] CSP, X-Frame-Options, HSTS, X-Content-Type-Options still emitted (curl -I against
      staging)
- [ ] CORS allowlist matches expected origins
- [ ] CSRF double-submit token issued and verified on POST/PUT/PATCH/DELETE

### Webhooks
- [ ] `X-Signature` mandatory on inbound webhooks
- [ ] Outbound webhook secret rotation primitive exists (ADR-004; wave-10 P0-5)
- [ ] Webhook URL allowlist enforced (no private IPs)

---

## Out-of-Band Manual

- [ ] Pen test findings from previous quarter — every P0 closed, every P1 in flight
- [ ] Bug bounty queue (if active) — triaged
- [ ] Customer-reported security concern — investigated and closed

---

## Sign-off

| Role                     | Name | Date | Signed |
|--------------------------|------|------|--------|
| Security Engineer        |      |      |        |
| Backend Lead             |      |      |        |
| Frontend Lead            |      |      |        |
| Release Manager          |      |      |        |

Archive signed checklist to `docs/audit/security-checklist-<release-tag>.md`.
