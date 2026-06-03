export const meta = {
  name: 'nu-aura-aura-foundation',
  description: 'Aura redesign Phase 0: port tokens (alias old names), rebuild shell (product rail + nav panel + topbar + cmdK), align primitives + charts, publish CONTRACT.md. Logic untouched.',
  phases: [
    { title: 'Tokens', detail: 'Port Aura tokens into globals.css + tailwind + Mantine; alias old names; Roboto Mono' },
    { title: 'Shell+Kit', detail: 'Rebuild app shell, align primitives, build charts, write CONTRACT.md (parallel)' },
    { title: 'Verify', detail: 'tsc, lint, design-drift, dev compile' },
  ],
}

const FE = 'frontend'
const SRC = 'design-import/aura/project/app' // design reference (tokens.css, app.css, Primitives.jsx, Shell.jsx, Charts.jsx, *Page.jsx)
const SHOTS = 'design-import/aura/project/design_handoff_nu_aura_redesign/screenshots'

const CHARTER = `
NU-AURA "Aura" REDESIGN — Phase 0 Foundation. Production Next.js 14 (App Router) + TS strict + Mantine 8 + Tailwind.
This is a real, user-approved redesign. The design source of truth is in the repo at ${SRC}/ (read it) and screenshots at ${SHOTS}/.
Full handoff spec: design-import/aura/project/design_handoff_nu_aura_redesign/README.md (the "Design System" + "App Shell" + "Screens" sections are authoritative).

GOAL OF PHASE 0: recolor + re-system the WHOLE app via the shared layer so all ~261 routes inherit the new look, and stand up the new shell + primitives the page wave will consume. Recreate the design faithfully in OUR stack — do NOT copy the prototype's Babel/CDN/inline-JSX setup.

CORE CONSTRAINTS:
- Visual/design only. Do NOT change business logic, data fetching, routing behavior, auth guards, hooks order, or component public APIs/props/exports.
- Token-driven: every color/space/radius/shadow is a CSS var. NEVER hardcode hex in components. The repo runs scripts/check-styling-drift.mjs.
- Preserve the Wave-1 motion system already in globals.css (--motion-*, .hover-lift/.press-scale/.focus-ring/.motion-rise, @/components/motion, @/lib/animation) and the Aura motion spec (which matches it: --t-fast 120 / base 180 / slow 280, cubic-bezier(.4,0,.2,1), hover lift -1/-2px, transform-only overlays, never rest at opacity:0).
- Full light + dark parity. WCAG-AA contrast + visible focus. Roboto Mono + tabular-nums for ALL numerics (money, IDs, stats, counts).
- Icons: lucide-react (already a dep). Fonts: Montserrat (display), Open Sans (body), Roboto Mono (numerics).

AURA TOKEN VALUES (from ${SRC}/tokens.css — light; dark under :root[data-theme="dark"]):
accent #2952A3 (dark #6884dc) · accent-soft #eef2fc · bg-app #f4f6fb (dark #070a14) · surface #ffffff (dark #11162a) · surface-2 #f4f6fb (dark #0d1322) · surface-hover #eef1f8 · rail #0c1120 (dark #06080f) · nav #0f1424 (dark #080b16) · nav-active rgba(88,121,224,.18) · text-1 #0e1225 (dark #eef1f9) · text-2 #3a3f57 (dark #b7bdd4) · text-3 #6b7190 (dark #7e85a3) · border #e4e7f0 (dark #1e2540) · prod-hrms #4463cf / hire #0ea5a3 / grow #d97706 / fluence #8b5cf6 · status ok #167c45 / warn #b15a09 / err #cf2f2f / info=accent · chart 1 #2952A3 / 2 #6884dc / 3 #0ea5a3 / 4 #d97706 / 5 #8b5cf6 · radii lg 12 (cards), buttons/inputs 10 · shadows soft + 1px top highlight (--sh-sm/md/lg/pop) · page title 28/700/-0.02em, stat value 29/700 mono, micro-label 10.5/700 uppercase .1em.
`

const SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['filesEdited', 'summary', 'contract', 'risks', 'verifyStatus'],
  properties: {
    filesEdited: { type: 'array', items: { type: 'string' } },
    summary: { type: 'string' },
    contract: { type: 'string', description: 'Exact names of tokens/components/props/paths created, for downstream consumers' },
    risks: { type: 'array', items: { type: 'string' } },
    verifyStatus: { type: 'string' },
  },
}

// ── PHASE A: TOKENS (serial — blocks everything) ──
phase('Tokens')
const tokens = await agent(
  `${CHARTER}

TASK — Port the Aura token system so the whole app recolors at once. You exclusively own: ${FE}/app/globals.css, ${FE}/tailwind.config.js, and the Mantine theme (find it: grep for createTheme/MantineProvider under ${FE}; likely ${FE}/app/providers.tsx or a theme file).

Steps:
1. Read ${SRC}/tokens.css in full. Read ${FE}/app/globals.css to enumerate the EXISTING token names already used by the 261 routes + 47 components (e.g. --bg-main, --bg-surface, --bg-card, --bg-card-hover, --bg-elevated, --bg-sidebar, --text-heading, --text-primary, --text-secondary, --text-muted, --text-inverse, --border-subtle, --border-main, --border-strong, --border-focus, --accent, --status-*).
2. ADD the full Aura token set (light under :root, dark under the existing dark scope) — do NOT remove existing tokens and do NOT remove the Wave-1 motion layer.
3. ALIAS the existing token names to Aura values so existing components inherit the new palette automatically, e.g. --accent: #2952A3; --bg-card: var(--surface); --text-primary: var(--text-1); --border-main: var(--border); --bg-sidebar: var(--nav); etc. Map every existing name to its closest Aura equivalent for BOTH light and dark.
4. Reconcile the dark-mode mechanism: detect how the app currently toggles dark (class .dark on <html>, or data-theme). Aura uses :root[data-theme="dark"]. Make BOTH selectors carry the dark tokens (support whatever the existing ThemeToggle sets) so the toggle keeps working with full Aura dark parity.
5. Add the three Google Fonts (Montserrat/Open Sans/Roboto Mono) via the project's font strategy (next/font if used, else @import) and add a .num / tabular-nums utility class + apply --font-mono to numeric contexts via a utility. Wire --font-display/--font-sans/--font-mono.
6. Bridge the new tokens into tailwind.config.js (colors.accent scale, surface, text, border, rail, nav, prod-*, chart-*, status; radii; shadows) and into the Mantine theme (primaryColor/primaryShade mapped to the accent scale, fontFamily, defaultRadius) so Mantine components match.

Verify the app still typechecks and the existing pages pick up the new colors. Return the structured report; in 'contract' list EVERY token name available (Aura + aliases), the font variables, and the Tailwind/Mantine keys, verbatim.`,
  { label: 'tokens:port', phase: 'Tokens', schema: SCHEMA }
)
log('Tokens ported. ' + (tokens?.summary || '').slice(0, 300))
const TOKEN_NOTE = `\nTOKENS NOW AVAILABLE (use these exact names; do not edit globals.css/tailwind/mantine theme):\n${tokens ? JSON.stringify({ contract: tokens.contract, files: tokens.filesEdited }) : 'unavailable — use Aura token values from the charter'}\n`

// ── PHASE B: SHELL + KIT (parallel, disjoint ownership) ──
phase('Shell+Kit')
const B = [
  { key: 'shell', label: 'shell:rail-nav-topbar-cmdk',
    prompt: `TASK — Rebuild the APP SHELL to the Aura design. Reference: ${SRC}/Shell.jsx (ProductRail, NavPanel, TopBar, CommandPalette, PRODUCTS, NAV) + ${SRC}/index.html (wiring) + screenshots ${SHOTS}/02-dashboard-light.png and 04-employees.png. README "App Shell" section is authoritative for exact dimensions/copy.

You own the layout: ${FE}/components/layout/AppLayout.tsx (+ menuSections.tsx, AdminPageContent.tsx) and may CREATE new shell components under ${FE}/components/layout/ (e.g. ProductRail.tsx, NavPanel.tsx, TopBar.tsx, CommandPalette.tsx). You may also touch ${FE}/components/ui/Sidebar.tsx and MobileBottomNav.tsx if they feed the shell.

Build: (1) Product rail 72px (--rail) — NULogic gradient "N" mark, 4 product buttons HRMS/Hire/Grow/Fluence (product-colored active indicator + glow + tooltip), help + 34px avatar at bottom. (2) Nav panel 232px (--nav) — product header, workspace switcher, grouped nav (10px uppercase labels, 18px lucide icons, active = --nav-active + accent-300 icon, count pills incl. red Approvals badge), "Unlock NU-Grow" upsell footer. (3) Sticky top bar 60px — translucent --surface + blur(14px), panel-toggle, breadcrumbs, ⌘K search trigger (260px, shows ⌘K kbd), theme toggle, bell w/ dot, user block. (4) ⌘K command palette — 600px centered modal, global ⌘K/Ctrl+K listener, grouped results (Navigate/Actions/People), arrow/enter/esc keyboard nav, substring filter, scrim+Esc dismiss, transform-based entrance.

CRITICAL: Preserve AppLayout's existing public API (props/exports) and everything it wires — AuthGuard, providers, route children, mobile responsiveness. Feed the nav from the EXISTING menuSections registry (map our real routes to the rail products + nav groups); the ⌘K palette must navigate via the Next.js router (next/navigation), not a local state machine. Every existing route must still render inside the new shell. Use motion from @/components/motion + @/lib/animation. Mark client components with "use client". No hardcoded hex — tokens only.`,
    },
  { key: 'primitives', label: 'primitives:align',
    prompt: `TASK — Align the shared PRIMITIVES to the Aura look. Reference: ${SRC}/Primitives.jsx (Button, IconButton, Avatar, Badge, StatusBadge, Card, SectionHead, Stat, Field, Switch, Segmented, Check, Tabs, AvatarStack) + ${SRC}/app.css for the component CSS + screenshots.

You own ${FE}/components/ui/* (existing files) and ${FE}/components/ui/index.ts. Map Aura primitives onto our existing components (preserve their public props/exports): Button (variants ghost/primary/etc, sizes, icon/iconRight, press-scale), Card (pad/hover/lift), Stat/StatCard/PremiumMetricCard → Aura Stat (icon tile tinted, uppercase micro-label, 29px mono value, delta pill up=green/down=red/flat, sparkline slot, foot), StatusBadge + Badge (dot variants, STATUS_VARIANT map), Input/Field (icon, hint/error, 10px radius, inset shadow, focus ring), Select/Textarea, Switch, Tabs (with count), and ADD a new Segmented control (components/ui/Segmented.tsx) used by dashboard/attendance. Numerics use --font-mono + tabular-nums. Keep dark-mode + reduced-motion correct. Do NOT edit the shell, globals.css, tailwind, or charts. Keep all co-located tests green.`,
    },
  { key: 'charts', label: 'charts:svg-kit',
    prompt: `TASK — Build the Aura CHART kit. Reference: ${SRC}/Charts.jsx (Sparkline, AreaChart with hover crosshair+tooltip, Donut, BarsH, Ring) + screenshots (dashboard donut/area, attendance rings).

CREATE a new chart module you exclusively own: ${FE}/components/charts/ with Sparkline.tsx, AreaChart.tsx, Donut.tsx, Ring.tsx, BarsH.tsx and an index.ts barrel. The stack already has Recharts — you may implement these as thin Recharts wrappers OR port the prototype's hand-rolled SVG (whichever matches the spec more faithfully and stays token-driven). Use the chart-1..5 + chart-grid + chart-axis tokens, tabular-nums for value labels, animate fills (reduced-motion safe), and match the screenshots' look (e.g. Donut center label "88% present", Ring progress). Strongly typed props. Do NOT edit components/ui, the shell, or globals.css.`,
    },
  { key: 'contract', label: 'contract:doc',
    prompt: `TASK — Write the Phase-0 CONTRACT so the 10 page agents can build without stepping on shared code. CREATE ${FE}/AURA_CONTRACT.md documenting: (1) the token names + font vars now available (from the Tokens phase output below), (2) the primitive component public APIs in components/ui (props), (3) the chart components in components/charts, (4) the shell layout (how a page mounts inside it, breadcrumb/active-nav wiring), (5) the data model shapes from ${SRC}/data.js (Employee, Approval, AttendanceRow, LeaveBalance, PayrollRun, Asset, BenefitPlan, Report, Role, Integration) as a contract sketch, and (6) a file-ownership map (which route folder each future page agent owns). Read the design README "Screens" section and ${SRC}/data.js. This is a docs-only task — create exactly one markdown file. Keep it tight and accurate.`,
    },
]

const kit = await parallel(B.map((b) => () =>
  agent(`${CHARTER}${TOKEN_NOTE}\n\n${b.prompt}\n\nReturn the structured report; in 'contract' list the exact component names/props/paths you created or aligned.`,
    { label: b.label, phase: 'Shell+Kit', schema: SCHEMA })
)).then((r) => r.filter(Boolean))

log(`Shell+Kit done: ${kit.length}/${B.length}`)

// ── PHASE C: VERIFY ──
phase('Verify')
const V = [
  { key: 'typecheck', task: `cd ${FE} && npx tsc --noEmit. Report PASS/FAIL + first 25 errors verbatim. FIX trivial breakage caused by the foundation work (bad import of a new shell/chart component, token typo, missing "use client"). Pre-existing errors in untouched files (leave/approvals, travel) are not your concern.` },
  { key: 'lint-drift', task: `cd ${FE} && node scripts/check-styling-drift.mjs --quiet (report-only), then npx eslint components app/globals.css tailwind.config.js --max-warnings=0 (scope to changed areas if it floods). Report drift + any NEW lint errors; auto-fix safe ones with --fix.` },
  { key: 'build-sanity', task: `cd ${FE} && (npx next build --no-lint 2>&1 | tail -40 || true). If next build is too slow/heavy, instead start the dev server briefly and curl http://localhost:3000 for a 200, or fall back to "npx tsc --noEmit". Report whether the app compiles with the new shell + tokens. Do NOT commit anything.` },
]
const verify = await parallel(V.map((v) => () =>
  agent(`Verify Phase 0 of the NU-AURA Aura redesign foundation (Next.js 14 + Mantine + Tailwind). TASK (${v.key}): ${v.task}\nReturn the structured report: filesEdited = auto-fixes; summary = outcome; contract = ""; risks = unresolved items for human review; verifyStatus = PASS / PASS_WITH_WARNINGS / FAIL + one-line reason.`,
    { label: `verify:${v.key}`, phase: 'Verify', schema: SCHEMA })
)).then((r) => r.filter(Boolean))

return {
  tokens: tokens ? { files: tokens.filesEdited, contract: tokens.contract } : null,
  shellKit: kit.map((r) => ({ summary: r.summary, files: r.filesEdited, contract: r.contract })),
  verify: verify.map((r) => ({ status: r.verifyStatus, summary: r.summary, fixed: r.filesEdited })),
  followUps: [...(tokens?.risks || []), ...kit.flatMap((r) => r.risks || []), ...verify.flatMap((r) => r.risks || [])],
}
