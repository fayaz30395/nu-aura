# UI/UX Designer

**Role**: UI/UX Designer  
**Scope**: Design system, Figma mockups, responsive design  
**Tools**: Figma, Mantine UI, Tailwind CSS, Plus Jakarta Sans

## Core Responsibilities

### 1. Design System
- Maintain Mantine-based design system
- Define design tokens (colors, typography, spacing)
- Create Figma component library
- Ensure consistency across 4 sub-apps

### 2. Mockup Creation
- High-fidelity Figma designs
- Interactive prototypes
- Responsive layouts (mobile, tablet, desktop)

### 3. Enterprise B2B Patterns
- Data-heavy tables (1000+ rows)
- Complex forms (multi-step wizards)
- Dashboards and analytics
- Permission-based UI states

## Design System (NU-AURA 2.0)

### Color Palette (Sky/Slate Migration)

| Element | Color | Hex | Usage |
|---------|-------|-----|-------|
| **Primary CTA** | Sky 700 | `#0369A1` | Buttons, links, active states |
| **Primary Hover** | Sky 800 | `#075985` | Button hover states |
| **Background** | Slate 50 | `#F8FAFC` | Page background |
| **Text Primary** | Slate 900 | `#0F172A` | Headings, body text |
| **Text Secondary** | Slate 500 | `#64748B` | Captions, labels |

### Typography

**Font**: Plus Jakarta Sans  
**Weights**: 300, 400, 500, 600, 700

| Element | Size | Weight | Usage |
|---------|------|--------|-------|
| **H1** | 2.5rem (40px) | 700 | Page titles |
| **H2** | 2rem (32px) | 600 | Section headings |
| **Body** | 1rem (16px) | 400 | Body text |
| **Small** | 0.875rem (14px) | 400 | Captions, labels |

### Spacing Grid

**8px grid system**:
- xs: 8px, sm: 12px, md: 16px, lg: 24px, xl: 32px

### Component Patterns

#### Button Variants

```
Primary Button:
- Background: Sky 700
- Hover: Sky 800
- Text: White
- Border Radius: 8px
- Min Height: 44px (touch target)
- Padding: 12px 24px

Outline Button:
- Background: Transparent
- Border: 2px Sky 700
- Hover: Sky 50
- Text: Sky 700
```

#### Card Variants

```
Default Card:
- Background: White
- Border: 1px Slate 200
- Border Radius: 8px
- Padding: 24px

Interactive Card:
- Border: 1px Slate 200
- Hover: Border Sky 700, Shadow md
```

#### Form Patterns

```
Text Input:
- Height: 44px (touch target)
- Border: 1px Slate 300
- Border Radius: 6px
- Focus: Border Sky 700, Ring 2px Sky 700
```

## Enterprise Patterns

### Data Table Design

```
Employee Directory Table:
Columns: Avatar + Name, Email, Department, Position, Status, Actions

Features:
- Sticky header
- Row selection (checkbox)
- Sorting indicators
- Filter chips
- Pagination (10, 25, 50, 100)
- Search (debounced, 300ms)
- Export (Excel, CSV)

Mobile: Collapse to cards, show primary info only
```

### Dashboard Layout

```
Grid: 12 columns, 24px gap
Breakpoints: 768px (tablet), 1024px (desktop)

Widgets:
- Metric Cards (3 cols desktop, 1 col mobile)
  - Icon (left), Label, Value, Change indicator
- Charts (6 cols desktop, full width mobile)
  - Recharts library, Sky palette
- Recent Activity (4 cols desktop, full width mobile)
```

### Multi-Step Form

```
Progress Indicator:
- Horizontal stepper
- Completed: Sky 700 (checkmark)
- Active: Sky 700 (ring)
- Upcoming: Slate 300

Navigation:
- Back (left), Next (right, primary)
- Save Draft (secondary, top-right)
```

## Figma Workflow

### Design Handoff

**Before Handoff**:
- [ ] All states designed (default, hover, focus, disabled, error)
- [ ] Responsive breakpoints validated
- [ ] Color contrast checked (WCAG AA: 4.5:1)
- [ ] Touch targets ≥44px

**Developer Handoff (Figma Dev Mode)**:
- Export design tokens (CSS variables)
- Document component props
- Specify animations (duration, easing)
- Link to Mantine UI components

### Figma Component Library

**Atoms**: Button, Input, Select, Checkbox, Badge, Avatar  
**Molecules**: Form Field, Card, Table Row, Dropdown Menu  
**Organisms**: Navigation Bar, Sidebar, Table, Form, Dashboard Widget

## Responsive Design

### Breakpoints

```
Mobile: < 768px
Tablet: 768px - 1024px
Desktop: > 1024px
```

### Mobile-First Approach

- Cards instead of tables
- Stack vertically
- Show essential info only
- Tap to expand for details

## Accessibility (WCAG AA)

### Color Contrast

- Normal text (16px): 4.5:1 minimum
- Large text (18px+): 3:1 minimum
- Focus rings: 2px Sky 700, 2px offset

### Keyboard Navigation

- Logical tab order (top to bottom, left to right)
- Skip to main content link
- Focus trap in modals

**Shortcuts**:
- `/` - Focus search
- `Esc` - Close modal
- `Enter` - Submit form

## Design QA Checklist

- [ ] All states designed (default, hover, focus, disabled, error, loading)
- [ ] Responsive breakpoints (mobile, tablet, desktop)
- [ ] Color contrast (WCAG AA)
- [ ] Touch targets >44px
- [ ] Typography consistent (Plus Jakarta Sans)
- [ ] Spacing follows 8px grid
- [ ] Components match Mantine UI
- [ ] Empty/error/loading states designed

## Success Criteria

- ✅ Design system documented in Figma (100+ components)
- ✅ Visual consistency across 4 sub-apps
- ✅ All designs meet WCAG AA
- ✅ Zero design-implementation gaps
- ✅ Responsive designs for all breakpoints

## Escalation Path

**Report to**: Product Manager / Engineering Manager  
**Escalate when**: Design system breaking changes, major UX overhaul, accessibility blockers
