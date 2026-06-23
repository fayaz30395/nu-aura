# NU-AURA — Autonomous 8-Hour UI E2E Runbook (Goal · Loop · Executive Workflow)

**Purpose:** A self-paced, autonomous Chrome-driven loop that, for ~8 hours straight, **tests →
fixes → deploys → re-confirms** the NU-AURA UI: it attempts **100% coverage of login/RBAC paths,
sub-app features, alignment/responsive/a11y surfaces, and end-to-end flows (including approvals)**,
then **fixes real UI/alignment/detail defects in parallel, deploys to Vercel (FE) / Railway (BE),
and re-verifies the fix live in Chrome** — with **zero hallucination** (every finding cited by
screenshot + URL + reproducible steps) and **zero destructive action on real shared data**.

> **Code review:** all code fixes are committed to `main` expecting an **external Codex review pass**
> (write clean, minimal, self-explanatory diffs). Codex is the reviewer — do not self-merge sweeping
> refactors; keep each fix small, scoped, and independently revertable so Codex can review it cleanly.

> **MCPs available:** use them when they help — `mcp__ruflo__browser_*` (Chrome automation),
> `mcp__plugin_vercel_vercel__*` (deploy/logs/inspect FE), `mcp__railway__*` (BE deploy/logs/health),
> plus the Vercel/Railway CLIs via Bash. Prefer the browser MCP for the visual loop.

This file has two halves:
1. **The spec** (goal, safety, environment, loop mechanics, executive phases) — read once.
2. **THE PROMPT** (copy-paste block at the bottom) — paste into a fresh session to start the run.

---

## 1. North-Star Goal

> Produce an evidence-backed verdict on whether the NU-AURA UI is correct, aligned, accessible, and
> functionally complete across all roles and all four sub-apps — by driving a real Chrome browser as
> real users, citing a screenshot + URL + steps for **every** claim, fixing only **real** issues with
> minimal diffs, and never over-engineering or inventing problems.

**Definition of done (the score):** a single `VERDICT.md` with a 0–100 readiness score, a coverage
matrix showing every `role × module × flow` cell as PASS / FAIL / BLOCKED / SKIPPED / TODO /
UNTESTED, and a triaged
findings list (CRITICAL/HIGH/MEDIUM/LOW) — each finding reproducible from its evidence.

**Success criteria**
- Attempt 100% seeded demo-role login and route allow/deny coverage (no privilege escalation).
- Attempt 100% route-map-backed nav coverage per sub-app and render-verify visited cells (no blank/error pages).
- All four breakpoints (320 / 768 / 1024 / 1440) screenshotted for the key surfaces; no overflow/clipping.
- Automated a11y pass (axe) on every distinct page template; keyboard + focus-order spot-checks.
- The core flows + at least one **approval** flow driven to completion with state transition verified.
- Every finding has: screenshot path, exact URL, role, repro steps, expected vs actual, severity.
- Any unvisited cells remain `TODO`/`UNTESTED` with reason and must never be marked `PASS`.

---

## 2. HARD SAFETY RULES (read before anything — these override speed)

These encode the project's standing charter. **Violating any one invalidates the whole run.**

1. **READ-ONLY on shared DATA; WRITE allowed for CODE.** Two different axes — keep them straight:
   - **Data (the running app):** browse/navigate/screenshot/read freely. **Do NOT click Save /
     Submit / Approve / Delete / Pay / Send** on production data unless it's on a **disposable demo
     record you just created in the demo tenant** during Phase 4 (the only write-path-testing phase).
   - **Code (the repo) + deploys:** this IS the sanctioned write path. Editing source to fix real
     defects, committing to `main`, and deploying to Vercel/Railway is the whole point. Keep diffs
     minimal and Codex-reviewable; gate locally before every deploy.
2. **Never act as the real owner.** `fayaz.m@nulogic.io`, `sarankarthick.maran@nulogic.io`, and the
   user's default Chrome profile may hold a live **SUPER_ADMIN PROD** session. Drive **only a clean
   incognito window** logged in as a **demo** account. If true incognito is unavailable, clear cookies,
   `localStorage`, and `sessionStorage`, then verify no prior identity remains before login. **Verify
   the tab URL + logged-in identity before every state-changing action.** If you ever see a real
   SUPER_ADMIN/owner session, STOP.
3. **Demo accounts only** (all `Welcome@123`, demo-gated, fail-closed). Never create real users,
   never touch real PII, never rotate/expose secrets, never commit credentials.
4. **No hallucination.** If you did not see it on screen, it did not happen. Every PASS/FAIL cites a
   screenshot file + URL + steps. "Looks fine" without a screenshot is not a result. If a page is
   gated/blocked, that is a **BLOCKED** cell with the 403/redirect evidence — not a guess.
5. **No over-engineering.** Fix only reproduced, real defects with the **smallest** correct diff.
   A pre-existing intentional RBAC 403 that is gracefully handled is **not a bug** — record it as
   expected behavior. Do not refactor, redesign, or "improve" beyond the defect.
6. **Stay on `main`. No feature branches.** Remove any stale `git index.lock` (`rm -f`) if a
   multi-agent step left one. Frontend dev = port 3000, backend = port 8080 (fixed).
7. **Auth surface reality:** authenticated testing requires **HTTPS** (backend sets `Secure` +
   `__Host-` cookies that the browser drops over plain `http://localhost`). Use the **live Vercel
   HTTPS frontend** for login-gated work; use local `:3000` only for static/visual checks that don't
   need a session.
8. **Unattended autonomy:** the operator may start this and leave. Do not wait for human approval
   between phases, code edits, local gates, commits, Vercel/Railway deploys, or live re-checks when
   the action is inside this runbook's safety limits. Proceed with the safest allowed action and keep
   journaling evidence.
9. **Stop conditions (halt + report, don't push through):** demo logins disabled (login ≠ 200);
   backend health ≠ UP; browser MCP disconnects; you find yourself on a real prod owner session;
   any irreversible action would be required to proceed.
   If the run stops early, still write `VERDICT.md` with partial coverage, stop reason, current
   findings, and the next recommended action.

---

## 3. Environment & Credentials (grounded — verified from repo seeds + auth-inventory)

| Surface | URL |
|---|---|
| **Live frontend (USE for auth)** | `https://hrms-frontend-vert.vercel.app` |
| **Live backend** | `https://nu-aura-backend-production.up.railway.app` (health: `/actuator/health` → UP) |
| Local frontend (static/visual only) | `http://localhost:3000` |
| Local backend | `http://localhost:8080` |

**Login (UI):** navigate to the live frontend → redirects to `/login` → enter email + `Welcome@123`
→ submit → lands on role-appropriate dashboard. **Always use a fresh incognito window per role.**

**Seeded demo accounts (all `Welcome@123`)** — enumerate live; do not assume a role exists until
login succeeds and you read the actual landing + nav. Source: `V265` role seeds + `auth-inventory.md`.

| Account | Seeded role(s) | Use for |
|---|---|---|
| `arun@nulogic.io` | `EMPLOYEE` (pure low-priv) | **canonical employee baseline** |
| `anshuman@nulogic.io` | `EMPLOYEE` | backup employee |
| `saran@nulogic.io` | `EMPLOYEE` (+`HR_ADMIN` per auth-inv) | HR admin surfaces |
| `raj@nulogic.io` | `EMPLOYEE` (+`FINANCE_ADMIN` per auth-inv) | finance surfaces |
| `sumit@nulogic.io` | `MANAGER` | manager dashboard + **approvals** |
| `mani@`, `gokul@`, `dhanush@nulogic.io` | `TEAM_LEAD` | team-lead scope |
| `jagadeesh@nulogic.io` | `HR_MANAGER` | HR ops |
| `suresh@nulogic.io` | `RECRUITMENT_ADMIN` | NU-Hire admin |
| `finance@nulogic.io` | `FINANCE_ADMIN` (demo-gated) | payroll/finance |
| `tenant.admin@nulogic.io` | `TENANT_ADMIN` | tenant administration |
| `admin@nulogic.io` | (admin — verify on login) | broad admin |
| `fayaz.m@`, `sarankarthick.maran@nulogic.io` | `SUPER_ADMIN` | **DO NOT USE on prod** (owner) |

**Full role catalog seeded in DB** (for the RBAC matrix; verify each by login, don't assume):
`SUPER_ADMIN, TENANT_ADMIN, HR_ADMIN, HR_MANAGER, FINANCE_ADMIN, FINANCE_MANAGER, PAYROLL_ADMIN,
RECRUITMENT_ADMIN, IT_ADMIN, MANAGER, REPORTING_MANAGER, TEAM_LEAD, EMPLOYEE`.

**Four sub-apps to cover:** NU-HRMS (core HR), NU-Hire (recruitment/agencies/scorecards/onboarding),
NU-Grow (reviews/OKRs/360/LMS/surveys/wellness), NU-Fluence (wiki/blogs/templates/search/AI chat/wall).

**Browser tooling:** prefer the connected Chrome MCP (`browser_open`, `browser_click`, `browser_fill`,
`browser_press`, `browser_screenshot`, `browser_snapshot`, `browser_get-url`, `browser_get-text`,
`browser_eval`, `browser_scroll`, `browser_wait`). Use `browser_get-url` to satisfy Rule 2 before any
action. If the Chrome extension is the connection, the same verify-before-act discipline applies.

**Preflight gate before Phase 0 (do not skip):**
- Read the local control docs first: `AGENTS.md`, `CLAUDE.md`, `MEMORY.md`,
  `tools/PROCESS-RULES.md`, `tools/CONSTRAINT.md`, and `tools/MERMAID.md`.
- Read the QA and coverage truth sources for this run: `docs/obsidian/00-Home.md`,
  `docs/obsidian/09-Testing/QA-Strategy.md`, `docs/obsidian/09-Testing/Test-Coverage.md`,
  `docs/obsidian/03-Frontend/Route-Map-Full.md`, `docs/obsidian/05-RBAC/`, and
  `docs/obsidian/08-Security/Security-Audit.md`. For auth/RBAC fixes, also read
  `docs/obsidian/11-Decisions/ADR-005.md`; for code fixes, read
  `docs/obsidian/01-Architecture/Code-Patterns.md` and the relevant module note.
- Run RuFlo routing/memory preflight when available:
  `npx ruflo@latest memory search --query "autonomous UI E2E Playwright RBAC QA" --namespace patterns`
  and `npx ruflo@latest hooks route --task "autonomous UI E2E run"`.
- Confirm repo state before edits: `git branch --show-current`, `git status --short`, and read any
  touched-file diffs before modifying. Do not overwrite unrelated user/agent work. If new commits were
  pulled before the run, execute `./scripts/ruflo-sync.sh`.
- Build the initial coverage matrix from `Route-Map-Full`, RBAC roles/permissions, and
  `frontend/e2e/` specs first; then reconcile it against live nav. Visible nav alone is not the source
  of truth because hidden/deep-linked protected routes are part of the RBAC proof.

---

## 4. The Autonomous Loop (how it runs 8 hours without supervision)

**Cadence:** self-paced dynamic loop. Each iteration completes **one coverage cell** end-to-end
(login if role-switch needed → navigate → verify → screenshot → record), then picks the next-highest-
value uncovered cell. No fixed sleep — go as fast as the browser allows; the only clock is the
8-hour wall budget.

**State files (the loop's memory — create under `docs/qa/ui-e2e-run-<date>/`):**
- `USE-CASES.md` — **the tested-use-case ledger (the reference document).** One row per concrete use
  case with a stable ID (`UC-<area>-NNN`), title, role, sub-app/module, preconditions, steps,
  expected result, actual result, status, evidence link, and (if fixed) commit SHA, deploy id,
  previous deploy id, and revert command.
  This is the durable catalog the user references — keep it complete and current as the run proceeds.
- `COVERAGE.md` — the live matrix: every `role × module × flow` cell with status
  `TODO / PASS / FAIL / BLOCKED / SKIPPED / UNTESTED` + link to the relevant `UC-*` rows. Source of truth for "what's left."
  Attempt 100% coverage. Any unvisited cells remain `TODO`/`UNTESTED` with reason and must never be marked `PASS`.
- `FINDINGS.md` — append-only; one row per defect with severity + full evidence + fix status
  (`OPEN / FIXED ✓ (deployed+verified)`), linked to its `UC-*` id (never overwrite).
- `SCREENS/` — screenshots, named `<role>__<module>__<state>__<breakpoint>.png` (`__before`/`__after` for fixes).
- `PROGRESS.md` — one line per iteration: timestamp, cell/UC done, result, % coverage, time elapsed.

**Iteration protocol (repeat until a stop condition):**
1. Read `COVERAGE.md`; pick the highest-priority `TODO` cell (priority order = Phase order in §5).
2. Ensure the correct role session (reuse if same role as last cell; else fresh incognito + login;
   if true incognito is unavailable, clear cookies/storage and verify no prior identity remains).
3. `browser_get-url` → confirm you're on the intended host + identity (Rule 2). 
4. Execute the cell's checks (§5). Screenshot every meaningful state.
5. Write result to `COVERAGE.md`; append any defects to `FINDINGS.md`; append a `PROGRESS.md` line.
6. **Time check:** if elapsed ≥ 7h30m → jump to Phase 6 (synthesis) regardless of remaining cells.
7. **Dry check:** if 2 consecutive full matrix passes surface no new findings AND coverage = 100%,
   escalate depth once (edge cases / negative inputs / concurrent-tab), then go to Phase 6.

**Time budget (8h wall) — testing and fixing run concurrently, not as separate halves:**

| Window | Phase | Focus |
|---|---|---|
| 0:00–0:30 | Phase 0 | Preflight + health + login smoke + matrix scaffold |
| 0:30–1:25 | Phase 1 | Auth & RBAC matrix (all roles) — queue fixes as found |
| 1:25–4:30 | Phase 2 | Per-sub-app feature sweep + **UI detail/alignment polish** — fix·deploy·reconfirm inline |
| 4:30–5:45 | Phase 3 | Responsive (320/768/1024/1440) + a11y audit — fix·deploy·reconfirm inline |
| 5:45–6:45 | Phase 4 | E2E flows + **approvals** (write-path, demo records only) |
| 6:45–7:30 | Phase 5 | Drain fix queue: final batch fix → deploy → **re-confirm every fix live** |
| 7:30–8:00 | Phase 6 | Synthesis: VERDICT.md + score; confirm Vercel+Railway green; Codex-ready diffs |

**The fix·deploy·reconfirm inner loop (runs throughout Phases 2–5, in parallel with testing):**
1. Reproduce the defect in Chrome; screenshot `__before`.
2. Locate the source (use the graphify code-RAG / Grep), apply the **smallest correct diff**. UI-detail
   fixes (alignment, spacing, overflow, contrast, broken empty/error state, misrendered component)
   are in-scope; respect the FROZEN RBAC spine and compact desktop-first sizing (36px buttons,
   `text-xs` labels, `w-8` icons). No refactors, no redesigns, no scope creep.
3. If a fix touches RBAC/auth/security/API contracts or takes more than 15 minutes, leave it `OPEN`
   with evidence unless the root cause is fully understood, locally gated, and safely re-testable.
4. Gate locally from `frontend/`: `npm run lint` + `npx tsc --noEmit` + `npm run build` must pass
   before deploy. For visual/styling fixes, also run `npm run lint:design-system`.
5. Commit to `main` with a clear conventional-commit message (Codex will review the diff).
6. Deploy CRITICAL/HIGH fixes immediately after local gates: FE fixes to Vercel (`vercel --prod` or
   the Vercel MCP), and Railway only if BE changed. Batch MEDIUM/LOW UI polish fixes into Phase 5
   unless they block further testing. Wait for the deploy to go READY.
7. **Re-confirm live in Chrome** on the deployed URL; screenshot `__after`. If still broken, revert
   or iterate — never leave a half-fix on `main`. For every deployed fix, record the rollback path:
   commit SHA, previous deploy id, and revert command if needed. Mark the finding
   `FIXED ✓ (deployed+verified)`.

**Self-scheduling (CONTINUOUS — do not slow down, do not idle):** drive the loop continuously. Do as
much work as possible *within* each turn (multiple coverage cells back-to-back — never end a turn after
a single cell while uncovered cells remain). When you must re-arm via the `/loop` skill, use the
**minimum possible delay** so the next iteration fires immediately. The `ScheduleWakeup` tool clamps
`delaySeconds` to a **60-second floor** (10s is not achievable between turns), so re-arm at **60s** —
never longer, never "back off for diminishing returns." Do not pause, sleep, or wait for approval
between iterations; keep going until a STOP condition (§2.9) is hit or coverage is genuinely exhausted.
Keep journaling evidence so a mid-run compaction can resume from `COVERAGE.md`.

---

## 5. Executive Workflow (the six phases — concrete checks per cell)

### Phase 0 — Setup & smoke (0:00–0:30)
- Complete the preflight gate in §3 and record any missing source as `BLOCKED` evidence, not an assumption.
- Backend health = UP; live frontend loads `/login`. If either fails → STOP condition #8.
- Log in as `arun@nulogic.io`; confirm dashboard renders + cookies set. Log out.
- Scaffold `COVERAGE.md` with rows = (each seeded role) × (route-map-backed sub-app/module) × flow,
  linking each cell to one or more `UC-*` rows.

### Phase 1 — Auth & RBAC matrix (0:30–1:25)
For **each** demo role:
- Login succeeds; landing page matches role; nav shows only role-permitted entries.
- **Allowed routes** render with data (not 403/blank). **Denied routes** (deep-link a higher-priv URL,
  e.g. employee → `/admin/*`, `/payroll/*`, operator `/dashboard` gated by `DASHBOARD_VIEW`) must
  fail-closed: 403 page / redirect / `?denied=1`, never leak data. Screenshot both allow + deny.
- **No privilege escalation:** lower roles cannot reach higher-role surfaces by URL, refresh, or
  back-button. Record each as a matrix cell with evidence.
- Session integrity: refresh keeps you authed; logout clears; expired/again-login works.

### Phase 2 — Per-sub-app feature sweep (1:25–4:30)
Attempt **100%** route-map-backed reachable nav entries in all four sub-apps (HRMS, Hire, Grow,
Fluence) as the role(s) that can see them. Deep-link route-map entries that are not visible in nav to
prove expected allow/deny behavior. Any unvisited page/cell remains `TODO`/`UNTESTED` with reason and
must never be marked `PASS`. For each visited page:
- Renders without console errors / error boundary / infinite spinner.
- Primary data loads (list/table/cards populate) OR a proper **empty state** shows (not a blank div).
- Tabs, filters, search, pagination, sort, modals **open and respond** (read-only interactions).
- Detail pages open from list rows; breadcrumbs/back work.
- Record render + one interaction screenshot per distinct page template, plus console/network error
  notes for failed requests or browser exceptions.
- **UI-detail polish (the "UI is a little messed" mandate):** as you sweep, actively flag and fix
  visual detail defects — misaligned headers/cards, inconsistent spacing/padding, broken grid
  columns, overflow/clipping, cramped or oversized controls, wrong icon sizes, low-contrast text,
  truncation, ragged tables, modal/drawer misalignment, ugly empty/error states. Fix via the inner
  fix·deploy·reconfirm loop. Stay within the design system (Studio Slate tokens, compact desktop-first
  sizing); polish details, don't redesign surfaces.

### Phase 3 — Alignment / responsive / a11y (4:30–5:45)
On the key surfaces (each role's dashboard, a list page, a detail page, a form, a modal):
- Screenshot at **320 / 768 / 1024 / 1440**. Flag overflow, clipping, overlap, misalignment,
  broken grids, off-canvas content, unreadable contrast, inconsistent spacing/radius.
- Run **axe** (`browser_eval` injecting axe-core, or the a11y MCP) per distinct template; record
  violations with the failing selector.
- Keyboard: Tab order is logical, focus is visible, modals trap focus + close on Esc; primary CTA
  reachable without mouse. Spot-check `prefers-reduced-motion` if motion is present.

### Phase 4 — E2E flows + approvals (5:45–6:45) — WRITE-PATH, demo records only
Drive complete journeys, creating only **disposable demo records**, verifying the **state transition**:
- **Leave approval:** as an EMPLOYEE apply for leave → log in as the MANAGER (`sumit@`) → approve →
  verify status flips + notification delivered. (This flow is the canonical approval path.)
- **Employee CRUD** (if an admin demo role permits): create a throwaway employee → edit → verify →
  delete the same record you created. Never edit a pre-existing real employee.
- One flow per other sub-app where a safe demo write exists (e.g. Hire: move a demo candidate a
  stage; Grow: submit a demo self-review; Fluence: post to the wall + react). If no safe demo write
  exists, mark the flow **SKIPPED (no disposable record)** — do **not** touch real data.
- For each: screenshot before → action → after; cite the state change. On failure, capture the error.

### Phase 5 — Drain the fix queue (6:45–7:30)
- Apply remaining MEDIUM/LOW UI polish fixes in one batch only when they satisfy the fix safety rule
  above and do not require RBAC/auth/security/API-contract changes. CRITICAL/HIGH fixes should already
  have been deployed immediately after local gates. Leave RBAC/auth/security/API-contract or >15-minute
  fixes `OPEN` unless fully understood, gated, and safely re-testable. Gate locally, commit, and deploy
  only those safe fixes.
- **Re-confirm EVERY fix live** on the deployed Vercel/Railway URL with an `__after` screenshot.
  A fix is not done until it's deployed and visually re-verified. Never leave `main` half-fixed.

### Phase 6 — Synthesis (7:30–8:00)
- Confirm both deployments are green: latest Vercel deploy READY, Railway health UP, login still 200.
- Write `VERDICT.md`: 0–100 score, coverage % per phase, the full matrix summary, triaged findings
  with severity + evidence links (each FIXED item showing before/after + commit SHA + deploy id +
  previous deploy id + revert command), and a clear GO / CONDITIONAL-GO / NO-GO with blocking reasons.
  List the commits awaiting Codex review.
- If the run stopped early, `VERDICT.md` must still include partial coverage, stop reason, current
  findings, and the next recommended action.
- Update `MEMORY.md` (project memory) with a one-line pointer to the run + verdict.

**Severity rubric:** CRITICAL = data leak / privilege escalation / broken auth / data loss.
HIGH = a core flow or approval is broken, or a page errors for a permitted role. MEDIUM = wrong
empty/error state, broken filter/pagination, responsive break that hides content. LOW = spacing,
copy, minor contrast, polish.

**Score formula:** start at 100, then apply the strictest applicable cap and deductions. Any open
CRITICAL finding caps the score at 40. Any open HIGH finding caps the score at 70. Coverage below
80% caps the score at 75. Deduct 10 points for each untested critical RBAC/write-path cell, 5 points
for each open MEDIUM finding, and 1 point for each open LOW finding. Fixed+verified findings do not
reduce the score unless regression risk remains. Floor the final score at 0 and show the arithmetic
in `VERDICT.md`.

---

## 6. THE PROMPT (copy-paste to start the run)

> Paste the block below into a **fresh** session with the Chrome MCP connected. It is written to be
> self-driving for ~8 hours. (To use the loop skill instead, prefix with `/loop` and the same text.)

```
ROLE: You are an autonomous full-stack QA + fix engineer. For ~8 hours you drive a real Chrome
browser to TEST the live NU-AURA UI, FIX real defects in parallel, DEPLOY to Vercel (frontend) /
Railway (backend), and RE-CONFIRM each fix live. Follow docs/qa/AUTONOMOUS-UI-E2E-RUNBOOK.md EXACTLY.
Read it fully first, then run.

GOAL: Attempt 100% coverage of login/RBAC paths, features in all four sub-apps (NU-HRMS, NU-Hire,
NU-Grow, NU-Fluence), UI alignment at 320/768/1024/1440, a11y, and the E2E flows including approvals — AND
fix the real UI/alignment/detail defects you find (the UI is currently a little messed), deploy them,
and visually re-verify. Every claim MUST cite a screenshot + URL + repro steps. No hallucination.

HARD RULES (do not violate):
- READ-ONLY on shared DATA; WRITE is for CODE. Don't click Save/Submit/Approve/Delete on prod data
  except on a disposable demo record YOU created (Phase 4 only). BUT editing source, committing to
  main, and deploying to Vercel/Railway to fix defects IS the job — keep diffs minimal + Codex-reviewable.
- Drive a CLEAN INCOGNITO window as a DEMO account only (Welcome@123). If true incognito is
  unavailable, clear cookies/localStorage/sessionStorage and verify no prior identity remains before
  login. NEVER use owner accounts (fayaz.m@, sarankarthick.maran@) on prod. Call browser_get-url +
  confirm identity BEFORE any state-changing app action. If you land on a real SUPER_ADMIN/owner
  session, STOP.
- NO over-engineering: fix only reproduced real defects with the smallest correct diff; no refactors/
  redesigns. Respect the FROZEN RBAC spine (routes.ts/usePermissions/PermissionGate/AuthGuard) and the
  Studio Slate design system + compact desktop-first sizing (36px buttons, text-xs labels, w-8 icons).
- Stay on main, no feature branches; rm -f any stale git index.lock. Gate locally before EVERY deploy:
  cd frontend && npm run lint && npx tsc --noEmit && npm run build must pass. For visual fixes also
  run npm run lint:design-system.
- CODE REVIEW: Codex is the external reviewer. Commit small, scoped, self-explanatory conventional
  commits so each fix is independently reviewable + revertable. Do NOT self-merge sweeping changes.
- Auth needs HTTPS: log in at https://hrms-frontend-vert.vercel.app (local :3000 can't hold Secure
  cookies). BE health: https://nu-aura-backend-production.up.railway.app/actuator/health.
- MCPs allowed: mcp__ruflo__browser_* (Chrome), mcp__plugin_vercel_vercel__* (FE deploy/logs),
  mcp__railway__* (BE deploy/logs/health); Vercel/Railway CLIs via Bash also fine.
- UNATTENDED AUTONOMY: the operator may start this and leave. Do not ask for or wait on human
  approval between phases, code edits, local gates, commits, Vercel/Railway deploys, or live
  re-checks when the action is inside this runbook's safety limits. Proceed with the safest allowed
  action and keep journaling evidence.
- STOP + report if: demo login != 200, backend not UP, browser disconnects, a deploy can't be made
  green, or an irreversible action would be required. If the run stops early, still write VERDICT.md
  with partial coverage, stop reason, current findings, and next recommended action.

PREFLIGHT (do before Phase 0; do not skip):
- Read AGENTS.md, CLAUDE.md, MEMORY.md, tools/PROCESS-RULES.md, tools/CONSTRAINT.md, tools/MERMAID.md,
  docs/obsidian/00-Home.md, docs/obsidian/09-Testing/QA-Strategy.md,
  docs/obsidian/09-Testing/Test-Coverage.md, docs/obsidian/03-Frontend/Route-Map-Full.md,
  docs/obsidian/05-RBAC/, docs/obsidian/08-Security/Security-Audit.md, and
  docs/obsidian/11-Decisions/ADR-005.md for auth/RBAC fixes.
- For code fixes, read docs/obsidian/01-Architecture/Code-Patterns.md and the relevant module note first.
- Run RuFlo memory + route preflight if available:
  npx ruflo@latest memory search --query "autonomous UI E2E Playwright RBAC QA" --namespace patterns
  npx ruflo@latest hooks route --task "autonomous UI E2E run"
- Confirm git branch/status and read touched-file diffs before editing. Do not overwrite unrelated work.
  If new commits were pulled, run ./scripts/ruflo-sync.sh.
- Build COVERAGE.md from Route-Map-Full + RBAC roles/permissions + frontend/e2e specs, then reconcile
  with live nav. Visible nav alone is not enough because hidden/deep-linked routes are part of RBAC proof.

STATE FILES (create under docs/qa/ui-e2e-run-<today>/):
- USE-CASES.md = THE REFERENCE LEDGER. One row per use case: id UC-<area>-NNN, title, role, module,
  preconditions, steps, expected, actual, status (PASS/FAIL/BLOCKED/SKIPPED/TODO/UNTESTED/FIXED),
  evidence link, commit SHA + deploy id + previous deploy id + revert command if fixed. Keep it
  complete + current — this is the doc the user references.
- COVERAGE.md = role×module×flow matrix (TODO/PASS/FAIL/BLOCKED/SKIPPED/UNTESTED + linked UC ids).
  Attempt 100% coverage. Any unvisited cells remain TODO/UNTESTED with reason and must never be marked PASS.
- FINDINGS.md = append-only defects: severity + evidence + status (OPEN / FIXED ✓ deployed+verified) + UC id.
- SCREENS/ = <role>__<module>__<state>__<breakpoint>.png (__before/__after for fixes).
- PROGRESS.md = one line per iteration (timestamp, cell/UC, result, %coverage, elapsed).

ACCOUNTS (all Welcome@123; verify role by logging in, don't assume): arun@ (EMPLOYEE baseline),
anshuman@ (EMPLOYEE), saran@ (HR_ADMIN), raj@ (FINANCE_ADMIN), sumit@ (MANAGER — use for approvals),
mani@/gokul@/dhanush@ (TEAM_LEAD), jagadeesh@ (HR_MANAGER), suresh@ (RECRUITMENT_ADMIN), finance@
(FINANCE_ADMIN), tenant.admin@ (TENANT_ADMIN), admin@ (admin). NEVER fayaz.m@ / sarankarthick.maran@ on prod.

LOOP: Self-paced. Each iteration = one use case end-to-end (login if role changes → navigate → verify
→ screenshot → write the UC-* row + COVERAGE cell + any FINDINGS row + a PROGRESS line). Reuse the
session when the role is unchanged. Testing and fixing run CONCURRENTLY.

INNER FIX·DEPLOY·RECONFIRM LOOP (Phases 2–5, in parallel with testing):
reproduce + screenshot __before → locate source (graphify code-RAG / Grep) → smallest correct diff →
if RBAC/auth/security/API contract or >15m, leave OPEN with evidence unless root cause is fully
understood, locally gated, and safely re-testable →
cd frontend && npm run lint && npx tsc --noEmit && npm run build green (plus npm run
lint:design-system for visual fixes) → commit to main (Codex-reviewable) → deploy CRITICAL/HIGH
fixes immediately to Vercel for FE or Railway only if BE changed; batch MEDIUM/LOW UI polish fixes
into Phase 5 unless they block further testing → wait READY → re-open the deployed URL in Chrome →
screenshot __after → mark FINDINGS row FIXED ✓ +
record commit SHA, deploy id, previous deploy id, and revert command in USE-CASES.md. Never leave a
half-fix on main.

TIME BUDGET (8h wall):
- 0:00-0:30 Phase 0: preflight + health + login smoke + scaffold USE-CASES.md/COVERAGE.md.
- 0:30-1:25 Phase 1: Auth/RBAC for EVERY role — login lands correctly; allowed routes render with
  data; deep-linked higher-priv routes fail-closed (403/redirect, no data leak); no privilege
  escalation via URL/refresh/back. Screenshot allow AND deny. Queue any defects.
- 1:25-4:30 Phase 2: Attempt 100% route-map-backed reachable nav coverage in all 4 sub-apps as
  permitted roles, and deep-link hidden route-map entries to prove allow/deny. Unvisited cells remain
  TODO/UNTESTED with reason and must never be marked PASS. Verify render (no console
  error/error-boundary/infinite spinner), data load OR proper empty state, and that
  tabs/filters/search/pagination/sort/modals respond. Capture console/network errors. ACTIVELY fix
  UI-detail defects (misaligned headers/cards, bad spacing, broken grids, overflow/clipping, wrong
  control/icon sizes, low contrast, truncation, ragged tables, ugly empty/error states) via the inner
  loop. Stay in the design system.
- 4:30-5:45 Phase 3: Screenshot key surfaces at 320/768/1024/1440 — fix overflow/clipping/overlap/
  misalignment/contrast via the inner loop. Run axe per distinct template. Keyboard: logical Tab
  order, visible focus, modal focus-trap + Esc close.
- 5:45-6:45 Phase 4 (write-path, demo records ONLY): Leave approval (EMPLOYEE applies → sumit@ MANAGER
  approves → verify status flip + notification). Employee create→edit→delete of a throwaway record if
  an admin role permits. One safe demo flow per other sub-app, else SKIPPED (no disposable record).
  Screenshot before→action→after; cite the state change.
- 6:45-7:30 Phase 5: drain the fix queue — batch MEDIUM/LOW UI polish fixes unless they block further
  testing; CRITICAL/HIGH fixes should already be deployed immediately to Vercel for FE or Railway only
  if BE changed after local gates. Gate → commit → deploy → RE-CONFIRM EVERY fix live with an __after
  screenshot. A fix isn't done until deployed + visually re-verified.
- 7:30-8:00 Phase 6: confirm both deploys green (Vercel READY, Railway UP, login 200). Write
  VERDICT.md (0-100 score, coverage % per phase, matrix summary, triaged findings with before/after +
  commit SHA + deploy id + previous deploy id + revert command, list of commits awaiting Codex review,
  GO/CONDITIONAL-GO/NO-GO). If stopped early, include partial coverage, stop reason, current findings,
  and next recommended action. Pointer in MEMORY.md.

EXIT EARLY IF: elapsed >= 7:30 (jump to Phase 6), OR coverage = 100% AND fix queue empty AND 2
consecutive matrix passes find nothing new (escalate to edge/negative/concurrent-tab once, then Phase 6).

SEVERITY: CRITICAL=data leak/priv-escalation/broken auth/data loss; HIGH=core flow or approval broken,
or a permitted page errors; MEDIUM=wrong empty/error state, broken filter/pagination, content-hiding
responsive break; LOW=spacing/copy/contrast/polish.

SCORE FORMULA: Start at 100. Apply the strictest cap: any open CRITICAL caps at 40, any open HIGH
caps at 70, coverage below 80% caps at 75. Deduct 10 for each untested critical RBAC/write-path cell,
5 for each open MEDIUM, and 1 for each open LOW. Fixed+verified findings do not reduce score unless
regression risk remains. Floor at 0 and show the arithmetic in VERDICT.md.

START: read the runbook, run Phase 0, then loop for the full 8-hour budget. Report a short status
after each phase + after each deploy. Do not ask me questions or wait for approval unless a STOP
condition is hit — proceed with the safest default.
```

---

## 7. Operating notes
- Keep iterations small and journaled so a mid-run compaction or crash can resume from `COVERAGE.md`.
- If a write-path flow has no safe disposable record, **SKIP and say so** — a skipped cell with a
  reason is a valid, honest result; a fabricated PASS is not.
- Prefer the existing demo tenant's seed data; never invent users or mutate real employees.
- This runbook is environment-pinned to the live Vercel+Railway demo surface as of the seed/auth
  inventory cited above. If those URLs or demo-gating change, re-verify §3 before a run.
