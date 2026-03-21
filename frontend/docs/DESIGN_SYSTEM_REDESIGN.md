# NU-AURA Design System Redesign

**Aesthetic**: Civic Canvas (Warm, crafted enterprise)
**Philosophy**: Human clarity + tactical depth + calm momentum
**Status**: ✅ Foundation refreshed

---

## Overview

This redesign shifts NU-AURA away from cold minimalism into a **warm, confident enterprise UI**. It keeps clarity and density, but adds **material depth**, **editorial typography**, and **atmospheric backgrounds** so the platform feels modern and human without losing rigor.

### Core Principles

1. **Warm surfaces, high legibility** — paper-like neutrals with strong contrast
2. **Purposeful hierarchy** — serif-led headings, mono metrics
3. **Signal-first accent** — teal is used to guide attention, not decorate
4. **Material depth** — soft shadows, crisp borders, no glassmorphism
5. **Meaningful motion** — page enter + staggered reveals only
6. **Atmosphere** — gradients and grid texture for subtle depth

### Differentiation Anchor

> "Enterprise clarity that feels human, not sterile."

---

## What Changed

### 1. Typography

**Before**: Inter / Space Grotesk / Fraunces (mixed, inconsistent)
**After**: IBM Plex family (humanist + editorial + mono)

- **Body**: IBM Plex Sans
- **Headings**: IBM Plex Serif
- **Metrics**: IBM Plex Mono
- **Tighter hierarchy**: serif for titles, mono for numbers

**Usage**:
```tsx
<h1 className="text-page-title">Dashboard</h1>
<p className="text-body">Content here</p>
<span className="text-stat-large">₹ 1,24,300</span>
```

---

### 2. Color System

**Before**: Purple-centric, high-contrast gray scale
**After**: Warm sand neutrals + signal teal accent

#### Light Mode
- Background: `#f7f3ec`
- Surface: `#ffffff`
- Text: `#1c1b19`
- Borders: `#e3dcd1`
- Accent: `#0d9488`

#### Dark Mode
- Background: `#0f1416`
- Surface: `#131a1d`
- Text: `#f2ede4`
- Borders: `#273037`
- Accent: `#2dd4bf`

**Removed**:
- Purple brand bias
- Flat, sterile neutrals

---

### 3. Background Atmosphere

We now use a **soft gradient + subtle grid** to create atmosphere without visual noise.

```css
--bg-pattern:
  radial-gradient(...teal glow...),
  radial-gradient(...blue glow...),
  linear-gradient(...paper tone...),
  linear-gradient(...grid...),
  linear-gradient(...grid...);
```

---

### 4. Shadows

**Before**: Minimal ring shadows
**After**: Soft material depth

```css
--shadow-card: 0 1px 0 rgba(16,24,40,.04), 0 8px 24px rgba(16,24,40,.06);
--shadow-elevated: 0 1px 0 rgba(16,24,40,.08), 0 16px 36px rgba(16,24,40,.14);
```

---

### 5. Components

#### Cards
```css
.card-aura {
  border-radius: 16px;
  border: 1px solid var(--border-main);
  box-shadow: var(--shadow-card);
}
```

#### Buttons
```css
.btn-primary {
  background-image: linear-gradient(135deg, var(--accent-primary), var(--accent-primary-hover));
  border-radius: 12px;
}
```

#### Forms
```css
.input-aura {
  height: 44px;
  border-radius: 12px;
}
```

---

### 6. Motion

**Before**: Generic micro-motion
**After**: Page + stagger only

```css
.page-reveal { animation: riseIn 280ms ease-out; }
.stagger-children > * { animation: riseIn 320ms ease-out; }
```

---

### 7. Layout Shell

- **Header**: semi-opaque surface, subtle hover glow
- **Sidebar**: deep ink background, teal signal for active states
- **AppSwitcher**: accent-led, calm grid

---

## Design Tokens Reference

### Core CSS Variables

```css
/* Surfaces */
--bg-main
--bg-surface
--bg-elevated
--bg-card
--bg-card-hover

/* Text */
--text-primary
--text-secondary
--text-muted

/* Borders */
--border-main
--border-subtle
--border-strong
--border-focus

/* Accent */
--accent-primary
--accent-primary-hover
--accent-primary-subtle

/* Shadows */
--shadow-card
--shadow-card-hover
--shadow-elevated
--shadow-dropdown
```

---

## Migration Guide

1. **Replace purple accents**
   - `primary-*` → `accent-*`
2. **Update card radius**
   - `rounded-xl` → `rounded-2xl`
3. **Use staggered reveal for sections**
   - Wrap blocks with `stagger-children`
4. **Prefer mono for metrics**
   - Use `text-stat-large` / `text-stat-medium`

---

## Next Steps

1. ✅ Design tokens + globals refresh
2. 🔄 Layout shell polish (Header + Sidebar fine-tune)
3. ⏳ Dashboard redesign pass
4. ⏳ Component library audit
5. ⏳ Full codebase migration

---

**Updated**: 2026-03-21
