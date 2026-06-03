export const meta = {
  name: 'nu-aura-aura-polish-test',
  description: 'Aura Phase 2: deep-detail polish of the 10 screens to pixel fidelity, then clean tests — build/lint + visual (Playwright) + feature smoke. Returns failures for the fix-loop.',
  phases: [
    { title: 'Polish', detail: 'Per-page deep-detail refinement vs screenshot + AURA_DETAIL_SPEC.md (10 agents)' },
    { title: 'Build', detail: 'tsc + lint + design-drift + production build gate' },
    { title: 'UITest', detail: 'Playwright visual (light/dark, 1440/1280/1024) + feature smoke on redesigned routes' },
  ],
}

const FE = 'frontend'
const SHOTS = 'design-import/aura/project/design_handoff_nu_aura_redesign/screenshots'
const DETAIL = 'design-import/AURA_DETAIL_SPEC.md'
const CONTRACT = `${FE}/AURA_CONTRACT.md`

const POLISH_CHARTER = `
NU-AURA "Aura" redesign — DEEP-DETAIL POLISH. The 10 screens already have a first restyle pass; your job is to take ONE to pixel fidelity against its screenshot.
READ FIRST: ${DETAIL} (the binding fidelity checklist) and ${CONTRACT} (frozen primitives/tokens/charts).
Refine EXACTLY to the checklist: exact token colors (no hardcoded hex), typography scale (28px title / 10.5px micro-label / 29px mono tabular-nums values), every button variant + state (hover lift, press inset, focus ring, disabled, loading), icon tiles + delta pills, 58px rows + bulk bar + select-all, slide-over/tabs/pipeline/rings as specced, hover/focus-visible on every interactive element, intentional empty/loading/error states, exact copy, light+dark parity, reduced-motion.
PRESERVE all real data fetching, hooks order, permissions, actions, and component public APIs — visual only. Do NOT edit globals.css, tailwind, mantine theme, components/ui shared primitives, components/charts, or components/layout/shell (frozen — note gaps in 'risks', don't fork). Verify JSX balance + imports after editing.
`

const PSCHEMA = { type:'object', additionalProperties:false, required:['filesEdited','fidelity','risks'], properties:{
  filesEdited:{type:'array',items:{type:'string'}}, fidelity:{type:'string'}, risks:{type:'array',items:{type:'string'}} } }

phase('Polish')
const PAGES = [
  { key:'login', route:`${FE}/app/auth/login`, shot:'README §1 (no shot)' },
  { key:'dashboard', route:`${FE}/app/dashboard`, shot:'02-dashboard-light.png' },
  { key:'employees', route:`${FE}/app/employees`, shot:'04-employees.png / 05-employees-profile-slideover.png / 06-employees-bulk-select.png' },
  { key:'approvals', route:`${FE}/app/approvals`, shot:'07-approvals.png' },
  { key:'attendance', route:`${FE}/app/attendance + ${FE}/app/leave`, shot:'08-attendance.png / 09-leave.png' },
  { key:'payroll', route:`${FE}/app/payroll`, shot:'10-payroll.png' },
  { key:'assets', route:`${FE}/app/assets`, shot:'11-assets.png' },
  { key:'benefits', route:`${FE}/app/benefits`, shot:'12-benefits.png' },
  { key:'reports', route:`${FE}/app/reports`, shot:'13-reports.png' },
  { key:'settings', route:`${FE}/app/settings`, shot:'14-settings-roles.png / 15-settings-integrations.png' },
]
const polish = await parallel(PAGES.map((p) => () =>
  agent(`${POLISH_CHARTER}\n\nPAGE: ${p.key} — real route(s): ${p.route}. Compare against screenshot(s) ${SHOTS}/ → ${p.shot}. Refine to pixel fidelity per ${DETAIL}. Return: filesEdited, fidelity (gap-closed vs screenshot), risks.`,
    { label:`polish:${p.key}`, phase:'Polish', schema:PSCHEMA })
)).then((r) => r.filter(Boolean))
log(`Polish: ${polish.length}/${PAGES.length}`)

phase('Build')
const VSCHEMA = { type:'object', additionalProperties:false, required:['status','summary','failures'], properties:{
  status:{type:'string'}, summary:{type:'string'}, failures:{type:'array',items:{type:'string'}} } }
const build = await parallel([
  () => agent(`cd ${FE} && npx tsc --noEmit. Report status PASS/FAIL and list failures verbatim (first 25). FIX trivial JSX/import breakage from the polish pass in the offending file. Ignore pre-existing leave/approvals + travel rules-of-hooks.`, { label:'build:tsc', phase:'Build', schema:VSCHEMA }),
  () => agent(`cd ${FE} && node scripts/check-styling-drift.mjs --quiet then eslint the changed app routes (git diff --name-only HEAD | grep '^frontend/app' | sed 's#frontend/##' | xargs npx eslint --max-warnings=0). Report NEW hardcoded-hex/inline-style drift + lint errors introduced; auto-fix safe ones. status=PASS/PASS_WITH_WARNINGS/FAIL.`, { label:'build:lint', phase:'Build', schema:VSCHEMA }),
  () => agent(`cd ${FE} && NEXT_PUBLIC_API_URL=https://api.aura.local/api/v1 ALLOW_INSECURE_RELEASE_API_URL=true npx next build 2>&1 | tail -50. Report whether the production build compiles with the Aura shell + 10 redesigned pages. List any page that fails to build verbatim. status=PASS/FAIL. Do not commit.`, { label:'build:next', phase:'Build', schema:VSCHEMA }),
]).then((r) => r.filter(Boolean))
log(`Build gate: ${build.map((b)=>b.status).join(' / ')}`)

phase('UITest')
const uitest = await parallel([
  () => agent(`Playwright VISUAL check of the Aura redesign. From repo root: cd ${FE}. Start the dev server (npx next dev on :3000 in the background; wait for ready), then with Playwright (already a dep) navigate the reachable redesigned routes — at minimum /auth/login — at viewports 1440, 1280, 1024 in BOTH light and dark (toggle data-theme/.dark on <html>), capture screenshots to /tmp/aura-visual/, and check: no horizontal overflow, accent #2952A3 present on primary action, Roboto-Mono tabular numerics, visible focus ring on tab-focus, both themes render. Many app routes require auth — for those, report them as "needs-auth, not visually covered" rather than failing. Kill the dev server when done. Report status + a list of routes covered vs needs-auth, and any visual defects (overflow, contrast, broken layout). status=PASS/PASS_WITH_WARNINGS/FAIL.`, { label:'uitest:visual', phase:'UITest', schema:VSCHEMA }),
  () => agent(`FEATURE smoke of the redesign. cd ${FE}. Run the unit suite: npx vitest run --silent (report pass/fail counts; failing tests verbatim). Then inspect the existing Playwright e2e specs under e2e/ — run the ones that exercise the redesigned shell/login that can pass without a live backend (npx playwright test --project=chromium -g "login|shell|nav" if such specs exist; else report which e2e specs WOULD cover the redesigned routes and why they need a live backend/DB). Goal: confirm the redesign did not break component/feature behavior. status=PASS/PASS_WITH_WARNINGS/FAIL + failures list.`, { label:'uitest:feature', phase:'UITest', schema:VSCHEMA }),
]).then((r) => r.filter(Boolean))

return {
  polish: polish.map((r)=>({ fidelity:r.fidelity, files:r.filesEdited })),
  build: build.map((r)=>({ status:r.status, summary:r.summary, failures:r.failures })),
  uitest: uitest.map((r)=>({ status:r.status, summary:r.summary, failures:r.failures })),
  allFailures: [...build.flatMap((r)=>r.failures||[]), ...uitest.flatMap((r)=>r.failures||[])],
  followUps: polish.flatMap((r)=>r.risks||[]),
}
