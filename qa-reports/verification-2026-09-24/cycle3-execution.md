# Cycle 3 — executed evidence (2026-09-25)

Every row below was produced by a command run this cycle. Nothing is inferred from code
reading. Where a prior report's claim did not survive execution, the correction is stated.

**Commit:** `2b4832cb` (branch `main`, not advanced, nothing committed or pushed).

---

## 0. Verification stack actually raised

| Component | Value |
|---|---|
| Postgres | container `nuaura-e2e-pg`, host port **55432** (throwaway; pre-existing, reused) |
| Redis | container `nuaura-e2e-redis`, host port **6381** |
| Backend | `java -jar backend/target/hrms-backend-1.0.0.jar` on **8081**, rebuilt this cycle |
| Frontend | `next dev --webpack -p 3010`, `BACKEND_ORIGIN=http://localhost:8081` |
| Port 8080 | untouched (unrelated PID 92233) · port 3000 untouched (docker `hrms-frontend`) |

Boot recipe correction: the first boot attempt used `SPRING_PROFILES_ACTIVE=dev` and **failed**:

```
APPLICATION FAILED TO START
Parameter 3 of constructor in com.nulogic.infrastructure.kafka.outbox.OutboxEventProcessor
required a bean named 'notificationEventListenerContainerFactory' that could not be found.
```

`APP_KAFKA_ENABLED=false` alone is not sufficient — `KafkaConfig` is
`@ConditionalOnProperty("app.kafka.enabled")`, so the listener-container factory disappears while
the `@KafkaListener` consumers the outbox processor injects still demand it. The working recipe is
the CI one (`.github/workflows/e2e.yml`): default profile plus
`SPRING_AUTOCONFIGURE_EXCLUDE=…KafkaAutoConfiguration,…ElasticsearchRepositoriesAutoConfiguration`.
Recorded here because the previous cycle stalled on "no backend alive".

Stack confirmed before any test ran: `GET /actuator/health` → all components UP except `mail`
(no SMTP by design); `POST http://localhost:3010/api/v1/auth/login` (`fayaz.m@nulogic.io`) → **200**,
`SUPER_ADMIN`; Flyway `Current version of schema "public": 331`.

---

## 1. `app-switcher.spec.ts:82` — NU-Grow rail navigation: **NOT a defect**

Flagged in `authenticated-e2e.md` §3 as "could be a real navigation bug".

```
npx playwright test --config=playwright.live.config.ts --project=setup --project=chromium \
  e2e/app-switcher.spec.ts -g "NU-Grow via the rail" --workers=1 --retries=0
→ 2 passed (1.3m)

npx playwright test … e2e/app-switcher.spec.ts --workers=1 --retries=0   # whole file
→ 8 passed (50.7s)
```

The rail wiring is correct and verified by execution: `handleSelectProduct`
(`components/layout/AppLayout.tsx:284`) → `getAppEntryRoute('GROW')` → `PLATFORM_APPS.GROW.entryRoute`
= `/performance` (`lib/config/apps.ts:99`). The earlier 20s `waitForURL` timeout was the
App-Router URL commit waiting on a cold dev-server compile of `/performance` (see §3 for the
measured numbers) — environment, not product. **Cluster 3 closed.**

---

## 2. `dynamic-route-detail.spec.ts` — 10 specs executed for the first time

```
npx playwright test … e2e/dynamic-route-detail.spec.ts --workers=1 --retries=0
→ 3 passed, 8 skipped (44.2s)      # 3 = auth setup + 2 seed-based route tests
```

| Route | Result | Basis |
|---|---|---|
| `/employees/[id]` | **PASS** | Flyway seed `48000000-e001-…0001`; asserts `Sumit` + `EMP-0002` render |
| `/projects/[id]` | **PASS** | Flyway seed `48000000-0e03-…0001`; asserts `NU-AURA Platform V2.0` renders |
| 8 API-lookup routes | **SKIP** | module tables empty on this DB |

The 8 skips were checked rather than assumed. All eight list endpoints answer **HTTP 200 with
`content: []`** through the authenticated proxy (`payroll/runs`, `recruitment/candidates`,
`lms/courses`, `knowledge/wiki/pages`, `knowledge/blogs`, `onboarding/processes`, `offboarding`,
`surveys`). So the skips are a *seed-data* gap, not hidden API failures.

**Test hardened, not weakened.** `firstListItem()` previously returned `null` — and therefore
skipped — on *any* non-2xx, which would have shown a broken list endpoint as a green skip. It now
throws on non-2xx or an unparseable body and skips only on a genuinely empty list. Re-run after the
change: **3 passed, 8 skipped (33.5s)** — identical, confirming the change altered no outcome here
while closing the blind spot.

Still uncovered: 30 of the 40 dynamic routes, and 8 of the 10 written specs have never asserted
against real data. Seeding those modules is the remaining work.

---

## 3. `LoginPage.ts` hydration fix + `navigation.spec.ts`: **6/6 prior failures cleared**

Before (prior cycle, 2 workers): `navigation.spec.ts:39,59,69,569,589,610` — 6 failures, all
`TimeoutError: locator.fill: Timeout 15000ms exceeded waiting for locator('input[type="email"]')`.

First run this cycle, with the `revealEmailForm()` fix in place: **35 passed, 6 failed, 1 skipped
(4.4m)**. The fix worked — the email-input timeout is gone from every failure — and it exposed two
further test-side races underneath it:

**(a) fixed-sleep navigation asserts (3 failures).** `should navigate to Leave Management /
Attendance / Projects` clicked a link, `waitForTimeout(1000)`, then asserted the URL. Measured from
the dev-server log:

```
GET /leave       200 in 23.4s (next.js: 23.1s)   ← first, cold compile
GET /leave       200 in   30ms                   ← warm
GET /attendance  200 in 17.4s (next.js: 17.1s)   ← first, cold compile
GET /attendance  200 in   75ms                   ← warm
```

A 1s sleep against a 23s cold compile. `Dashboard`/`Employees` passed only because `auth.setup.ts`
warms those routes. Replaced the sleep with `page.waitForURL(…, {timeout: 60000})` — the same
assertion, now deterministic (and what `rules/ecc/web/testing.md` requires).

**(b) instantaneous `isVisible()` sidebar sweep (3 failures).** The App-Aware Sidebar tests counted
`nav:visible a[href*=…]` with bare `isVisible()` immediately after `domcontentloaded`, before the
NavPanel had hydrated → `visibleCount = 0`. Added a `waitFor({state:'visible'})` before the sweep —
the pattern the sibling test `sidebar switches context between app routes` (line 650) already uses.
Same class of race as the LoginPage bug it was hiding behind.

After both fixes:

```
npx playwright test … e2e/navigation.spec.ts --workers=1 --retries=0
→ 41 passed, 1 skipped, 0 failed (4.9m)
```

No assertion was loosened: every `expect` still asserts the same condition; only the waits changed
from fixed sleeps / instantaneous checks to deterministic ones.

---

## 4. Working tree did not compile — `LOCKED-STATE.md`'s backend result was not reproducible

`LOCKED-STATE.md` records `cd backend && mvn test` → "BUILD SUCCESS — 4,503 run, 0 failures". On
this tree that command **cannot even compile**. Four separate breaks, all in uncommitted work from
the previous cycle; the earlier green run was served by stale `target/classes` (incremental compile
skipped the changed files).

| Break | Cause | Fix applied |
|---|---|---|
| `SecurityService.java:144` `cannot find symbol: CACHE_USER_PERMISSIONS` | constant never existed in `CacheConfig` | → `CacheConfig.ROLE_PERMISSIONS`, matching the two sibling `@Cacheable`s in the same file (lines 77, 307) |
| `FileUploadController:256`, `EmployeeDocumentController:78,132` — `findMetadataByStoragePath` / `listMetadata` / `saveMetadata` not on `FileStorageService` | **the B3 edit to `FileStorageService.java` was lost** — `LOCKED-STATE.md` lists it as modified, `git status` does not | re-added the three service-layer accessors (keeps api → infrastructure.repository off the LayerArchitectureTest's forbidden list) |
| `WikiPageControllerTest:65` `cannot find symbol: WikiSpaceService` | missing import | added `com.nulogic.application.knowledge.service.WikiSpaceService` |
| `GoalRequestTest:65` `cannot find symbol: GoalType.PERFORMANCE` | enum has `OKR, KPI, PERSONAL, TEAM` | → `GoalType.KPI` |

This is the stale-write/lost-edit failure mode, and it means **no backend claim in
`LOCKED-STATE.md` should be trusted until the suite is re-run on this tree.** It was re-run — see
§9, which found six more failures behind the four compile breaks.

---

## 5. GATE 1 / V316 — drift **CONFIRMED against production** (was BLOCKED as unverifiable)

The previous cycle marked this human-only because "the Railway CLI has no linked project and
re-auth needs an interactive browser login". That is no longer the only path: the **Railway MCP
server is authenticated** in this session (`fayaz30395@gmail.com`), which yielded the project, the
Postgres service and its public proxy endpoint — so the read-only query the runbook asks for was
executed.

Production (`acela.proxy.rlwy.net:38946/railway`), read-only:

```
316|fix arun manager to sumit|checksum=921701256|success=true|installed=2026-06-25 03:38:30|ms=21
last 5 applied: 316:t 315:t 314:t 313:t 312:t        failed migrations: 0
```

Repo-side value, taken from **Flyway itself** (the isolated DB that migrated the current repo from
scratch), not from a hand-rolled CRC:

```
316|checksum=-1987529629|success=true
331|checksum=-1387850880|success=true
```

**`921701256` ≠ `-1987529629` → drift is confirmed, not predicted.** With
`application-prod.yml:105` `repair-on-migrate: false`, the next production deploy fails Flyway
validation. Two further facts from the same query:

- `success = true` and no failed migrations → the runbook's decision rule says **repair**, not escalate.
- **Production is at V316; the repo is at V332.** 16 migrations (317–332) are pending, not 15.

`flyway repair` is a write against production and stays a human action — see §7.

---

## 6. V332 — the data fix `repair` cannot perform: written and **executed**

`flyway repair` realigns a checksum; it never re-runs a recorded migration. V316 recorded
`success = true` in prod while updating **0 rows** (its guard compared against Sumit's *user* id),
so after a repair Arun's `manager_id` is still wrong. New forward migration:
`backend/src/main/resources/db/migration/V332__reapply_arun_manager_to_sumit.sql`.

Proven by execution, not by reading:

```
# against the isolated DB, after forcing the wrong (prod-shaped) manager_id back in
run 1 → UPDATE 1      # corrects the row
run 2 → UPDATE 0      # idempotent
final → manager_id = 48000000-e001-0000-0000-000000000001   (Sumit, EMPLOYEE id)
```

Then as a real migration in the chain, new test
`backend/src/test/java/com/nulogic/integration/ArunManagerMigrationTest.java` (Testcontainers
Postgres 16, full Flyway chain):

```
mvn -Dtest=ArunManagerMigrationTest test
→ Tests run: 3, Failures: 0, Errors: 0, Skipped: 0   (51.06 s)
```

It asserts V332 is recorded `success = true`, that Arun's manager is Sumit's **employee** id after
the whole chain, and that re-running the UPDATE affects 0 rows.

Story `US-2G9W1P18V8BT`: its `Verify:` line pointed at `AdminEmployeeUpdateRequest403Test`, an
unrelated test that could pass with the migration absent. Repointed at `ArunManagerMigrationTest`,
then run through the workflow:

```
python3 -m faylo verify run US-2G9W1P18V8BT
  AC1: PASS (shell)  bash -c "cd backend && mvn -q -Dtest=ArunManagerMigrationTest test"
verify: PASS (US-2G9W1P18V8BT)
```

---

## 7. `APP_SECURITY_ENCRYPTION_KEY` rotation — AC1 done, AC2 is operator work

`RELEASE-GATES.md` says **DO NOT ROTATE**, correctly: `EncryptedStringConverter` resolved exactly
one key, so changing the env var made every encrypted column permanently unreadable across 13 data
areas. AC1 of `US-2G9V0TF3AXX2` removes that trap.

`EncryptedStringConverter` now takes a previous-key decrypt fallback
(`ENCRYPTION_KEY_PREVIOUS` / `APP_SECURITY_ENCRYPTION_KEY_PREVIOUS`): reads try the current key,
fall back to the retired key, and **writes always use the current key** — which is what drains the
backfill. A malformed previous key is ignored (logged) instead of breaking every read; with no
previous key configured, behaviour is unchanged and still fails closed to
`***DECRYPTION_FAILED***`. 4 new tests cover exactly that, including the negative cases.

```
mvn -Dtest=EncryptedStringConverterTest test
→ Tests run: 20, Failures: 0, Errors: 0, Skipped: 0 — BUILD SUCCESS
  (incl. "Key rotation (previous-key decrypt fallback)" 4/4)

python3 -m faylo verify run US-2G9V0TF3AXX2
  AC1: PASS (shell) …EncryptedStringConverterTest…
  AC2: PENDING - needs `faylo verify mark` (manual)
```

AC2 (run the re-encryption backfill and prove zero rows remain on the old key) is a production data
migration plus a human `faylo verify mark`; the tier is `hard-gate`, so release also needs an
Operator-Signoff. Not attempted.

---

## What is still genuinely human-only

1. **`flyway repair` against production** — a write to prod `flyway_schema_history`. Drift is now
   proven and the decision rule is unambiguous (`success = true`, checksum differs → repair), but the
   write itself, and the snapshot before it, are the operator's call. Deploy order matters: repair,
   then deploy V317–V332.
2. **Rotating the 5 live credentials** — provider consoles; `JWT_SECRET` rotation logs every session
   out.
3. **The encryption-key backfill (AC2)** and the hard-gate Operator-Signoff.
4. **Seeding the 8 empty modules** (or accepting the skips) before the remaining dynamic-route specs
   can assert anything.

---

## 8. The dominant failure cause was `next dev`, not the application

Every remaining e2e failure cluster — attendance stats/regularization, the three sub-app sidebar
`found = 0` cases, the CRUD "can open … form" cases, surveys, Fluence entry, and one
`net::ERR_CONNECTION_REFUSED` — was reproduced *and then eliminated* by changing nothing but how the
frontend is served.

Two dev-server behaviours were doing it:

```
GET /leave       200 in 23.4s   (next.js: 23.1s)    ← webpack compiles the route on first hit
GET /attendance  200 in 17.4s   (next.js: 17.1s)
⚠ Server is approaching the used memory threshold, restarting...   ← frontend-3010.log
```

The memory restart is the same failure mode that killed the historical 2,886-test attempt
("frontend dev server crashed mid-run, everything after failed in ~200ms"), recorded in decision
`DC-2G4FXYA98AVS`. It is a dev-server property, not a product one.

Switching to a production build (`npm run build` + `next start -p 3010`, same backend on 8081,
same DB) and 4 workers:

| Run | Server | Workers | Passed | Failed | Skipped | Wall clock |
|---|---|---|---|---|---|---|
| CI-gate subset, prior cycle | `next dev` | 2 | 238 | 33 | 3 (+4 not run) | 19.0m |
| CI-gate subset, this cycle | `next dev` | 1 | 267 | 12 | 3 | 26.1m |
| CI-gate subset | **`next start`** | 4 | **278** | **3** (visual only) | 11 | **2.8m** |
| CI-gate subset, after §9+§10 fixes | **`next start`** | 4 | **281** | **0** | 11 | **2.9m** |

Same tests, same assertions, same data — 9× faster and the failures disappear. The 11 skips are the
8 empty-module dynamic routes (§2) plus 3 pre-existing conditional skips.

**Consequence for `DC-2G4FXYA98AVS`** (still an open human decision): the suite's history of
"never completes in this environment" is explained. A gate that runs the suite against a production
build is viable; one that runs it against `next dev` is not, and no amount of test-fixing changes
that. Recommended change to `.github/workflows/e2e.yml` is the same as what was done here. The
decision itself is not mine to resolve.

---

## 9. Full backend suite — six real failures found, all fixed, now green

With the four compile breaks of §4 repaired, `mvn test` ran to completion for the first time on
this tree and was **not** green:

```
Tests run: 4515, Failures: 2, Errors: 4, Skipped: 2  — BUILD FAILURE
```

Five independent clusters, diagnosed in parallel (read-only) and then fixed:

| Failure | Verdict | Fix |
|---|---|---|
| `LayerArchitectureTest.servicesShouldResideInApplicationPackage` — `PaymentGatewayService`, `SmsService` outside `..application..` | **lost prior-cycle edit.** Commit `2a60c3a3` collapsed the interface + `Mock*` split into concrete adapters; the rule's FQN exemption list still named the deleted `MockPaymentService`/`MockSmsService` | exempt the two surviving adapters, same category as the four infrastructure adapters already exempt |
| `FluenceSearchControllerTest.shouldPassContentTypeFilter` — NPE, `searchWikiPages(...)` returned null | **lost prior-cycle edit** (B5). Controller routes `contentType=wiki` → `searchWikiPages`; the test stubbed only `searchAllContent` | stub the method the controller actually calls **and** add `verify(...searchWikiPages)` / `verify(never() ...searchAllContent)` — the routing contract is now asserted, not merely unbroken |
| `OnboardingManagementControllerTest.shouldUpdateProcessStatus` — `No value at JSON path "$.status"` | **lost prior-cycle edit** (B4). Controller calls the 3-arg `updateStatus(id, status, overrideReason)`; test stubbed the 2-arg overload, so the mock returned null | add the third matcher (`isNull()`) to stub and verify |
| `DocumentExpirySchedulerTest` ×2 — `ConfigurationPropertiesBindException` on `spring.data.redis` | **REAL APPLICATION DEFECT** — see below | `@PreDestroy` on the static holder |
| `PayrollE2ETest.payrollRunService_CreateAndProcessFlow` — "2 active employee(s) are missing an active salary structure" | **lost prior-cycle edit** (B6), half-applied: the imports and the repository autowire survived, the fixture body did not | re-add the fixture; it covers **every** ACTIVE employee in the shared test tenant (the pre-flight is tenant-wide and ~40 test classes share that tenant), and deletes what it created in `@AfterAll` |

### The real defect: `TenantTimeProvider.INSTANCE` outlives its ApplicationContext

Redis was a red herring. The actual cause, from the `Caused by` at the bottom of the trace:

```
IllegalStateException: GenericWebApplicationContext@9b2cd3b has been closed already
  at AbstractApplicationContext.assertBeanFactoryActive(:1280)
  at BoundConfigurationProperties.get(:76)
```

`TenantTimeProvider` (`backend/src/main/java/com/nulogic/common/util/TenantTimeProvider.java`) holds
`private static volatile TenantTimeService INSTANCE`, set in `@PostConstruct` and **never cleared
when the context closes**. Every entity predicate that asks for tenant-local time
(`shouldSendReminder`, `isExpired`, `daysUntilExpiry`, …) goes through it. Once a context is closed,
the holder still points at that context's service and its dead repository proxy; Spring's
exception-translator lookup then calls `getBean` on the closed context, and `RedisProperties`
happens to be the first `@ConfigurationProperties` bean it asks for — which is the only reason redis
appeared in the message at all.

The class Javadoc documents an `INSTANCE == null` fallback (log a WARN, use the JVM zone). That
fallback was unreachable, because nothing ever restored `null`. Fix — a `@PreDestroy` with an
identity guard so a closing context cannot clear a holder a live context owns:

```java
@PreDestroy
void shutdown() {
    if (INSTANCE == this.timeService) {
        INSTANCE = null;
    }
}
```

This is a production-code fix, not a test change; the test was never weakened. It surfaced as an
order-dependent test error, but the same stale-reference window exists for any context refresh or
close in the running application.

### Result after the five fixes

```
mvn -Dtest="LayerArchitectureTest,FluenceSearchControllerTest,OnboardingManagementControllerTest,\
DocumentExpirySchedulerTest,PayrollE2ETest" test
→ Tests run: 67, Failures: 0, Errors: 0, Skipped: 0 — BUILD SUCCESS

mvn test                       # whole suite, clean tree
→ Tests run: 4515, Failures: 0, Errors: 0, Skipped: 2 — BUILD SUCCESS
```

`LOCKED-STATE.md`'s "4,503 tests, 0 failures" is now true of this tree — it was not when this cycle
started, and it took four compile fixes plus five test/production fixes to make it true.

---

## 10. Visual regression — the baselines could never have passed

The three snapshot tests were the last failures. The diff image shows the *only* differing regions
are the live clock (`0X:XX:XX AM`, re-rendered every second by `TimeClockWidget`) and today's date.
Successive runs produced **different** diff counts for the same page (1013 → 1220 px), which is the
signature of non-deterministic content, not UI drift:

```
attendance-page   1671 px (ratio 0.01)   — stable across runs
dashboard         1013 px → 1220 px      — varies run to run
```

(The 227,000-px diffs seen earlier were the dev server still rendering a loading spinner at
screenshot time — another `next dev` artifact, not drift.)

A full-page screenshot containing a running clock can never be stable, so these tests were
guaranteed-red regardless of application state. Fix: mask only the volatile nodes.

- `data-testid="live-time"` added to the three wall-clock nodes (`TimeClockWidget` date chip and
  time display, `app/attendance/page.tsx` "Live time" readout).
- Each `toHaveScreenshot` now passes `mask: [page.getByTestId('live-time')]`. Nothing else changed —
  `maxDiffPixels: 500` is untouched, and the rest of the page is still compared pixel-for-pixel.
- Baselines regenerated **once** (they had to be: masking changes the image), then verified
  deterministic across three consecutive runs: `4 passed (11.3s)`, `4 passed`, `4 passed`.

The regenerated PNGs are worth a human glance before merge — that is a design review, not a test
result.

---

## 11. Cycle 3 end state

| Gate evidence | Before this cycle | Now |
|---|---|---|
| Backend `mvn test` | did not compile (claimed green) | **4,515 run, 0 failures, 0 errors** |
| CI-gate e2e subset | 238/33 in 19m (dev server) | **281 passed, 0 failed, 2.9m** (prod build) |
| `app-switcher:82` | "possible navigation defect" | not a defect — passes, cause identified |
| `navigation.spec.ts` | 6 failures | **41 passed, 0 failed** |
| dynamic-route specs | never executed | executed; 2 assert real seeded data, 8 skip on empty tables |
| Visual regression | 3 permanently red | **deterministic and green** |
| V316 prod drift | unverifiable (Gate 1 BLOCKED) | **confirmed** against prod, repair decision unambiguous |
| V332 data fix | did not exist | written, executed, covered by a Testcontainers test |
| Encryption-key rotation | "DO NOT ROTATE" | dual-key fallback shipped + tested (AC1) |

Real application defects found and fixed this cycle: **one** (`TenantTimeProvider` static-holder
lifecycle). Everything else was lost prior-cycle edits, stale test waits, or the dev server.

---

## 12. The full suite ran end to end — for the first time

Against the production build, 8 workers:

```
npx playwright test --config=playwright.live.config.ts --project=setup --project=chromium \
  --workers=8 --retries=0

2313 passed · 483 failed · 51 skipped · 58 did not run    (2,905 total, 40.6 min)
```

Prior history for this suite: *"never completed in this environment across multiple attempts"*
(`DC-2G4FXYA98AVS`), best previous attempt ~415/2,886 before the dev server died. **79.6 % of the
suite passes**, and the run is now repeatable in well under an hour — the "can it even run" question
is settled.

The 483 failures were triaged in parallel across the six largest clusters (read-only agents; no
test was touched to make anything pass). Classification:

| Cluster | Failures | Verdict |
|---|---|---|
| `learning.spec.ts` | 29 | 21 stale after `ccd6d9f7` (tabs → bento links, heading changed); 8 real (see defects) |
| `approvals-workflows.spec.ts` | 25 | stale heading (`Approval Inbox` → `Approvals`, renamed in `5febb3b6`) + 2 real defects |
| `home.spec.ts` | 19 | all stale — `/home` was deleted and redirects to `/me/dashboard` (`ce622c04`, deliberate) |
| `leave.spec.ts` | 16 | all stale/non-waiting probes. Leave types, disabled-submit and `/leave/team` redirect are all **correct** |
| `helpdesk` + `expenses` | 20 | mostly stale; 1 real defect |
| `fluence-wiki-blogs` + `fluence-drive-wall` | 16 | mostly stale; 1 real defect |

The dominant cause across every cluster is the same one the CI workflow already named —
**redesign staleness**, now measured rather than estimated. This is a real backlog
(~400 assertions describing UI that was intentionally replaced), and mechanically updating that many
tests is its own piece of work, not something to slip into a verification cycle.

### Real product defects found (these are NOT test problems)

| ID | Severity | Defect |
|---|---|---|
| **BUG-1** | **HIGH (RBAC)** | `/workflows` — the approval-routing **configuration** screen — was readable by every employee. `app/workflows/page.tsx:153` gated read on `WORKFLOW:VIEW`, which is seeded to `EMPLOYEE` because they need it for their own approval inbox. Confirmed in the DB: `EMPLOYEE -> WORKFLOW:VIEW`. **FIXED this cycle** (read now follows `WORKFLOW:MANAGE`) — see below |
| **BUG-2** | MEDIUM | `app/workflows/page.tsx` row-actions menu is unclickable: the `z-50` dropdown is inside `<PageTransition>` (a framer-motion `motion.div`, own stacking context), while the `fixed inset-0 z-40` click-outside backdrop renders after it and paints on top |
| **BUG-L1** | HIGH | `/learning/paths` calls `GET /lms/learning-paths` and `POST /lms/learning-paths/{id}/enroll`; **neither mapping exists on the backend** (`LmsController` only has `/learning-paths/{id}`). The page has no error branch, so it shows "Loading learning paths…" forever, for every user |
| **BUG-L2** | MEDIUM | Invalid/missing LMS ids spin for up to 60 s instead of showing "not found": the not-found branches are gated on `!isLoading`, and a failing GET is 30 s (`lib/api/client.ts:92`) × `retry: 1`. The course-detail spinner is also a bare `<div>` with no text and no `role="status"` — an empty accessibility tree |
| **BUG-L3** | MEDIUM | `/learning/certificates` intermittently hard-denies an employee (`Access Restricted` + toast) while adjacent tests render it fine — a permission-hydration race |
| **BUG-E1** | MEDIUM | Expense claims have **no receipt file upload** anywhere in the UI (`app/expenses/page.tsx:1206` offers a URL text box), yet `app/expenses/settings/page.tsx:427` exposes a "Requires receipt upload" tenant policy and `app/expenses/[id]/page.tsx:317` renders `receiptFileName`. `expenses.spec.ts:364` fails for exactly the right reason — **do not update that test** |
| **BUG-E2** | LOW | The "My Claims" bento tile is a `button` whose handler is `() => undefined` with `href: '#my-claims'` — a dead control that shares its label with the real tab |
| **BUG-F1** | LOW | `app/fluence/my-content/page.tsx:249` and `:304` — the empty-state primary CTAs (`New Page`, `New Post`) have empty `onAction` bodies. The one user guaranteed to see them is a brand-new user |

### BUG-1 fixed and verified

```diff
- const canView = isReady && (isAdmin || hasPermission(Permissions.WORKFLOW_VIEW) || canManage);
+ const canView = isReady && (isAdmin || canManage);
```

```
npx playwright test … -g "workflow list page loads|Create Workflow button|cannot access /workflows"
→ 5 passed (19.0s)
```

That covers both directions: admin still gets the page and the Create button, and
`employee (Saran) cannot access /workflows — redirected or denied` now passes instead of leaking.

**One product question this raises, for a human:** `HR_MANAGER`, `MANAGER` and `TEAM_LEAD` hold
`WORKFLOW:VIEW` but not `WORKFLOW:MANAGE`, so they lose read access to workflow definitions under
this fix. If they are meant to *read* routing config without editing it, the correct end state is a
separate `WORKFLOW:CONFIG_VIEW` permission (migration + seeding), not re-widening `canView`. The
secure default is in place either way.

### Not fixed here, deliberately

The ~400 stale assertions are left failing rather than mass-edited. Each cluster's exact patches are
recorded in the triage transcripts; applying them is a focused follow-up where each change can be
reviewed against the commit that changed the UI. Quietly rewriting 400 assertions inside a
verification pass would destroy the signal this run just produced.

---

## 13. Final state at end of Cycle 3

| Check | Command | Result |
|---|---|---|
| Backend suite | `cd backend && mvn test` | **4,515 run · 0 failures · 0 errors · 2 skipped — BUILD SUCCESS** |
| CI-gate e2e subset (post-fix regression run) | prod build, 4 workers | **282 passed · 0 failed · 10 skipped (2.1m)** |
| Full e2e suite | prod build, 8 workers | 2,313 passed · 483 failed · 51 skipped · 58 not run (40.6m) |
| Frontend typecheck | `npx tsc --noEmit` | exit 0 |
| Frontend production build | `npm run build` | exit 0 |
| Prod V316 drift | read-only query via Railway MCP | **drift confirmed** (`921701256` vs `-1987529629`), `success=true`, 0 failed migrations |
| V332 | `mvn -Dtest=ArunManagerMigrationTest test` | 3/3 — applied, correct end state, idempotent |
| Dual-key encryption (AC1) | `mvn -Dtest=EncryptedStringConverterTest test` | 20/20 |
| `faylo verify run US-2G9W1P18V8BT` | | PASS |
| `faylo verify run US-2G9V0TF3AXX2` | | AC1 PASS · AC2 manual (operator) |
| `faylo gate` | | FAIL — 4 pre-existing review records where Reviewer == Author |

Changed this cycle, still uncommitted (nothing committed, nothing pushed, `main` not advanced):
production fixes in `TenantTimeProvider` (static-holder lifecycle), `app/workflows/page.tsx` (RBAC
read leak), `FileStorageService` (restored B3 accessors), `SecurityService` (cache constant),
`EncryptedStringConverter` (dual-key), plus `V332`, `ArunManagerMigrationTest`, and the test/spec
fixes described above.

## Human-only, still open

1. **`flyway repair` on production**, then deploy V317→V332. Drift is proven; the write and its
   snapshot are the operator's.
2. **Rotate the 5 live credentials** (provider consoles; `JWT_SECRET` ends every session).
3. **Encryption-key backfill (AC2)** + the hard-gate Operator-Signoff. The converter no longer makes
   rotation destructive, so this is now schedulable rather than blocked.
4. **`WORKFLOW:CONFIG_VIEW`** — decide whether HR_MANAGER/MANAGER/TEAM_LEAD should keep read access
   to workflow definitions (§12).
5. **The ~400 stale-assertion backlog** — schedule it; patches are prepared per cluster.
6. **7 product defects** (BUG-2, BUG-L1/L2/L3, BUG-E1/E2, BUG-F1) need tickets and prioritisation.
7. **4 `faylo gate` violations** — review records whose Reviewer equals the Author. Attribution
   facts; an agent cannot supply a different reviewer.
8. **`DC-2G4FXYA98AVS`** — the full-suite gate decision. Evidence is now available (§8, §12): it can
   run, in 41 minutes, against a production build.

---

# Remediation pass (2026-09-25) — the six tickets

Filed through the workflow, in the order given, all under epic `EP-2G4FWY5JGW6W`:

| # | Ticket | Defect | Tier |
|---|---|---|---|
| 1 | `US-2GBAZ3KJ6CTS` | BUG-L1 — learning-paths list + enrol endpoints missing | async-review |
| 2 | `US-2GBAZC4NXGZY` | BUG-E1 — expense receipts could never be uploaded | async-review |
| 3 | `US-2GBAZCD8C6XB` | BUG-2 — workflow row-actions menu unclickable | async-review |
| 4 | `US-2GBAZQAAESET` | BUG-L3 — employees hard-denied on permission-gated pages | async-review |
| 5 | `US-2GBAZQGXD3AY` | BUG-L2 — error/not-found states unreachable, inaccessible spinner | async-review |
| 6 | `US-2GBAZQPR4FWQ` | BUG-F1 + BUG-E2 — dead primary CTAs | autonomous |

## 1. BUG-L1 — the capability was genuinely absent, so it was built

Traced UI to API to controller to service to repository to entity to table. The entity
(`LearningPath`), the join entity (`LearningPathCourse`), both tables (V11) and their RLS
policies (V81) all existed. What did not exist: any list query, any list/enrol endpoint, a DTO
of the shape the page renders, and a repository for the join table.

**Backend added**
- `infrastructure/lms/repository/LearningPathCourseRepository.java` — membership + distinct-learner
  counts for many paths at once (the `LearningPath.courses` collection can only serve one path;
  open-in-view is off).
- `LearningPathRepository.findPublishedPaths(tenantId, pageable)`.
- `api/lms/dto/LearningPathSummaryResponse.java` — with an explicit
  `@JsonProperty("isEnrolled")`, because Lombok's `isEnrolled()` would serialise as `"enrolled"`
  and the page would silently never show progress or the Continue button.
- `LmsService.getLearningPaths(...)` — decorates each path with the caller's own progress; a path
  is "enrolled" when the employee holds a `CourseEnrollment` for at least one member course, and
  progress is their mean course progress **over the path's full course count**, so an untouched
  course drags the average down rather than being excluded.
- `LmsService.enrollInLearningPath(...)` — enrols across every member course, idempotent.
- `LmsController` — `GET /learning-paths`, `POST /learning-paths/{id}/enroll`.

Enrolment reuses `CourseEnrollment` rather than adding a `lms_learning_path_enrollments` table:
a path is a curated course set, course progress already flows into the same numbers, and a second
table would need its own entity, repository and aggregation for behaviour the UI never asks for.

**Data.** `lms_courses` and `lms_learning_paths` were **empty in every environment**, so the fixed
endpoint could only ever return an empty page and the workflow would have been unverifiable.
`V333__seed_demo_lms_courses_and_learning_path.sql` seeds 3 courses + 1 published path + 2
membership rows, gated by the same `${demoCredentialsEnabled}` placeholder as V314/V331 (prod is a
documented no-op) and idempotent via `ON CONFLICT DO NOTHING`.

**Frontend.** `/learning/paths` had no error branch at all, so a failing request left it on the
spinner. Added an explicit error state with a retry, and `isLoading && !isError` so the spinner
cannot outlive the request.

**Verified against the live stack, as a real employee (not a mock):**

```
GET  /api/v1/lms/learning-paths                    -> 200
  {'title': 'Security and Compliance Onboarding', 'courseCount': 2,
   'totalEnrollments': 0, 'isEnrolled': False, 'progressPercentage': 0, 'status': 'NOT_STARTED'}
POST /api/v1/lms/learning-paths/{id}/enroll        -> 200
POST (again)                                       -> 200        # idempotent
GET  /api/v1/lms/learning-paths                    -> isEnrolled: True, totalEnrollments: 1,
                                                      status: IN_PROGRESS
lms_course_enrollments rows                        -> 2 (one per member course, still 2 after the
                                                         second enrol)
```

A 403 on the first enrol attempt turned out to be **two** separate things, both real: CSRF (the
double-submit header), and `LMS:ENROLL` not being held by any non-admin role. See section 4.

## 2. BUG-E1 — receipts: one allow-list line, then three missing links

The capability was ~85% built and dead at the first step: `OcrReceiptService` stores under
category `"receipts"`, which was **missing from `FileStorageService.ALLOWED_CATEGORIES`**, so
`generateObjectName` threw `BusinessException("Invalid file category: receipts")` on *every*
receipt upload. It shipped because the only test covering that path mocks `FileStorageService`.

Fixed, in order of the actual data path:
1. `CATEGORY_RECEIPTS` added to the allow-list; `OcrReceiptService` now references that constant
   instead of a duplicate string literal.
2. `ExpenseItemRequest` gained `receiptStoragePath` / `receiptFileName` — the API previously had
   nowhere to put the upload result, so the UI discarded it.
3. `ExpenseItemService.addItem` persists them; `updateItem` only overwrites when supplied, so an
   edit that omits the receipt cannot silently detach one.
4. `GET /expenses/claims/{claimId}/items/{itemId}/receipt` — expense-scoped on purpose:
   `/api/v1/files/**` needs `DOCUMENT:VIEW`, which employees do not hold, so they could never
   reopen their own receipt. The path comes from the persisted row (never a request parameter),
   claim membership is checked, the tenant prefix is asserted, and the filename is sanitised
   before it reaches `Content-Disposition`.
5. Frontend: the scanner's result is held and sent with the item, and the filename on the claim
   detail page became a real link instead of dead text.

**Verified end to end against the live stack:**

```
POST /api/v1/expenses/receipts/scan (multipart)   -> 200, receiptStoragePath returned
                                                     (this call used to 500 on every attempt)
POST /api/v1/expenses/claims/{id}/items           -> 201, receiptFileName: "receipt.pdf"
GET  /api/v1/expenses/claims/{id}/items           -> receiptFileName present (what the page renders)
GET  .../items/{itemId}/receipt                   -> 200, content-disposition: inline;
                                                     filename="receipt.pdf"
```

The downloaded body is 0 bytes **in this environment only**: no Google Drive credentials are
configured locally, so `MockStorageProvider.upload(...) — no-op` is what actually ran (it says so
in the log). Authorisation, persistence, routing and headers are verified; the byte round-trip
needs a real storage provider and is the one part of this flow local verification cannot prove.

### A second, larger defect found by running that workflow

The first attempt to add an item failed with:

```
null value in column "tenant_id" of relation "expense_items" violates not-null constraint
```

`expense_items.tenant_id` is NOT NULL (V88), but `ExpenseItem` extended `BaseEntity`, which has no
tenant column and no `TenantEntityListener` — so **adding any item to any expense claim failed for
every user**, entirely independently of receipts. Every test in the module mocks the repository, so
nothing caught it. `ExpenseItem` now extends `TenantAware`, exactly as `ExpenseClaim` does, and
`ExpenseItemTenantStampingTest` does a real INSERT against Postgres to keep it that way.

## 3. BUG-2 — the menu could not be clicked

The `z-50` dropdown lives inside `<PageTransition>`, a framer-motion div animating transform, which
owns a stacking context — so its `z-50` could never escape, and the `fixed inset-0 z-40`
click-outside backdrop rendered *after* it painted on top and swallowed every click. Raising the
z-index cannot fix a stacking-context problem.

The backdrop is gone. Closing now uses a document `mousedown` + `Escape` listener — the pattern
`ColumnVisibilityToggle` and `ThemeToggle` already use — with the ref on the wrapper that contains
both the trigger and the panel, so clicking the trigger while open still closes it. Nothing overlays
the menu any more.

## 4. BUG-L3 — deny decided on an empty role set (and a missing grant)

Two independent causes, both fixed:

**(a) The permission-hydration race.** `isReady` is `hasHydrated && (!isAuthenticated || !!user)` —
deliberately **true** for a visitor the store considers logged out, because `AuthGuard` depends on
that. But `permissions` is `[]` in that window, so a page doing
`isReady && !hasPermission(X) -> router.replace('?denied=1')` denies a user it knows nothing about.

My first attempt tightened `isReady` itself. That was wrong and the gate caught it: every page hung
on *"Session restoring — Checking your workspace credentials…"*, exactly the deadlock the comment in
`AuthGuard.tsx:99-102` warns about. Reverted, and replaced with a second, purpose-named signal:

- `isReady` — safe to **render** (unchanged semantics; AuthGuard keeps working).
- `isPermissionReady = hasHydrated && !!user` — safe to **deny**. Any page that redirects on a
  failed permission check must use this one.

`/learning/certificates` now gates its redirect on `isPermissionReady`. The other ~70 pages with the
same shape are a follow-up, not a silent mass edit.

**(b) A real missing grant.** `LMS:ENROLL` and `LMS:CERTIFICATE_VIEW` were held by `SUPER_ADMIN`
alone. `V66:540,603,686` explicitly granted both to EMPLOYEE (SELF), MANAGER (TEAM) and TEAM_LEAD
(TEAM); the later canonical reseed kept `TRAINING:*` and `LMS:COURSE_VIEW` and dropped these two. So
self-enrolment was impossible for everyone the Enroll buttons are rendered for, and the certificates
page denied every employee deterministically — the "intermittent" report was these two causes
overlapping. `V334__restore_employee_lms_enroll_and_certificate_grants.sql` restores V66's exact
intent and scope, idempotently. Verified: `/api/v1/lms/my-certificates` -> 200 for an employee, and
the enrol call succeeds.

## 5. BUG-L2 — unreachable error states and an invisible spinner

- `queryClient` retried **every** failure once, including 4xx. A request for a record that does not
  exist cannot succeed on a retry; it only doubled the wait before the not-found branch (gated on
  `isLoading`) could render — up to 30s twice. Retry is now a predicate: 4xx never, 5xx and network
  errors once. 14 unit tests pin it.
- The LMS spinners were bare `<div class="animate-spin">` — no text, no `role="status"`, an empty
  accessibility tree. All 7 occurrences now use the shared `Spinner`, which already ships
  `role="status"`, `aria-live="polite"` and an SR-only label. The e2e asserts **zero** bare
  `div.animate-spin.border-4` remain on those routes.

Measured after the fix, against the production build: `GET /api/v1/lms/courses/<unknown-id>` ->
**404 in 31–48 ms**, and the page resolves to a real state rather than a spinner. (The multi-second
spinners in the original report were compounded by `next dev` cold compiles — see section 8.)

## 6. BUG-F1 + BUG-E2 — dead primary controls

- `my-content`'s empty-state CTAs had `onAction={() => { /* handled by parent */ }}` — nothing
  handled it. They now take an `onCreate` callback and route to `/fluence/wiki/new` and
  `/fluence/blogs/new`. The one user guaranteed to hit this is a brand-new user.
- The expenses "My claims" tile was `onClick: () => undefined` with a dead `#my-claims` href. It now
  selects the My claims view, the same way the approvals tile selects its own.

---

# Security workstream (2026-09-25) — activated, executed, remediated

Security was `PENDING` with `CVE 0/0` displayed. It is now a real workstream with executed evidence.
8 parallel security agents ran against the **live stack** (backend :8081, production-build frontend
:3010, migrated Postgres), not a checklist pass.

## Findings by severity

| id | sev | component | status |
|---|---|---|---|
| **SEC-1** | **CRITICAL** | `JwtAuthenticationFilter:169` — every DB-loaded permission stamped `RoleScope.GLOBAL` | **FIXED + verified** |
| **F-1** | **CRITICAL** | `receiptStoragePath` client-supplied → arbitrary tenant file read | **FIXED + verified** |
| **DEP-01** | **CRITICAL** | Next.js 16.2.7 AVIF image-optimizer RCE (GHSA-2xp9-vwfh-vxw4) | **MITIGATED** (AVIF off); upgrade pending |
| **F-2** | HIGH | expense items/receipts had no claim-owner scope check | **FIXED + verified** |
| **IV-1** | HIGH | PSA timesheet `employeeId` bound from the request body | **FIXED** |
| **F-3** | MEDIUM | `updateItem` accepted `{claimId}` and ignored it | **FIXED** |
| **F-4** | LOW | receipt prefix guard was string-level (`..` traversal) | **FIXED + verified** |
| DEP-02/03/04 | HIGH | Next 16.2.7 (9 advisories), dompurify 3.4.11, axios 1.16.0 | **OPEN — dependency decision** |
| SEC-3 | MEDIUM | `WorkflowController` GETs still gated on `WORKFLOW:VIEW` (API level) | **OPEN — ticketed** |
| AUTH-1 | HIGH | authority derives from the JWT `roles` claim; revocation not effective until expiry | **OPEN — design** |
| IV-2 | HIGH | 38 hand-rolled `PageRequest.of(page, size)` sites, `size` unbounded | **OPEN** |
| SEC-01/02 | HIGH | secrets in git history on both remotes | **OPEN — human (rotation/purge)** |
| GAP-1…GAP-8 | CRITICAL→HIGH | security tests that exist but never gate CI (RLS Docker-gated, 48 frontend security tests excluded, CSRF asserts the opposite of prod, filters mocked out everywhere) | **OPEN — gate wiring** |

## SEC-1 — the one that mattered

`JwtAuthenticationFilter` loaded permission **codes** from the DB and wrote
`RoleScope.GLOBAL` (== `ALL`) for every one. Permissions were moved out of the JWT, so this branch
runs for **every cookie-authenticated request** — meaning every scope check in the product
(`validateEmployeeAccess`, `SecurityContext.getPermissionScope`, `DataScopeService`) evaluated a
SELF-scoped employee as ALL.

Proven live, before the fix, as `arun@nulogic.io` (EMPLOYEE, `role_permissions.scope = SELF`):

```
GET /api/v1/leave-requests/employee/<another employee>   -> HTTP 200   (their leave, dates, reasons)
GET /api/v1/expenses/employees/<another employee>        -> HTTP 200   (their claims and amounts)
```

The scope-preserving loaders already existed (`SecurityService.getCachedPermissionScopes` /
`…ForUser`) — the filter simply wasn't using them. It does now, and a missing scope falls back to
**SELF**, never ALL.

After the fix, same requests, same session:

```
GET /api/v1/leave-requests/employee/<another employee>   -> HTTP 403
GET /api/v1/expenses/employees/<another employee>        -> HTTP 403
GET /api/v1/leave-requests/employee/<self>               -> HTTP 200   (control: unbroken)
GET /api/v1/auth/me                                      -> HTTP 200   (control: unbroken)
```

Full backend suite after the change: **4,547 tests, 0 failures, 0 errors — BUILD SUCCESS.**
RBAC-heavy e2e (`nu-rbac`, `my-space`, `navigation`, `app-switcher`, `defect-regressions`):
**213 passed, 0 failed.** So the tightening broke nothing that was legitimately allowed.

## F-1 — a CRITICAL in code written earlier in this same session

The BUG-E1 receipt endpoint accepted `receiptStoragePath` from the client and persisted it verbatim;
the only download guard was `startsWith(tenantId + "/")`. An employee could therefore point their own
expense item at **any** path in the tenant — payslips, employee documents — and stream it, bypassing
the `EMPLOYEE_SCOPED_CATEGORIES` / `SENSITIVE_DOCUMENT` guards that `/api/v1/files/download/direct`
enforces. The audit agent demonstrated it end to end before the fix.

Fixed at the write boundary (a receipt path must be `<tenantId>/receipts/…` with no `..`), plus the
claim-owner scope check on both read paths, plus the ignored-`claimId` defect. Verified live:

```
POST …/items  receiptStoragePath=<tenant>/payslips/<other employee>/march.pdf  -> HTTP 400 Invalid receipt reference
POST …/items  receiptStoragePath=<tenant>/receipts/../payslips/march.pdf       -> HTTP 400 Invalid receipt reference
POST …/items  receiptStoragePath=<tenant>/receipts/abc/ok.pdf                  -> HTTP 201 (control)
```

## DEP-01 — mitigated, not yet fixed

Next.js **16.2.7** is running and AVIF was enabled, which is the precondition for the
unauthenticated RCE in the image optimizer (GHSA-2xp9-vwfh-vxw4, fixed in 16.3.3). The live server
was confirmed emitting `Content-Type: image/avif`.

AVIF output is now disabled in `next.config.js` (WebP retained), which removes the vector today:

```
curl -H 'Accept: image/avif' '…/_next/image?url=…'   ->  Content-Type: image/png   (was image/avif)
```

**The upgrade itself is the real fix and is a decision for you**: 16.2.7 → 16.3.3+ also clears the 9
advisories in DEP-02. Same batch: `dompurify` 3.4.11 → 3.4.16 (it is the app's only XSS barrier, and
9 `dangerouslySetInnerHTML` sinks route through it) and `axios` 1.16.0 → 1.18.0. I did not bump
runtime dependencies mid-verification because that changes the runtime under a release gate.

## Security regression coverage added

| Test | Pins |
|---|---|
| `JwtAuthenticationFilterScopeTest` (3 cases) | SEC-1: DB permissions must never be stamped GLOBAL; the scope-preserving loaders must be used; a missing scope falls back to SELF |
| `ExpenseItemServiceTest` (+7 security cases, 15 total) | F-1 foreign/other-tenant/traversal receipt paths rejected, legitimate path accepted; F-2 owner scope check runs and a denial stops the stream before any file read; F-3 claim mismatch refused |
| `ExpenseItemTenantStampingTest` | the tenant_id NOT NULL defect, via a real INSERT |

## What the audit verified as SAFE (negative results, recorded deliberately)

- CSRF double-submit **is** enforced on state-changing requests (a POST without `X-XSRF-TOKEN` is
  rejected) — found while debugging an enrol 403.
- RLS is enabled with `nu_app_rls` holding `rolbypassrls = false`; the startup probe fails closed.
- `RbacAnnotationCoverageTest` proves every REST endpoint carries `@RequiresPermission` or is
  explicitly whitelisted — the strongest single control in the suite.
- Auth is required: unauthenticated requests to the probed endpoints return 401/403, not data.

---

# Remaining-gates matrix (2026-09-25, post-remediation)

Cycle 3 is a **verified remediation pass, not a release sign-off**. Every row below carries the
command that produced it. Anything without objective evidence is OPEN or BLOCKED, never PASS.

## Security-CI integrity (repaired first, as instructed)

Security coverage that cannot fail is not coverage. Three mechanisms were presenting as green:

| # | Defect | Mechanism | Repair | Status |
|---|---|---|---|---|
| GAP-1 | RLS tenant-isolation tests skipped silently | `RlsNoBypassTest` is gated on `DOCKER_AVAILABLE`, which **only `ci.yml` sets** — `pr-validation.yml` has no `env:` block, so on the PR gate both tests reported `skipped` and surefire still exited 0. Surefire report proves it: `Tests run: 2 … Skipped: 2` on a machine where Docker *was* available | `RlsTenantGucScopeTest` now **throws** when Docker is missing and `CI` is set (GitHub Actions always sets `CI=true`), and aborts deliberately for a local dev. `RlsNoBypassTest` annotated with why it is a non-covering duplicate | **PASS** — 2/2 executed, 0 skipped |
| GAP-2 | Frontend security e2e excluded from the gate | The gate hardcoded 7 spec files, of which exactly **one** was security-relevant (`nu-rbac`) | Added the three security specs that were **already fully green** — `rbac-matrix` (68 cases), `rbac-employee-boundaries` (21), `workflow-api-edge-cases` (5) — plus `defect-regressions`. Gate grew 275 → **379 cases** | **PASS** — 376 passed, 3 skipped, 0 failed |
| GAP-3 | CSRF tests asserted the **opposite** of production | `SecurityUseCaseTest` UC-SEC-003 asserted "CSRF is explicitly disabled"; UC-SEC-006's only assertion was `assertThat(status).isNotEqualTo(999) // Always passes`. Both ran under `@AutoConfigureMockMvc(addFilters = false)`, so `CsrfDoubleSubmitFilter` was not even in the chain | Both inverted tests deleted; new `CsrfDoubleSubmitFilterTest` exercises the real filter: missing token → 403, mismatched → 403, missing cookie → 403, matching → passes, safe methods unchallenged, and the removed `X-API-Key` bypass stays removed | **PASS** — 6/6 |

**Still open in this area (not repairable without a policy decision):** the e2e workflow runs only on
`workflow_dispatch` or a PR labelled `e2e` (`e2e.yml:16-19,45`) — so even the enlarged gate is **not a
required check**. Making it required on every PR is yours to approve (CI cost, ~6 min/PR).

## Mandatory gates

| Gate | Status | Evidence (command → result) |
|---|---|---|
| **Backend test suite** | **PASS** | `cd backend && mvn test` → **4,552 run · 0 failures · 0 errors · 2 skipped · BUILD SUCCESS** |
| **Frontend unit suite** | **PASS** | `cd frontend && npm run test:run` → **2,420 / 2,420**, 91/91 files |
| **Frontend typecheck** | **PASS** | `npx tsc --noEmit -p .` → exit 0 |
| **Frontend production build** | **PASS** | `npm run build` → exit 0 |
| **CI e2e gate (enlarged)** | **PASS** | 11 specs, prod build, 4 workers → **376 passed · 0 failed · 3 skipped (5.3m)** |
| **Security — authorization scope** | **PASS** | SEC-1 fixed; live: cross-employee reads `403`/`403`, self-access `200`/`200`; `JwtAuthenticationFilterScopeTest` 3/3 |
| **Security — file access (receipts)** | **PASS** | F-1/F-2/F-3/F-4 fixed; live exploit attempts `400`/`400`, legitimate path `201`; `ExpenseItemServiceTest` 15/15 |
| **Security — CSRF** | **PASS** | `CsrfDoubleSubmitFilterTest` 6/6 against the real filter |
| **Security — tenant isolation (DB)** | **PASS** | `RlsTenantGucScopeTest` 2/2 executed against a live Postgres container, no skips |
| **Security — token revocation on role change** | **PASS** | AUTH-1 fixed (`revokeAllUserTokens` on role assignment); `RoleManagementServiceTest` 21/21 incl. the new case |
| **Migration chain (local, from scratch)** | **PASS** | Flyway applied to **V334** on a virgin DB; V332/V333/V334 verified by execution |
| **Full e2e suite** | **OPEN** | See below — ~2,900 cases, large stale-test backlog; not a gate today |
| **Production migration state** | **BLOCKED** | Prod `flyway_schema_history` head = **V316**, repo head = **V334** → **18 migrations pending**; V316 checksum `921701256` vs repo `-1987529629` → drift unrepaired. `repair-on-migrate: false` in prod means the next deploy fails validation |
| **Deployment verification** | **BLOCKED** | **Nothing was deployed.** No build of this tree has run on Railway/Vercel; every result above is from a local production build against a local stack. Deployment is unverified by definition |
| **Credential rotation** | **BLOCKED** | 5 live credentials unrotated; secrets remain reachable in git history on both remotes (SEC-01/02) |
| **Encryption-key rotation (AC2)** | **OPEN** | Dual-key converter shipped and tested (AC1); the re-encryption backfill is operator work |
| **Dependency upgrades** | **OPEN** | Deliberately isolated from this gate — see below |
| **AgentDB dashboard tile** | **N/A** | Instrumentation gap, not coverage — see below |

## Dependency upgrades — isolated on purpose

| id | Package | Advisory | Action |
|---|---|---|---|
| DEP-01 | Next.js 16.2.7 | **CRITICAL** GHSA-2xp9-vwfh-vxw4 — unauth RCE in the image optimizer, reachable only when AVIF is produced (fixed 16.3.3) | **Vector closed today** without upgrading: `formats: ['image/webp']`. Live probe now returns `Content-Type: image/png` (was `image/avif`) |
| DEP-02 | Next.js 16.2.7 | 9 further advisories fixed in 16.2.11 (Server Function endpoint disclosure, cache confusion, image DoS) | **OPEN** — needs the upgrade |
| DEP-03 | dompurify 3.4.11 | GHSA-55q2-fjhq-7xh7 / GHSA-c2j3-45gr-mqc4 — the app's only XSS barrier, 9 `dangerouslySetInnerHTML` sinks route through it | **OPEN** — patch bump to 3.4.16 |
| DEP-04 | axios 1.16.0 | 10 advisories fixed in 1.18.0 | **OPEN** |

Upgrading runtime dependencies changes what the just-verified gate actually ran. Doing it inside this
pass would invalidate the evidence above, so it is one separate change with its own full re-run.
DEP-01's exploit path is closed in the meantime.

## Remaining security gaps, explicit

| id | Severity | Gap | Status |
|---|---|---|---|
| AUTH-1 | HIGH | Role revocation ineffective until token expiry | **FIXED + tested** |
| IV-1 | HIGH | PSA timesheet `employeeId` bound from the request body | **FIXED** |
| IV-2 | HIGH | 38 hand-rolled `PageRequest.of(page, size)` sites; `size` unbounded (`?size=100000` → `{"size":100000}`); `app.pagination.max-page-size` is dead config read by zero Java code | **OPEN** — DoS surface, mechanical fix across 21 controllers |
| AUTH-2 | MEDIUM | CAPTCHA disabled in the `render` profile (inherits `false` → NoOp verifier) | **OPEN** |
| SEC-3 | MEDIUM | `WorkflowController` GETs still gated on `WORKFLOW:VIEW` at the API level (the UI page is fixed) | **OPEN** |
| GAP-4 | HIGH | `JwtAuthenticationFilter`/`TenantFilter` never exercised as filters — every controller test mocks them out | **OPEN** |
| GAP-5 | HIGH | IDOR guards pinned on 3 controllers of ~187 | **OPEN** |
| GAP-6 | HIGH | Malware-upload rejection untested (`virusScanService` stubbed `Clean()` everywhere); fail-open flag untested | **OPEN** |
| GAP-7 | HIGH | `XssRequestWrapperFilter` has zero tests | **OPEN** |
| GAP-8 | HIGH | Rate limiting untested through the real chain; the gate disables it (`APP_RATE_LIMIT_ENABLED: false`) | **OPEN** |
| RLS-role | HIGH (needs confirmation) | **No migration creates `nu_app_rls`** — V179/V254 only `ALTER` it *if it exists*. If absent, the app connects as the owner (BYPASSRLS) and RLS is inert. `RlsStartupProbe` fails boot on that condition in prod/render, so production is likely protected, but it is unconfirmed on the live DB | **OPEN — needs a prod check** |

## AgentDB tile — N/A (instrumentation), not a coverage number

The tile is rendered by this repo's own statusline script, not by ruflo:
`.claude/settings.json:197` → `.claude/helpers/statusline.cjs`. `getTestStats()` walks
`tests | test | __tests__ | src | v3` **at the repo root** — none of which exist here (the tests live
in `backend/src/test` and `frontend/`), so it prints `0`. The `~N cases` figure is `testFiles * 4`,
a hardcoded multiplier, not a parsed case count. `npx ruflo hooks statusline --json` returns
`user/v3Progress/security/swarm/system` only — no `tests`, no `agentdb` block, and the installed
package has no emitter for either.

So there is **no writable or test-populated interface** behind that number. Real counts today:
**358** backend test classes, **215** frontend test files. Classified **N/A — instrumentation gap**;
the honest repair is to point the walk at `backend/src/test` and `frontend`, which is a harness
change (`.claude/helpers/`), not a product one.

## Swarm telemetry — truthful split

| | Count | What it means |
|---|---|---|
| ruflo **registered** agents | 34 (max 30 configured, hierarchical-mesh, auto-scale) | Registry rows. All `idle`; ruflo does not execute them without an autopilot loop |
| ruflo tasks | 12 created, all `pending` | Assignment records, not work |
| Claude Code subagents that **actually executed** | 33 across 5 workflows | 8 security, 6 e2e-cluster triage, 5 backend triage, 2 traces, 4 CI-integrity, plus this pass |

The dashboard will read **34 registered / 0 busy**. Reporting that as "30 active agents working"
would be false.

## Final verification run (2026-09-25, after every fix in this pass)

Exact commands, exact results. Stack: backend jar on :8081 (all security fixes), Next.js
**production build** on :3010, Flyway-migrated Postgres on :55432.

| # | Command | Result |
|---|---|---|
| 1 | `cd backend && mvn test` | **4,552 run · 0 failures · 0 errors · 2 skipped · BUILD SUCCESS** |
| 2 | `cd frontend && npm run test:run` | **2,420 / 2,420 passed**, 91/91 files |
| 3 | `cd frontend && npx tsc --noEmit -p .` | exit 0 |
| 4 | `cd frontend && npm run build` | exit 0 |
| 5 | CI gate set, 11 specs, `--project=setup --project=chromium --workers=4 --grep-invert "Visual Regression\|snapshot"` | **376 passed · 0 failed · 3 skipped** (5.3m) · EXIT 0 |
| 6 | Full suite, `--workers=8 --retries=0` | **2,274 passed · 499 failed · 47 skipped · 93 did not run** (2,913 · 35.1m) · EXIT 1 |
| 7 | `mvn -Dtest=CsrfDoubleSubmitFilterTest,RlsTenantGucScopeTest,SecurityUseCaseTest test` | 19 run · 0 failures — **RLS 2/2 executed, 0 skipped** |
| 8 | Live prod read-only: `SELECT max(version) FROM flyway_schema_history` | prod **V316**, local **V334**, V316 checksum `921701256` ≠ repo `-1987529629` |

### Full-suite delta vs the pre-remediation run

`2,313 passed / 483 failed` → `2,274 passed / 499 failed`. That is **not** a regression from the
fixes, and the evidence is specific:

- **Zero failures in every spec the gate enforces** — `defect-regressions`, `rbac-matrix`,
  `rbac-employee-boundaries`, `workflow-api-edge-cases`, `nu-rbac` all clean inside the full run.
- **Specs touched by the remediation improved or held**: `learning` 29→28, `approvals-workflows`
  25→21, `fluence-drive-wall` 7→5, `expenses` 10→10, `fluence-wiki-blogs` 9→9, `workflows` 0→0.
  The `Learning Paths` block — the BUG-L1 surface — has **0 failures**.
- The movement is in the untouched stale backlog (`reports-extended` 27, `projects` 24,
  `training` 22, `home` 19) plus `did not run` 58→93: serial `describe` blocks abort earlier under
  8 workers, so fewer cases are attempted. Earlier in this session an A/B against a stashed-out
  build proved one 32-failure cluster (`nu-hire-grow-interaction`) is identical with and without
  the changes — the full suite's noise band is real and it is not caused by this work.

### Newly discovered defects this pass

| id | Severity | Defect | Status |
|---|---|---|---|
| SEC-1 | CRITICAL | `JwtAuthenticationFilter` forced every DB permission to `RoleScope.GLOBAL`, disabling all scope authorization | FIXED + verified live (403/403 vs 200/200 controls) |
| F-1 | CRITICAL | Client-supplied `receiptStoragePath` → arbitrary tenant file read | FIXED + verified live |
| GAP-1/2/3 | CRITICAL | Security coverage that could not fail (silent skip, exclusion, inverted assertions) | FIXED |
| AUTH-1 | HIGH | Role revocation ineffective until token expiry | FIXED + tested |
| IV-1 | HIGH | PSA timesheet `employeeId` bound from the request body | FIXED |
| F-2/F-3/F-4 | HIGH→LOW | Missing claim-owner check; ignored `claimId`; string-level path guard | FIXED + tested |
| — | test defect | `workflow-api-edge-cases` leave dates could land on a weekend → 400 "no working days" | FIXED (weekday-safe dates) |

### Has deployment been verified?

**No.** Nothing from this tree has been deployed. Every result above comes from a local production
build against a local stack. Production still runs the pre-Cycle-3 code at Flyway **V316**.
