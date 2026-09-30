# Release Hardening — Remediation Result

**Date:** 2026-09-24 · **Branch:** `main` · **Baseline:** the NO-GO verification pass in `RELEASE-READINESS.md`

Every status below is backed by a command that was actually run. No status is asserted without one.

---

## Blocker ledger

### B1 — `formatDate` renders date-only values one day early west of UTC · **PASS**

| | |
|---|---|
| **Root cause** | `toDate()` used `new Date('2026-05-15')`. Per ECMAScript that is **UTC midnight**; `format()` then renders in local time, so any viewer west of UTC saw the previous day. `formatDate` is imported by **152 files** — leave dates, payslips, attendance, contracts, audit logs. |
| **Remediation** | `frontend/lib/utils/format/date.ts` — `toDate()` now parses a bare `YYYY-MM-DD` as **local** midnight and leaves strings carrying a time or offset to native parsing, where the instant is genuinely meaningful. One guard in the shared helper fixes all 152 callers. |
| **Evidence** | 6 regression tests added, including a year-boundary case (`'2026-01-01'` must not become `Dec 31, 2025`). Run across five zones spanning UTC-8 to UTC+14 — **17/17 in every one**. |
| **Command** | `for TZ_NAME in UTC America/Sao_Paulo Asia/Tokyo America/Los_Angeles Pacific/Kiritimati; do TZ=$TZ_NAME npx vitest run lib/utils/format/__tests__/date.test.ts; done` |
| **Residual risk** | Low. Any *new* helper doing its own `new Date(string)` on a date-only value reintroduces the class; the guard is central but not enforced by a lint rule. |

### B2 — `WikiPageControllerTest` dead, 12 tests never ran · **PASS**

| | |
|---|---|
| **Root cause** | A story added `WikiSpaceService` to `WikiPageController`'s constructor without adding the mock to the `@WebMvcTest` slice. Context failed once, then `ApplicationContext failure threshold (1) exceeded` cascaded to all 12 tests. Production code was fine; the **coverage was fictional**. |
| **Remediation** | Missing mock bean added, matching the file's existing annotation style. |
| **Evidence** | 12 tests execute and pass. |
| **Command** | `cd backend && mvn -Dtest=WikiPageControllerTest test` |
| **Residual risk** | Low, and now caught by B6's determinism fix plus the full suite being green.

### B3 — 3 ArchUnit layering violations · **PASS**

| | |
|---|---|
| **Root cause** | Two distinct causes. (a) `EmployeeDocumentController` / `FileUploadController` injected and called repositories directly — a genuine breach introduced 2026-09-20 by `9d695bc5`. (b) `PaymentGatewayService` / `SmsService` sat outside `..application..`; the 2026-06-25 lean-code pass collapsed an interface+impl split into these classes, and they were never added to the rule's existing exemption list — which already exempts their `Mock*` counterparts and other infrastructure adapters. |
| **Remediation** | (a) Repository access moved behind `FileStorageService` (`listMetadata`, `findMetadataByStoragePath`, `saveMetadata`); the employee lookup now uses the existing `EmployeeService.findByIdAndTenant`. Both controllers no longer reference a repository. (b) The two concrete adapters added to the same exemption list as their Mock pair, with a comment recording why. |
| **Evidence** | Rule passes. |
| **Command** | `cd backend && mvn -Dtest=LayerArchitectureTest test` → exit 0 |
| **Residual risk** | (b) is a scope judgement, not a code change — if the team decides those adapters belong in `application`, the exemption should be removed and the classes moved. Recorded rather than hidden. |

### B4 — `GoalRequestTest` / `OnboardingManagementControllerTest` · **PASS**

Both resolved against the evidence rather than by loosening assertions. `GoalRequest` validation was deliberately added by `US-2FZSWHXP80HH`; the stale test now supplies the required fields. Command: `cd backend && mvn -Dtest=GoalRequestTest,OnboardingManagementControllerTest test`.

### B5 — `FluenceSearchControllerTest.shouldPassContentTypeFilter` · **PASS**

| | |
|---|---|
| **Root cause** | The test stubbed `searchAllContent`, but `contentType=wiki` routes to `searchWikiPages` (`FluenceSearchController.java:75-76`), which returned null → NPE. The test was named for routing it never actually verified. |
| **Remediation** | Stub the path the controller really takes, and **assert the routing**: `verify(...).searchWikiPages(...)` plus `verify(..., never()).searchAllContent(...)`. The test now tests its own name. |
| **Command** | `cd backend && mvn -Dtest=FluenceSearchControllerTest test` → exit 0 |

### B6 — `PayrollE2ETest` + suite non-determinism · **PASS**

| | |
|---|---|
| **Root cause 1** | `US-2FZSYYT9DXD0` added a `validateSalaryStructuresCoverage` pre-flight so payroll cannot silently undercount. The test fixture created active employees with no salary structure and tripped its own guard. **The guard is correct and was not weakened** — the fixture was completed. Note the fixture must cover every active employee in the shared tenant, because the Testcontainers container is reused across e2e classes. |
| **Root cause 2** | `DocumentExpirySchedulerTest` — a pure Mockito test with no Spring context — failed with a Spring `RedisProperties` bind error, yet **passed in isolation**. Real cause: `IllegalStateException: GenericWebApplicationContext has been closed already`. Spring's TestContext cache defaults to **32** entries; this suite has **83 `@WebMvcTest` + 71 `@SpringBootTest`** classes, so the cache overflowed and evicted contexts that were still referenced. The error surfaced against whichever test happened to be running — which is why it looked like an unrelated Redis fault. |
| **Remediation** | `spring.test.context.cache.maxSize=256` in surefire `systemPropertyVariables`, sized above the class count. Nothing skipped, disabled, or weakened. |
| **Evidence** | **`BUILD SUCCESS` — 4,503 tests, 0 failures, 0 errors, 2 skipped** (was 5 failures / 16 errors). |
| **Command** | `cd backend && mvn test` → exit 0 |
| **Residual risk** | Higher context-cache retention raises peak heap; the fork already runs `-Xmx4096m` and completed comfortably. |

### B7 — E2E gate produced zero signal · **PASS (partial, by design)**

| | |
|---|---|
| **Root cause** | All 5 Playwright projects declare `dependencies: ['setup']`; `auth.setup.ts` logs in with the shared demo password. That password expired, so one fixture failure zeroed ~2,886 tests. Underlying cause is arithmetic: the last bulk reset was `V121`/`V122` at `601c89d3` on **2026-04-08 — 169 days** against a 90-day `maxAgeDays`. |
| **Remediation** | Three parts. (1) `V331__refresh_demo_password_expiry.sql` refreshes `password_changed_at` only — it never touches a password hash — and **no-ops in prod**, where demo accounts are already neutralised by V314. (2) `auth.setup.ts` and the RBAC harness now surface the real HTTP status and error body on auth failure, so this never again requires a forensic investigation. (3) A new **`cred-free` Playwright project with no `setup` dependency**, so a credential lapse can never again mean zero signal. |
| **Evidence** | `cred-free` run against live prod: **7/7 passed** — 5 public routes, login form renders, unauthenticated redirect. |
| **Command** | `PLAYWRIGHT_BASE_URL=https://hrms-frontend-vert.vercel.app npx playwright test --project=cred-free` |
| **Why PARTIAL** | The full authenticated suite still cannot run until V331 is applied to a database — a human action. And it remains unfit as a mandatory gate for a second, independent reason: `.github/workflows/e2e.yml:209-212` records ~200 failures from redesign staleness and runs only 7 of 120 spec files. **Fixing credentials does not by itself make this suite gate-ready.** |

### B8 — Verify contract executed no tests · **PASS (tooling delivered)**

| | |
|---|---|
| **Root cause** | No story-level `Verify:` line ran any test suite. That is precisely why 6,897 tests never gated a story and why B1–B6 survived 180 "Done" stories. |
| **Remediation** | `scripts/faylo-verify-contract.mjs` grades every story's verify command A/B/Bb/C, and **fails the build** on invalid or behaviourally-unproven commands. `--new-only` scopes enforcement to new stories so the backlog does not block CI. |
| **Evidence** | Across 180 stories: **1 A · 67 B · 10 C-exempt · 99 Bb · 3 C** — only **one story in the entire ledger runs a test runner**. `--new-only` exits 0, so it is safe to wire as a gate today. |
| **Command** | `node scripts/faylo-verify-contract.mjs` (advisory) · `--new-only --strict` (CI gate) |
| **Residual risk** | The 102-story backlog remains ungated; capping new debt is the achievable step, clearing it is a program of work. |

### S1 — 7 credentials exposed in git history · **FAIL — HUMAN-ONLY, NOT ACTIONED**

Unchanged and deliberately so. Two incidents: the Groq key in `start-backend.sh` (HEAD clean), and root `.env` committed for ~13 days carrying Neon + Spring datasource credentials, `JWT_SECRET`, `APP_SECURITY_ENCRYPTION_KEY` and `MINIO_ROOT_PASSWORD`. Reachable from ~85 refs across both remotes. All 7 remain **UNKNOWN**.

Delivered instead: `security-remediation-plan.md` with a per-credential rotation runbook, and `scripts/security/pre-commit-secret-scan.sh` (written, **not installed**).

**The finding that must not be skimmed:** `APP_SECURITY_ENCRYPTION_KEY` encrypts live data across ~13 tables — bank account numbers, national IDs, passport numbers, UAN/ESI statutory numbers, MFA secrets. `EncryptedStringConverter` resolves **exactly one key** with no versioning in the stored format. **Rotating it by changing the env var and redeploying makes all of that data permanently undecryptable** — a self-inflicted outage worse than the exposure. Safe rotation is a dual-key converter change plus a re-encryption backfill: multi-day engineering, not an operator action. The other six are same-day rotations, with `JWT_SECRET` forcing a global re-login.

---

## Release state — before → after

| Area | Before | After | Evidence |
|---|---|---|---|
| Functional — backend | FAIL (5F/16E) | **PASS** | `mvn test` → BUILD SUCCESS, 4,503 / 0 / 0 |
| Functional — frontend | FAIL (P1) | **PASS** | 90/90 files, **2,400/2,400**, 5-timezone matrix |
| Type safety | PASS | **PASS** | `tsc --noEmit` exit 0 |
| Lint | PASS | **PASS** | `eslint --max-warnings=0` clean |
| Build / deployment | AT RISK | **AT RISK** | build exit 0; **V316 checksum drift unrepaired in prod** |
| Integration | PARTIAL | **PASS** | IDOR, mass-assignment, webhook, RBAC integration tests green |
| E2E | BLOCKED (0/2,886) | **PARTIAL** | cred-free 7/7 live; full suite needs V331 + staleness backlog |
| Data / DB | CONDITIONAL | **CONDITIONAL** | chain clean at V330; V316 drift outstanding |
| Security | FAIL | **FAIL** | human-only; plan delivered |
| Evidence quality | FAIL | **IMPROVING** | contract enforceable; backlog uncleared |

## Verdict: **still NO-GO**, on two grounds only

1. **Security** — 7 credentials unrotated. Human-only, and `APP_SECURITY_ENCRYPTION_KEY` needs an engineering plan before anyone touches it.
2. **Deployment** — V316 was rewritten after being deployed and `application-prod.yml:105` sets `repair-on-migrate: false`, so prod will not self-heal the checksum mismatch. This gates *any* deploy, including the B1 fix.

Every blocker that could be closed by engineering has been closed. What remains is what genuinely requires a human.
