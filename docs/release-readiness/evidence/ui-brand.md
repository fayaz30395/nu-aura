# UI design tokens, Wave 1 (neutral Apple-style system, Geist, refined blue)

Source of truth: `frontend/app/globals.css`. Mantine (`styles/mantine-theme.ts`) and Tailwind (`tailwind.config.js`) read from it. Token names kept; new names added: `--surface-elevated`, `--text-tertiary`, `--accent-subtle`, `--focus-ring`, `--overlay`, `--sh-overlay`, `--text-display/page-heading/section/card/body/caption` (+ line-height/tracking).

Token map, old -> new (light / dark)

| Token | Old | Light | Dark |
|---|---|---|---|
| `--accent` (+ hover) | blue #244288 / #6884DC | #2563EB (#1D4ED8) | #6EA8FE (#8DBBFF) |
| `--btn-primary-bg` | blue | #2563EB (hover #1D4ED8) | #2563EB (hover #1D4ED8), white label |
| `--btn-primary-gradient*`, `--nu-grad-*`, `--bg-pattern`, shell gradient | gradients | `none` / flat | `none` / flat |
| `--aura-accent-50..950` (Tailwind brand/accent/primary, Mantine `aura`) | old blue scale | #EFF4FF ... #172554, 600 = #2563EB | same |
| `--bg-app` / `--surface` / `--surface-aura-2` | #F4F6FB / #FFF / #F4F6FB | #F5F5F7 / #FFFFFF / #FAFAFC | #111113 / #1C1C1F / #242428 (elevated #2C2C30) |
| `--text-1/2/3` | #0E1225 / #3A3F57 / #6B7190 | #1D1D1F / #48484D / #68686D | #F5F5F7 / #D1D1D6 / #A1A1AA |
| `--border` / soft / strong | blue-grey | #E5E5EA / #EEEEF2 / #D1D1D6 | #34343A / #2A2A2F / #44444B |
| ok / warn / err / info fg | #167C45 / #B15A09 / #CF2F2F / blue | #1F7A45 / #8F5F12 / #C62F3E / #44659A | #4CC38A / #E5B567 / #F0707C / #8FA9D4 |
| chart-1..4, prod-* | blue/teal/amber/violet | #2563EB, #6B7FA8, #1F8A4C, #B7791F | #6EA8FE, #8FA9D4, #4CC38A, #E5B567 |
| nav / rail | #0F1424 | #1D1D1F / #141416 | #17171A / #0E0E10 |
| fonts | Open Sans / Montserrat / Roboto Mono | Geist Sans (UI + headings), Geist Mono | same |
| motion | 120/200/280ms, ease-standard | 150/200/250ms, cubic-bezier(0.2,0,0,1) | same; reduced-motion also zeroes animations |

Notes
- Warn light fg is #8F5F12 (not #B7791F, 3.9:1 on its tint). Light text-3 is #68686D (#6E6E73 gave 4.42 on hover surface).
- Geist loaded in `app/layout.tsx` via `next/font/google` (variable font: one file covers 400-700; latin, swap). Tailwind/Mantine use `--font-sans` / `--font-display` / `--font-mono` with system-ui fallbacks. `tabular-nums` applied to table/td/th and `.tabular-nums`.
- Not changed: Tailwind `nu-red/nu-purple/nu-teal` utility palettes (explicit brand names, not the shared accent); spacing/radius/control tokens already match the 8px scale (radius 6/8/12/16).

## Contrast results (`node evidence/scripts/ui-brand/contrast.mjs`)
```

== light ==
PASS  15.46 (>=4.5)  heading on page  [--text-heading / --bg-page]
PASS  16.83 (>=4.5)  heading on card  [--text-heading / --bg-card]
PASS  15.46 (>=4.5)  body on page  [--text-primary / --bg-page]
PASS  16.83 (>=4.5)  body on card  [--text-primary / --bg-card]
PASS   9.09 (>=4.5)  secondary on card  [--text-secondary / --bg-card]
PASS   8.35 (>=4.5)  secondary on page  [--text-secondary / --bg-page]
PASS   5.54 (>=4.5)  muted on card  [--text-muted / --bg-card]
PASS   5.09 (>=4.5)  muted on page  [--text-muted / --bg-page]
PASS   4.83 (>=4.5)  muted on hover  [--text-muted / --surface-hover]
PASS   5.17 (>=4.5)  primary button label  [--text-inverse-btn / --btn-primary-bg]
PASS   6.70 (>=4.5)  primary button label (hover)  [--text-inverse-btn / --btn-primary-bg-hover]
PASS   6.70 (>=4.5)  link/accent text on card  [--accent-text / --bg-card]
PASS   6.15 (>=4.5)  link/accent text on page  [--accent-text / --bg-page]
PASS   5.87 (>=4.5)  accent text on accent-soft  [--accent-text / --accent-soft]
PASS   9.99 (>=4.5)  sidebar text on nav  [--on-rail / --nav]
PASS   6.57 (>=4.5)  sidebar dim text on nav  [--on-rail-dim / --nav]
PASS  16.83 (>=4.5)  sidebar active text on nav  [--sidebar-text-active / --nav]
PASS   4.82 (>=4.5)  ok on ok-bg  [--ok-fg / --ok-bg]
PASS   5.13 (>=4.5)  warn on warn-bg  [--warn-fg / --warn-bg]
PASS   4.77 (>=4.5)  err on err-bg  [--err-fg / --err-bg]
PASS   5.19 (>=4.5)  info on info-bg  [--info-fg / --info-bg]
PASS   6.45 (>=4.5)  neutral on neutral-bg  [--neutral-fg / --neutral-bg]
PASS   5.42 (>=4.5)  err text on card  [--err-fg / --bg-card]
PASS   1.52 (>=1.5)  border strong on card (UI)  [--border-strong / --bg-card]
PASS   5.17 (>=3)  focus ring/border on card (UI)  [--border-focus / --bg-card]
PASS   5.17 (>=3)  chart-1 on card (graphic)  [--chart-1 / --bg-card]
PASS   4.02 (>=3)  chart-2 on card (graphic)  [--chart-2 / --bg-card]
PASS   4.38 (>=3)  chart-3 on card (graphic)  [--chart-3 / --bg-card]
PASS   3.64 (>=3)  chart-4 on card (graphic)  [--chart-4 / --bg-card]

== dark ==
PASS  17.32 (>=4.5)  heading on page  [--text-heading / --bg-page]
PASS  15.61 (>=4.5)  heading on card  [--text-heading / --bg-card]
PASS  17.32 (>=4.5)  body on page  [--text-primary / --bg-page]
PASS  15.61 (>=4.5)  body on card  [--text-primary / --bg-card]
PASS  11.17 (>=4.5)  secondary on card  [--text-secondary / --bg-card]
PASS  12.40 (>=4.5)  secondary on page  [--text-secondary / --bg-page]
PASS   6.63 (>=4.5)  muted on card  [--text-muted / --bg-card]
PASS   7.36 (>=4.5)  muted on page  [--text-muted / --bg-page]
PASS   5.43 (>=4.5)  muted on hover  [--text-muted / --surface-hover]
PASS   5.17 (>=4.5)  primary button label  [--text-inverse-btn / --btn-primary-bg]
PASS   6.70 (>=4.5)  primary button label (hover)  [--text-inverse-btn / --btn-primary-bg-hover]
PASS   8.65 (>=4.5)  link/accent text on card  [--accent-text / --bg-card]
PASS   9.60 (>=4.5)  link/accent text on page  [--accent-text / --bg-page]
PASS   7.72 (>=4.5)  accent text on accent-soft  [--accent-text / --accent-soft]
PASS  10.62 (>=4.5)  sidebar text on nav  [--on-rail / --nav]
PASS   6.98 (>=4.5)  sidebar dim text on nav  [--on-rail-dim / --nav]
PASS  17.89 (>=4.5)  sidebar active text on nav  [--sidebar-text-active / --nav]
PASS   6.79 (>=4.5)  ok on ok-bg  [--ok-fg / --ok-bg]
PASS   7.72 (>=4.5)  warn on warn-bg  [--warn-fg / --warn-bg]
PASS   5.47 (>=4.5)  err on err-bg  [--err-fg / --err-bg]
PASS   6.32 (>=4.5)  info on info-bg  [--info-fg / --info-bg]
PASS  10.78 (>=4.5)  neutral on neutral-bg  [--neutral-fg / --neutral-bg]
PASS   5.92 (>=4.5)  err text on card  [--err-fg / --bg-card]
PASS   1.76 (>=1.5)  border strong on card (UI)  [--border-strong / --bg-card]
PASS   7.04 (>=3)  focus ring/border on card (UI)  [--border-focus / --bg-card]
PASS   7.04 (>=3)  chart-1 on card (graphic)  [--chart-1 / --bg-card]
PASS   7.12 (>=3)  chart-2 on card (graphic)  [--chart-2 / --bg-card]
PASS   7.67 (>=3)  chart-3 on card (graphic)  [--chart-3 / --bg-card]
PASS   9.02 (>=3)  chart-4 on card (graphic)  [--chart-4 / --bg-card]

ALL PASS
```
