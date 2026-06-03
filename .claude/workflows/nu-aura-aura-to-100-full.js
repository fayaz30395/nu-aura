export const meta = {
  name: 'nu-aura-aura-to-100-full',
  description: 'COMPREHENSIVE Aura push to 100: apply Aura tokens/motion/primitives + WCAG 2.2 AA across EVERY app route folder and EVERY feature component dir, then browser visual-regression evidence, then full verify (tsc/lint/build/behavior).',
  phases: [
    { title: 'Pages', detail: 'Aura polish + a11y across all 80 app route folders (disjoint batches, Haiku)' },
    { title: 'Components', detail: 'Aura polish + a11y across all 19 feature component dirs + a11y-only pass on ui/motion/charts primitives' },
    { title: 'Visual', detail: 'Playwright visual-regression at 320/768/1024/1440 in light+dark' },
    { title: 'Verify', detail: 'tsc + lint + prod build + behavior gate (Haiku)' },
  ],
}

const FE = 'frontend'
const REF = `Consume the frozen contract: ${FE}/AURA_CONTRACT.md + design-import/AURA_DETAIL_SPEC.md. Tokens only (no hardcoded hex), light+dark parity, reduced-motion, tabular-nums on numerics. Primitives from @/components/ui, charts @/components/charts, motion @/components/motion. PRESERVE all data fetching, hooks order, props, permissions, behavior — visual/a11y only. After editing, verify JSX balance + imports. Stay STRICTLY within the assigned folders so parallel agents never touch the same file.`
const S = { type:'object', additionalProperties:false, required:['filesEdited','summary','risks'], properties:{
  filesEdited:{type:'array',items:{type:'string'}}, summary:{type:'string'}, risks:{type:'array',items:{type:'string'}} } }
const VS = { type:'object', additionalProperties:false, required:['status','summary','failures'], properties:{
  status:{type:'string'}, summary:{type:'string'}, failures:{type:'array',items:{type:'string'}} } }

const chunk = (arr, n) => { const out=[]; for (let i=0;i<arr.length;i+=n) out.push(arr.slice(i,i+n)); return out }

// ---- Phase 1: all app route folders (api excluded — no UI) ----
const ROUTES = [
  'about','admin','allocations','analytics','announcements','app','approvals','assets','attendance',
  'auth','benefits','biometric-devices','calendar','careers','company-spotlight','compensation','compliance',
  'contact','contracts','dashboard','dashboards','departments','employees','executive','exit-interview',
  'expenses','features','feedback360','fluence','goals','helpdesk','holidays','import-export','integrations',
  'knowledge','learning','leave','letters','linkedin-posts','loans','lwf','me','nu-calendar','nu-drive',
  'nu-mail','offboarding','offer-portal','okr','onboarding','one-on-one','overtime','payments','payroll',
  'performance','preboarding','predictive-analytics','pricing','probation','projects','recognition',
  'recruitment','referrals','reports','reset-password','resources','restricted-holidays','security','settings',
  'shifts','sign','statutory','surveys','tax','team-directory','time-tracking','timesheets','training','travel',
  'wellness','workflows',
]
const ROUTE_BATCHES = chunk(ROUTES, 6) // ~14 batches of 6 disjoint folders

phase('Pages')
const pageResults = await parallel(ROUTE_BATCHES.map((folders, i) => () =>
  agent(
    `${REF}\n\nTASK (pages batch ${i+1}): Apply the full Aura treatment to EVERY page.tsx, layout.tsx, loading.tsx, error.tsx and co-located component (./_components, ./components) under these route folders ONLY: ${folders.map(f=>`${FE}/app/${f}`).join(', ')}.\nApply: PageTransition + Reveal/Stagger entrance on sections, Stat/Card/StatusBadge for metrics & tables, .hover-lift on interactive cards, tabular-nums on numerics, focus-visible rings on every interactive element, aria-label on icon-only buttons, intentional empty/loading/error states, semantic typography tokens (.text-aura-title/.text-aura-micro). Replace hardcoded hex with tokens. Skip ${FE}/app/api. Do NOT change behavior, data fetching, hooks order, or permissions.\nReturn filesEdited, summary, risks.`,
    { label:`pages:${i+1}/${ROUTE_BATCHES.length}`, phase:'Pages', model:'haiku', schema:S }
  )
)).then(r=>r.filter(Boolean))
log(`Pages: ${pageResults.flatMap(p=>p.filesEdited||[]).length} files across ${ROUTE_BATCHES.length} batches`)

// ---- Phase 2: feature component dirs + primitives a11y ----
const FEATURE_DIRS = [
  'admin','auth','custom-fields','dashboard','employee','errors','expenses','fluence','integrations',
  'layout','notifications','payroll','performance','platform','projects','recruitment','resource-management',
  'training','wall',
]
const DIR_BATCHES = chunk(FEATURE_DIRS, 4) // ~5 batches of 4 disjoint dirs

phase('Components')
const compThunks = DIR_BATCHES.map((dirs, i) => () =>
  agent(
    `${REF}\n\nTASK (components batch ${i+1}): Apply the full Aura treatment to EVERY *.tsx under these feature component dirs ONLY: ${dirs.map(d=>`${FE}/components/${d}`).join(', ')}.\nApply: token colors (no hex), Reveal/Stagger where entrance fits, StatusBadge/Card/Stat usage, .hover-lift, tabular-nums on numerics, focus-visible rings, aria-label on icon-only controls, aria-live on toasts/status. PRESERVE behavior, props, hooks order. Return filesEdited, summary, risks.`,
    { label:`comp:${i+1}/${DIR_BATCHES.length}`, phase:'Components', model:'haiku', schema:S }
  )
)
// Primitives: a11y-only, non-destructive — these are the canonical design system source.
compThunks.push(() =>
  agent(
    `${REF}\n\nTASK (primitives a11y): NON-DESTRUCTIVE accessibility-only hardening of the design-system primitives under ${FE}/components/ui, ${FE}/components/motion, ${FE}/components/charts. Do NOT restyle or change their visual API. ONLY: ensure focus-visible rings, aria-label/role/aria-current correctness, aria-live on status/toast primitives, keyboard operability (Esc/Arrow/Enter on menus/dialogs/tabs/command palette), prefers-reduced-motion honored in motion primitives, chart elements have accessible names/aria-hidden on decorative SVG. Preserve all props, variants, and exports exactly. Return filesEdited, summary, risks.`,
    { label:'comp:primitives-a11y', phase:'Components', model:'haiku', schema:S }
  )
)
const compResults = await parallel(compThunks).then(r=>r.filter(Boolean))
log(`Components: ${compResults.flatMap(c=>c.filesEdited||[]).length} files across ${compThunks.length} batches`)

// ---- Phase 3: visual regression evidence ----
phase('Visual')
const visual = await agent(
  `BROWSER VISUAL-REGRESSION pass on the Aura redesign. cd ${FE}. Start the dev server in the background (npx next dev --webpack on :3000; wait until it responds 200), then with Playwright (already a dep) capture the reachable redesigned routes — at minimum /auth/login plus any public routes (/, /careers, /pricing, /about, /contact, /features) — at viewports 320, 768, 1024, 1440 in BOTH light and dark (toggle by setting class 'dark' / [data-theme=dark] on <html>). Save PNGs to /tmp/aura-visual-full/. For each: assert no horizontal overflow (document.scrollingElement.scrollWidth <= innerWidth + 1), accent #2952A3 present on primary action, visible focus ring on Tab, both themes render, Roboto-Mono tabular numerics. Routes needing auth: report as 'needs-auth, not covered' (do NOT fail them). Kill the dev server when done. Report status + routes covered vs needs-auth + any real visual defects (overflow/contrast/broken layout) as 'failures'.`,
  { label:'visual:regression', phase:'Visual', schema:VS })
log('Visual: ' + (visual?.status||'?') + ' — ' + (visual?.summary||'').slice(0,160))

// ---- Phase 4: verify gates ----
phase('Verify')
const verify = await parallel([
  () => agent(`cd ${FE} && npx tsc --noEmit. status PASS/FAIL + first 25 errors. FIX trivial breakage introduced by the Aura passes (bad imports, JSX imbalance, unused). Ignore pre-existing leave/approvals + travel rules-of-hooks.`, { label:'verify:tsc', phase:'Verify', model:'haiku', schema:VS }),
  () => agent(`cd ${FE} && node scripts/check-styling-drift.mjs --quiet then eslint the changed app+components areas (--max-warnings=0, skip files whose ONLY errors are pre-existing rules-of-hooks in leave/approvals+travel). Report + auto-fix safe issues. Flag any NEW rules-of-hooks error (must be fixed).`, { label:'verify:lint', phase:'Verify', model:'haiku', schema:VS }),
  () => agent(`cd ${FE} && npx next build (production build). status PASS/FAIL + first 25 errors. If a page fails to compile from an Aura edit, FIX it minimally (visual-only). Report verbatim.`, { label:'verify:build', phase:'Verify', model:'haiku', schema:VS }),
  () => agent(`BEHAVIOR GATE: cd ${FE} && npx vitest run components/ui --silent. All must pass (visual-only changes). Report failures verbatim; do NOT edit tests to pass.`, { label:'verify:behavior', phase:'Verify', model:'haiku', schema:VS }),
]).then(r=>r.filter(Boolean))

return {
  pages: { batches: ROUTE_BATCHES.length, files: pageResults.flatMap(p=>p.filesEdited||[]).length, summaries: pageResults.map(p=>p.summary) },
  components: { batches: compThunks.length, files: compResults.flatMap(c=>c.filesEdited||[]).length, summaries: compResults.map(c=>c.summary) },
  visual: visual ? { status:visual.status, summary:visual.summary, failures:visual.failures } : null,
  verify: verify.map(v=>({ label:v.status, status:v.status, summary:v.summary, failures:v.failures })),
  followUps: [...pageResults.flatMap(p=>p.risks||[]), ...compResults.flatMap(c=>c.risks||[]), ...(visual?.failures||[])],
}
