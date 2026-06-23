# NU-AURA — Planned vs Built: Findings Report

**Date:** 2026-06-23
**Question:** "What is exactly done, and did we achieve what we planned to build?"
**Method:** grill-me assessment → codebase mapping (3 read-only agents) → live lint/tsc verification → fixes.
**HEAD at start:** `b8e3e569` · **Commits this session:** `1d996195`, `7d92f1e9` (pushed to both forks).

---

## 1. Calibration (the bar this report is measured against)

Two decisions set the yardstick (chosen by the product owner during the grill):

| Axis | Choice |
|------|--------|
| **Baseline** | **PRODUCT.md vision** — internal OS replacing KEKA; 4 sub-apps behind one login + one design language; Linear-not-Workday; WCAG 2.1 AA. (NOT the canonical React18/MUI stack, NOT raw KEKA parity.) |
| **Bar for "done"** | **Code-complete + deployable, where a real write-path must work (facades don't count), and design-language unity counts as part of done.** |

Stack divergence (Next 16/Mantine/Postgres vs canonical React 18/MUI/MySQL) is **out of scope** — PRODUCT.md does not mandate a stack.

---

## 2. Verdict

**Breadth achieved, depth + design-unity partial.**

The full *surface area* of the platform is built, and a *subset* of core write-paths is live-proven. What is **not** achieved at the strict bar: every flow proven correct end-to-end, and one consistent design language across all four sub-apps.

---

## 3. Planned vs Built (evidence-grounded)

Source: `PRODUCT.md`, `docs/obsidian/00-Home.md`, `docs/obsidian/02-Modules/*`, filesystem counts.

| Pillar | Planned | Built | Status |
|--------|---------|-------|--------|
| 4 sub-apps | HRMS, Hire, Grow, Fluence | All 4 render with real data, one login/shell | ✅ Breadth |
| Frontend pages | ~280–300 | 289 `page.tsx` | ✅ |
| Components | — | 182 | ✅ |
| Backend controllers | 180+ | 180 (1,711 endpoints) | ✅ |
| Services / entities | — | 240 services / 361 entities | ✅ |
| DB | — | 331 tables, Flyway V312 | ✅ |
| RBAC | 9–20 roles | 26 roles, ~1,750 `@RequiresPermission` across 173/180 controllers, RLS + tx-local GUC | ✅ Real (not facade) |
| Design system | Studio Slate + WCAG AA | Enforced (gate now functional — see §5) | ✅ 0 drift |
| Fluence wiki | Phase 2 | Built (Phase 1) | ✅ Accelerated |
| LinkedIn posts | Planned | **Stub** (`/api/v1/linkedin-posts` → empty) | ⚠️ Deferred |
| Test depth | 80% | BE ~0.19 line cov, FE ~60% | 🔴 Below bar |
| Real write-path proof | All flows | ~5 domains proven, ~12 unproven | 🟡 Partial |

---

## 4. Write-path proof — the biggest real gap (Arc A)

A page rendering ≠ its create/update/delete flow working. Status:

### Live-verified (5 domains)
auth/login · leave apply→approve→notify · employee CRUD · asset create/assign/return/delete · attendance clock-in.
Evidence: `qa-reports/CHROME_E2E_2026-06-19.md`, `qa-reports/PRODUCTION_READINESS_2026-06-17.md`.

### Unverified (~12 domains, ~650 mutating endpoints) — prioritized
- **HIGH:** Recruitment (job → candidate stage → interview → offer → e-sign) · Payroll (run → process → approve → lock) · Admin/RBAC writes · Attendance regularization + comp-off.
- **MED:** Expense (claim → approve → disburse) · Performance (cycle/OKR/360) · Compensation · Loan · Training/LMS · Leave encash/carry-forward.
- **LOW:** Fluence (wiki/blog/wall create) · Wellness · Org units · Webhooks · Exit/offboarding.

### Root finding: the e2e specs are facades
Specs exist for these domains but assert render-only with tautological escape hatches that **can never fail**:

```
e2e/payroll-run.spec.ts:73   expect(hasCreate || true).toBe(true)
```

They prove a page renders and a "Create" button exists — never click create→process→approve. This is the "facades, not production-correct" audit note (2026-06-09) confirmed at the test layer.
**Fix:** upgrade ~12 domain specs to real click-through assertions (remove `|| true`); run against the live demo backend. Browser/live-gated.

---

## 5. Design-language unity (Arc B) — and the lint-gate discovery

PRODUCT.md principle #5: "one design language; cross-bundle drift is a bug."

### 5.1 The FE lint gate was non-functional (FIXED — `1d996195`)
Every prior QA report called the "FE lint gate RED / 82 drift warnings." That was a **misdiagnosis**. Two unrelated bugs in `frontend/eslint.config.mjs`:

1. **ESLint crashed on startup.** Flat-config plugin namespaces do not cascade across config objects. `baseRules` (and 4 file-scoped overrides) referenced `jsx-a11y/`, `react-hooks/`, and `@typescript-eslint/` rules without registering those plugins in their own object → ESLint died (`could not find plugin jsx-a11y`, then `react-hooks`). The gate was a silent **no-op** — it linted nothing.
   - **Fix:** build `nextPlugins` by merging the `.plugins` maps from `eslint-config-next/core-web-vitals` + `/typescript` (reusing the instances Next already resolves, incl. its nested react-hooks) and set `plugins: nextPlugins` on the relevant objects.
2. **`.vercel/` build output not ignored.** Once running, ESLint scanned 1,295 minified bundles → 100 errors + 23,759 warnings (all at `line 1, col 7000+` = minified noise).
   - **Fix:** add `'.vercel/**'` to `ignores`.

### 5.2 True state once the gate lints source only
- **Design-system `no-restricted-syntax` drift = 0** — icon-gradient, side-stripe, gradient-text, brand-color, invalid-status all clean. The "82" and "35" figures in old reports are **stale/wrong**.
- 0 errors; 4 trivial dead-code warnings → cleared (`FolderInput`/`Mail` in `app/employees/page.tsx`; `removeVote`+import in `app/fluence/wall/page.tsx`; `endDate`+`watch` in `app/performance/pip/page.tsx`).
- `npm run lint` now passes `--max-warnings=0` green. `tsc --noEmit` clean.

### 5.3 Second drift checker (separate, report-only)
`scripts/check-styling-drift.mjs` → **28 findings**: raw-input ×9, raw-textarea ×8, raw-select ×8, inline-style ×3. Top offenders: `app/surveys/pulse/page.tsx`, `app/preboarding/portal/[token]/page.tsx`, `app/projects/psa/timesheets/page.tsx`.

### 5.4 Deferred modernization epics (browser-gated)
Deferred specifically because they need runtime + role-matrix visual verification:

**Dashboard cluster** (`app/dashboard/page.tsx`, operator surface) — do as one unit, F5 first:
- F5 — wrap Google `fetch` in `useQuery` (behavioral; unblocks the rest)
- F2 — split `dashboard/page.tsx` into 6 section files
- F3 — memoize widgets/handlers
- F4 — preserve 3 role predicates + add RBAC test

**Skeleton/loading cluster** — D4 first (unblocks D1):
- D4 — merge duplicate exports. **CONFIRMED real** (memory's "no Skeleton* exports" caveat was wrong): both `components/ui/Skeleton.tsx` (11 exports) and `components/ui/Loading.tsx` (5) export overlapping `Skeleton`/`SkeletonCard`/`SkeletonStatCard`/`SkeletonTable`. Touches 20+ importers.
- D1 — Mantine `Skeleton` → canonical across ~22 `loading.tsx`
- D3 — remove inline page-level spinners (e.g. `app/leave/my-leaves/page.tsx:166-174`)

---

## 6. Test depth & correctness (needs improvement)
- Backend line coverage **~0.19** (org standard 0.80); FE ~60%. Breadth high, depth low.
- **FINANCE_ADMIN boundary untested** — V312 seeds the user; no test fixture exercises it.
- **NOBYPASSRLS live proof missing** — RLS tenant isolation static-proven locally; no live-prod proof.
- **God-components** — `dashboard/page.tsx` and peers oversized (F2 split targets this).

---

## 7. Operational / launch gates (config, not build)
- **Demo creds live in prod** — `DEMO_CREDENTIALS_ENABLED=true` (Railway) + `NEXT_PUBLIC_DEMO_MODE=true` (Vercel). Public 1-click SUPER_ADMIN. The **one true launch blocker**; env flip, code fail-closed. (= `pendings.md` §1 SEC-3b.)
- **RT-01: deployed build lags HEAD** — `/admin/users` 404s live though it exists in code; Vercel deploys are CLI-only (not git-auto). Redeploy HEAD before any live verification.
- **Railway Kafka ephemeral** (staging only) — durable Kafka/outbox needed for prod scale.
- **CI** needs `NEXT_PUBLIC_API_URL` injected; confirm green on a frozen SHA.

---

## 8. Done this session
- `1d996195` — repair non-functional ESLint gate (register plugins + ignore `.vercel`); clear 4 dead-code warnings. Gate green, tsc clean.
- `7d92f1e9` — `pendings.md` §10 (not-done / needs-improvement tracker entry).
- Memory: `project_lint_gate_broken_2026_06_23.md` + MEMORY.md index.
- Both commits pushed to `fayaz30395/nu-aura` + `Fayaz-Deen/nu-aura` (main).

---

## 9. Blocked this session (and why)
The browser MCP (claude-in-chrome) and computer-use servers disconnected mid-session, and Vercel/Railway live verification needs them. So Arc A write-path proof and Arc B deferred epics could not be executed/validated — which is exactly why they were deferred originally. They are not authoring gaps; they are verification gaps.

---

## 10. Recommended close-out sequence
1. **Unblock:** redeploy live build to HEAD (RT-01) + decide demo-creds posture (SEC-3b). Gates everything.
2. **One browser pass:** Arc A P0 spec de-tautologization (payroll, recruitment, admin/RBAC, attendance regularization) + Arc B2 dashboard/skeleton epics.
3. **No browser needed (do anytime):** ~~Arc B1 lint drift~~ (DONE this session); the 28 `check-styling-drift.mjs` form-control sites; test-depth lift.
4. **Finish:** Arc A P1/P2 write-paths; design-system convergence (`pendings.md` §5).

---

*Cross-references:* `pendings.md` §10 (live tracker) · `PRODUCT.md` (vision) · `qa-reports/CHROME_E2E_2026-06-19.md` · `qa-reports/PRODUCTION_READINESS_2026-06-17.md` · `docs/obsidian/09-Testing/Readiness-Session-2026-06-18.md`.
