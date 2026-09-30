# Dynamic-Route Spec-Authoring Gap — Closure Report

**Date:** 2026-09-24
**Owner:** dynamic-route spec-authoring task (this agent)
**Scope:** frontend Next.js dynamic (`[id]`/`[slug]`/`[token]`/`[quizId]`) routes with zero spec
coverage, per `qa-reports/verification-2026-09-24/route-coverage.md`.

## Headline correction

The brief cited "46 dynamic routes with no spec at all." The actual count, verified by
diffing `find frontend/app -name page.tsx | grep '\['` (40 files) against
`frontend/e2e/generated/routes.json` (250 entries, **0** containing `[`), is **40**, not 46.
`route-coverage.md`'s own "290 total routes" figure matches `find … | wc -l` exactly, so the
40 dynamic pages plus the 250 static entries in `routes.json` account for all 290 — there is no
missing category of route beyond these 40. Reporting the true number rather than repeating the
brief's estimate.

## Full list of the 40 uncovered dynamic routes

None of these appear in `e2e/generated/routes.json`, so `route-smoke.spec.ts` never visits them.

| # | Route |
|---|---|
| 1 | `/calendar/[id]` |
| 2 | `/contracts/[id]` |
| 3 | `/employees/[id]` |
| 4 | `/employees/[id]/compensation` |
| 5 | `/employees/[id]/edit` |
| 6 | `/exit-interview/[token]` |
| 7 | `/expenses/[id]` |
| 8 | `/fluence/blogs/[slug]` |
| 9 | `/fluence/blogs/[slug]/edit` |
| 10 | `/fluence/templates/[id]` |
| 11 | `/fluence/wiki/[slug]` |
| 12 | `/fluence/wiki/[slug]/edit` |
| 13 | `/helpdesk/tickets/[id]` |
| 14 | `/learning/courses/[id]` |
| 15 | `/learning/courses/[id]/play` |
| 16 | `/learning/courses/[id]/quiz/[quizId]` |
| 17 | `/learning/paths/[id]` |
| 18 | `/loans/[id]` |
| 19 | `/offboarding/[id]` |
| 20 | `/offboarding/[id]/exit-interview` |
| 21 | `/offboarding/[id]/fnf` |
| 22 | `/onboarding/[id]` |
| 23 | `/onboarding/templates/[id]` |
| 24 | `/payroll/runs/[id]` |
| 25 | `/performance/cycles/[id]/calibration` |
| 26 | `/performance/cycles/[id]/nine-box` |
| 27 | `/preboarding/portal/[token]` |
| 28 | `/projects/[id]` |
| 29 | `/recruitment/agencies/[id]` |
| 30 | `/recruitment/candidates/[id]` |
| 31 | `/recruitment/candidates/[id]/offer` |
| 32 | `/sign/[token]` |
| 33 | `/surveys/[id]` |
| 34 | `/surveys/[id]/analytics` |
| 35 | `/surveys/[id]/respond` |
| 36 | `/time-tracking/[id]` |
| 37 | `/time-tracking/[id]/edit` |
| 38 | `/training/catalog/[id]` |
| 39 | `/travel/[id]` |
| 40 | `/workflows/[id]` |

Note: `frontend/e2e/employee.spec.ts:194` and a few other existing specs do reach
`/employees/{id}` incidentally (via UI navigation from the list page) but only assert
`page.url()` contains `/employees/` — the weak-evidence pattern this exercise exists to
eliminate. They provide no direct, assertion-on-real-data coverage of the route.

## Top 10 chosen (ranked, with justification)

1. **`/employees/[id]`** — CRITICAL per route-coverage.md; core HR record, referenced from
   nearly every other module. Highest-value gap in the whole 290-route inventory.
2. **`/payroll/runs/[id]`** — payroll is sensitive/high-scrutiny; a broken run-detail page
   blocks HR from viewing what was actually processed.
3. **`/recruitment/candidates/[id]`** — Hire's core record; every recruitment workflow step
   (screening, interview, offer) hangs off this page.
4. **`/learning/courses/[id]`** — Grow's core record; course catalog is the entry point to
   all LMS engagement.
5. **`/fluence/wiki/[slug]`** — Fluence's primary content type; knowledge base is unusable if
   individual pages don't render.
6. **`/fluence/blogs/[slug]`** — Fluence's second content type; same class of risk as wiki.
7. **`/projects/[id]`** — PSA/resource-management core record (per the Keka-parity audit
   memory, this graph — employee↔team↔project↔allocation↔timesheet↔billing — is a known
   fragile area).
8. **`/onboarding/[id]`** — new-hire lifecycle; broken detail page blocks Day-1 HR ops.
9. **`/offboarding/[id]`** — exit lifecycle; same class of risk, financial/compliance
   adjacent (FnF, exit interview sub-routes hang off this id).
10. **`/surveys/[id]`** — engagement/pulse surveys; lower blast radius than 1-9 but rounds out
    the set and exercises yet another id-resolution path (Page<T> with a `title` field).

Deliberately excluded from top-10 despite being reachable: routes whose parent module has no
seed data or list endpoint I could resolve safely within scope (`contracts`, `loans`,
`expenses`, `travel`, `time-tracking`, `helpdesk/tickets`, `calendar`, `workflows`,
`recruitment/agencies`, `training/catalog`, `learning/paths`, edit/sub-action variants, and the
three `[token]` magic-link routes `exit-interview`, `preboarding/portal`, `sign` — tokens are
single-use/expiring by design and unsuited to a repeatable smoke assertion).

## Specs written

**File:** `frontend/e2e/dynamic-route-detail.spec.ts` (owned by this task)

10 tests, one per route above, inside `test.describe('@dynamic-route detail pages')`. Runs
under the existing `chromium`/`firefox` Playwright projects (SUPER_ADMIN `storageState` from
`e2e/auth.setup.ts`) — no new project or login flow needed.

### How each test resolves its id

| Route | Resolution | Source |
|---|---|---|
| `/employees/[id]` | Hardcoded Flyway seed id `48000000-e001-0000-0000-000000000001` (Sumit Kumar, `EMP-0002`, Engineering Manager) | `backend/.../V49__org_chart_demo_data.sql`, cross-checked against `frontend/e2e/fixtures/testData.ts`'s org-chart comment (matches exactly) |
| `/projects/[id]` | Hardcoded Flyway seed id `48000000-0e03-0000-0000-000000000001` ("NU-AURA Platform V2.0") | `backend/.../V76__seed_projects_allocations.sql` |
| `/payroll/runs/[id]` | Runtime API lookup: `GET /api/v1/payroll/runs?size=1`, first `content[0].id` | No Flyway seed exists for payroll runs — runs are created by the payroll process, not seed data |
| `/recruitment/candidates/[id]` | Runtime API lookup: `GET /api/v1/recruitment/candidates?size=1` | No Flyway seed for candidates |
| `/learning/courses/[id]` | Runtime API lookup: `GET /api/v1/lms/courses?size=1` | No Flyway seed for courses |
| `/fluence/wiki/[slug]` | Runtime API lookup: `GET /api/v1/knowledge/wiki/pages?size=1` (route param is named `[slug]` but the page component reads it as the page id — confirmed in `app/fluence/wiki/[slug]/page.tsx:425`) | No Flyway seed for wiki pages |
| `/fluence/blogs/[slug]` | Runtime API lookup: `GET /api/v1/knowledge/blogs?size=1` (same slug-is-actually-id situation, confirmed at `app/fluence/blogs/[slug]/page.tsx:80`) | No Flyway seed for blog posts |
| `/onboarding/[id]` | Runtime API lookup: `GET /api/v1/onboarding/processes?size=1` | No Flyway seed for onboarding processes |
| `/offboarding/[id]` | Runtime API lookup: `GET /api/v1/offboarding?size=1` | No Flyway seed for offboarding processes |
| `/surveys/[id]` | Runtime API lookup: `GET /api/v1/surveys?size=1` | No Flyway seed for surveys |

Per the brief's preference order, (a) Flyway seed was used for the 2 routes where a stable seed
exists; (b) an authenticated API list lookup (via `page.request`, sharing the browser session's
cookies, routed through the same `/api/v1/*` Next.js rewrite the app itself uses) was used for
the other 8, where no seed exists. Nothing is created by the test — avoids the order-dependency
that broke `PayrollE2ETest` per prior audit notes. Each of the 8 lookup tests calls
`test.skip(!record, '<reason>')` and stops cleanly if the environment's list is empty; the
assertion itself is never made conditional — a skip means "no data to test against," never "the
assertion silently didn't check."

### What each assertion actually checks

Every test asserts a field that came back from the API for *that specific record* is visible on
the rendered detail page — not an HTTP 200, not "body is not empty":

- Employee: the seeded first name (`Sumit`) and employee code (`EMP-0002`) both render.
- Project: the seeded project name (`NU-AURA Platform V2.0`) renders.
- Payroll run: the fetched run's `status` enum value (e.g. `DRAFT`/`APPROVED`) renders.
- Candidate: the fetched candidate's `fullName` renders.
- Course: the fetched course's `title` renders.
- Wiki page / blog post: the fetched record's `title` renders.
- Onboarding / offboarding process: the fetched record's `employeeName` renders.
- Survey: the fetched survey's `title` renders.

## Execution results

**Not executed against a live browser this session.** Honest fallback per the brief:

```
$ npx playwright test --list e2e/dynamic-route-detail.spec.ts
Total: 21 tests in 2 files   (10 tests × {chromium, firefox} + the shared `setup` project)
```

All 10 tests parse, are collected under both projects, and produce zero list errors. `npx tsc
--noEmit -p .` also passes clean for this file — no type errors.

**Why not executed further:** the shared local environment already had multiple concurrent
agent-owned processes at task time — `docker ps` showed live throwaway Postgres containers
(`nuaura-p0-pg`, `v316-throwaway-pg`) and a `dev`-profile Spring Boot backend on port 8082 that
was mid-boot (health `DOWN` on the `mail` component, actively serving traffic) — plus the
persistent `hrms-frontend` Docker container on :3000, whose backend (`backend:8080` on the
Compose network) is not currently running. Port 8080 on the host is confirmed unrelated
(Shopware/dockware, per the brief's own warning). None of these was a safe, isolated stack this
task could claim without either colliding with a teammate agent's in-flight state or getting a
misleading pass/fail tied to someone else's transient data. Standing up a fresh isolated stack
(the `.github/workflows/e2e.yml` recipe: build the backend jar, migrate a throwaway Postgres,
boot on a free port, `npm ci && npm run build`) was judged out of scope for this task's budget
given other named agents in this session (`v-e2e`, `q-e2e`, `a-e2efix`) are already working
execution/infrastructure for the same verification effort — duplicating that work risked wasted
effort and port/container collisions rather than adding signal.

**Recommendation:** once any teammate agent's isolated e2e stack (backend + seeded Postgres +
frontend, matching the `NEXT_PUBLIC_API_URL`/`BACKEND_ORIGIN` pair) is confirmed up and free to
use, run:

```
npx playwright test e2e/dynamic-route-detail.spec.ts --project=chromium
```

and report real pass/fail here. The 2 Flyway-seed-based tests (employee, project) should pass
against any environment that has run the full migration chain with demo data enabled; the 8
API-lookup tests will pass if the corresponding module has at least one record and will
`skip` (not fail) cleanly otherwise.

## Boundaries respected

- No application source modified.
- No existing test weakened.
- Nothing committed.
- `faylo-sdlc/` untouched.
- No production/prod-pointing config touched; the 8080 Shopware container and the 8082
  dev-profile backend (owned by another agent this session) were inspected read-only via
  health-check curls and left running exactly as found.
