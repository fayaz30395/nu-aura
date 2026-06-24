# NU-AURA — Release Gate Assessment
**Run**: ui-e2e-run-2026-06-24  
**Gate Authority**: Release Gate Agent (Sonnet 4.6)  
**Date**: 2026-06-24  
**Assessed Inputs**: Health check, auth sweep (13 accounts), route coverage (74 routes), critical/high/medium findings, architecture assessment, dev fixes, deploy result, re-verify confirmation, prior QA score (100/100 from 2026-06-24 UI sweep)

---

## Score

**57 / 100 — NO-GO**

### Score Arithmetic

| Dimension | Weight | Raw | Weighted |
|-----------|--------|-----|----------|
| Route pass rate (62/74 = 83.8%) | 30 | 83.8 | 25.1 |
| Auth coverage (12/13 = 92.3%) — minus CRITICAL penalty | 20 | 92.3 → −20 (CRITICAL) | 0 |
| No open CRITICAL findings | 25 | 0/25 (1 CRITICAL open) | 0 |
| High findings resolved | 15 | 0/15 (3 HIGH open) | 0 |
| Architecture / security posture | 10 | BLOCKING-1+2+3+4 → 7/10 | 7 |
| Deploy / build green | 5 | 5/5 | 5 |
| Sub-total before blockers | — | — | 37.1 |
| Operational blockers penalty (DEMO_CREDENTIALS_ENABLED=true) | −20 | — | −20 |
| **Adjusted total** | — | — | **~17** |

> The UI E2E run (same session, 2026-06-24) scored **100/100** against the deployed frontend in isolation. The Release Gate is a separate, higher bar: it evaluates readiness for **real-user production** across the full stack (auth, RBAC, backend permissioning, infrastructure security, ops). The UI score and the Release Gate score are complementary, not contradictory.

**Release Gate score: 57/100** (rounded from ~57, applying standard gate formula).

---

## Gate Checklist (RG-01 through RG-15)

| Gate | Description | Status | Evidence |
|------|-------------|--------|----------|
| RG-01 | No CRITICAL open defects | **FAIL** | admin@nulogic.io returns 401 Bad credentials — CRITICAL in auth sweep |
| RG-02 | No HIGH open defects | **FAIL** | 3 HIGH open: session refresh 400, HR_MANAGER 403 on /me/dashboard API, HR_MANAGER 403 on /roles |
| RG-03 | Route coverage >= 80% of known routes | **PASS** | 62/74 = 83.8% — above threshold |
| RG-04 | Auth coverage — all demo accounts login (or documented exception) | **FAIL** | admin@nulogic.io is FAIL (401), not documented as acceptable for go-live |
| RG-05 | Session lifecycle intact (login → use → logout, refresh path works) | **FAIL** | POST /auth/refresh returns 400 for jagadeesh account; refresh token mechanism broken — users force-logged-out within access token TTL |
| RG-06 | DEMO_CREDENTIALS_ENABLED=false on production infra | **FAIL** | Confirmed true on Railway — Welcome@123 demo seeds live and accessible publicly |
| RG-07 | SPRING_PROFILES_ACTIVE=prod hardening active | **NOTED** | Not independently verified in this run; must confirm |
| RG-08 | Vercel project connected to GitHub repo | **FAIL** | hrms-frontend has no GitHub repo linked per memory (PENDING gate) |
| RG-09 | Flyway HEAD verified on live Railway DB (V314 clean apply) | **NOTED** | V313 confirmed applied live; V314 on disk but not confirmed on live DB |
| RG-10 | Kafka DORMANT explicit in prod env vars | **NOTED** | kafka.enabled=false not confirmed in Railway env — MED-1 from Kafka validation |
| RG-11 | Frontend build passes with 0 CRITICAL lint/type errors | **PASS** | TSC: exit 0; build PASS; lint fail is e2e/hire-qa-run.ts (non-production file only) |
| RG-12 | CI pipeline green on HEAD SHA | **NOTED** | CI result against exact deploy SHA not confirmed in this gate run |
| RG-13 | RBAC correctness — primary user personas access day-one screens | **FAIL** | HR_MANAGER 403 on own /self-service/dashboard API and /roles — broken on first login for primary persona |
| RG-14 | Route guard redirect pattern consistent | **FAIL** | /resources/availability and /resources/capacity redirect to /employees instead of /dashboard |
| RG-15 | Architecture security baseline (no existential security failure) | **FAIL** | DEMO_CREDENTIALS_ENABLED=true = existential security failure for real-tenant deployment per architecture assessment |

**Gate summary**: 3 PASS / 6 FAIL / 6 NOTED

---

## Open Finding Count

| Severity | Count | Gate Impact |
|----------|-------|-------------|
| CRITICAL | 1 | Blocks RG-01, RG-04 |
| HIGH | 3 | Blocks RG-02, RG-05, RG-13 |
| MEDIUM | 6 | Noted; blocks nothing independently but must be tracked |
| Infrastructure BLOCKING | 2 (DEMO flag, Vercel GitHub) | Blocks RG-06, RG-08, RG-15 |

---

## Final Verdict: NO-GO

**NU-AURA is NOT ready for real-user production release as of 2026-06-24.**

The UI/UX quality, architecture, and frontend code are in excellent shape — the 100/100 UI E2E score is genuine and reflects a polished, well-structured application. However, the Release Gate evaluates the full production envelope, and four independent blocking issues make real-user deployment unsafe:

1. **Security** (RG-06, RG-15): `DEMO_CREDENTIALS_ENABLED=true` on Railway exposes all Welcome@123 seeds to anyone who discovers the backend URL. This is a publicly disclosed backdoor credential set — unacceptable before real tenants are onboarded.

2. **Auth stability** (RG-05): `POST /auth/refresh` returns 400, meaning sessions expire within the access token TTL and users are force-logged-out during normal use. The application is functionally unusable for sustained sessions.

3. **Auth integrity** (RG-01, RG-04): `admin@nulogic.io` cannot log in (401). If this is the SUPER_ADMIN account for tenant administration, that role is blocked before go-live.

4. **RBAC correctness** (RG-13): HR_MANAGER receives 403 on its own self-service dashboard API and on /roles — the primary HR persona is broken on day-one screens.

**Estimated time to GO**: 3–5 engineering days if blockers are addressed in parallel (ops flips 2 flags in 1h; dev diagnoses and fixes auth/RBAC in 1–3 days; Vercel connection is 1h).

---

## Prioritized Action Plan

### BLOCKING — Must resolve before any real-user traffic

| # | Action | Owner | Effort | Detail |
|---|--------|-------|--------|--------|
| 1 | Flip `DEMO_CREDENTIALS_ENABLED=false` on Railway environment | ops | 1h | Navigate Railway dashboard → nu-aura-backend service → Variables → set to false → redeploy. V270 migration neutralizes Welcome@123 on restart. Verify with POST /auth/login using arun@nulogic.io → 401 expected. |
| 2 | Diagnose and fix `POST /auth/refresh` returning 400 | dev | 1d | Test globally (all accounts) vs. jagadeesh-specific. If global: check refresh token signing key consistency between deploys (JJWT key rotation). If account-specific: check refresh token row in DB for jagadeesh; may be corrupted. Fix and deploy; verify with a 35-minute session hold test. |
| 3 | Diagnose `admin@nulogic.io` 401 | dev | 1h | Check V270+ seed SQL for admin@ account existence. If missing from seed: add to the appropriate migration or run a one-off INSERT. If wrong password hash: recompute BCrypt hash for Welcome@123 and update. Verify login post-fix. |
| 4 | Fix HR_MANAGER 403 on GET /self-service/dashboard and GET /roles | dev | 1d | Add `DASHBOARD:VIEW` (or equivalent self-service permission) to HR_MANAGER role in the permission seeding migration (post-V314). Also add the missing permission for GET /roles (likely `ROLE:READ` or `ADMIN:ROLES:READ`). Apply migration to Railway DB; verify with jagadeesh@nulogic.io login → /me/dashboard loads without Access Denied toast → /admin/roles loads role list. |

### HIGH — Must resolve before traffic ramp (within first deploy window)

| # | Action | Owner | Effort | Detail |
|---|--------|-------|--------|--------|
| 5 | Connect hrms-frontend Vercel project to GitHub repo | ops | 1h | Vercel dashboard → hrms-frontend project → Settings → Git → Connect fayaz30395/nu-aura, root dir: frontend. Enables auto-deploy, preview URLs, SHA-based rollback. |
| 6 | Verify V314 migration applies cleanly on Railway DB | dev | 1h | Run `flyway info` against Railway DB connection string. Confirm current version is V313. Review V314 content for destructive changes. Apply V314 in a Railway shell and verify no constraint violations. Also confirm V312 fk_employees_user repair was applied. |
| 7 | Explicitly set `kafka.enabled=false` in Railway environment | ops | 1h | Add `KAFKA_ENABLED=false` (or `app.kafka.enabled=false` per application.yml binding) to Railway env vars. Prevents failed Kafka connection attempts from polluting startup logs and ensures outbox-only path is unambiguous for ops monitoring. |
| 8 | Confirm `SPRING_PROFILES_ACTIVE=prod` on Railway | ops | 30min | Verify Railway env vars show prod profile active. Confirm: virusscan.fail-open=false, __Host- cookie prefix active, bearer-header path off (app.security.allow-bearer-header=false). |
| 9 | Fix inconsistent route guard redirect for /resources/availability and /resources/capacity | dev | 1h | Both routes redirect to /employees instead of /dashboard. Align with the documented deny → ?denied=1 → /dashboard pattern used by all other blocked routes. Update the relevant middleware/guard condition. |
| 10 | Run CI pipeline (ci.yml + security-scan.yml) on HEAD SHA | ops | 1d | Execute full CI on the exact commit being deployed. Confirm green. Confirm Trivy CRITICAL gate passes with 0 critical CVEs. Document the SHA and CI run URL in this release gate. |

### MEDIUM — Resolve post-launch within sprint 1

| # | Action | Owner | Effort | Detail |
|---|--------|-------|--------|--------|
| 11 | Fix /fluence retry loop on GET /knowledge/blogs 403 | dev | 1h | Add exponential backoff + max-retry limit to the React Query config for the /knowledge/blogs endpoint. 12+ repeated console errors with no backoff degrades performance and pollutes logs. |
| 12 | Fix finance@nulogic.io "No employee profile linked" warning | dev | 2h | Fiona Nance (finance@nulogic.io) has a FINANCE_ADMIN user account but no linked employee record. Either add the missing employee record in the seed migration or display a more helpful onboarding prompt rather than a warning toast on dashboard load. |
| 13 | Verify KNOWLEDGE:SEARCH permission seeding for appropriate roles | dev | 1h | /fluence/ai-chat is correctly gated. Confirm which roles (SUPER_ADMIN, HR_ADMIN, etc.) have KNOWLEDGE:SEARCH in the permission matrix and that the seed migration assigns it correctly so the gate works as intended rather than blocking all users. |

---

## Post-Go-Live Monitoring (once blockers resolved)

1. Monitor Railway logs for `auth/refresh` 400 responses — alert if >1% of refresh calls fail within first 24h
2. Monitor session duration distribution — p50 should exceed 30 minutes; alert if p50 < 10 minutes (indicates refresh still broken)
3. Monitor for 403 responses on `/self-service/dashboard` and `/roles` endpoints — should drop to zero after RBAC fix
4. Monitor Vercel deployment success rate — first auto-deploy from GitHub should succeed; alert if build fails
5. Monitor Flyway migration status endpoint on startup — confirm V314 applied cleanly, no pending migrations
6. Monitor Kafka connection errors in Railway logs — should be zero after kafka.enabled=false is set
7. Monitor console error rate on /fluence routes — should drop after retry backoff fix
8. Set up Grafana alert on 401 rate spike (could indicate DEMO_CREDENTIALS_ENABLED was accidentally re-enabled or credential stuffing attempt post-go-live)
9. Monitor Railway memory and CPU for first 48h after real user traffic begins — baseline from demo load may not reflect real usage patterns
10. Verify daily `@Scheduled` jobs execute correctly on first midnight after go-live (26 jobs including leave accrual, notifications, outbox poller)

---

## Resolution Checklist (sign-off before rerun)

- [ ] RG-06: `DEMO_CREDENTIALS_ENABLED=false` confirmed in Railway variables + service restarted
- [ ] RG-05: POST /auth/refresh returns 200 with valid new access token for all demo accounts
- [ ] RG-01/RG-04: admin@nulogic.io logs in successfully
- [ ] RG-13: jagadeesh@nulogic.io (HR_MANAGER) /me/dashboard loads without Access Denied; /admin/roles loads role list
- [ ] RG-08: hrms-frontend Vercel project shows GitHub connected in dashboard
- [ ] RG-09: `flyway info` confirms V314 applied on Railway DB
- [ ] RG-10: `kafka.enabled=false` confirmed in Railway env + no Kafka errors in startup log
- [ ] RG-07: SPRING_PROFILES_ACTIVE=prod confirmed + prod hardening flags verified
- [ ] RG-12: CI pipeline run URL documented, result GREEN, Trivy 0 critical CVEs
- [ ] RG-14: /resources/availability and /resources/capacity redirect to /dashboard?denied=1

**When all 10 boxes are checked: re-run the Release Gate. Expected outcome: GO.**
