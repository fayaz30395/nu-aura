# Component Migration Checklist
## Modern Enterprise Refined → Full Platform Rollout

**Target**: 200+ routes, 123+ components, 190+ hooks, 92+ services
**Estimated Impact**: ~2,500 files will benefit from the new design system
**Priority**: High-traffic pages first, then systematic module rollout

---

## Phase 1: Core Components (Week 1) ✅ COMPLETE

### Design Foundation
- [x] globals.css redesigned (Enterprise Clarity Refined)
- [x] Tailwind config updated (new tokens, simplified animations)
- [x] Mantine theme updated (accent colors, typography, spacing)

### Layout Shell
- [x] Header.tsx - Remove glassmorphism, apply clean borders
- [x] AppSwitcher.tsx - Simplify gradients, use accent color
- [x] Mantine theme - Inter-only, generous spacing, minimal shadows

**Files Modified**: 5
**Impact**: Affects all 200+ pages (core layout is global)

---

## Phase 2: UI Components Library (Week 2)

### High-Priority Components (Used on 50+ pages)

#### Buttons
**Files**: `components/ui/Button.tsx`, `components/ui/IconButton.tsx`
- [ ] Replace `rounded-xl` → `rounded-lg`
- [ ] Update color props: `primary-500` → `accent`
- [ ] Remove gradient backgrounds
- [ ] Verify `btn-primary`, `btn-secondary`, `btn-ghost` classes
- [ ] Test active state: `scale(0.98)` on press

**Pattern**:
```tsx
// Before
<Button className="rounded-xl bg-gradient-to-r from-primary-500 to-primary-600">

// After
<Button className="btn-primary">
```

#### Cards
**Files**: `components/ui/Card.tsx`, `components/ui/StatsCard.tsx`, `components/ui/KPICard.tsx`
- [ ] Replace `rounded-xl` → `rounded-lg`
- [ ] Remove `glass-aura` → use `card-aura`
- [ ] Remove `shadow-theme-md` → use `shadow-card`
- [ ] Update padding: `p-4` → `p-6` (generous spacing)
- [ ] Test hover states (cleaner, less lift)

**Pattern**:
```tsx
// Before
<Card className="glass-aura rounded-xl shadow-theme-md p-4">

// After
<Card className="card-aura p-6">
```

#### Forms
**Files**: All form components in `components/ui/`
- [ ] Input height: `h-10` → `h-11` (44px touch target)
- [ ] Focus ring: verify high-contrast `--border-focus`
- [ ] Placeholder color: ensure `--text-muted`
- [ ] Border radius: `rounded-xl` → `rounded-lg`
- [ ] Remove any purple-tinted focus rings

**Pattern**:
```tsx
// Before
<input className="h-10 rounded-xl focus:ring-primary-500">

// After
<input className="input-aura">
```

#### Tables
**Files**: `components/ui/Table.tsx`, `components/ui/DataTable.tsx`
- [ ] Remove frosted glass header (use solid `bg-surface`)
- [ ] Cell padding: `px-4 py-3` → `px-6 py-4`
- [ ] Header text: ensure `text-muted`, `uppercase`, `tracking-wider`
- [ ] Hover state: `hover:bg-card-hover` (no purple tint)
- [ ] Use `.table-aura` class

**Pattern**:
```tsx
// Before
<thead className="glass-aura backdrop-blur-xl">

// After
<thead className="bg-surface sticky top-0">
```

#### Badges & Status
**Files**: `components/ui/Badge.tsx`, `components/ui/StatusBadge.tsx`
- [ ] Use `.badge-status` + semantic classes
- [ ] Remove `bg-purple-*` → use `status-success`, `status-danger`, etc.
- [ ] Remove `rounded-full` → `rounded-md` (pills → rounded rectangles)
- [ ] Remove pulse animations (keep for truly urgent states only)

**Pattern**:
```tsx
// Before
<span className="bg-purple-100 text-purple-700 rounded-full px-2 py-0.5 text-xs">

// After
<span className="badge-status status-success">
```

#### Modals & Dropdowns
**Files**: `components/ui/Modal.tsx`, `components/ui/Dropdown.tsx`, `components/ui/Popover.tsx`
- [ ] Remove `glass-midnight` → use `bg-dropdown border border-dropdown-border`
- [ ] Remove backdrop blur
- [ ] Shadow: `shadow-dropdown` (clean, precise)
- [ ] Border radius: `rounded-2xl` → `rounded-lg`
- [ ] Animation: 400ms → 150ms

**Pattern**:
```tsx
// Before
<div className="glass-midnight rounded-2xl shadow-xl backdrop-blur-xl">

// After
<div className="bg-dropdown border border-dropdown-border rounded-lg shadow-dropdown">
```

---

## Phase 3: Page Templates (Week 3)

### Dashboard Pages (12 pages)
**Files**: `app/(protected)/me/dashboard/page.tsx`, `app/(protected)/dashboard/page.tsx`, etc.

- [ ] Replace gradient stat cards with solid accent backgrounds
- [ ] Update chart colors to use `--chart-*` tokens
- [ ] Remove ambient background gradients
- [ ] Increase spacing: `gap-4` → `gap-6`
- [ ] Page padding: `p-6` → `p-8`

### List Pages (45 pages)
**Files**: `app/(protected)/employees/page.tsx`, `app/(protected)/recruitment/candidates/page.tsx`, etc.

- [ ] Update table component (Phase 2)
- [ ] Remove gradient headers
- [ ] Action buttons: use `btn-ghost` for tertiary actions
- [ ] Filter panels: clean borders, no glassmorphism
- [ ] Search inputs: use `.input-aura`

### Detail Pages (68 pages)
**Files**: `app/(protected)/employees/[id]/page.tsx`, etc.

- [ ] Header sections: clean layout, generous spacing
- [ ] Tab navigation: use accent for active state
- [ ] Info cards: `card-aura` with `p-6`
- [ ] Action buttons: primary for main CTA, secondary for others
- [ ] Remove decorative dividers (keep only semantic ones)

### Form Pages (32 pages)
**Files**: Create/edit pages across all modules

- [ ] All inputs: `.input-aura` (44px height)
- [ ] Form sections: use semantic spacing (`space-y-6`)
- [ ] Submit button: `btn-primary`
- [ ] Cancel button: `btn-secondary`
- [ ] Field labels: `text-sm font-medium text-foreground mb-1.5`
- [ ] Help text: `text-caption`

---

## Phase 4: Module-Specific Components (Week 4)

### HRMS Module (35 components)
- [ ] Employee card - Remove gradient, use accent for status
- [ ] Attendance calendar - Clean grid, high contrast
- [ ] Leave balance cards - Solid backgrounds, no gradients
- [ ] Payroll summary - Muted chart colors
- [ ] Benefits cards - Generous padding, clean borders

### NU-Hire Module (22 components)
- [ ] Candidate card - Remove glassmorphism
- [ ] Job posting card - Clean layout
- [ ] Pipeline stage - Accent for active, muted for inactive
- [ ] Interview scheduler - High-contrast calendar
- [ ] Offer letter - Professional typography

### NU-Grow Module (28 components)
- [ ] Performance review card - Clean cards, no decorative elements
- [ ] OKR progress bars - Accent color, high contrast
- [ ] 360 feedback - Clean form layout
- [ ] Training module card - Solid backgrounds
- [ ] Recognition badge - Simple, not decorative

### NU-Fluence Module (18 components)
- [ ] Wiki page editor - Already clean (Tiptap)
- [ ] Blog card - Remove gradients
- [ ] Comment thread - High contrast, generous spacing
- [ ] Template library - Clean grid
- [ ] Search results - Minimal highlighting

---

## Phase 5: Specialized Components (Ongoing)

### Charts & Visualizations (15 components)
- [ ] Replace vibrant colors with `--chart-*` tokens
- [ ] Use muted colors for non-primary data
- [ ] Grid lines: `--chart-grid` (very subtle)
- [ ] Tooltips: `--chart-tooltip-*` tokens
- [ ] Remove gradient fills (solid colors only)

### Notifications & Toasts (6 components)
- [ ] Remove purple gradients
- [ ] Use semantic colors: success, danger, info
- [ ] Clean borders, no glassmorphism
- [ ] Faster animations (200ms)
- [ ] Remove decorative icons (keep only semantic ones)

### Navigation Components (8 components)
- [ ] Sidebar items: Already updated in Phase 1
- [ ] Breadcrumbs: Clean separators, high contrast
- [ ] Pagination: Accent for active page
- [ ] Tab navigation: Accent underline for active tab
- [ ] Mobile nav: Clean overlay, no blur

---

## Automated Migration Tasks

### Find & Replace (Safe, Automated)

Run these regex replacements across the codebase:

```bash
# 1. Rounded corners
sed -i '' 's/rounded-xl/rounded-lg/g' **/*.tsx
sed -i '' 's/rounded-2xl/rounded-lg/g' **/*.tsx

# 2. Purple gradients → Accent
sed -i '' 's/bg-gradient-to-r from-primary-500 to-primary-600/btn-primary/g' **/*.tsx
sed -i '' 's/bg-purple-50/bg-accent-subtle/g' **/*.tsx
sed -i '' 's/text-purple-600/text-accent/g' **/*.tsx

# 3. Glassmorphism → Clean
sed -i '' 's/glass-aura/bg-header border-header-border/g' **/*.tsx
sed -i '' 's/glass-midnight/bg-dropdown border border-dropdown-border shadow-dropdown/g' **/*.tsx
sed -i '' 's/backdrop-blur-xl//g' **/*.tsx

# 4. Shadows
sed -i '' 's/shadow-theme-md/shadow-card/g' **/*.tsx
sed -i '' 's/shadow-xl/shadow-elevated/g' **/*.tsx

# 5. Spacing (conservative - review manually)
# sed -i '' 's/p-4 /p-6 /g' components/ui/Card*.tsx
# sed -i '' 's/gap-4/gap-6/g' app/**/*page.tsx
```

**⚠️ Warning**: Test thoroughly after automated replacements. Some contexts may require different values.

---

## Manual Review Required

### High-Risk Changes (Test Thoroughly)

1. **Animation Removals**
   - Files with `stagger-*`, `animate-bounce-*`, `animate-pulse-glow`
   - Review: Are these purely decorative or functionally important?
   - Action: Remove decorative, keep functional (loading states)

2. **Color Overrides**
   - Files with inline `style={{ background: '...' }}`
   - Review: Is this a one-off design or systematic?
   - Action: Move to CSS tokens if systematic

3. **Custom Shadows**
   - Files with `boxShadow: '...'` in styled components
   - Review: Does this match new shadow system?
   - Action: Replace with `shadow-card`, `shadow-elevated`, or `shadow-dropdown`

4. **Typography Overrides**
   - Files with custom `fontFamily`, `letterSpacing`
   - Review: Is this intentional or legacy?
   - Action: Use design system tokens

---

## Testing Checklist

### Per-Component Testing
- [ ] Light mode: All states visible, high contrast
- [ ] Dark mode: All states visible, high contrast
- [ ] Hover states: Smooth, 150ms transition
- [ ] Active states: 98% scale on press (buttons only)
- [ ] Focus states: High-contrast ring, 4px width
- [ ] Responsive: Works on mobile (44px touch targets)
- [ ] Accessibility: WCAG AA contrast (4.5:1 text, 3:1 UI)
- [ ] Performance: No jank, fast paint times

### Per-Page Testing
- [ ] Layout: Generous spacing (24-32px gaps)
- [ ] Typography: Clear hierarchy, readable
- [ ] Colors: Accent used sparingly (CTAs only)
- [ ] Shadows: Minimal, only for elevation
- [ ] Borders: Clean 1px lines, no decorative borders
- [ ] Animations: Fast (150-200ms), purposeful only
- [ ] Loading states: Skeleton animations work
- [ ] Error states: Clear, high-contrast messages

---

## Rollout Schedule

### Week 1: Foundation ✅
- [x] Design system tokens
- [x] Core layout shell
- [x] Mantine theme

### Week 2: Components
- [ ] Button, Card, Input, Table (high-priority)
- [ ] Badge, Modal, Dropdown (medium-priority)
- [ ] Run automated migrations
- [ ] Test component library in Storybook

### Week 3: Pages
- [ ] Dashboard pages (all 4 apps)
- [ ] List pages (employees, candidates, etc.)
- [ ] Detail pages (profile, job detail, etc.)
- [ ] Form pages (create/edit)

### Week 4: Modules
- [ ] HRMS module (35 components)
- [ ] NU-Hire module (22 components)
- [ ] NU-Grow module (28 components)
- [ ] NU-Fluence module (18 components)

### Week 5: Polish
- [ ] Charts & visualizations
- [ ] Notifications & toasts
- [ ] Edge cases & custom components
- [ ] Performance audit
- [ ] Accessibility audit
- [ ] Final QA pass

---

## Success Metrics

### Performance
- ✅ Target: 30% faster paint times (no backdrop-blur)
- ✅ Target: 15% smaller CSS bundle (fewer animations)
- ✅ Target: 60fps on all interactions

### Accessibility
- ✅ Target: WCAG AA (4.5:1 text, 3:1 UI)
- ✅ Target: All touch targets ≥ 44px
- ✅ Target: High-contrast focus indicators (4px ring)

### Visual Consistency
- ✅ Target: 100% of pages use design system tokens
- ✅ Target: 0 inline gradient definitions
- ✅ Target: 0 glassmorphism classes
- ✅ Target: Accent color used sparingly (<10% of UI)

---

## Emergency Rollback Plan

If critical issues arise:

1. **Revert CSS files**:
   ```bash
   git checkout HEAD~1 -- frontend/app/globals.css
   git checkout HEAD~1 -- frontend/tailwind.config.js
   ```

2. **Revert Mantine theme**:
   ```bash
   git checkout HEAD~1 -- frontend/lib/theme/mantine-theme.ts
   ```

3. **Revert component changes** (selective):
   ```bash
   git checkout HEAD~1 -- frontend/components/layout/Header.tsx
   git checkout HEAD~1 -- frontend/components/platform/AppSwitcher.tsx
   ```

4. **Force rebuild**:
   ```bash
   rm -rf .next
   npm run build
   ```

---

## Questions & Answers

**Q: Can we keep some gradients for marketing pages?**
A: Yes, but only for marketing/landing pages, not the core app. Use the accent color as the base.

**Q: What about custom illustrations and graphics?**
A: Keep them! This redesign is about UI chrome (buttons, cards, forms), not content.

**Q: Should we update the logo or brand colors?**
A: No. The logo stays the same. The purple brand color is now the accent (used sparingly).

**Q: What if a component needs more visual weight?**
A: Use larger size, bolder weight, or accent color — not gradients or shadows.

**Q: Can we add subtle animations?**
A: Yes, but only for functional feedback (loading, success, error) — not decoration.

---

**Last Updated**: 2026-03-21
**Owner**: Engineering Team
**Status**: Phase 1 Complete ✅ | Phase 2-5 Pending
