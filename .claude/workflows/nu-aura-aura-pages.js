export const meta = {
  name: 'nu-aura-aura-pages',
  description: 'Aura redesign Phase 1: restyle the 10 specced screens onto real routes to pixel-match the design, consuming the frozen contract. Data/logic untouched.',
  phases: [
    { title: 'Pages', detail: '10 route agents in parallel — pixel-match each screen' },
    { title: 'Verify', detail: 'tsc, lint, design-drift' },
  ],
}

const FE = 'frontend'
const SRC = 'design-import/aura/project/app'
const SHOTS = 'design-import/aura/project/design_handoff_nu_aura_redesign/screenshots'
const README = 'design-import/aura/project/design_handoff_nu_aura_redesign/README.md'

const CHARTER = `
NU-AURA "Aura" REDESIGN — Phase 1 (pages). The Foundation is DONE and committed: Aura tokens (accent #2952A3) are live in globals.css with existing token names aliased, the new shell (product rail + nav panel + top bar + ⌘K) is in components/layout/shell, primitives are aligned + a Segmented control added, and the chart kit lives in ${FE}/components/charts. The frozen contract is documented in ${FE}/AURA_CONTRACT.md — READ IT FIRST.

YOUR JOB: take ONE real existing route and RESTYLE it to pixel-match its Aura design spec, IN PLACE.
This is a REAL production app with REAL data fetching (React Query / hooks / services) — NOT the prototype's mock data. So:
- PRESERVE all data fetching, hooks (order!), business logic, permissions, routing, and component public APIs. Visual/layout only.
- Map the prototype's mock-data layout onto the page's REAL data. Where the real page already has data the prototype lacks, keep it; where the prototype shows a component the real page lacks, add it as presentation only.
- Recreate the design faithfully in our stack (Next.js App Router + Mantine + Tailwind). Do NOT port the prototype's Babel/CDN/inline-JSX or its localStorage SPA routing.

CONSUME (do NOT edit) the frozen contract:
- Tokens: use CSS-var tokens only (var(--surface), var(--text-1/2/3), var(--accent), var(--border), var(--ok-fg)…). NEVER hardcode hex. Numerics use the .num / tabular-nums utility (Roboto Mono).
- Primitives from @/components/ui: Button, Card, Stat, StatusBadge, Badge, Segmented, Tabs, Switch, Field/Input, Avatar, etc. (import the Aura Tabs explicitly; it is NOT Mantine's compound Tabs).
- Charts from @/components/charts: Sparkline, AreaChart, Donut, Ring, BarsH — feed them real data (they take number[] series).
- Motion from @/components/motion + @/lib/animation (Reveal/Stagger/PageTransition; reduced-motion safe; never rest at opacity:0; overlays animate transform only).
- The shell is already mounted by AppLayout — your page renders inside it. Do NOT build nav/topbar.

HARD RULES: light + dark parity (token-driven), WCAG-AA focus/contrast, keyboard nav, tabular-nums on every number. Do NOT edit globals.css, tailwind.config.js, the mantine theme, components/ui shared primitives, components/charts, or components/layout/shell — those are frozen (if a primitive truly needs a change, note it in 'risks', don't fork it). After editing, verify JSX tag balance + imports resolve.

REFERENCES per page: the design prototype ${SRC}/<Page>.jsx (behavior/layout), the matching screenshot(s) under ${SHOTS}/, and the authoritative "Screens" section of ${README}.
`

const SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['filesEdited', 'summary', 'fidelity', 'risks', 'verifyStatus'],
  properties: {
    filesEdited: { type: 'array', items: { type: 'string' } },
    summary: { type: 'string' },
    fidelity: { type: 'string', description: 'How closely it matches the spec/screenshot + what real-data adaptations were made' },
    risks: { type: 'array', items: { type: 'string' } },
    verifyStatus: { type: 'string' },
  },
}

phase('Pages')
const PAGES = [
  { key: 'login', ref: 'LoginPage.jsx', shot: 'n/a (see README §1)', route: `${FE}/app/auth/login (+ signup/reset share the brand panel)`,
    note: 'Two-column: dark gradient brand panel (NULogic radial washes, product cards, "One login. Your whole people stack.") + right form (Welcome back, email/password, SSO/Google/Microsoft). Standalone — no shell. Keep the real auth submit/validation/MFA flow.' },
  { key: 'dashboard', ref: 'DashboardPage.jsx', shot: '02-dashboard-light.png', route: `${FE}/app/dashboard (and align ${FE}/app/me/dashboard if it is the user landing)`,
    note: 'Greeting head + Export/New Hire actions; 4 KPI Stat cards (icon tile, mono value, delta pill, Sparkline); Headcount AreaChart w/ 3M/6M/12M Segmented; Attendance Donut + legend; Pending approvals list; Activity timeline. Wire to the real dashboard data hooks; charts take real series.' },
  { key: 'employees', ref: 'EmployeesPage.jsx', shot: '04-employees.png + 05-employees-profile-slideover.png + 06-employees-bulk-select.png', route: `${FE}/app/employees (list + [id] + profile slide-over)`,
    note: 'Toolbar (search + department chips w/ counts + Sort), bulk-select bar (accent bg), 58px rows (avatar+name+email, role, dept, location, joined mono, StatusBadge, kebab), pager. Profile slide-over (480px right sheet, name-tinted header, Overview/Documents/Timeline tabs). Keep real employee data, selection, and filtering logic.' },
  { key: 'approvals', ref: 'ApprovalsPage.jsx', shot: '07-approvals.png', route: `${FE}/app/approvals`,
    note: 'Head + Tabs (All/Leave/Expense/Offers/Assets w/ counts); split master-detail (left request cards, right detail w/ requester header, key-values, approval-chain timeline, note textarea, Approve/Decline/Delegate). Keep real approval data + the real approve/decline actions.' },
  { key: 'attendance', ref: 'AttendancePage.jsx', shot: '08-attendance.png + 09-leave.png', route: `${FE}/app/attendance + ${FE}/app/leave`,
    note: 'Header Segmented (Attendance/Leave). Attendance: 4 KPI stats + weekly heatmap table (P/R/L/A tinted cells). Leave: My balance (4 Rings) + Pending requests + month calendar with event chips. Build the heatmap row model from real attendance data.' },
  { key: 'payroll', ref: 'PayrollPage.jsx', shot: '10-payroll.png', route: `${FE}/app/payroll`,
    note: 'Current-run banner (tinted gradient, Processing badge, 3 big mono stats Gross/Net/Taxes, 5-step pipeline Inputs→Calculated→Review→Approved→Paid); 4 KPI row; Cost by department table w/ share bars; Pay composition Donut; Run history table. Keep real payroll run data + actions.' },
  { key: 'assets', ref: 'AssetsPage.jsx', shot: '11-assets.png', route: `${FE}/app/assets (locate the real assets route under ${FE}/app)`,
    note: '4 KPI stats; split — left asset table (icon tile + AST-id, serial, assignee, location, status, purchased) w/ category chips + search; right By-category BarsH + Lifecycle bars. Real asset data.' },
  { key: 'benefits', ref: 'BenefitsPage.jsx', shot: '12-benefits.png', route: `${FE}/app/benefits`,
    note: 'Head + 4 KPI stats; 3-col grid of hoverable plan cards (color icon tile, provider, Enrolled n/total + progress bar, Tier/Cost); Open-enrollment progress card w/ 92px Ring (94%) + status bars. Real benefits data.' },
  { key: 'reports', ref: 'ReportsPage.jsx', shot: '13-reports.png', route: `${FE}/app/reports`,
    note: 'Saved reports 3-col grid of hoverable cards (color icon tile, category badge, kebab, full-width Sparkline preview, "Open →"); Scheduled deliveries table (report, frequency, owner, next run, format badge). Real reports data.' },
  { key: 'settings', ref: 'SettingsPage.jsx', shot: '14-settings-roles.png + 15-settings-integrations.png', route: `${FE}/app/settings`,
    note: '2-col: sticky section nav (General/Roles & permissions/Integrations/Notifications/Billing) + sections. Roles: RBAC table (colored dot + role, Users, Permissions mono, Scope, edit). Integrations: rows w/ app icon + Connected badge + Switch. General: workspace form. Keep real settings/RBAC/integration data + toggles.' },
]

const pageResults = await parallel(PAGES.map((p) => () =>
  agent(`${CHARTER}

TASK — Restyle the "${p.key}" screen to pixel-match its Aura spec, IN PLACE.
Real route(s): ${p.route}
Design refs: prototype ${SRC}/${p.ref} · screenshot(s) ${p.shot} · README "Screens" section.
Spec summary: ${p.note}

Steps: (1) Read ${FE}/AURA_CONTRACT.md, then the prototype ${p.ref} and the screenshot(s). (2) Locate the real route file(s) under ${FE}/app (Glob/Grep) and read them fully — note the real data hooks/services. (3) Restyle the primary page (and key sub-views: detail/slide-over/tabs as specced) to match, using the frozen primitives/charts/tokens and feeding them REAL data. Keep all data fetching, hooks order, permissions, and actions intact. (4) Light+dark, tabular-nums, a11y, reduced-motion. (5) Verify JSX balance + imports.
Return the structured report; 'fidelity' = how close to the screenshot + the real-data adaptations; 'risks' = any primitive gap you had to note instead of fork, or sub-routes you did not reach.`,
    { label: `page:${p.key}`, phase: 'Pages', schema: SCHEMA })
)).then((r) => r.filter(Boolean))

log(`Pages done: ${pageResults.length}/${PAGES.length}`)

phase('Verify')
const V = [
  { key: 'typecheck', task: `cd ${FE} && npx tsc --noEmit. Report PASS/FAIL + first 25 errors verbatim. FIX trivial breakage from the page work (unbalanced JSX, bad import of a primitive/chart, wrong prop). Pre-existing errors in untouched files (leave/approvals, travel) are not your concern.` },
  { key: 'lint-drift', task: `cd ${FE} && node scripts/check-styling-drift.mjs --quiet (report-only — flag any NEW hardcoded hex/inline-style the page agents introduced), then eslint the changed app routes (git diff --name-only HEAD | grep '^frontend/app' | sed 's#frontend/##' | xargs npx eslint --max-warnings=0). Auto-fix safe issues; report NEW errors.` },
]
const verify = await parallel(V.map((v) => () =>
  agent(`Verify Phase 1 of the NU-AURA Aura redesign (Next.js 16 + Mantine + Tailwind). TASK (${v.key}): ${v.task}\nReturn structured report: filesEdited = auto-fixes; summary = outcome; fidelity = ""; risks = unresolved items; verifyStatus = PASS / PASS_WITH_WARNINGS / FAIL + reason.`,
    { label: `verify:${v.key}`, phase: 'Verify', schema: SCHEMA })
)).then((r) => r.filter(Boolean))

return {
  pages: pageResults.map((r) => ({ summary: r.summary, fidelity: r.fidelity, files: r.filesEdited })),
  verify: verify.map((r) => ({ status: r.verifyStatus, summary: r.summary, fixed: r.filesEdited })),
  totalFiles: pageResults.flatMap((r) => r.filesEdited || []).length,
  followUps: [...pageResults.flatMap((r) => r.risks || []), ...verify.flatMap((r) => r.risks || [])],
}
