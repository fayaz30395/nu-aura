export const meta = {
  name: 'nu-aura-aura-to-100',
  description: 'Push controllable scores to 100: a11y hardening + long-tail route polish (Aura tokens/motion/primitives), then browser visual-regression evidence, then full verify (tsc/lint/build/behavior).',
  phases: [
    { title: 'Harden', detail: 'a11y hardening + long-tail polish (disjoint route areas, Haiku)' },
    { title: 'Visual', detail: 'Playwright visual-regression at 320/768/1024/1440 in light+dark' },
    { title: 'Verify', detail: 'tsc + lint + prod build + behavior gate (Haiku)' },
  ],
}
const FE = 'frontend'
const REF = `Consume the frozen contract: ${FE}/AURA_CONTRACT.md + design-import/AURA_DETAIL_SPEC.md. Tokens only (no hardcoded hex), light+dark parity, reduced-motion, tabular-nums on numerics. Primitives from @/components/ui, charts @/components/charts, motion @/components/motion. PRESERVE all data fetching, hooks order, props, permissions, behavior — visual/a11y only. After editing, verify JSX balance + imports.`
const S = { type:'object', additionalProperties:false, required:['filesEdited','summary','risks'], properties:{
  filesEdited:{type:'array',items:{type:'string'}}, summary:{type:'string'}, risks:{type:'array',items:{type:'string'}} } }

phase('Harden')
const AREAS = [
  { key:'a11y', model:'haiku', prompt:`ACCESSIBILITY HARDENING across the Aura hero surfaces (${FE}/app: dashboard, employees, approvals/inbox, attendance, leave, payroll, assets, benefits, reports, settings, auth/login) + ${FE}/components/layout/shell. Apply WCAG 2.2 AA: aria-label on icon-only buttons, role/aria-current on nav, visible focus-visible rings on every interactive element, aria-live on toasts/status, table th scope, alt/aria-hidden on decorative SVG/icons, keyboard operability of ⌘K palette + slide-overs + tabs, contrast via tokens. Do NOT change behavior. Each file edited stays disjoint from the long-tail agents (they own different route folders).` },
  { key:'me', model:'haiku', prompt:`LONG-TAIL POLISH of self-service routes under ${FE}/app/me/* (dashboard, profile, payslips, attendance, leave). Apply Aura: PageTransition + Reveal/Stagger entrance, Stat/Card/StatusBadge for metrics/tables, .hover-lift, tabular-nums, focus rings, intentional empty/loading states. Stay within ${FE}/app/me.` },
  { key:'admin', model:'haiku', prompt:`LONG-TAIL POLISH of ${FE}/app/admin/* (employees, roles, permissions, holidays, departments). Aura table-card Reveal + row hover, StatusBadge dots, PageTransition, focus rings, tabular-nums. Stay within ${FE}/app/admin.` },
  { key:'grow', model:'haiku', prompt:`LONG-TAIL POLISH of NU-Grow ${FE}/app/performance/* + app/okr + app/goals + app/learning + app/surveys (landings + main list/detail). Aura Reveal/Stagger, Stat/Card, rings/charts where present, PageTransition, a11y. Stay within those folders.` },
  { key:'hire', model:'haiku', prompt:`LONG-TAIL POLISH of NU-Hire ${FE}/app/recruitment/* + app/offer-portal + app/onboarding (landings + list/detail). Aura table-card Reveal + row hover, StatusBadge, PageTransition, a11y, tabular-nums. Stay within those folders.` },
  { key:'fluence', model:'haiku', prompt:`LONG-TAIL POLISH of NU-Fluence ${FE}/app/fluence/* + app/announcements + app/knowledge + app/recognition (wiki/blogs/wall/dashboard). Aura Reveal/Stagger, Card, PageTransition, a11y. Preserve realtime/comment behavior. Stay within those folders.` },
]
const harden = await parallel(AREAS.map((a) => () =>
  agent(`${REF}\n\nTASK (${a.key}): ${a.prompt}\nReturn filesEdited, summary, risks.`, { label:`harden:${a.key}`, phase:'Harden', model:a.model, schema:S })
)).then((r)=>r.filter(Boolean))
log(`Harden: ${harden.flatMap((h)=>h.filesEdited||[]).length} files`)

phase('Visual')
const VS = { type:'object', additionalProperties:false, required:['status','summary','failures'], properties:{
  status:{type:'string'}, summary:{type:'string'}, failures:{type:'array',items:{type:'string'}} } }
const visual = await agent(
  `BROWSER VISUAL-REGRESSION pass on the Aura redesign. cd ${FE}. Start the dev server in the background (npx next dev --webpack on :3000; wait until it responds 200), then with Playwright (already a dep) capture the reachable redesigned routes — at minimum /auth/login — at viewports 320, 768, 1024, 1440 in BOTH light and dark (toggle by setting class 'dark' / [data-theme=dark] on <html>). Save PNGs to /tmp/aura-visual/. For each: assert no horizontal overflow (document.scrollingElement.scrollWidth <= innerWidth + 1), accent #2952A3 present on primary action, visible focus ring on Tab, both themes render, Roboto-Mono tabular numerics. Routes needing auth: report as 'needs-auth, not covered' (do NOT fail them). Kill the dev server when done. Report status + routes covered vs needs-auth + any real visual defects (overflow/contrast/broken layout) as 'failures'.`,
  { label:'visual:regression', phase:'Visual', schema:VS })
log('Visual: ' + (visual?.status||'?') + ' — ' + (visual?.summary||'').slice(0,160))

phase('Verify')
const verify = await parallel([
  () => agent(`cd ${FE} && npx tsc --noEmit. status PASS/FAIL + first 20 errors. FIX trivial breakage from the harden pass. Ignore pre-existing leave/approvals + travel rules-of-hooks.`, { label:'verify:tsc', phase:'Verify', model:'haiku', schema:VS }),
  () => agent(`cd ${FE} && node scripts/check-styling-drift.mjs --quiet then eslint the changed app+components areas (--max-warnings=0, skip files whose ONLY errors are pre-existing rules-of-hooks in leave/approvals+travel). Report + auto-fix safe issues. Flag any NEW rules-of-hooks error (must be fixed).`, { label:'verify:lint', phase:'Verify', model:'haiku', schema:VS }),
  () => agent(`BEHAVIOR GATE: cd ${FE} && npx vitest run components/ui --silent. All must pass (visual-only changes). Report failures verbatim; do NOT edit tests to pass.`, { label:'verify:behavior', phase:'Verify', model:'haiku', schema:VS }),
]).then((r)=>r.filter(Boolean))

return {
  harden: harden.map((h)=>({ summary:h.summary, files:h.filesEdited })),
  visual: visual ? { status:visual.status, summary:visual.summary, failures:visual.failures } : null,
  verify: verify.map((v)=>({ status:v.status, summary:v.summary, failures:v.failures })),
  followUps: [...harden.flatMap((h)=>h.risks||[]), ...(visual?.failures||[])],
}
