export const meta = {
  name: 'nu-aura-visual-evolution',
  description: 'Evolve NU-AURA UI in place across all 4 apps: motion+token foundation, 47 shared components, per-app hero surfaces, then verify. Logic untouched.',
  phases: [
    { title: 'Foundation', detail: 'Motion/interaction token system + reusable Framer Motion primitives' },
    { title: 'Components', detail: 'Upgrade 47 shared components in place (8 clusters)' },
    { title: 'Apps', detail: 'Apply new primitives + motion to hero surfaces of all 4 apps' },
    { title: 'Verify', detail: 'Typecheck, design-drift/lint, component tests' },
  ],
}

const FE = 'frontend' // all paths relative to repo root /Users/fayaz.m/IdeaProjects/nulogic/nu-aura

const CHARTER = `
DESIGN CHARTER — NU-AURA "Studio Slate v2", evolved.
You are upgrading a PRODUCTION Next.js 14 (App Router) + TypeScript + Mantine + Tailwind app IN PLACE.
Goal adjectives: animated, professional, clean, robust. Tasteful, NOT flashy.

HARD CONSTRAINTS (violating these breaks the build or the design system):
- DO NOT change component logic, props, exports, data flow, business behavior, or test contracts. Visual + motion ONLY.
- Use existing CSS-var design tokens (e.g. var(--bg-card), var(--text-primary), var(--accent), var(--border-main)) and Tailwind utilities. NEVER hardcode hex colors, NEVER add inline style={{}} with literals. The repo runs scripts/check-styling-drift.mjs.
- Single-hue accent #2563EB only (light) / #5B8CF5 (dark). No new brand colors, no gradient text, no glassmorphism, no skeuomorphism. Color = signal, not decoration.
- Sidebar stays warm-dark (#0E111A) both modes. Light mode is canonical.
- Motion MUST be compositor-friendly: animate ONLY transform / opacity / clip-path / filter. Never animate width/height/top/left/margin/padding/font-size.
- ALWAYS honor prefers-reduced-motion (disable or reduce non-essential motion). Use the provided reduced-motion utilities/hook.
- Keep WCAG AA: visible focus rings (2px accent, offset), contrast preserved, keyboard nav intact, ARIA preserved.
- Preserve dark mode token coverage for everything you touch.

MOTION LANGUAGE (consume tokens/keyframes from globals.css created by the Foundation phase):
- Durations: --motion-fast (~120ms), --motion-base (~200ms), --motion-slow (~320ms). Easings: --ease-standard, --ease-out-expo, --ease-spring.
- Entrance: fade + 8px rise. Lists/grids: staggered reveal. Hover (cards/rows): -2px lift + elevation shadow. Buttons: press scale 0.98. Links: accent underline grow. Skeleton: shimmer. Route/page: subtle fade+rise transition.
- Prefer CSS transitions for simple state; use Framer Motion (already a dependency) for orchestrated/staggered/page motion.

STATES (robustness): every interactive surface must have intentional hover, focus-visible, active, disabled, loading, empty, and error treatments where applicable.

CONVENTIONS: components/ui = shared primitives. Import motion helpers from the Foundation phase (components/motion + lib/animation.ts). Do NOT edit components/ui/index.ts or app/globals.css or tailwind.config.js (Foundation owns those). Match surrounding code style.
`

const REPORT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['filesEdited', 'summary', 'motionAdded', 'risks', 'verifyStatus'],
  properties: {
    filesEdited: { type: 'array', items: { type: 'string' }, description: 'Relative paths actually edited/created' },
    summary: { type: 'string', description: '2-4 sentence summary of visual/motion changes' },
    motionAdded: { type: 'array', items: { type: 'string' }, description: 'Concrete motion/interaction behaviors added' },
    risks: { type: 'array', items: { type: 'string' }, description: 'Anything risky, skipped, or needing follow-up' },
    verifyStatus: { type: 'string', description: 'Result of self-check (imports resolve, no logic change, tests if run)' },
  },
}

// ---------- PHASE 1: FOUNDATION ----------
phase('Foundation')
const foundation = await agent(
  `${CHARTER}

TASK — Build the motion + interaction FOUNDATION that every other agent will consume. You own these files exclusively:
1. ${FE}/app/globals.css — ADD (do not remove existing tokens) a comprehensive motion layer:
   - Tokens under :root and the dark scope: --motion-fast/base/slow, --ease-standard (cubic-bezier(.4,0,.2,1)), --ease-out-expo (cubic-bezier(.16,1,.3,1)), --ease-spring (cubic-bezier(.34,1.56,.64,1)), elevation shadow tokens (--shadow-sm/md/lg/hover) tuned for the flat Studio Slate look, a focus-ring convention.
   - @keyframes: fade-rise, fade-in, scale-in, shimmer, stagger helpers.
   - Utility classes in @layer utilities/components: e.g. .motion-rise, .motion-fade, .hover-lift, .press-scale, .focus-ring, .skeleton-shimmer, .link-underline. Compositor-friendly only.
   - A global @media (prefers-reduced-motion: reduce) block that neutralizes non-essential motion (animation/transition durations -> minimal) for these utilities and keyframes.
2. ${FE}/lib/animation.ts — exported Framer Motion variants + helpers: fadeRise, staggerContainer(stagger), staggerItem, scaleIn, pageTransition, and a useReducedMotionSafe() helper (wrap framer-motion's useReducedMotion) returning variants or a no-op when reduced motion is preferred. Strongly typed.
3. ${FE}/components/motion/ — small reusable React primitives (client components): Reveal.tsx (fade+rise on mount/in-view via framer-motion), Stagger.tsx + StaggerItem.tsx (orchestrate list/grid entrance), PageTransition.tsx (wrap route content). Plus an index.ts barrel. All must respect reduced motion and accept className/children and forward refs where sensible.

Inspect existing tokens in ${FE}/app/globals.css and the Tailwind bridge first so names/conventions match. Check ${FE}/lib for an existing animation module and EXTEND rather than duplicate. Verify TypeScript compiles for the new files (npx tsc is heavy — at least ensure imports/types are correct). Return the structured report; in 'summary' include the EXACT names of every token, keyframe, utility class, variant, and component you created so downstream agents can use them verbatim.`,
  { label: 'foundation:motion-system', phase: 'Foundation', schema: REPORT_SCHEMA }
)

log('Foundation ready. Token/primitive names: ' + (foundation?.summary || 'n/a').slice(0, 400))

const FOUNDATION_NOTE = `\nFOUNDATION OUTPUT (use these exact names; import primitives from "@/components/motion" and variants from "@/lib/animation"):\n${foundation ? JSON.stringify({ summary: foundation.summary, files: foundation.filesEdited }) : 'foundation unavailable — use sensible defaults and CSS transitions'}\n`

// ---------- PHASE 2: SHARED COMPONENTS (8 disjoint clusters) ----------
phase('Components')
const CLUSTERS = [
  { key: 'actions', files: ['Button.tsx', 'ExportMenu.tsx', 'ThemeToggle.tsx', 'FileUpload.tsx', 'GoogleGLogo.tsx'],
    note: 'Buttons & action controls. Add press-scale, hover elevation, loading spinner states, focus rings, file-drop hover/active feedback.' },
  { key: 'forms', files: ['Input.tsx', 'Select.tsx', 'Textarea.tsx', 'Label.tsx', 'AccessibleFormField.tsx', 'EmployeeSearchAutocomplete.tsx'],
    note: 'Form inputs. Smooth focus transitions, animated label/helper/error reveal, validation state color via tokens, autocomplete dropdown enter/exit.' },
  { key: 'cards', files: ['Card.tsx', 'AnimatedCard.tsx', 'StatCard.tsx', 'Stat.tsx', 'PremiumMetricCard.tsx', 'DashboardGrid.tsx'],
    note: 'Cards & metrics. Hover-lift + elevation, in-view reveal, optional number count-up for metrics (respect reduced motion), consistent surface tokens. DashboardGrid should support staggered child entrance.' },
  { key: 'tables', files: ['DataTable.tsx', 'ResponsiveTable.tsx', 'TableFilterBar.tsx', 'AdvancedFilterPanel.tsx', 'EditableCell.tsx'],
    note: 'Data tables & filters. Row hover, sort-indicator transitions, filter panel slide/expand, editable-cell focus affordance, sticky header polish. Keep virtualization/perf intact.' },
  { key: 'badges', files: ['Badge.tsx', 'StatusBadge.tsx', 'Callout.tsx'],
    note: 'Badges, status pills, callouts. Subtle entrance, semantic token colors both modes, optional pulse for live/active status (reduced-motion safe).' },
  { key: 'overlays', files: ['Modal.tsx', 'ConfirmDialog.tsx', 'Toast.tsx', 'NotificationDropdown.tsx'],
    note: 'Overlays & feedback. Backdrop fade + content scale-in/rise, exit animations, toast slide+stack, dropdown enter/exit, focus trap preserved.' },
  { key: 'loading', files: ['Loading.tsx', 'Spinner.tsx', 'PremiumSpinner.tsx', 'Skeleton.tsx', 'EmptyState.tsx', 'empty-state-presets.tsx', 'ErrorBoundary.tsx'],
    note: 'Loading, skeleton, empty & error states. Shimmer skeletons, smooth spinner, friendly animated empty states, polished error boundary. These set perceived quality — make them feel intentional.' },
  { key: 'shell', files: ['Sidebar.tsx', 'MobileBottomNav.tsx'], layout: ['AppLayout.tsx', 'menuSections.tsx', 'AdminPageContent.tsx'],
    note: 'Navigation & app shell. Active-item accent transition, hover states, collapse/expand animation, mobile bottom-nav indicator slide, content area page-transition wrapper. Sidebar stays warm-dark. This is the most-seen surface — make it crisp.' },
]

const componentResults = await parallel(CLUSTERS.map((c) => () => {
  const uiPaths = c.files.map((f) => `${FE}/components/ui/${f}`)
  const layoutPaths = (c.layout || []).map((f) => `${FE}/components/layout/${f}`)
  const all = [...uiPaths, ...layoutPaths].join(', ')
  return agent(
    `${CHARTER}${FOUNDATION_NOTE}

TASK — Upgrade this cluster of SHARED components IN PLACE. You exclusively own ONLY these files (do not touch any other file, do not edit index.ts/globals.css/tailwind.config.js):
${all}

Focus: ${c.note}

For EACH file: Read it fully first. Apply the motion language + state robustness from the charter using the Foundation tokens/utilities/primitives by their exact names. Preserve every export, prop, ref, ARIA attribute, and behavior. If a component has a co-located .test.tsx, keep it green (run it if quick). Keep dark mode + reduced motion correct. Return the structured report listing exactly what you changed per file.`,
    { label: `component:${c.key}`, phase: 'Components', schema: REPORT_SCHEMA }
  )
})).then((r) => r.filter(Boolean))

log(`Components phase done: ${componentResults.length}/${CLUSTERS.length} clusters upgraded`)

// ---------- PHASE 3: PER-APP HERO SURFACES ----------
phase('Apps')
const APPS = [
  { key: 'hrms', note: 'NU-HRMS core. Hero surfaces under frontend/app: dashboard, dashboards, employees (list+detail), attendance, leave, payroll. Apply Reveal/Stagger entrance, page transitions, upgraded cards/tables/empty-loading states. Pick the primary landing + one representative list + one detail per area; do not attempt every route.' },
  { key: 'hire', note: 'NU-Hire. Hero surfaces: recruitment, careers, offer-portal, onboarding, preboarding. Same treatment.' },
  { key: 'grow', note: 'NU-Grow. Hero surfaces: performance, okr, goals, learning, surveys, feedback360, one-on-one. Same treatment.' },
  { key: 'fluence', note: 'NU-Fluence. Hero surfaces: fluence/* (wiki), announcements, knowledge, recognition, company-spotlight. Same treatment.' },
  { key: 'auth-marketing', note: 'Auth & public/marketing. Surfaces: auth, sign, reset-password, about, pricing, careers (public), contact, features. Polished entrance, hero motion, form transitions. Highest first-impression value.' },
  { key: 'me-admin', note: 'Self-service + settings + admin. Surfaces: me, settings, admin, security. Apply shell/page transitions and upgraded primitives.' },
]

const appResults = await parallel(APPS.map((a) => () =>
  agent(
    `${CHARTER}${FOUNDATION_NOTE}

TASK — Apply the evolved visual system to the HERO surfaces of one app area, IN PLACE. Files live under ${FE}/app/. 
Area: ${a.note}

Approach:
1. List the routes in your area (Glob/Grep under ${FE}/app). Identify the primary landing page + a representative list page + a representative detail page (3-6 pages max — be selective, this is a showcase pass not exhaustive).
2. For those pages: wrap content with the PageTransition primitive where appropriate, apply Reveal/Stagger to sections/cards/grids, ensure they use the upgraded shared components, and polish empty/loading states. Import primitives from "@/components/motion" and variants from "@/lib/animation".
3. Logic, data fetching, and props untouched. Tokens only — no hardcoded colors, no literal inline styles. Reduced-motion + dark-mode safe.

Do NOT edit shared components (another phase owns those), index.ts, globals.css, or tailwind.config.js. Stay within ${FE}/app/ for your area. Return the structured report listing the exact pages you upgraded and what motion you applied. In 'risks', note the most valuable remaining routes you did NOT get to.`,
    { label: `app:${a.key}`, phase: 'Apps', schema: REPORT_SCHEMA }
  )
)).then((r) => r.filter(Boolean))

log(`Apps phase done: ${appResults.length}/${APPS.length} app areas polished`)

// ---------- PHASE 4: VERIFY ----------
phase('Verify')
const VERIFY = [
  { key: 'typecheck', cmd: 'TypeScript', task: `Run a TypeScript check on the frontend to ensure the visual edits did not break types. From repo root: cd ${FE} && npx tsc --noEmit (use the project's tsconfig; if it is too slow or memory-heavy, scope to changed dirs or run "npx tsc --noEmit --incremental"). Report pass/fail and the FIRST 20 errors verbatim if any. If errors are caused by our edits and are trivial (missing import of a motion primitive, type of variant), FIX them in the offending file. Do not mask errors.` },
  { key: 'drift-lint', cmd: 'Design drift + ESLint', task: `From repo root: cd ${FE} && node scripts/check-styling-drift.mjs --quiet (reports token/hex/inline-style drift; never fails CI). Then run ESLint on the changed areas: npx eslint components/ui components/motion components/layout lib app --max-warnings=0 (or scope tighter if it floods). Report drift counts and any NEW lint errors introduced by the visual work; auto-fix safe issues (npx eslint --fix) where it does not change logic.` },
  { key: 'unit', cmd: 'Component tests', task: `From repo root: cd ${FE} && npx vitest run components/ui --silent (run the shared-component unit tests). If the path filter is unsupported, run "npx vitest run --silent" but cap output. Report pass/fail counts and the names of any failing tests with the assertion message. If a failure is purely a snapshot/markup change from intended visual work, note it as expected; if it's a real regression, summarize the cause.` },
]

const verifyResults = await parallel(VERIFY.map((v) => () =>
  agent(
    `You are verifying a large in-place visual/motion refactor of the NU-AURA frontend (Mantine + Tailwind + Framer Motion, Next.js 14). 
TASK (${v.cmd}): ${v.task}
Return the structured report: filesEdited = any files you auto-fixed; summary = the verification outcome; motionAdded = []; risks = unresolved failures or things a human must review; verifyStatus = PASS / PASS_WITH_WARNINGS / FAIL with one-line reason.`,
    { label: `verify:${v.key}`, phase: 'Verify', schema: REPORT_SCHEMA }
  )
)).then((r) => r.filter(Boolean))

// ---------- SYNTHESIS ----------
const allComponentFiles = componentResults.flatMap((r) => r.filesEdited || [])
const allAppFiles = appResults.flatMap((r) => r.filesEdited || [])
const allRisks = [
  ...(foundation?.risks || []),
  ...componentResults.flatMap((r) => r.risks || []),
  ...appResults.flatMap((r) => r.risks || []),
  ...verifyResults.flatMap((r) => r.risks || []),
]

return {
  foundation: foundation ? { files: foundation.filesEdited, summary: foundation.summary } : null,
  componentsUpgraded: componentResults.map((r) => ({ summary: r.summary, files: r.filesEdited })),
  appsPolished: appResults.map((r) => ({ summary: r.summary, files: r.filesEdited })),
  verify: verifyResults.map((r) => ({ status: r.verifyStatus, summary: r.summary, fixed: r.filesEdited })),
  totals: {
    foundationFiles: foundation?.filesEdited?.length || 0,
    componentFiles: allComponentFiles.length,
    appFiles: allAppFiles.length,
  },
  followUps: allRisks,
}
