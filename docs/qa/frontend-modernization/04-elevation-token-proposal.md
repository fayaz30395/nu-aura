# Phase 2 — Elevation Token Proposal (opt-in)

A layer **on top of** Studio Slate, not a global restyle. Screens opt in via a scope attribute; everything else is untouched. Accent `#2952A3` unchanged. Decision taken: **warm-neutral surface shift** (vs cool slate).

## Mechanism
A scope wrapper — proposed `[data-altitude="elevated"]` set by `AppLayout` on its content root for employee routes (route-allowlist driven, mirrors the existing employee/operator split). It **remaps a small set of CSS vars** layered on the existing ones in `globals.css`. No new color system, no new dependency, fully reversible by removing the attribute/block.

```css
[data-altitude="elevated"] {
  /* Surfaces — warm-neutral, low saturation */
  --elv-surface-flat:      #FFFFFF;   /* dark: #1C1813 */  /* base card */
  --elv-surface-app:       #FAF8F5;   /* dark: #14110E */  /* page bg   */
  --elv-surface-highlight: #F4EFE9;   /* dark: #221D17 */  /* hero band, identity zones */

  /* Radius — generous (vs dense 10–12px operator) */
  --elv-r-sm: 8px;  --elv-r-md: 12px;  --elv-r-lg: 16px;  --elv-r-xl: 24px;

  /* Shadows — soft, tinted to warm bg hue; never neon/glow */
  --elv-shadow-subtle: 0 1px 2px rgba(40,30,20,.04), 0 1px 3px rgba(40,30,20,.06);
  --elv-shadow-medium: 0 2px 8px rgba(40,30,20,.06), 0 8px 24px rgba(40,30,20,.08);
  --elv-shadow-strong: 0 8px 32px rgba(40,30,20,.10);

  /* Spacing — calmer vertical rhythm */
  --elv-space-section: clamp(2rem, 4vw, 3.5rem);
  --elv-space-card:    clamp(1.25rem, 2vw, 1.75rem);
  --elv-space-hero:    clamp(1.5rem, 3vw, 2.5rem);

  /* Interaction — designed, tactile */
  --elv-hover:  translateY(-2px) + --elv-shadow-medium;
  --elv-active: translateY(-1px);            /* tactile push */
  --elv-focus:  0 0 0 3px color-mix(in oklab, #2952A3 35%, transparent);

  /* Identity — photo-forward */
  --elv-avatar-sm:32px; --elv-avatar-md:48px; --elv-avatar-lg:72px; --elv-avatar-xl:112px;
  --elv-avatar-ring: 0 0 0 3px var(--elv-surface-flat);
}
```
(Dark-mode values resolve via the existing `.dark` scope; warm-charcoal surfaces above.)

## Token table — purpose / usage / exclusions
| Token group | Purpose | Used by | **Excluded** |
|---|---|---|---|
| `--elv-surface-*` | Warm, layered surfaces | ProfileHero, directory cards, `/me/*`, wall/recognition/wellness | `/admin/*`, ops `/dashboard`, payroll, reports, recruitment ATS, settings/rbac, dense tables |
| `--elv-r-*` | Softer corners | hero, cards, avatars, photo tiles | operator tables/forms (keep 10–12px) |
| `--elv-shadow-*` | Depth = hierarchy | raised cards, hero, hover lift | flat operator surfaces |
| `--elv-space-*` | Breathing rhythm | employee page shells | dense operator screens (no density loss) |
| `--elv-hover/active/focus` | Designed states | directory cards, action clusters, nav tiles | (focus ring universal/a11y) |
| `--elv-avatar-*` | Photo prominence | ProfileHero, directory grid, people lists | — |

## Taste guardrails (Stitch lens, within Studio Slate)
Tinted soft shadows (no glow/neon) · generous radius for warmth · skeletal-not-spinner loading · composed empty states · tactile `-1px` active · photo as first-class. **Non-goals honored:** no glassmorphism, no decorative gradients, no new heavy deps, accent unchanged, operator density preserved.

## Validation hook
The token block is additive and inert until a screen sets `data-altitude="elevated"`. First wiring target: `app/me/dashboard` + `ProfileHero`, validated light/dark/375/768/1440 before broad rollout.
