---
name: nulogic-branding
description: >
  NULogic brand identity guidelines — colors, logos, typography, gradients, and tone of voice.
  Use this skill whenever creating ANY deliverable for NULogic or that carries the NULogic brand,
  including presentations, documents, HTML pages, portals, emails, social media graphics, proposals,
  pitch decks, reports, dashboards, or any visual output. Also trigger when the user mentions
  "NULogic brand", "NULogic colors", "NULogic logo", "NULogic style", "on-brand", "brand guidelines",
  "company branding", or asks to make something "look like NULogic". If another skill (pptx, docx,
  html, etc.) is also being used, load this skill alongside it so the brand is applied correctly.
---

# NULogic Brand Identity Skill

This skill contains the complete NULogic brand system. When creating any NULogic-branded
deliverable, follow these guidelines to ensure visual consistency.

## Company Overview

NULogic is a leading digital transformation company that combines software expertise and industry
intelligence. Founded in 2008 and headquartered in Fremont, CA, USA, NULogic is a global system
integrator with 250+ professionals operating from offices in Chennai, Mexico City, and Santiago. The
company specializes in digital commerce and works with major international retailers across the US,
EU, and LATAM markets.

- **Tagline**: INFINITE INNOVATION
- **Website**: https://www.nulogic.io
- **Sales email**: sales@nulogic.io
- **Address**: 825 Corporate Way, Fremont, CA-94539, USA
- **Phone**: +1 865 408 7639

---

## Logo

The NULogic logo features a custom wordmark where the "g" is a distinctive circular icon with a
red-to-purple gradient, a dot above it, and a curved arc below. The tagline "INFINITE INNOVATION"
appears below the wordmark in uppercase with wide letter-spacing.

### Logo Files & CDN URLs

Use CDN URLs for web/HTML deliverables. For offline or print work, reference the local files in the
assets/ folder.

| Variant           | CDN URL                                                                                                        |
|-------------------|----------------------------------------------------------------------------------------------------------------|
| Full logo (SVG)   | `https://cdn.prod.website-files.com/65fb25139694761d554cf15b/67c1643d837ad81822ec693b_nulogic.svg`             |
| G icon only (SVG) | `https://cdn.prod.website-files.com/65fb25139694761d554cf15b/68275dd02001200b841dbac6_g-logo.svg`              |
| Scroll logo (SVG) | `https://cdn.prod.website-files.com/65fb25139694761d554cf15b/68300308cc34ea5d7bf06e90_nulogic_scroll_logo.svg` |

Local asset files (bundled with this skill):

- `assets/nulogic-logo.svg` — Full wordmark, dark text version (for light backgrounds)
- `assets/NU_logo.png` — PNG version of the icon mark (transparent background)
- `assets/symbol-03.png` — Standalone "g" icon mark (transparent background)

### Logo Types

1. **Full wordmark + tagline** — Primary logo for most uses
2. **Icon mark only** (the "g" symbol) — For small sizes, favicons, app icons
3. **Typographic-only mark** — Wordmark without the icon, for tight spaces

### SVG Color Classes

When manipulating the SVG directly, these are the CSS classes:

- `.cls-3` = `#25255C` — Navy, main letterforms. Change to `#FFFFFF` for white-on-dark version.
- `.cls-2` = `#797E85` — Gray, "INFINITE INNOVATION" tagline
- `.cls-1` = Linear gradient `#ED3027 → #7B469B` — The "g" circle, dot, and arc

### Logo Usage Rules

- Surround the logo with clear space equal to the half-height of the "g"
- Minimum size: **1 inch / 100px** for full wordmark, **0.25 inch / 30px** for icon mark
- On dark backgrounds, invert the wordmark to white (`#FFFFFF`); the gradient "g" stays as-is
- On light backgrounds, use the navy (`#25255C`) wordmark

**Do not:**

- Change the logo colors beyond the approved dark/white versions
- Place elements inside the clear space
- Distort, condense, expand, or rotate the logo
- Add drop shadows, bevels, emboss, or glow effects
- Resize individual elements independently
- Crop the logo

---

## Color Palette

The palette has three tiers: primary (60% of any composition), secondary (30%), and tertiary (10%).
Lean heavily on the primary "Lapis Blue" and use the supporting sets for balance.

### Primary Color (60%)

| Name       | Hex       | RGB       | CMYK            | Pantone | Usage                                               |
|------------|-----------|-----------|-----------------|---------|-----------------------------------------------------|
| Lapis Blue | `#050766` | 5, 7, 102 | 100, 98, 22, 30 | 2747 C  | Headers, dark backgrounds, primary text on light bg |

### Secondary Colors (30%)

| Name       | Hex       | RGB           | CMYK           | Usage                                   |
|------------|-----------|---------------|----------------|-----------------------------------------|
| Red-Orange | `#E62A32` | 230, 42, 50   | 3, 97, 88, 0   | Warm accents, CTAs, gradient start      |
| Purple     | `#8939A1` | 137, 57, 161  | 56, 90, 0, 0   | Gradient end, secondary accent          |
| Dark Teal  | `#133E49` | 19, 62, 73    | 91, 62, 53, 43 | Deep backgrounds, section dividers      |
| Near-White | `#F4F5F6` | 244, 245, 246 | 3, 2, 2, 0     | Page backgrounds, cards, light sections |

### Tertiary Colors (10%)

| Name         | Hex       | Usage                    |
|--------------|-----------|--------------------------|
| Muted Teal   | `#3E616A` | Subtle accents           |
| Soft Coral   | `#EE777C` | Highlights, hover states |
| Light Purple | `#B17DC1` | Badges, tags             |
| Dusty Indigo | `#61629D` | Secondary text, borders  |

### Gradients

| Name                        | CSS                                            | Usage                                      |
|-----------------------------|------------------------------------------------|--------------------------------------------|
| **Logo gradient**           | `linear-gradient(to bottom, #F32820, #8539A6)` | The "g" icon; red at top, purple at bottom |
| **Primary gradient**        | `linear-gradient(135deg, #D42F7B, #E8623A)`    | CTAs, accent bars, hero banners            |
| **Dark gradient**           | `linear-gradient(135deg, #1B1F4E, #7B2D8E)`    | Dark sections, overlays                    |
| **Brand Identity gradient** | `linear-gradient(to right, #ED3027, #7B469B)`  | Decorative bars, dividers                  |

### Applying Colors in Practice

- **White backgrounds**: Use Lapis Blue `#050766` for headings and Dark Teal `#133E49` for body text
- **Dark backgrounds**: Use white `#FFFFFF` text and Red-Orange `#E62A32` or the primary gradient
  for accents
- **Cards and panels**: Near-White `#F4F5F6` background with Lapis Blue text
- **Buttons/CTAs**: Primary gradient (`#D42F7B → #E8623A`) with white text, or solid Red-Orange
  `#E62A32`
- **Links**: Red-Orange `#E62A32` or Purple `#8939A1`
- **Borders and dividers**: Dusty Indigo `#61629D` or Muted Teal `#3E616A` at reduced opacity

---

## Typography

### Primary Typefaces

| Role          | Font       | Source       | Weights                                                                 |
|---------------|------------|--------------|-------------------------------------------------------------------------|
| **Headings**  | Montserrat | Google Fonts | Light (300), Regular (400), SemiBold (600), Bold (700), ExtraBold (800) |
| **Body text** | Open Sans  | Google Fonts | Light (300), Regular (400), SemiBold (600), Bold (700)                  |

### Secondary / Fallback

| Font   | Usage                                                                      |
|--------|----------------------------------------------------------------------------|
| Roboto | Use when Montserrat and Open Sans are unavailable                          |
| Inter  | Website font (used on nulogic.io); acceptable for web/digital deliverables |

### Web Usage (HTML/CSS)

```html
<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;600;700;800&family=Open+Sans:wght@300;400;600;700&display=swap" rel="stylesheet">
```

```css
h1, h2, h3, h4, h5, h6 { font-family: 'Montserrat', sans-serif; }
body, p, li, td { font-family: 'Open Sans', sans-serif; }
```

### Tagline Typography

The "INFINITE INNOVATION" tagline uses uppercase with 3–4px letter-spacing in a light weight:

```css
.tagline {
  font-family: 'Montserrat', sans-serif;
  font-weight: 300;
  text-transform: uppercase;
  letter-spacing: 3px;
}
```

---

## Graphic Patterns

The NULogic "g" icon can be repeated as a subtle background pattern across collateral. The pattern
works on multiple background colors — light gray, dark teal, navy, red, black, and purple. Use the
pattern at reduced opacity (10–20%) so it doesn't compete with content.

### Pattern Backgrounds (by color)

- Light gray `#F4F5F6` with slightly darker gray circles
- Dark teal `#133E49` with slightly lighter teal circles (the signature "NULogic dark" look)
- Lapis Blue `#050766` with slightly lighter blue circles
- Red-Orange `#E62A32` with slightly darker red circles
- Black `#000000` with dark gray circles
- Purple `#8939A1` with slightly lighter purple circles

---

## Brand Voice & Tone

NULogic positions itself as reliable, qualitative, and supportive. Communications should feel
professional yet approachable — technically competent without being jargon-heavy. The brand speaks
with confidence about digital transformation, commerce, and technology while remaining
client-focused and solutions-oriented.

Key phrases and positioning:

- "Infinite Innovation" (tagline)
- "Leading digital transformation company"
- "Combining software expertise and industry intelligence"
- "Cloud-based, scalable and agile technology"
- "Reliable, qualitative & supportive"

---

## Quick-Reference: CSS Variables

For HTML/web deliverables, use these CSS custom properties for consistency:

```css
:root {
  /* Primary */
  --nu-lapis-blue: #050766;
  --nu-navy: #25255C;

  /* Secondary */
  --nu-red-orange: #E62A32;
  --nu-purple: #8939A1;
  --nu-dark-teal: #133E49;
  --nu-near-white: #F4F5F6;

  /* Tertiary */
  --nu-muted-teal: #3E616A;
  --nu-soft-coral: #EE777C;
  --nu-light-purple: #B17DC1;
  --nu-dusty-indigo: #61629D;

  /* Gradients */
  --nu-gradient-logo: linear-gradient(to bottom, #F32820, #8539A6);
  --nu-gradient-primary: linear-gradient(135deg, #D42F7B, #E8623A);
  --nu-gradient-dark: linear-gradient(135deg, #1B1F4E, #7B2D8E);
  --nu-gradient-brand: linear-gradient(to right, #ED3027, #7B469B);

  /* Typography */
  --nu-font-heading: 'Montserrat', sans-serif;
  --nu-font-body: 'Open Sans', sans-serif;

  /* Logo URLs */
  --nu-logo-full: url('https://cdn.prod.website-files.com/65fb25139694761d554cf15b/67c1643d837ad81822ec693b_nulogic.svg');
  --nu-logo-icon: url('https://cdn.prod.website-files.com/65fb25139694761d554cf15b/68275dd02001200b841dbac6_g-logo.svg');
}
```

---

## Product Application: NU-AURA Platform

The sections above define **NULogic corporate brand identity**. This section extends them into the *
*NU-AURA product design system** — how brand values map to UI components, dark mode, charts,
spacing, and governance.

### Design Philosophy

Single-hue tonal system focused on cognitive efficiency, consistency, and scalability. Color is a
functional signal, not decoration. 80–90% of the UI uses the primary tonal scale; semantic colors
are reserved for status and meaning.

**Principles:**

1. Color = meaning
2. Consistency over creativity
3. Reduce noise, not signal
4. Design for scanning

### Monospace Font

| Role               | Font        | Source       | Weights                                     |
|--------------------|-------------|--------------|---------------------------------------------|
| **Code & metrics** | Roboto Mono | Google Fonts | Regular (400), Medium (500), SemiBold (600) |

```css
:root {
  --nu-font-mono: 'Roboto Mono', 'SF Mono', 'Cascadia Code', monospace;
}
```

### Semantic Color Layer

Independent from the primary tonal scale. Each includes bg, text, and border variants.

| Semantic | Color  | Light bg  | Light text | Dark bg                 | Dark text |
|----------|--------|-----------|------------|-------------------------|-----------|
| Success  | Green  | `#ecfdf3` | `#166534`  | `rgba(22,163,74,0.18)`  | `#86efac` |
| Danger   | Red    | `#fef2f2` | `#b91c1c`  | `rgba(230,42,50,0.18)`  | `#EE777C` |
| Warning  | Amber  | `#fffbeb` | `#92400e`  | `rgba(245,158,11,0.18)` | `#fcd34d` |
| Info     | Indigo | `#eff6ff` | `#1e40af`  | `rgba(97,98,157,0.18)`  | `#c4c4f5` |

**In Tailwind:** `success-50` through `success-950`, `danger-*`, `warning-*`, `info-*`

### Dark Mode Tokens

Built on NULogic Dark Teal (`#133E49`) foundation with lighter Lapis accents for readability.

| Token           | Light Mode             | Dark Mode                |
|-----------------|------------------------|--------------------------|
| Background      | `#F4F5F6` (Near-White) | `#0a1218`                |
| Surface / Cards | `#FFFFFF`              | `#0e1e25`                |
| Elevated        | `#FFFFFF`              | `#1a3540`                |
| Text primary    | `#050766` (Lapis Blue) | `#FFFFFF`                |
| Text secondary  | `#3E616A` (Muted Teal) | `#9aa8af`                |
| Text muted      | `#797E85`              | `#5e6e75`                |
| Accent primary  | `#050766` (Lapis Blue) | `#a8a8ef`                |
| Border          | `#c0c3c8`              | `#2a4a55`                |
| Sidebar bg      | `#133E49` (Dark Teal)  | `#0a1218`                |
| Focus ring      | `rgba(5,7,102,0.35)`   | `rgba(168,168,239,0.40)` |

### Chart Color Palette

All charts must use these CSS variables — never raw hex. Auto-adapts to light/dark mode.

| Variable                 | Light     | Dark      | Use                 |
|--------------------------|-----------|-----------|---------------------|
| `--chart-primary`        | `#050766` | `#a8a8ef` | Primary data series |
| `--chart-secondary`      | `#8939A1` | `#B17DC1` | Secondary series    |
| `--chart-success`        | `#16a34a` | `#4ade80` | Positive metrics    |
| `--chart-warning`        | `#f59e0b` | `#fbbf24` | Caution metrics     |
| `--chart-danger`         | `#E62A32` | `#EE777C` | Negative metrics    |
| `--chart-info`           | `#61629D` | `#c4c4f5` | Informational       |
| `--chart-accent`         | `#EE777C` | `#EE777C` | Highlight           |
| `--chart-muted`          | `#c0c3c8` | `#2a4a55` | Gridlines, axes     |
| `--chart-grid`           | `#d8dadd` | `#2a4a55` | Background grid     |
| `--chart-tooltip-bg`     | `#ffffff` | `#0e1e25` | Tooltip background  |
| `--chart-tooltip-border` | `#c0c3c8` | `#2a4a55` | Tooltip border      |
| `--chart-tooltip-text`   | `#050766` | `#FFFFFF` | Tooltip text        |

### Typography Scale (Balanced Spec)

| Token | Size | Use                          |
|-------|------|------------------------------|
| xs    | 12px | Metadata, timestamps         |
| sm    | 14px | Tables (primary), body dense |
| base  | 16px | Default UI text              |
| md    | 18px | Emphasis, subtitles          |
| lg    | 20px | Section headers              |
| xl    | 24px | Page headers                 |

### Spacing System (8px Grid)

| Token | Size | Use                       |
|-------|------|---------------------------|
| xs    | 4px  | Tight gaps (icon-to-text) |
| sm    | 8px  | Inline spacing            |
| md    | 16px | Section internal padding  |
| lg    | 24px | Section gaps              |
| xl    | 32px | Page-level spacing        |

### Component Rules

| Component     | Spec                                  | Tailwind                            |
|---------------|---------------------------------------|-------------------------------------|
| Buttons       | 8px vertical, 16px horizontal padding | `h-11 px-4` (md default)            |
| Forms         | 16px spacing between fields           | `space-y-4`                         |
| Tables        | 44px row height                       | `h-11` on `<td>`                    |
| Cards         | 16–24px padding                       | `p-4` to `p-6`                      |
| Touch targets | 44px minimum                          | `min-h-[44px] min-w-[44px]`         |
| Focus rings   | 2px, accent primary                   | `ring-2 ring-[var(--ring-primary)]` |

### Alignment Rules

| Element | Alignment |
|---------|-----------|
| Text    | Left      |
| Numbers | Right     |
| Actions | Right     |
| Badges  | Center    |

### Density Strategy

| Mode               | Adjustment              | Use               |
|--------------------|-------------------------|-------------------|
| Default (Balanced) | Standard spacing        | Normal UI         |
| Compact            | −4px on spacing/padding | Dense data tables |
| Comfortable        | +8px on spacing/padding | Dashboard cards   |

### Governance Rules

1. **No raw hex in component code** — all colors via CSS variables or Tailwind tokens
2. **No random colors** — only primary tonal (`accent-*`), semantic (`success-*`, `danger-*`,
   `warning-*`, `info-*`), or brand secondary (`nu-red-*`, `nu-purple-*`, `nu-teal-*`)
3. **Semantic colors are immutable** — success is always green, danger is always red
4. **Charts use `--chart-*` variables** — auto-adapt to dark mode
5. **Design review required for new tokens** — no ad-hoc color additions
6. **Google OAuth colors exempt** — third-party brand assets (`#4285F4`, `#34A853`, `#FBBC05`,
   `#EA4335`)

### UI/UX Quality Checklist

- [ ] No emojis as icons — use Lucide React or Tabler Icons (SVG)
- [ ] `cursor-pointer` on all clickable elements
- [ ] Hover states with smooth transitions (150–300ms)
- [ ] Light mode text contrast 4.5:1 minimum (WCAG AA)
- [ ] Focus states visible for keyboard navigation (2px ring)
- [ ] `prefers-reduced-motion` respected
- [ ] Responsive at 375px, 768px, 1024px, 1440px
- [ ] No horizontal scroll on mobile
- [ ] 44px minimum touch targets
- [ ] Skeleton screens for async content loading
