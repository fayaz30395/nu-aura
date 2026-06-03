# AURA — Deep-Detail Fidelity Checklist (enforced by the polish pass)

Every restyled page must hit ALL of these against its screenshot in `design_handoff_nu_aura_redesign/screenshots/`. Token-driven only — no hardcoded hex.

## Color & tokens
- Surfaces: `--bg-app` page bg, `--surface` cards, `--surface-2` hover/sunken, `--rail`/`--nav` dark chrome. Borders `--border` / `--border-soft` / `--border-strong`.
- Text hierarchy: `--text-1` headings/values, `--text-2` body, `--text-3` muted/labels. Never pure black/gray.
- Accent `#2952A3` (dark `#6884dc`) for primary action, active state, focus ring, links, chart-primary, key emphasis ONLY. `--accent-soft` for selected rows / active palette item.
- Status: ok `--ok-fg`/`--ok-bg`/`--ok-bd`, warn, err, info(=accent), neutral — used semantically (Active=ok, On Leave=warn, Probation=primary/info, Terminated=err).
- Product accents on rail only: hrms `#4463cf` / hire `#0ea5a3` / grow `#d97706` / fluence `#8b5cf6`.
- Chart palette `--chart-1..5` + `--chart-grid` + `--chart-axis`; donut/area/ring/bars use these, never ad-hoc colors.

## Typography
- Page title 28px / 700 / -0.02em. Section head 15px / 700. Body 13–14px. Caption 12px.
- Micro-label 10.5px / 700 / uppercase / 0.1em tracking (the KPI labels, table column heads, group labels).
- Stat value 29px / 700, **Roboto Mono + tabular-nums**. ALL numerics (money, IDs, dates, counts, %) use `.num` / tabular-nums mono.
- Display = Montserrat, body = Open Sans, mono = Roboto Mono.

## Buttons (every variant + state)
- Primary: accent fill, white text, `--sh-sm`; hover brightens + lifts -1px; active insets (press shadow, translate-y-0); focus = `--sh-focus` 3px ring; disabled = reduced opacity, no lift.
- Ghost / secondary: transparent or `--surface`, `--border`; hover `--surface-2`; same focus ring.
- ghostdark (on dark upsell/bulk bars): subtle light-on-dark.
- Icon buttons: 18px lucide, hover bg, focus ring; bell carries a red dot.
- Sizes: xs / sm / md per spec; buttons & inputs radius 10px. Loading state = spinner, label preserved.

## Components & micro-detail
- Stat card: 38px rounded icon tile (tinted per-card via icon color @14%), micro-label, 29px mono value, delta pill (mono, up=green ▲ / down=red ▼ / flat=neutral, `white-space:nowrap`, trending-up/down/minus icon), Sparkline, foot note.
- StatusBadge/Badge: dot + label, semantic variant colors both modes, subtle.
- Table: column heads = micro-labels; 58px rows; row hover `--surface-2`; selected row `--accent-soft`; checkbox select-all over filtered set; bulk bar (accent bg) replaces toolbar when rows selected; kebab menu; pager "Showing N of M".
- Cards: radius `--r-lg` (12px), `--sh-sm`, hover = lift -1/-2px + `--sh-md`. Plan/report/saved cards are hoverable.
- Segmented: pill group, active = filled/accent; Tabs: underline/active + count pill.
- Slide-over (Employees): 480px right sheet + scrim, name-tinted gradient header, Overview/Documents/Timeline tabs; transform entrance, scrim+Esc dismiss.
- Approval chain / activity = vertical timeline with colored node icons.
- Pipelines (payroll 5-step): connector lines green where done, current step accent + soft ring.
- Rings/Donut: animated fill, center label (e.g. "88% present", "94%").
- Empty / loading / error states styled intentionally (shimmer skeletons, friendly empty), not default.

## Interaction & motion
- Hover/press on cards & rows; focus-visible ring on every interactive element; keyboard nav (tables, tabs, slide-over, ⌘K).
- Motion: `--t-fast/base/slow` (120/180/280), `cubic-bezier(.4,0,.2,1)`; transform/opacity only; reduced-motion safe; never rest at opacity:0.

## Copy
- Match the prototype's exact copy where the real page has no equivalent (greetings, section titles, button labels, empty-state text, upsell "Unlock NU-Grow / Start trial").

## Parity
- Light AND dark both intentional (token parity). WCAG-AA contrast + focus. Verify at 1440 / 1280 / 1024.
