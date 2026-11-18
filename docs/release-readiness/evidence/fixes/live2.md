# Live re-check 2 (2026-11-18, local FE :3000 dev + BE :8080 V350, commit 818a7405)

Scripts (new, under `evidence/scripts/e2e/`): `live2-checks.mjs`, `live2-v350b.mjs`, `live2-v350c.mjs`, `live2-q010b.mjs`, `live2-p1-sweep.mjs` (copy of p1 with new output paths), `live2-helpers.mjs` (copy of ui-helpers; whoAmI fetch uses `http://backend:8080` because CSP `connect-src` now blocks `http://localhost:8080`; networkidle wait cut to 5 s). Screenshots: `evidence/screenshots/live2-*.png`. No code changed, nothing committed.

## Item results

| Item | Result | Evidence | Note |
|---|---|---|---|
| Q-027 dark mode, 6 pages @1440 + /admin/departments | PASS | screenshots/live2-dark-{dashboard,employees,recruitment,performance,fluence-wall,settings,departments}.png | `html.dark` set, body `rgb(17,17,19)`, 0 near-white surfaces on all 7 pages (old finding: /admin/departments, /admin/payroll, /leave/calendar). Cards are one step lighter than page, sidebar darker: layering is clear. Accent tint is intentional (green "All caught up" card, blue active nav). See minor notes below. |
| H-011 job save 400 shows message | PASS | screenshots/live2-h011.png | Red toast "Error: Invalid input: potentially malicious content in jobTitle". Dialog stays open (fine). Wording exposes the field name `jobTitle` (cosmetic). |
| H-012 duplicate candidate code shows message | PASS | screenshots/live2-h012.png | API 400; toast "Error: Candidate with code ... already exists". First create gave success toast. |
| H-021 onboarding "CREATE & CONFIGURE TASKS" @390 | PASS | screenshots/live2-h021-390.png | Navigates to `/onboarding/templates/<id>`. Button shows a spinner while the dev server compiles the next route (a first try with a 4 s wait looked like a failure; with a 45 s wait it navigates). |
| H-002 notifications container blocks taps @390 | PASS (1 open check) | script output in this file's notes | 11 Hire pages: 0 blocked elements, except `/onboarding` 1 of 3 probed controls covered (what covers it was not identified; likely the fixed bottom nav or the dev "Rendering/Compiling" badge). See NEW-02. |
| Q-010 15-25 s spinner before error | PASS for /payroll only | screenshots/live2-q010-payroll-45s.png | With payroll APIs forced to 500: error state "Payroll data unavailable / Could not load payroll data" at 5 s, 0 spinners. /recruitment/candidates and /one-on-one not re-timed (first attempt was invalid: my mock also failed auth calls and logged the session out). |
| V350 manager /one-on-one participant picker | PASS | screenshots/live2-v350-mgr-1on1-dlg.png | Page and "Schedule Meeting" view load, 0 x 401/403, search box type-ahead raised no 403. Picker result list itself not visually confirmed (typed "a", no option row captured). |
| V350 manager /training courses/meetings | PASS | screenshots/live2-v350-mgr-catalog.png | `/training` and `/training/catalog` render ("Course Catalog", 3 courses), 0 x 403. |
| V350 hr sees certificates | PASS | screenshots/live2-v350-hr-cert.png | `/learning/certificates` renders ("My Certificates", filters), 0 x 403. Empty list (no certificates in data), so the grant is proven by absence of 403 only. |
| V350 offer template for demo tenant | PASS | SQL (read-only) | `letter_templates`: `OFFER_STANDARD` "Standard Offer Letter", category OFFER, active, 1 row for the demo tenant. |
| Route re-sweep (3 roles) | PARTIAL, see below | fixes/live2-p1.json, fixes/live2-p1.md | Re-ran the 47 routes that failed before, not all 249 (reason below). |

## Route sweep: before vs after (47 previously failing routes, desktop + mobile = 94 loads per role)

Before = `p1-route-sweep.json` (commit c0e2db9a). After = `fixes/live2-p1.json` (818a7405 + V350).

| Role | Failing routes before | after | Failing loads before | after | gate-missing before / after | session-lost before / after |
|---|---|---|---|---|---|---|
| hradmin | 25 | 10 | 43 | 19 | 4 / 0 | 2 / 0 |
| manager | 31 | 13 | 54 | 26 | 4 / 0 | 2 / 0 |
| employee | 39 | 21 | 69 | 42 | 5 / 0 | 2 / 0 |
| total | 95 | 44 | 166 | 87 | 13 / 0 | 6 / 0 |

Failure classes in those loads (before -> after): authz 4xx 162 -> 92, console errors 118 -> 79, not-found 16 -> 6, "no heading" (blank-ish) 52 -> 8, spinner after 10 s 4 -> 4, horizontal overflow 0 -> 0, 5xx 0 -> 0, failed requests 7 -> 0.

Still failing in all 3 roles: `/benefits` (404 flex allocation, plus 403 dashboard for employee), `/tasks` (403 `/pm/tasks/assignee/...`), `/letters/templates` (403), `/settings/sso` (429 only, a rate-limit artifact of 3 parallel roles), `/fluence/analytics` (403 templates for mgr/emp; hydration error for hr). Also failing for hradmin: `/admin/roles`, `/settings/rbac` (403 `GET /api/v1/permissions?size=500`), `/letters` (403), `/reports/attrition` (403). Full list per role in `fixes/live2-p1.md`.

Why partial: the dev server compiles each route on first hit (30-100 s) and every page also never reaches network idle, so a full 249 x 2 x 3 sweep would take about 4 hours. Routes that passed before were not re-run; a regression there would not be seen.

## New defects (register style)

- **NEW-01** | Low | `/fluence/analytics` as HR admin: React hydration error "`<div>` cannot be a descendant of `<p>`" in `ActivityCard`. Repro: open `/fluence/analytics` as admin@nulogic.io, read the console. Was not flagged in the earlier sweep (data-dependent). File hint: the ActivityCard component under `frontend/components/fluence`.
- **NEW-02** | Low | 390px `/onboarding`: 1 of 3 probed top controls is covered by another element (H-002 style, far smaller than before). Repro: HR at 390x844, open `/onboarding`, `elementFromPoint` at the center of the 3 main buttons. Needs a look at what overlays (bottom nav, toast host).
- **NEW-03** | Low | Rate limit 429 on `/settings/sso` and `/settings/security` appears whenever the 3 roles load these pages in the same minute (limit 5/min/IP on auth-like routes?). Counted as sweep noise, but real users behind one IP (office NAT) could hit it. Repro: parallel loads of `/settings/sso`.
- **NEW-04** | Low | Dark mode accent inconsistency: the primary button "Add Employee" on `/employees` is a pale washed blue while "Clock In" and "Post" use saturated blue (`screenshots/live2-dark-employees.png` vs `live2-dark-dashboard.png`). Likely two different button variants or a disabled-looking style.
- Env note, not a defect: the FE tries `ws://backend:8080/ws/...` and fails with ERR_NAME_NOT_RESOLVED in the harness (host rewrite covers HTTP only), so pages never reach network idle; the browser console shows this error on every page.

## Minor dark-mode notes (Q-027)

- Wall (`/fluence/wall`) content starts about 24 px further right than other pages (title at x=420 vs 352): layout padding differs.
- `/settings` dark page is correct but sparse (two cards, large empty area).
