---
title: "Design System: NU-AURA — Studio Slate"
tags: ["area/design","type/reference","layer/frontend","type/guide"]
summary: "Canonical Studio Slate v2 design system: color tokens, typography hierarchy, elevation/shadow vocabulary, component patterns, and do/don't rules for all frontend surfaces."
name: NU-AURA — Studio Slate
description: The quiet operating system for NULogic. One login, four sub-apps, one restrained design language.
colors:
  accent-primary: "#2952A3"
  accent-hover: "#244288"
  accent-soft: "#eef2fc"
  accent-dark: "#6884dc"
  bg-app: "#f4f6fb"
  surface: "#ffffff"
  surface-hover: "#eef1f8"
  surface-sunken: "#f0f3f9"
  sidebar: "#0f1424"
  text-primary: "#0e1225"
  text-secondary: "#3a3f57"
  text-muted: "#6b7190"
  border-main: "#e4e7f0"
  border-subtle: "#eef0f6"
  border-strong: "#d4d8e6"
  success: "#167c45"
  warning: "#b15a09"
  danger: "#cf2f2f"
  info: "#2952A3"
  prod-hrms: "#4463cf"
  prod-hire: "#0ea5a3"
  prod-grow: "#d97706"
  prod-fluence: "#8b5cf6"
  dark-bg-app: "#070a14"
  dark-surface: "#11162a"
  dark-surface-hover: "#182040"
typography:
  display:
    fontFamily: "Montserrat, \"Open Sans\", system-ui, sans-serif"
    fontSize: "30px"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.01em"
  headline:
    fontFamily: "Montserrat, \"Open Sans\", system-ui, sans-serif"
    fontSize: "24px"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Montserrat, \"Open Sans\", system-ui, sans-serif"
    fontSize: "20px"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "-0.01em"
  body:
    fontFamily: "\"Open Sans\", system-ui, -apple-system, \"Segoe UI\", sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "normal"
  label:
    fontFamily: "\"Open Sans\", system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 600
    lineHeight: "16px"
    letterSpacing: "0.05em"
  stat:
    fontFamily: "\"Roboto Mono\", ui-monospace, SFMono-Regular, Menlo, monospace"
    fontSize: "30px"
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: "normal"
rounded:
  xs: "5px"
  sm: "7px"
  md: "9px"
  control: "10px"
  lg: "12px"
  xl: "16px"
  2xl: "22px"
  pill: "999px"
spacing:
  1: "4px"
  2: "8px"
  3: "12px"
  4: "16px"
  5: "20px"
  6: "24px"
  8: "32px"
  10: "40px"
  12: "48px"
components:
  button-primary:
    backgroundColor: "{colors.accent-primary}"
    textColor: "#ffffff"
    rounded: "{rounded.lg}"
    padding: "0 14px"
    height: "36px"
  button-primary-hover:
    backgroundColor: "{colors.accent-hover}"
    textColor: "#ffffff"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.lg}"
    padding: "0 14px"
    height: "36px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.text-secondary}"
    rounded: "{rounded.lg}"
    padding: "0 14px"
    height: "36px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.lg}"
    padding: "0 14px"
    height: "36px"
  input-focus:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-primary}"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.lg}"
    padding: "16px"
  table-header:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-secondary}"
    typography: "{typography.label}"
    height: "44px"
  badge-status:
    backgroundColor: "{colors.surface-hover}"
    textColor: "{colors.text-secondary}"
    rounded: "{rounded.md}"
    padding: "4px 10px"
---

# Design System: NU-AURA — Studio Slate

## 1. Overview

**Creative North Star: "The Quiet Operator"**

Studio Slate is the interface of an expert who already knows the answer and isn't excited about it. It earns trust by being predictable, fast, and right, never by announcing itself. The working surface is near-white and calm; a single deep navy accent carries every primary action and signal; a warm-dark navigation rail anchors the left edge in both light and dark mode so the task always reads as the foreground. One login spans four sub-apps (HRMS, Hire, Grow, Fluence) and the visual vocabulary never drifts between them: a user who learns one already half-knows the next.

The density target is Linear, not Workday. Reveal only what the current task needs; everything else is one click away. Surfaces are not flat poster-board, they carry a soft, low, in-between depth, a 1px top highlight plus a diffuse ambient shadow, so a card feels like a physical pane resting on the canvas without ever tipping into skeuomorphic emboss. Color is rationed. Motion is short. Type is tuned for dense tables and long admin sessions, not for spectacle.

This system explicitly rejects four things, drawn straight from the product's anti-references. It is not **KEKA / Zoho HRMS clutter** (every field visible at once, pastel chips, emoji-status). It is not **Workday / SuccessFactors enterprise gray** (gray-on-gray density, modal-soup, accessibility-by-checkbox). It is not the **generic SaaS purple-gradient hero deck** (gradient text, vanity hero metrics, identical icon-grid cards). And it is not **Notion-style infinite-canvas freedom** (blank-page-by-default, drag-everywhere); Fluence is a structured wiki with taxonomy and ownership.

**Key Characteristics:**
- Single deep-navy accent (`#2952A3`) rationed to action, focus, selection, and signal.
- Warm-dark nav rail (`#0f1424`) in both modes; near-white working surface.
- Soft layered depth with a 1px top highlight, never flat board, never heavy emboss.
- Four sub-app bundle accents used only on rail/identity, never bleeding into product chrome.
- Light mode is canonical for desk work; dark mode has full token coverage for low-light reading.
- Color + label on every status, never color alone. WCAG 2.1 AA baseline.

## 2. Colors

A single saturated anchor over cool-tinted neutrals. The strategy is **Restrained**: tinted neutrals carry 90%+ of every surface; the accent is reserved for primary action, focus ring, active navigation, links, and key data emphasis. The four sub-app accents are an identity layer on the bundle rail, deliberately walled off from product UI.

### Primary
- **Aura Navy** (`#2952A3`): The one voice. Primary buttons, focus rings, active sidebar item, link text, primary chart series, and key numeric emphasis. Hover deepens to **Aura Navy Deep** (`#244288`); the wash **Aura Navy Soft** (`#eef2fc`) tints selected rows and info surfaces. In dark mode the accent lightens to **Aura Navy Lifted** (`#6884dc`) for legibility on the warm-dark surface.

### Secondary
The four sub-app bundle accents. Each marks one sub-app's identity on the rail and in cross-bundle navigation; never used as a general UI accent inside a sub-app's pages.
- **HRMS Indigo** (`#4463cf`): NU-HRMS, core HR.
- **Hire Teal** (`#0ea5a3`): NU-Hire, recruitment.
- **Grow Amber** (`#d97706`): NU-Grow, performance and learning.
- **Fluence Violet** (`#8b5cf6`): NU-Fluence, knowledge.

### Tertiary
Semantic status. Each role has a paired bg / text / border for both modes.
- **Success** (`#167c45` on `#effaf3`), **Warning** (`#b15a09` on `#fff7ec`), **Danger** (`#cf2f2f` on `#fef1f1`), **Info** (`#2952A3` on `#eef2fc`), **Neutral** (`#4e5270` on `#eef1f6`).

### Neutral
Cool-tinted toward the blue/violet axis. Never pure gray, never pure black or white.
- **Canvas** (`#f4f6fb` light / `#070a14` dark): the app background behind all surfaces.
- **Surface** (`#ffffff` light / `#11162a` dark): default card and panel body. Hover lifts to `#eef1f8` light / `#182040` dark; sunken nests at `#f0f3f9`.
- **Rail** (`#0f1424`): the warm-dark navigation rail, constant across both modes.
- **Text** — Primary `#0e1225`, Secondary `#3a3f57`, Muted `#6b7190` (dark mode: `#eef1f9` / `#b7bdd4` / `#7e85a3`).
- **Borders** — Subtle `#eef0f6`, Main `#e4e7f0`, Strong `#d4d8e6` (dark mode: `#161c33` / `#1e2540` / `#2b3358`). Focus border is always the accent.

### Named Rules
**The One Voice Rule.** Aura Navy appears on no more than ~10% of any screen. Its rarity is the signal. If two things are blue, neither reads as the action.

**The Walled Bundle Rule.** The four sub-app accents (Indigo, Teal, Amber, Violet) live on the rail and bundle switcher only. Inside a sub-app, the accent is always Aura Navy. A teal button inside Hire is a bug.

**The NULogic Brand Lockout.** The corporate logo colors (Lapis `#050766`, Red-orange `#E62A32`, Purple `#8939A1`, Dark teal `#133E49`) are for the logo and brand-adjacent marketing only. They are forbidden in product UI. The product is single-hue.

## 3. Typography

**Display Font:** Montserrat (with Open Sans, system-ui fallback)
**Body Font:** Open Sans (with system-ui, -apple-system, Segoe UI fallback)
**Mono Font:** Roboto Mono (with ui-monospace, SF Mono, Menlo fallback)

**Character:** Montserrat gives headings a geometric, quietly confident presence with tight tracking; Open Sans is a neutral humanist workhorse tuned for dense tables and long admin sessions; Roboto Mono carries every figure that must align in a column. Headings are `font-semibold` with `letter-spacing: -0.01em`; body runs at `line-height: 1.6`, antialiased, `optimizeLegibility`.

### Hierarchy
- **Display / Page Title** (semibold, 30px, lh 1.2, tracking -0.01em): the one page H1, Montserrat. A denser 28px/700/-0.02em variant exists for compact app headers.
- **Headline** (semibold, 24px, lh 1.25): `h1`/`h2`, major section breaks.
- **Title** (semibold, 20px, lh 1.3): `.text-section-title`, panel and group headers.
- **Card Title** (semibold, 16px): `.text-card-title`, the label on a card or row group.
- **Body** (regular, 14px, lh 1.6): all running text, table cells, labels. Long-form prose (Fluence articles, blog posts) caps at 65–75ch; tables and dashboards use available width.
- **Label / Micro** (semibold, 12px, tracking 0.05em, uppercase): table headers, eyebrow labels, micro-captions. A 10.5px/700/0.1em micro-label exists for the densest chrome.
- **Stat** (semibold, 30px, tabular-nums, Roboto Mono): numeric KPI values; always monospace and tabular so digits align.

### Named Rules
**The Tabular Figure Rule.** Any number that sits in a column, KPI, or stat block is set in Roboto Mono with `tabular-nums`. Proportional figures in a data column are a bug.

**The No Display-In-Chrome Rule.** Montserrat is for titles and stat values only. Buttons, inputs, labels, and table cells are Open Sans. A display font on a button is forbidden.

## 4. Elevation

This system is **softly layered, not flat**. Surfaces rest on the canvas with a low, in-between depth: a 1px white top-highlight inset plus a diffuse, low-opacity ambient shadow tinted toward the ink color (`rgba(16,22,44,...)`). The effect reads as a real pane catching light from above, never as a heavy 2014-era drop shadow or an embossed bevel. Depth increases with interaction (hover) and with stacking order (cards → dropdowns → popovers → modals), not as decoration. Cards also carry a faint `backdrop-filter: blur(6px)`, a structural touch that lets them sit cleanly over the accent-washed background atmosphere, not a decorative glass panel.

### Shadow Vocabulary
- **Resting** (`--sh-sm`: `0 1px 0 rgba(255,255,255,0.6) inset, 0 1px 2px rgba(16,22,44,0.05), 0 2px 6px rgba(16,22,44,0.04)`): default card and panel at rest.
- **Hover** (`--sh-md`: adds `0 8px 22px rgba(16,22,44,0.07)`): card lift on hover, alongside a border step from subtle to main.
- **Elevated** (`--sh-lg`: `0 12px 34px rgba(16,22,44,0.12)`): drawers, floating panels.
- **Popover** (`--sh-pop`: `0 18px 50px rgba(12,18,40,0.22)`): dropdowns and menus, the deepest tier.
- **Accent shadow** (`0 1px 2px rgba(41,82,163,0.25), 0 2px 8px rgba(41,82,163,0.18)`): the primary button's navy-tinted glow, the only colored shadow in the system.

### Named Rules
**The 1px Highlight Rule.** Every resting surface gets the inset top highlight. It is what separates Studio Slate's soft depth from both flatness and from heavy material drop-shadows. Remove it and cards die.

**The Depth-Follows-Stack Rule.** Shadow strength is a function of z-order and state, never of importance. A resting card and a resting card are equal; a hovered or popped surface earns more.

**The No Emboss Rule.** Inner shadows beyond the 1px highlight, debossed fields, and heavy bevels are forbidden. The legacy `--shadow-skeuo-*` tokens are intentionally flattened to no-ops; do not reintroduce them.

## 5. Components

### Buttons
- **Shape:** Gently rounded, `rounded-xl` (12px). Height `h-9` (36px), horizontal padding `px-3.5` (14px), `text-sm font-semibold`.
- **Primary:** Solid Aura Navy (`#2952A3`), white text, navy-tinted accent shadow. Hover brightens ~6% and lifts `-0.5px`; active presses `+1px` and dims ~4%.
- **Secondary:** Surface fill, `border-main`, primary text. Hover fills to `surface-hover`, border steps to strong, lifts `-0.5px`.
- **Ghost:** Transparent, secondary text, no border. Hover fills `surface-hover` and promotes text to primary.

### Cards / Containers
- **Corner Style:** `rounded-xl` (12px) for cards; the outer shell uses `--radius-shell` (1.35rem) and panels `--radius-panel` (1rem).
- **Background:** `surface` (`#ffffff` / `#11162a`), with a faint `backdrop-filter: blur(6px)`.
- **Border:** 1px `border-subtle` at rest, stepping to `border-main` on hover.
- **Shadow Strategy:** Resting `--sh-sm`, hover `--sh-md` (see Elevation). Interactive cards add a `translateY(-1px)` lift.
- **Internal Padding:** `p-4` (16px) standard, `p-3` (12px) compact. Never nest a card inside a card; use `.panel-inset` for nested grouping.

### Inputs / Fields
- **Style:** `h-9` (36px), `rounded-xl`, `px-3.5`, 1px `border-main` on `surface`.
- **Focus:** Border shifts to accent, plus a 3px navy ring (`box-shadow: 0 0 0 3px rgba(41,82,163,0.22)`). Hover steps border to strong.
- **Placeholder:** `text-muted`.

### Chips / Status Badges
- **Style:** `inline-flex`, `px-2.5 py-1`, `text-xs font-medium`, `rounded-md` (6px). Tinted bg + matching text + matching 1px border per semantic role.
- **Rule:** Color + an icon + a word. Never color alone.

### Tables
- **Header:** Sticky, `bg-elevated`, `text-xs font-semibold uppercase tracking-wider` in `text-secondary`, 44px tall, 1px subtle bottom border. Sortable headers promote text and fill on hover.
- **Rows:** 44px tall, `px-4 py-2` cells, hover fills `surface-hover`, last row drops its border. Shell wrapper is `rounded-xl`, scrolls horizontally, `min-width: 720px`.

### Navigation (Sidebar)
- **Style:** Warm-dark rail (`#0f1424`) in both modes. Item text at ~38–42% white; section headings same muted level.
- **Active:** Accent-alpha fill (`rgba(88,121,224,0.18)`) plus a left active marker and white text.
- **Hover:** 5–6% white wash. Transitions 150ms ease-out.

### Empty State
- Centered, dashed `border-subtle`, `surface` bg, muted icon at 30% opacity, title in `text-secondary`, description in `text-muted`. **Always carries a recovery action** (button or link).

### Focus Ring (signature)
Two-layer ring auto-applied to every focusable element: `0 0 0 2px var(--bg-main), 0 0 0 4px var(--border-focus)`. The inner canvas-colored gap separates the accent ring from the element so it reads on any surface. Never strip it without an equivalent replacement.

## 6. Do's and Don'ts

### Do:
- **Do** ration Aura Navy (`#2952A3`) to ≤10% of any screen: primary action, focus, active nav, links, key data. Emphasis elsewhere comes from weight and scale.
- **Do** give every resting surface the 1px top highlight plus soft ambient shadow. Soft layered depth is the house style.
- **Do** set every figure in a column, stat, or KPI in Roboto Mono with `tabular-nums`.
- **Do** pair every status with an icon and a word, never color alone (WCAG 2.1 AA).
- **Do** keep the four bundle accents (Indigo / Teal / Amber / Violet) on the rail and switcher only; inside a sub-app the accent is always navy.
- **Do** reach for inline edit or a drawer before a modal; reserve modals for blocking confirmation.
- **Do** use `.panel-inset` for nested grouping. Use `text-sm` Open Sans for body, labels, buttons, and cells.

### Don't:
- **Don't** echo **KEKA / Zoho clutter**: every field visible at once, dense forms with no progressive disclosure, pastel chips, emoji-status. We are replacing KEKA, not reskinning it.
- **Don't** drift into **Workday / SuccessFactors enterprise gray**: gray-on-gray density, modal-soup workflows, accessibility-by-checkbox, dated type.
- **Don't** import the **generic SaaS purple-gradient hero deck**: gradient text, hero-metric vanity numbers, identical icon-grid feature cards. Marketing aesthetics stay out of this workhorse product.
- **Don't** build **Notion-style blank-canvas freedom**: drag-everywhere, drop-anywhere, blank-page-by-default. Fluence is structured wiki with taxonomy and ownership.
- **Don't** use `border-left` / `border-right` greater than 1px as a colored accent stripe on cards, list items, callouts, or alerts. Use a full subtle border + tinted bg instead.
- **Don't** use gradient text (`background-clip: text`). Use solid Aura Navy; emphasize with weight or size.
- **Don't** use glassmorphism decoratively. The faint card `blur(6px)` is structural; glass panels over flat white surfaces are forbidden.
- **Don't** nest a card inside a card. Always wrong; restructure with `.panel-inset`.
- **Don't** reintroduce embossed / debossed / heavy inner-shadow surfaces. The `--shadow-skeuo-*` tokens are flattened on purpose.
- **Don't** put NULogic brand colors (Lapis, Red-orange, Purple, Dark teal) or any sub-app accent into general product chrome. The product is single-hue navy.

## Related

- [[PRODUCT|Product Vision]] — brand personality and accessibility baseline this design system implements
- [[CONTRIBUTING|Contributing Guide]] — frontend coding standards referencing these design tokens
- [[docs/architecture/frontend|Frontend Architecture]] — component and styling conventions
- [[docs/Home|Home MoC]] — vault entry point
