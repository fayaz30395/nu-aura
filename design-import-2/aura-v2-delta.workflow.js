export const meta = {
  name: 'nu-aura-aura-v2-delta',
  description: 'Apply the Aura v2 design refinements (tokens unchanged) onto the already-restyled real routes: shared primitive/CSS deltas, then per-page deltas, then verify. Logic untouched.',
  phases: [
    { title: 'SharedDelta', detail: 'Apply app.css + Primitives.jsx v2 refinements to components/ui' },
    { title: 'PageDelta', detail: 'Apply each page v2 delta to its real route, pixel-match new screenshots' },
    { title: 'Verify', detail: 'tsc + lint' },
  ],
}

const FE = 'frontend'
const V1 = 'design-import/aura/project/app'             // version I already implemented
const V2 = 'design-import-2/aura/project/app'           // new refined version (target)
const SHOTS = 'design-import-2/aura/project/design_handoff_nu_aura_redesign/screenshots'

const CHARTER = `
NU-AURA "Aura" redesign — v2 DELTA. The Aura design is ALREADY implemented in the app (tokens, shell, primitives, charts, 10 pages — all live in ${FE}). v2 keeps the SAME tokens (no token changes) and refines specific files. Your job: apply ONLY what v2 changed, onto the real routes, IN PLACE.

To find the exact delta: run \`diff ${V1}/<File> ${V2}/<File>\` — that shows precisely what v2 changed vs what's already built. Apply that delta's INTENT to the corresponding real production code, and diff your result against the new screenshot in ${SHOTS}/.

RULES: visual/design only — preserve all data fetching, hooks order, props, permissions, behavior. Token-driven (no hardcoded hex), light+dark parity, reduced-motion, WCAG-AA, tabular-nums on numbers. Consume frozen primitives from @/components/ui + charts from @/components/charts + motion from @/components/motion. Do NOT change globals.css tokens (unchanged in v2). After editing, verify JSX balance + imports.
`
const S = { type:'object', additionalProperties:false, required:['filesEdited','summary','risks'], properties:{
  filesEdited:{type:'array',items:{type:'string'}}, summary:{type:'string'}, risks:{type:'array',items:{type:'string'}} } }

// ── Phase A: shared-layer delta (primitives + component css) ──
phase('SharedDelta')
const shared = await agent(`${CHARTER}

TASK — Apply the v2 SHARED-layer refinements. Diff these and port the changes to our shared layer:
- \`diff ${V1}/Primitives.jsx ${V2}/Primitives.jsx\` → apply to the matching components in ${FE}/components/ui (Button/Stat/StatusBadge/Card/Segmented/Tabs/etc.). Preserve each component's public API.
- \`diff ${V1}/app.css ${V2}/app.css\` → these are component styles; port the changed rules into the relevant ${FE}/components/ui component styling / Tailwind classes (NOT into globals.css tokens). If a change is a new shared utility, add it minimally where the components consume it.
Return filesEdited, summary (what v2 changed), risks.`, { label:'v2:shared', phase:'SharedDelta', schema:S })
log('Shared delta: ' + (shared?.summary||'').slice(0,200))

// ── Phase B: per-page deltas (changed pages only) ──
phase('PageDelta')
const PAGES = [
  { key:'settings', file:'SettingsPage.jsx', route:`${FE}/app/settings`, shot:'14-settings-roles.png', model:undefined,
    note:'Biggest v2 change (~132 lines). Likely refined RBAC roles table + integrations + section nav. Diff and apply fully.' },
  { key:'login', file:'LoginPage.jsx', route:`${FE}/app/auth/login`, shot:'01-login.png', model:undefined,
    note:'v2 added a real login screenshot (01-login.png). Refine the brand panel + form to match it exactly.' },
  { key:'employees', file:'EmployeesPage.jsx', route:`${FE}/app/employees`, shot:'04-employees.png / 05-employees-profile-slideover.png / 06-employees-bulk-select.png', model:'haiku',
    note:'~19-line refinement. Diff and apply (table/slide-over/bulk states).' },
  { key:'approvals', file:'ApprovalsPage.jsx', route:`${FE}/app/approvals`, shot:'07-approvals.png', model:'haiku', note:'~9-line refinement.' },
  { key:'dashboard', file:'DashboardPage.jsx', route:`${FE}/app/dashboard`, shot:'02-dashboard-light.png / 03-dashboard-dark.png', model:'haiku',
    note:'~4-line refinement + verify DARK dashboard matches the new 03-dashboard-dark.png.' },
  { key:'payroll', file:'PayrollPage.jsx', route:`${FE}/app/payroll`, shot:'10-payroll.png', model:'haiku', note:'~4-line refinement.' },
  { key:'attendance', file:'AttendancePage.jsx', route:`${FE}/app/attendance + ${FE}/app/leave`, shot:'08-attendance.png / 09-leave.png', model:'haiku', note:'~2-line refinement.' },
]
const pages = await parallel(PAGES.map((p) => () =>
  agent(`${CHARTER}

TASK — Apply the v2 delta for "${p.key}" to its real route(s): ${p.route}.
Diff: \`diff ${V1}/${p.file} ${V2}/${p.file}\` to see exactly what v2 changed; apply that to the real page. Match the new screenshot(s): ${SHOTS}/ → ${p.shot}.
Note: ${p.note}
Return filesEdited, summary, risks.`,
    { label:`v2:${p.key}`, phase:'PageDelta', schema:S, ...(p.model?{model:p.model}:{}) })
)).then((r)=>r.filter(Boolean))
log(`Page deltas: ${pages.length}/${PAGES.length}`)

// ── Phase C: verify ──
phase('Verify')
const VS = { type:'object', additionalProperties:false, required:['status','summary','failures'], properties:{
  status:{type:'string'}, summary:{type:'string'}, failures:{type:'array',items:{type:'string'}} } }
const verify = await parallel([
  () => agent(`cd ${FE} && npx tsc --noEmit. status PASS/FAIL + first 20 errors. FIX trivial breakage from the v2 deltas. Ignore pre-existing leave/approvals + travel.`, { label:'verify:tsc', phase:'Verify', model:'haiku', schema:VS }),
  () => agent(`cd ${FE} && node scripts/check-styling-drift.mjs --quiet then eslint the changed app+components areas (--max-warnings=0). Report + auto-fix safe issues.`, { label:'verify:lint', phase:'Verify', model:'haiku', schema:VS }),
  () => agent(`BEHAVIOR-REGRESSION GATE — the v2 deltas must be visual-only. cd ${FE} && npx vitest run components/ui --silent (the shared-primitive behavior tests). If any test fails, the restyle changed behavior — report the failing test + assertion verbatim and identify which v2 edit caused it; do NOT alter the test to pass. status PASS/FAIL. This gate confirms no feature behavior was touched.`, { label:'verify:behavior', phase:'Verify', model:'haiku', schema:VS }),
]).then((r)=>r.filter(Boolean))

return {
  shared: shared ? { files: shared.filesEdited, summary: shared.summary } : null,
  pages: pages.map((p)=>({ summary:p.summary, files:p.filesEdited })),
  verify: verify.map((v)=>({ status:v.status, summary:v.summary, failures:v.failures })),
  followUps: [...(shared?.risks||[]), ...pages.flatMap((p)=>p.risks||[])],
}
