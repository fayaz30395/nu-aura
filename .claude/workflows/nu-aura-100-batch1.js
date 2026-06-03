export const meta = {
  name: 'nu-aura-100-batch1',
  description: 'Execute batch 1 toward 100/100: fix the P0 rules-of-hooks crash, clear the 97-warning lint gate, and apply cheap CWV wins — all frontend, no infra. Then verify tsc + eslint(--max-warnings=0) + the full 2433 unit suite stay green.',
  phases: [
    { title: 'Fix', detail: '3 agents on disjoint frontend areas (hooks crash, lint gate, perf)' },
    { title: 'Verify', detail: 'central gates: tsc=0, eslint max-warnings=0, vitest 2433 pass' },
  ],
}

const FE = '/Users/fayaz.m/IdeaProjects/nulogic/nu-aura/frontend'
const GUARD = `STRICT RULES: visual/behavior-preserving fixes only. Do NOT change data fetching, hooks ORDER semantics (except the explicit hoist fix), props, permissions, or business logic. Use Aura design tokens (var(--*)) — never hardcoded hex. After editing, re-read each file to confirm JSX balance + imports. Verify your own area before returning.`
const S = { type:'object', additionalProperties:false, required:['status','filesEdited','summary','residualIssues'], properties:{
  status:{type:'string',description:'PASS|PARTIAL|FAIL for this area'},
  filesEdited:{type:'array',items:{type:'string'}},
  summary:{type:'string'},
  residualIssues:{type:'array',items:{type:'string'}} } }

phase('Fix')
const fixes = await parallel([
  // Agent 1 — P0 rules-of-hooks crash (owns this ONE file exclusively)
  () => agent(`${GUARD}\n\nP0 FIX — react-hooks/rules-of-hooks crash. File (yours exclusively): ${FE}/app/leave/approvals/page.tsx.\nProblem: an early return (~line 74: if (!hasHydrated || !isAuthenticated) ...) is followed by 8 useState + 3 useMemo (~lines 81-95), so 11 hooks run conditionally — a real unauthenticated-user crash in React 18 concurrent. FIX: hoist ALL hook calls (useState/useMemo/useEffect/useCallback/custom hooks) ABOVE the early-return guard so they run unconditionally on every render; keep the guard's render result (return <Spinner/> / null) AFTER all hooks. Preserve every hook's args and order otherwise. Also clear any unused-import eslint warnings IN THIS FILE.\nVerify: cd ${FE} && npx eslint app/leave/approvals/page.tsx  -> exit 0 (0 errors, 0 warnings). Report status.`,
    { label:'fix:hooks-p0', phase:'Fix', agentType:'react-build-resolver', schema:S }),

  // Agent 2 — lint gate: all remaining warnings EXCEPT the file agent 1 owns
  () => agent(`${GUARD}\n\nFIX THE LINT GATE. cd ${FE}. The script \`eslint . --max-warnings=0\` currently reports 97 warnings; CI is broken. Clear them ALL, with ONE exclusion: do NOT touch app/leave/approvals/page.tsx (another agent owns it).\nCategories: (a) ~66 design-system no-restricted-syntax 'off the 8px grid' warnings — replace off-grid Tailwind spacing (p-3/gap-3/space-y-3 = 12px, etc.) with the nearest approved 8px-grid value (p-2/p-4, gap-2/gap-4, space-y-2/space-y-4) that preserves layout intent; in skeleton/loading files match the real component's spacing. (b) ~20 @typescript-eslint/no-unused-vars unused imports in surveys, fluence (and others, NOT leave) — remove the unused import/var, or prefix with _ if it's an intentionally-unused param. (c) ~11 no-console in root-level *.mjs scripts — either remove the console.* or add an eslint-disable-next-line with a one-word reason, whichever the file's purpose warrants (these are dev scripts; disabling is acceptable).\nRun \`npx eslint . --max-warnings=0\` iteratively until it exits 0 — but treat app/leave/approvals/page.tsx's own warnings as out-of-scope (agent 1 clears them; the final gate will confirm). Report status + every file edited.`,
    { label:'fix:lint-gate', phase:'Fix', agentType:'frontend-specialist', schema:S }),

  // Agent 3 — cheap CWV wins (perf-owned files)
  () => agent(`${GUARD}\n\nCWV QUICK WINS (perf). cd ${FE}.\n1) LCP image: find the single above-the-fold hero/LCP next/image (likely in app/(public) landing, app/page.tsx, or the auth login brand panel) and add priority + fetchPriority="high" + explicit width/height if missing. Do NOT add priority to more than the one true LCP image.\n2) Fonts: in the font setup (app/layout.tsx or a fonts module using next/font), ensure display:'swap' on each font, and preload ONLY the one critical family/weight; if two families load eagerly (e.g. a sans + Roboto Mono) and one is non-critical, set its preload:false. Keep both families available — just stop eagerly preloading the non-critical one.\nThese must be visual no-ops at desktop. Avoid files owned elsewhere (do NOT touch app/leave/approvals/page.tsx). Report status + files.`,
    { label:'fix:cwv', phase:'Fix', agentType:'performance-engineer', schema:S }),
]).then((r)=>r.filter(Boolean))

log(`Fix: ${fixes.flatMap((f)=>f.filesEdited||[]).length} files across ${fixes.length} areas; statuses ${fixes.map(f=>f.status).join('/')}`)

phase('Verify')
const VS = { type:'object', additionalProperties:false, required:['gate','pass','detail'], properties:{
  gate:{type:'string'}, pass:{type:'boolean'}, detail:{type:'string'} } }
const verify = await parallel([
  () => agent(`cd ${FE} && npx tsc --noEmit 2>&1 | tail -40. Report gate='tsc', pass=true iff ZERO 'error TS' lines, detail=count + first errors if any. Read-only; do not edit.`,
    { label:'verify:tsc', phase:'Verify', schema:VS }),
  () => agent(`cd ${FE} && npx eslint . --max-warnings=0 2>&1 | tail -40. Report gate='eslint', pass=true iff exit 0 (0 errors AND 0 warnings), detail=the problem count line. Read-only; do not edit.`,
    { label:'verify:eslint', phase:'Verify', schema:VS }),
  () => agent(`cd ${FE} && npx vitest run --reporter=dot 2>/dev/null | tail -5. Report gate='vitest', pass=true iff the Tests line shows 0 failed (expect 2433 passed), detail=the Tests summary line. Read-only; do not edit.`,
    { label:'verify:vitest', phase:'Verify', schema:VS }),
]).then((r)=>r.filter(Boolean))

return {
  fixes: fixes.map((f)=>({ status:f.status, files:f.filesEdited, summary:f.summary, residual:f.residualIssues })),
  verify: verify.map((v)=>({ gate:v.gate, pass:v.pass, detail:v.detail })),
  allGreen: verify.every((v)=>v.pass),
}
