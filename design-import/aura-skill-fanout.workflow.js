export const meta = {
  name: 'nu-aura-aura-skill-fanout',
  description: 'Haiku-powered multi-skill audit→fix of the Aura UI. Read-only lens auditors (per skill, no collision) → per-route fixers → verify. Cost-optimized on Haiku.',
  phases: [
    { title: 'Audit', detail: 'Read-only lens auditors — one specialist skill each (Haiku)', model: 'haiku' },
    { title: 'Fix', detail: 'Apply consolidated findings per route (disjoint files, Haiku)', model: 'haiku' },
    { title: 'Verify', detail: 'tsc + lint (Haiku)', model: 'haiku' },
  ],
}

const FE = 'frontend'
const SCOPE = `the Aura redesign surface: ${FE}/app (the 10 hero screens: auth/login, dashboard, employees, approvals, attendance, leave, payroll, assets, benefits, reports, settings), ${FE}/components/layout/shell, ${FE}/components/ui, ${FE}/components/charts. Reference frozen spec: ${FE}/AURA_CONTRACT.md and design-import/AURA_DETAIL_SPEC.md.`

const FINDING = { type:'object', additionalProperties:false, required:['lens','findings'], properties:{
  lens:{type:'string'},
  findings:{ type:'array', items:{ type:'object', additionalProperties:false, required:['file','issue','severity','fix'],
    properties:{ file:{type:'string'}, issue:{type:'string'}, severity:{type:'string'}, fix:{type:'string'} } } } } }

// ── PHASE 1: AUDIT (read-only lens specialists, one skill each — no file collisions) ──
phase('Audit')
const LENSES = [
  { lens:'accessibility', agentType:'a11y-architect', ask:'WCAG 2.2 AA: keyboard nav, focus-visible rings, ARIA, color contrast (esp. dark mode), reduced-motion, semantic HTML, screen-reader labels on icon buttons.' },
  { lens:'react-correctness', agentType:'react-reviewer', ask:'Hook correctness + order, render performance, server/client boundaries, key stability, effect cleanup, no logic regressions from the restyle.' },
  { lens:'performance', agentType:'performance-engineer', ask:'Compositor-only motion, bundle weight of new shell/charts, no layout-thrash, lazy/dynamic imports for heavy bits, CWV risks.' },
  { lens:'visual-fidelity', agentType:'frontend-specialist', ask:'Fidelity vs AURA_DETAIL_SPEC.md + screenshots: exact token colors (no hardcoded hex), 28/10.5/29px type scale + tabular-nums, button states, icon tiles/delta pills, light+dark parity, spacing rhythm.' },
  { lens:'typescript', agentType:'typescript-reviewer', ask:'Type safety in the new/edited files: no any, correct prop types, no unsafe casts.' },
  { lens:'code-quality', agentType:'code-reviewer', ask:'General quality of the redesign diff: dead code left behind, duplicated styles, files >800 lines, inline-style drift, console.log.' },
]
const audits = await parallel(LENSES.map((L) => () =>
  agent(`You are the ${L.lens} lens. AUDIT (read-only — do NOT edit files) ${SCOPE}\nFocus: ${L.ask}\nReturn concrete, actionable findings: { file, issue, severity (critical/high/med/low), fix }. Only real issues in the Aura redesign code; skip pre-existing unrelated debt.`,
    { label:`audit:${L.lens}`, phase:'Audit', model:'haiku', agentType:L.agentType, schema:FINDING })
)).then((r) => r.filter(Boolean))

const allFindings = audits.flatMap((a) => (a.findings||[]).map((f) => ({...f, lens:a.lens})))
// group findings by top-level route/area for disjoint fixers
const byArea = {}
for (const f of allFindings) {
  const m = (f.file||'').replace(`${FE}/`,'')
  const area = m.startsWith('app/') ? m.split('/').slice(0,2).join('/')
    : m.startsWith('components/') ? m.split('/').slice(0,2).join('/') : 'other'
  ;(byArea[area] = byArea[area] || []).push(f)
}
const areas = Object.keys(byArea).filter((a) => byArea[a].some((f) => ['critical','high','med','medium'].includes((f.severity||'').toLowerCase())))
log(`Audit: ${allFindings.length} findings across ${areas.length} areas`)

// ── PHASE 2: FIX (one agent per area = disjoint files, Haiku) ──
phase('Fix')
const FIXSCHEMA = { type:'object', additionalProperties:false, required:['area','filesEdited','applied','skipped'], properties:{
  area:{type:'string'}, filesEdited:{type:'array',items:{type:'string'}}, applied:{type:'array',items:{type:'string'}}, skipped:{type:'array',items:{type:'string'}} } }
const fixes = await parallel(areas.map((area) => () => {
  const items = byArea[area].filter((f)=>['critical','high','med','medium'].includes((f.severity||'').toLowerCase()))
  return agent(`Apply these audited UI fixes to ONLY files under ${FE}/${area} (do not touch other areas, globals.css, tailwind, mantine theme, or shared primitives unless the file is in your area). Visual/quality only — preserve all data fetching, hooks order, props, behavior. Token-driven (no hardcoded hex), light+dark, reduced-motion, a11y. Verify JSX balance + imports after editing.\n\nFINDINGS:\n${JSON.stringify(items, null, 1)}\n\nReturn { area, filesEdited, applied (fixes done), skipped (with reason) }.`,
    { label:`fix:${area}`, phase:'Fix', model:'haiku', schema:FIXSCHEMA })
})).then((r) => r.filter(Boolean))
log(`Fix: ${fixes.flatMap((f)=>f.filesEdited||[]).length} files updated`)

// ── PHASE 3: VERIFY (Haiku) ──
phase('Verify')
const VS = { type:'object', additionalProperties:false, required:['status','summary','failures'], properties:{
  status:{type:'string'}, summary:{type:'string'}, failures:{type:'array',items:{type:'string'}} } }
const verify = await parallel([
  () => agent(`cd ${FE} && npx tsc --noEmit. status PASS/FAIL + first 20 errors. FIX trivial breakage from the fixes (JSX/import). Ignore pre-existing leave/approvals + travel.`, { label:'verify:tsc', phase:'Verify', model:'haiku', schema:VS }),
  () => agent(`cd ${FE} && node scripts/check-styling-drift.mjs --quiet then eslint the changed app+components areas (--max-warnings=0); report NEW issues, auto-fix safe ones.`, { label:'verify:lint', phase:'Verify', model:'haiku', schema:VS }),
]).then((r) => r.filter(Boolean))

return {
  auditFindings: allFindings.length,
  byLens: audits.map((a)=>({ lens:a.lens, count:(a.findings||[]).length })),
  fixes: fixes.map((f)=>({ area:f.area, files:f.filesEdited, applied:(f.applied||[]).length, skipped:f.skipped })),
  verify: verify.map((v)=>({ status:v.status, summary:v.summary, failures:v.failures })),
  openFindings: allFindings.filter((f)=>['low'].includes((f.severity||'').toLowerCase())),
}
