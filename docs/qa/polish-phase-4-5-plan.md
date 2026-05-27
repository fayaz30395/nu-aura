# Polish Phase 4 + Phase 5 — Plan

**Date:** 2026-05-13
**Status:** Plan only. Phase 2 complete, Phase 3 multi-session in progress.

This document captures what Phases 4 and 5 will entail. Both are multi-session by nature; they cannot be compressed into a single autonomous run.

## Phase 4 — NU-Hire + NU-Grow + NU-Fluence per-sub-app polish

Phase 3 covers NU-HRMS (the largest, most foundational sub-app). Phase 4 takes the same systematic per-route polish — alignment, IA, typography, color, interaction states, motion, content, icons, forms, edge cases, responsiveness, performance, code quality, per [`/Users/fayaz.m/.claude/skills/impeccable/reference/polish.md`](file:///Users/fayaz.m/.claude/skills/impeccable/reference/polish.md) — to the three remaining sub-apps.

### Scope per sub-app

**NU-Hire (recruitment):** the card-sweep round (Phase 3) already touched the recruitment family. Phase 4 deepens it:
- Pipeline page (`/recruitment/pipeline/page.tsx`) — DnD interactions, candidate cards, stage column polish; this is the highest-traffic recruiter surface
- Candidate detail (`/recruitment/candidates/[id]`) — multi-tab layout (overview, history, scorecards, comments)
- Interviews (`/recruitment/interviews`) — schedule + history
- Agencies (`/recruitment/agencies`) — new API, less battle-tested
- Scorecards (`/recruitment/scorecards`) — form-heavy
- Career page (`/career`) — externally-facing, brand-leaning
- Onboarding templates (`/onboarding/templates`) — already partially polished
- E-sign flow (`/sign/[token]`) — signature canvas, ink constant extracted; the rest needs review

**NU-Grow (performance / learning):** the card-sweep round (Phase 3) already touched the performance family. Phase 4 deepens it:
- Reviews flow (`/reviews`, `/reviews/[id]`) — multi-step, multi-actor
- OKRs (`/okrs`) — tree/list visualizations
- 360 feedback (`/feedback`) — peer flows
- LMS courses (`/learning`, `/learning/courses/[id]`) — Phase 3 flattened the course hero; full course player needs polish
- Surveys (`/surveys`) — form-heavy
- Wellness (`/wellness`) — sensitive data, accessibility critical
- Certificates gallery (`/learning/certificates`) — already partially polished

**NU-Fluence (knowledge):** the card-sweep round (Phase 3) covered the wiki/blog landing surfaces. Phase 4 deepens it:
- Wiki article view (`/fluence/wiki/[slug]`) — Tiptap reader/editor, inline comments
- Blog post view (`/fluence/blogs/[slug]`) — long-form reader, hero metadata
- Wiki editor (creation/edit flow) — Tiptap toolbar, formatting menus
- Templates (`/fluence/templates`) — gallery + apply flow
- AI chat (`/fluence/ai-chat`) — chat interface, message bubbles, code blocks
- Wall / activity feed (`/fluence/wall`) — high-frequency surface
- Search (`/fluence/search`) — faceted, ranking-aware

### Per-route checklist (apply to every route)

Per polish.md:

1. **Information architecture & flow shape** — does this route reveal complexity the way neighboring routes do?
2. **Visual alignment & spacing** — everything snaps to the 8px grid (4px and 12px are off-grid violations per the lint rule)
3. **Typography refinement** — line length, hierarchy, no widows/orphans, font loading
4. **Color & contrast** — WCAG AA, tinted neutrals, no gray-on-color
5. **Interaction states** — default / hover / focus / active / disabled / loading / error / success
6. **Micro-interactions & transitions** — 150–280ms, ease-out, no bounce, reduced-motion respected
7. **Content & copy** — consistent terminology, capitalization, punctuation
8. **Icons & images** — same family, sized consistently, alt text, no layout shift
9. **Forms & inputs** — labels, required indicators, error messages, tab order
10. **Edge cases & error states** — loading, empty, error, success, long content, no content, offline
11. **Responsiveness** — sm/md/lg breakpoints, 44×44 touch targets, no horizontal scroll
12. **Performance** — fast initial load, no CLS, smooth interactions, lazy loading
13. **Code quality** — no console logs, no commented code, no unused imports, semantic HTML, ARIA

### Approach

Phase 4 is per-route work that benefits from running the dev server and using the feature in a browser. Realistic pace: 5–10 routes per focused session. Total NU-Hire + NU-Grow + NU-Fluence ≈ 80+ routes, so **multi-week, multi-session**.

Recommend: pick the highest-traffic route per sub-app first (pipeline, OKR list, wiki article view). Land each as a reference implementation that subsequent routes mirror. Use `mcp__claude-in-chrome__*` tools for screenshots before/after.

## Phase 5 — Cross-bundle consistency pass

After Phases 3 and 4 land, Phase 5 audits **cross-bundle drift** — places where comparable flows look or behave differently across sub-apps.

### Areas to compare

1. **Approval workflows** — leave approval, expense approval, candidate stage advance, review submission. Should share the same UI shape, button placement, confirmation patterns.
2. **Search affordances** — global search vs sub-app search vs in-page filter. Same input style, results format, empty state, keyboard shortcuts.
3. **Filter chips** — used in candidates, leaves, employees, blog posts. Same chip style, clear-all button, count display.
4. **Empty states** — already standardized via `<EmptyState />`, but every route should use it.
5. **Error toasts vs error inline** — when does each kick in?
6. **Loading skeletons** — `.skeleton-aura` vs `<Skeleton>` usage should be consistent per content type.
7. **Pagination** — table pagination vs infinite scroll. Pick per data shape, use consistently.
8. **Modals vs drawers** — for the same conceptual action (e.g., "edit X"), one sub-app shouldn't use a modal while another uses a drawer.
9. **Date / time formatting** — Phase 1 audit flagged ~785 unzoned `now()` calls in backend. Frontend formatting should be consistent: `MMM d, yyyy` for dates, `h:mm a` for times, relative ("2h ago") for activity feeds.
10. **Status badge wording** — "Active" vs "Enabled", "Pending" vs "In Review" — flatten the vocabulary.

### Approach

Phase 5 needs a comprehensive **cross-bundle inventory**: for each comparable flow, document how each sub-app implements it; identify the canonical implementation; converge the others. This is a 1–2 week dedicated session.

### Output

`docs/qa/polish-phase-5-cross-bundle-audit.md` listing every divergent flow with: file:line evidence per sub-app, recommended canonical, conversion priority.

## Phase 6 (informal) — Mantine theme reconciliation

Discovered during Phase 3: `frontend/styles/compact-theme.ts` is NOT a Mantine theme (it's a Tailwind class catalogue). Every Mantine component is rendering with library defaults — Studio Slate v2 tokens are not propagated to Mantine.

This is a standalone 1-day session: write a real `createTheme()` config wired to `--accent-primary`, `--bg-card`, `--text-primary`, etc. Wire `colorScheme` to the `<html class="dark">` toggle. Standardize button/input height at 36px across `globals.css`, DESIGN.md, the new Mantine theme. Rename `compact-theme.ts` to `tailwind-presets.ts` to reflect what it actually is.

See `docs/qa/polish-phase-3-progress.md` § "Mantine theme audit" for the 0/8-axis scorecard.

## Phase 7 (informal) — Marketing pages content decision

Discovered during Phase 3 brand audit: NU-AURA has 5 marketing-shaped pages (`about`, `pricing`, `features`, `contact`, `AppLandingHero`) that PRODUCT.md says don't need to exist (NU-AURA is internal, no customer, no $-pricing). They're "worst-of-both" — neither committed brand register nor honoring product restraint.

This is a content decision more than a code decision: do these pages stay or get deleted? AppLandingHero has already been converted to product register in Phase 3. The remaining four pages need stakeholder input before any further polish work.

## Estimated time-to-complete (informal)

| Phase | Estimate | Approach |
|---|---|---|
| Phase 4 (Hire + Grow + Fluence per-route) | 4–8 weeks at 1 focused session/day | Per-route systematic polish |
| Phase 5 (cross-bundle) | 1–2 weeks | Comprehensive inventory + convergence |
| Phase 6 (Mantine reconciliation) | 1 day | Single focused session |
| Phase 7 (marketing decision) | 0–1 day code + stakeholder time | Conditional on content decision |

This is not pessimism — it's the realistic cost of "polish all of NU-AURA at flagship quality" the user asked for. Phase 2 (mechanical sweeps) was the fast part. Per-route polish is the long part.
