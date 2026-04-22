# NU-AURA Super E2E Report (Run 2 — post-fix regression)

- **Run:** `docs/qa/runs/super-e2e-20260421T175305Z/`
- **Mode:** FULL (10 parallel workers)
- **Base SHA:** `0b3aee04866bc12dacb7168dfb5590b7d5dc1386` (uncommitted fixes from prior run active
  via backend restart)
- **Started / Finished:** 2026-04-21 17:53Z → 18:09Z (~16 min wall)
- **Workers effective / blocked:** 3 / 7 — **orchestrator design flaw** (see Root Cause below)

---

## TL;DR

**Regression verdict on 7 fixes from prior run:**

| Fix                                            | Status           | Evidence                                                                                                                  |
|------------------------------------------------|------------------|---------------------------------------------------------------------------------------------------------------------------|
| **F-02** fluence/activities 500                | ✅ **HOLDS**      | W5: 1.2s response, 403 (RBAC), no 500                                                                                     |
| **F-05** OKR endpoints hang                    | ✅ **HOLDS**      | W4: /performance/okr renders <5s, /api/v1/okr/objectives/my 200 fast                                                      |
| **F-03** workflow/inbox/count timeout          | ⚠ **PARTIAL**    | W5: cache bean present, but first call 8.6s, cache-hit 3.9s — still above 1s SLA under load                               |
| **F-01** SuperAdmin bypass                     | ❓ **UNVERIFIED** | All SA workers (W1/W5/W8/W10) blocked by lockout/cred issue — W5 session raced to EMPLOYEE. Need single-worker SA re-run. |
| **F-04** Link anchors /helpdesk/tickets        | ❓ **UNVERIFIED** | W6 bailed early                                                                                                           |
| **F-06** EMPLOYEE /helpdesk/tickets permission | ❓ **UNVERIFIED** | W6 bailed early                                                                                                           |
| **F-12** /employees?page=N                     | ❓ **UNVERIFIED** | W1 blocked                                                                                                                |

**5 new findings** (all from the 3 workers that got through):

| ID     | P  | Source | Title                                                                                                     |
|--------|----|--------|-----------------------------------------------------------------------------------------------------------|
| NEW-01 | P1 | W4     | `/surveys` returns HTTP 503 (empty body after 10s)                                                        |
| NEW-02 | P1 | W5     | `/api/v1/workflow/inbox/count` still 3.9–8.6s (cache bean loaded but not hot-pathing)                     |
| NEW-03 | P2 | W4     | `/api/v1/okr/company/objectives` returns 403 for HR_MANAGER (intentional? spec review)                    |
| NEW-04 | P2 | W5     | `/api/v1/fluence/drive/files` returns 404 (endpoint not mapped) — /fluence/drive renders but Drive broken |
| NEW-05 | P3 | W7     | `/statutory` sidebar briefly renders admin nav items for EMPLOYEE (no data leak; client-side nav filter)  |

**Security posture (verified by W7):**

- ✅ Zero RBAC data leaks. All 7 denial-matrix URLs correctly denied at UI + API layer for EMPLOYEE.
- ✅ `/api/v1/auth/me` role consistent across tabs — no cross-tab session hijack detected.

---

## Worker Summary

| W   | Role              | Status      | Bugs | Notes                                                                                    |
|-----|-------------------|-------------|------|------------------------------------------------------------------------------------------|
| W1  | SUPER_ADMIN       | **BLOCKED** | 2    | Credential mismatch (contract had Password@123, real is Welcome@123) → 429 → 423 lockout |
| W2  | HR_ADMIN          | **BLOCKED** | 3    | Same cred cascade + rate-limit flood                                                     |
| W3  | HR_ADMIN          | **BLOCKED** | 3    | Cred cascade + 15min lockout on hradmin@nulogic.io                                       |
| W4  | HR_MANAGER        | ✅ PASS      | 2    | Used demo "JN HR MANAGER" button to bypass password gate                                 |
| W5  | SUPER_ADMIN       | ⚠ PARTIAL   | 2    | Cookie race → EMPLOYEE session; got useful regression data on F-02/F-03 before lockout   |
| W6  | EMPLOYEE          | BAILED      | 0    | Subagent returned immediately after stagger sleep (bug in tester subagent type?)         |
| W7  | EMPLOYEE          | ✅ PASS      | 1    | RBAC matrix clean — zero leaks verified                                                  |
| W8  | SUPER_ADMIN       | **BLOCKED** | 1    | Lockout                                                                                  |
| W9  | TEAM_LEAD/HRM/HRA | **BLOCKED** | 3    | All 3 role accounts rejected credentials                                                 |
| W10 | SUPER_ADMIN       | **BLOCKED** | 1    | Lockout                                                                                  |

**Totals:** 3 workers effective (30%) · 15 bugs logged · 42 of 74 planned probes skipped.

---

## Root Cause — Why 7 Workers Failed

### RC-1: Credential fixture gap in WORKER_CONTRACT (P1, SEV-2)

The skill invocation hard-coded `Password@123`. The seeded demo-user password is `Welcome@123`.
Every worker logging in via email/password hit 401. Contract was corrected mid-run but by then
accounts were locked.

### RC-2: Parallel-worker auth rate-limit collision (P1, SEV-2)

DistributedRateLimiter: 5 auth attempts/min (global, shared across all worker IP/session combos
running against localhost:8080). 10 workers staggered 12s apart exceeds 5/min on minutes 1–2, and
once failed logins push a single account over the 5-attempts/15-min threshold, AccountLockoutService
locks that account — blocking all subsequent workers using the same credential.

### RC-3: Single shared SuperAdmin credential

W1/W5/W8/W10 all used `fayaz@nulogic.io`. Once one worker's failed retries locked it, the other
three were permanently blocked for 15 min.

### RC-4: `tester` subagent type has tight early-exit behavior (RC-6 candidate)

W6 returned after the 72s stagger sleep with 7 tool uses and summary "Waiting for stagger before
first navigate" — it literally exited during the sleep. Consider using `general-purpose` for
long-running sequential shards, or shortening stagger.

---

## Recommendations — Orchestrator Design Fix

Before re-invoking `/nu-chrome-super-e2e` in FULL mode:

1. **Pre-flight credential check** — orchestrator verifies login works for each role account before
   dispatching workers. If role creds fail, use SA + role-switch pattern or demo-button login.
2. **Per-worker unique SA credential** or shared session cookie file (workers re-use an existing
   authenticated cookie rather than re-logging in).
3. **Stagger ≥ 15s minimum between login attempts**, and only 1 worker attempts login at a time (
   serialize the login phase).
4. **Whitelist test-runner IPs** in DistributedRateLimiter, or raise rate limit to ≥20/min for
   `localhost` in dev.
5. **Demo-button fallback** in worker contract: if email/password fails, try the "JN {ROLE}" demo
   button (this is what W4 did successfully).
6. **Don't use `tester` subagent for long sessions** — swap to `general-purpose` so it doesn't
   early-exit on idle.

---

## New Bugs (full detail)

### NEW-01 (P1) — `/surveys` 503

- W4, HR_MANAGER role
- Next.js page doc returns HTTP 503, body empty after 10s
- Suggest: frontend-specialist or full-stack — check if the RSC payload backend call is hanging

### NEW-02 (P1) — `/api/v1/workflow/inbox/count` latency 3.9–8.6s (F-03 fix insufficient)

- W5, SUPER_ADMIN (initial) then EMPLOYEE
- Cache bean `WORKFLOW_INBOX_COUNT` IS loaded (verified by backend restart log)
- But first call 8.6s and cache-hit 3.9s — not matching 30s TTL expectations
- Suggests cache miss path every time OR cache not keyed correctly OR query itself still slow +
  cache never warms
- **Owner:** backend-dev / performance-engineer — open `WorkflowService.getInboxCounts()` cache
  annotation, verify `@Cacheable` key + `unless` clauses, and profile the underlying query with
  `EXPLAIN ANALYZE`.

### NEW-03 (P2) — `/api/v1/okr/company/objectives` 403 for HR_MANAGER

- W4, HR_MANAGER on /performance/okr
- `GET /api/v1/okr/objectives/my` = 200 ✓ (F-05 verified)
- `GET /api/v1/okr/company/objectives` = 403
- **Ambiguous:** is HR_MANAGER expected to see company-wide OKRs? Depends on business rule. File as
  spec-review item.

### NEW-04 (P2) — `/api/v1/fluence/drive/files` 404 endpoint not mapped

- W5
- `/fluence/drive` page renders but file-list API 404s
- **Owner:** backend-dev — grep for drive/files routes; either endpoint missing or URL drifted

### NEW-05 (P3) — `/statutory` sidebar nav leak (UI only, no data leak)

- W7, EMPLOYEE
- Sidebar briefly rendered admin items (Executive, Employees, Payroll, System Admin) on /statutory
  access-denied page
- No data exposure — main content empty, API correctly 403s
- **Owner:** frontend-specialist — tighten client-side nav filter to match server-side permission
  gate

---

## Attachments

- `workers/w1..w10/report.json` — raw worker reports (9 exist; W6 bailed)
- `bugs.jsonl` — 15 atomic bug appends
- `WORKER_CONTRACT.md` — updated with Welcome@123 correction
- `manifest.json` — run metadata
- `tabs.json` — tab_id map

## Next suggested actions

1. **Single-worker SuperAdmin regression** — `super e2e regression` mode with ONE worker holding
   fayaz@nulogic.io after 15-min lockout clears (or manually clear `AccountLockoutService` Redis
   key). Covers F-01, F-04, F-06, F-12 which this run couldn't verify.
2. **Fix orchestrator per Recommendations §1–§6** before next FULL run.
3. **Dispatch fixer swarm** for NEW-01 (surveys 503), NEW-02 (inbox-count latency still high),
   NEW-04 (drive/files 404).
4. File NEW-03 as spec review — not a bug yet, needs business decision.
