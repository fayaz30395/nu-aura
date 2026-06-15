---
target: whole app (live prod-candidate, hrms-frontend-vert.vercel.app), harden+polish lens
total_score: 28
p0_count: 0
p1_count: 2
timestamp: 2026-06-15T16-48-54Z
slug: hrms-frontend-vert-vercel-app
---
## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Skeletons, `aria-busy`, live unread counts present; recruitment pipeline uses a bare spinner, not a skeleton. |
| 2 | Match System / Real World | 3 | Clean domain language; status badges carry icon+label+color, never color alone. |
| 3 | User Control and Freedom | 3 | Escape + click-outside on flyovers/modals; empty states carry recovery actions (mostly). |
| 4 | Consistency and Standards | 2 | Biggest weakness: three parallel card systems (`.card-aura`, `<Card>`, `lib/theme/design-system`) + two button systems; accent ships as `#2952A3` while spec says `#2563EB`. |
| 5 | Error Prevention | 3 | `ConfirmDialog`, Zod+RHF validation, disabled-while-loading buttons. |
| 6 | Recognition Rather Than Recall | 3 | Persistent product rail + nav panel + breadcrumbs; collapse state persisted. |
| 7 | Flexibility and Efficiency | 3 | Command palette, global search, keyboard focus rings, sidebar collapse. |
| 8 | Aesthetic and Minimalist Design | 3 | Flat restrained palette; loses a point to `backdrop-filter: blur()` baked into the base `.card-aura` and 4 identical metric tiles on the dashboard. |
| 9 | Error Recovery | 3 | `error.tsx` / `global-error.tsx`, inline auth errors, `.error-state` copy. |
| 10 | Help and Documentation | 2 | Single header help icon; empty-state descriptions carry most guidance. Thin but acceptable for internal tooling. |
| **Total** | | **28/40** | **Solid, ship-capable, not yet excellent** |

## Anti-Patterns Verdict

**Does this look AI-generated? No.** This is a lived-in, multiple-polish-wave product. The bans are enforced *as code with comments* (`PremiumMetricCard.tsx` documents "Replaces the banned hero-metric template"; `Callout.tsx` documents "Replaces the banned side-stripe"). Token foundation is senior-grade: 3-tier shadow scale with a 1px top-highlight inset, dark mode loaded pre-hydration to kill the theme flash, three-layer `prefers-reduced-motion` coverage, global WCAG focus rings. Empty/loading/error states are first-class and actually used at call sites.

**Deterministic scan (whole app, `app/` + `components/`):** 40 raw findings, but ~32 are false positives or intended deviations on inspection:
- The 26 `border-accent-on-rounded` hits are overwhelmingly legitimate active-tab underlines (`border-b-2 border-accent-500`) and table-header borders, not the banned left/right card side-stripe.
- `Callout.tsx:56 border-l-4` matched the string *inside a JSDoc comment that documents removing it*.
- `globals.css:2243 border-l-4` is the intended Fluence Tiptap blockquote accent.
- Most `em-dash-overuse` hits (incl. `globals.css` "1216 em-dashes") are CSS/code comments, not UI copy.

**Genuine deterministic findings (cross-validated with the source review):**
- `bounce-easing`: `--ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1)` (overshoot >1) in `globals.css:316`, applied via `.motion-scale-in` (1842) and wired into Sidebar/MobileBottomNav badges — violates the "no bounce/elastic, ease-out only" motion law.
- Brand-color leak: purple `#8b5cf6` / teal in chart tokens and `--nu-red-orange` notification dot + `nu-purple` workflow chips in product chrome.
- Real side-stripes: colored `border-l-4` on calendar leave entries (`leave/calendar:283`, `CalendarGridView:99`) — categorical data-viz, borderline.
- `EmployeeAvatar.tsx:51` raw `<img>` with no `onError` fallback to initials.

**Live visual confirmation (dark mode, logged in as HR Admin):** purple attendance donut + purple payroll-card underline on the dashboard, magenta/purple avatar chips on the Employees table — the brand-color leak is visible, not just in source.

## Overall Impression

This is a strong, genuinely-crafted internal platform that is past "AI slop" and close to release. The biggest opportunity is **system convergence**: a sound design system is being applied through 3+ competing surfaces, an off-spec accent, brand colors leaking into product chrome, and a bouncy easing that contradicts the "calm, quietly confident" brand. None of these are individually fatal; together they are exactly the "looks subtly different on every page" texture that reads as unpolished at prod scale. Fix the system once and every surface inherits the polish.

## What's Working

1. **Token foundation is production-grade.** 3-tier shadow scale with a 1px inset top-highlight, pre-hydration dark mode (no flash), global focus rings, triple-layer reduced-motion. This is the detail that separates "flat but cheap" from "flat and crafted."
2. **Empty/loading/error states are first-class and used.** "No upcoming events", "Connect Google", "No Job Selected" all render with icon + description; `EmptyState` has `role="status" aria-live="polite"` and a dashed (not colored-box) container.
3. **The Employees table is exemplary.** Filter chips with live counts, icon+label+color status badges, tabular mono dates, bulk-select, per-row overflow menus, clear hierarchy. Linear-like, low cognitive load.

## Priority Issues

**[P1] Brand colors leak into product UI (cross-validated: live + source + detector).**
- **Why it matters:** The brief explicitly bans lapis/red-orange/purple/teal in product UI; the product is single-hue blue. Yet the dashboard attendance donut and payroll underline are purple, avatar chips are magenta/purple, the TopBar notification dot is red-orange (`shell/TopBar.tsx:193`), and `app/workflows/page.tsx:120` uses `nu-purple` chips. This is the most-visible off-system texture.
- **Fix:** Repoint the donut/chart categorical tokens, notification dot, and workflow chips to accent + semantic status tokens. Leave the ProductRail *logo* gradient (legitimate brand moment).
- **Suggested command:** `/impeccable colorize`

**[P1] Three card systems + two button systems; accent ships off-spec.**
- **Why it matters:** `.card-aura` vs `<Card>` (CVA) vs `lib/theme/design-system.card` (wiki), plus `leave/apply` still on deprecated `.skeuo-card`. Hover/shadow/radius/padding drift silently between sub-apps. Separately, `--accent` ships `#2952A3` while the spec mandates `#2563EB` (and 4 files hardcode `#2563EB`) — two blues in one UI.
- **Fix:** Pick `<Card>`/`<Button>` (CVA) as canonical, alias the CSS classes to them, migrate wiki + `leave/apply`, add a lint gate. Decide the canonical accent once and grep-kill the strays.
- **Suggested command:** `/impeccable harden`

**[P2] Overshoot "spring" easing contradicts the no-bounce motion law.**
- **Why it matters:** `lib/animation.ts:36` `spring: [0.34, 1.56, 0.64, 1]` and `--ease-spring` overshoot >1 = bounce. Wired into nav badges, mobile bottom nav, and every `scaleIn` entrance. Bouncy chrome undercuts "Calm, Capable, Quietly confident."
- **Fix:** Repoint `--ease-spring` / `MOTION_EASE.spring` to `--ease-standard` or `--ease-out-expo`. One-line token change neutralizes all call sites.
- **Suggested command:** `/impeccable quieter`

**[P2] `backdrop-filter: blur()` baked into base surfaces + 4 identical metric tiles.**
- **Why it matters:** Blur on `.card-aura` / `.shell-panel` (`globals.css:827,838`) is a per-frame GPU cost on every card (scroll jank on long tables) for an effect invisible over opaque backgrounds — and the brief bans decorative glassmorphism. The dashboard's four identical big-number+label+colored-underline tiles also read as the hero-metric/identical-grid pattern the system claims to have retired.
- **Fix:** Remove `backdrop-filter` from base cards (keep only on translucent overlays). Differentiate the metric tiles by scale/grouping or convert to a denser non-tile summary.
- **Suggested command:** `/impeccable optimize` then `/impeccable layout`

**[P3] Empty-state dead-end + polish bugs.**
- **Why it matters:** The recruitment pipeline empty state ("No job openings found", disabled Add Applicant) gives a brand-new tenant no path to *create* a job — a dead-end at first-run. The dashboard "Expense" quick-action label is clipped. `global-error.tsx` carries em-dashes in user-facing copy.
- **Fix:** Add a "Create job opening" recovery CTA to the pipeline empty state; fix the truncated label; sweep `global-error` copy.
- **Suggested command:** `/impeccable onboard` then `/impeccable clarify`

## Persona Red Flags

**HR Admin (power user, long dense desk sessions — the primary user):**
- Live default is **dark mode**, but the design system names light as canonical for desk work / payroll / long table sessions. Either the deploy defaults wrong or it's a personal toggle worth confirming.
- The three card systems mean the Employees page looks subtly unlike Payroll looks unlike the Wiki — friction that compounds across an 8-hour session.
- Bulk-select bar exposes 5 simultaneous actions; otherwise excellent (command palette, keyboard focus, dense tables).

**First-time Employee (self-service, mobile, fragmented attention):**
- Dashboard opens with four metric tiles + multiple draggable widgets + "Connect Google" + "Start trial" upsell — high first-glance load competing with the actual task (apply leave / view payslip).
- Product-rail is icon-only; a first-timer leans on the text nav panel, which is good, but the rail icons alone aren't self-evident.

**Recruiter / Hiring Manager:**
- Pipeline first-run is a dead-end (no jobs → can't add applicants, no create-job CTA in view).
- Bouncy nav-badge easing reads as less "confident/calm" than the brand intends.
