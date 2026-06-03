export const meta = {
  name: 'nu-aura-100-batch4',
  description: 'Batch 4 toward 100/100: re-enable strictNullChecks (already set in tsconfig) and fix the 83 resulting null-safety errors across ~34 files with proper guards/optional-chaining (no lazy ! assertions). Verify tsc=0 + eslint clean + 2433 tests.',
  phases: [
    { title: 'NullSafety', detail: '4 agents fix strictNullChecks errors in disjoint path partitions' },
    { title: 'Verify', detail: 'tsc=0 (strictNullChecks on) + eslint max-warnings=0 + vitest 2433' },
  ],
}

const FE = '/Users/fayaz.m/IdeaProjects/nulogic/nu-aura/frontend'
const GUARD = `strictNullChecks is now TRUE in ${FE}/tsconfig.json — run \`cd ${FE} && npx tsc --noEmit\` to see errors. Fix EVERY strictNullChecks error in YOUR assigned paths ONLY (mostly TS18048 'possibly undefined', plus TS2322/2345/2352 null-assignability).
RULES — fix with REAL null-safety, NOT escapes:
- Prefer optional chaining (a?.b?.c), nullish coalescing (x ?? fallback), and explicit guards (if (!x) return / continue / early-out) that preserve behavior.
- For arrays/maps from server data, guard before .map/.length or default to [] / {}.
- Use a sensible default that matches existing UX (e.g. '' for text, 0 for counts, [] for lists) — match how nearby code already handles the empty case.
- DO NOT use the non-null assertion operator '!' to silence errors. DO NOT cast to 'any' or 'as unknown as'. DO NOT change runtime behavior, data fetching, hooks order, props, permissions, or DTO shapes. DO NOT add @ts-ignore/@ts-expect-error.
- If a value is genuinely guaranteed non-null by invariant, add a narrow guard with an early return rather than '!'.
After editing each file, re-run tsc scoped mentally and re-read to confirm balance. Stay STRICTLY within your assigned path prefixes (other agents own the rest).`
const S = { type:'object', additionalProperties:false, required:['status','filesEdited','errorsFixed','summary','usedNonNullAssertion'], properties:{
  status:{type:'string',description:'PASS|PARTIAL|FAIL'},
  filesEdited:{type:'array',items:{type:'string'}},
  errorsFixed:{type:'number'},
  summary:{type:'string'},
  usedNonNullAssertion:{type:'boolean',description:'true ONLY if you had to use ! anywhere (should be false)'} } }

phase('NullSafety')
const PARTS = [
  { key:'contracts+fluence-pages', paths:'app/contracts/** and app/fluence/** (page.tsx/[id]/[slug]/new) — the two heaviest files are app/contracts/[id]/page.tsx (~21) and app/fluence/templates/[id]/page.tsx (~16)' },
  { key:'components+lib', paths:'components/** and lib/** — incl. components/wall/WallCards.tsx (~6), components/wall/CommentThread.tsx (~3), components/fluence/*, components/ui/*, components/layout/*, components/expenses/*, lib/hooks/*, lib/services/*' },
  { key:'admin+performance+dashboards', paths:'app/admin/**, app/performance/**, app/dashboards/** (permissions, integrations, calibration, 9box, cycles, manager)' },
  { key:'misc-app', paths:'EVERY OTHER app/** route NOT owned above — incl. app/helpdesk, app/offboarding, app/nu-drive, app/surveys, app/recruitment, app/payroll, app/benefits (and any remaining app/* with errors that are NOT under app/contracts, app/fluence, app/admin, app/performance, app/dashboards)' },
]
const fixed = await parallel(PARTS.map((p) => () =>
  agent(`${GUARD}\n\nPARTITION: ${p.key}. You OWN ONLY: ${p.paths}.\nRun tsc, filter errors to your paths, fix them all with proper null-safety. Report status, filesEdited, errorsFixed (count), and usedNonNullAssertion (must be false).`,
    { label:`null:${p.key}`, phase:'NullSafety', agentType:'frontend-specialist', schema:S })
)).then((r)=>r.filter(Boolean))

log(`NullSafety: ~${fixed.reduce((a,f)=>a+(f.errorsFixed||0),0)} errors fixed across ${fixed.flatMap(f=>f.filesEdited||[]).length} files; any '!' used: ${fixed.some(f=>f.usedNonNullAssertion)}`)

phase('Verify')
const VS = { type:'object', additionalProperties:false, required:['gate','pass','detail'], properties:{
  gate:{type:'string'}, pass:{type:'boolean'}, detail:{type:'string'} } }
const verify = await parallel([
  () => agent(`cd ${FE} && npx tsc --noEmit 2>&1 | tail -40. strictNullChecks is ON. Report gate='tsc', pass=true iff ZERO 'error TS' lines, detail=count + first errors with file:line if any. Read-only.`,
    { label:'verify:tsc', phase:'Verify', schema:VS }),
  () => agent(`cd ${FE} && npx eslint . --max-warnings=0 2>&1 | tail -20. Report gate='eslint', pass=true iff exit 0 (0 errors/warnings), detail=problem count. Read-only.`,
    { label:'verify:eslint', phase:'Verify', schema:VS }),
  () => agent(`cd ${FE} && npx vitest run --reporter=dot 2>/dev/null | tail -5. Report gate='vitest', pass=true iff 0 failed (expect 2433 passed), detail=Tests line. Read-only.`,
    { label:'verify:vitest', phase:'Verify', schema:VS }),
]).then((r)=>r.filter(Boolean))

return {
  fixed: fixed.map(f=>({ status:f.status, files:f.filesEdited, errorsFixed:f.errorsFixed, usedBang:f.usedNonNullAssertion, summary:f.summary })),
  verify: verify.map(v=>({ gate:v.gate, pass:v.pass, detail:v.detail })),
  allGreen: verify.every(v=>v.pass),
  cleanNullSafety: !fixed.some(f=>f.usedNonNullAssertion),
}
