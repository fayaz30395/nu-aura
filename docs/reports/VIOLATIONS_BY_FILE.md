# Design System Violations - Detailed by File

## Color System Violations (1,082 total)

### Critical Files Requiring Immediate Attention

#### 1. app/settings/security/page.tsx (8 HIGH severity violations)
- **Line 106-107**: `text-slate-900 dark:text-slate-50` → `text-[var(--text-primary)]`
- **Line 215**: `text-slate-500 dark:text-slate-400 mt-3` → `text-[var(--text-muted)]`
- **Line 233**: `text-slate-600 dark:text-slate-400` → `text-[var(--text-secondary)]`
- **Line 242**: `border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-50` → Multiple CSS vars
- **Line 291**: `text-slate-600 dark:text-slate-400` → `text-[var(--text-secondary)]`
- **Line 292**: `text-slate-900 dark:text-slate-50` → `text-[var(--text-primary)]`
- **Line 319**: `bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700` → CSS vars
- **Line 325**: `text-slate-900 dark:text-slate-50` → `text-[var(--text-primary)]`

**Pattern**: Consistent slate color usage throughout. This file is the worst offender.

#### 2. app/settings/page.tsx (7 HIGH severity violations)
- **Line 162**: `bg-slate-100 dark:bg-slate-800` → `bg-[var(--bg-secondary)]`
- **Line 163**: `text-slate-600 dark:text-slate-400` → `text-[var(--text-secondary)]`
- **Line 167**: `text-slate-900 dark:text-slate-50` → `text-[var(--text-primary)]`
- **Line 170**: `text-slate-600 dark:text-slate-400` → `text-[var(--text-secondary)]`
- **Line 195**: `text-slate-900 dark:text-slate-50` → `text-[var(--text-primary)]`
- **Line 196**: `text-slate-600 dark:text-slate-400` → `text-[var(--text-secondary)]`
- **Line 231**: `text-slate-900 dark:text-slate-50` → `text-[var(--text-primary)]`

#### 3. app/home/page.tsx (12 violations: 5 HIGH, 7 MEDIUM)

HIGH severity:
- **Line 152**: `bg-gray-900` → `bg-[var(--bg-secondary)]`
- **Line 432**: `text-gray-700 dark:text-[var(--text-muted)]` → `text-[var(--text-muted)]` (consistency)
- **Line 446**: `text-gray-800 dark:text-gray-200` → `text-[var(--text-primary)]`
- **Line 465**: `text-gray-800 dark:text-gray-200` → `text-[var(--text-primary)]`
- **Line 527**: `text-gray-800 dark:text-gray-200` → `text-[var(--text-primary)]`

MEDIUM severity:
- **Line 177**: `text-gray-700 dark:text-[var(--text-muted)]` (mixed usage)
- **Line 217**: `text-gray-700 dark:text-[var(--text-muted)]` (mixed usage)
- **Line 231**: `text-gray-700 dark:text-gray-300` → `text-[var(--text-muted)]`
- **Line 287**: `text-gray-800 dark:text-gray-200` → `text-[var(--text-primary)]`
- **Line 323**: `text-[var(--text-muted)] hover:text-gray-700 dark:hover:text-gray-300` (mixed)
- **Line 343**: textarea with `text-gray-800 dark:text-gray-200 placeholder-gray-400` → CSS vars
- **Line 383**: `text-gray-300 dark:text-[var(--text-secondary)]` (mixed)

#### 4. app/attendance/team/page.tsx (1 HIGH severity)
- **Line 210**: `bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800 text-red-800 dark:text-red-300`
  → Use semantic error colors: `bg-[var(--bg-error-light)] border-[var(--border-error)] text-[var(--text-error)]`

#### 5. app/attendance/page.tsx (1 HIGH severity)
- **Line 286**: Button: `bg-white text-primary-600 hover:bg-gray-50`
  → `bg-[var(--bg-primary)] text-primary-600 hover:bg-[var(--bg-surface)]`

#### 6. app/approvals/page.tsx (1 HIGH severity)
- **Line 30**: `bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400`
  → Use semantic error: `bg-[var(--bg-error-light)]`

#### 7. app/loans/new/page.tsx (1 HIGH severity)
- **Line 146**: `bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400`
  → Use semantic error colors

#### 8. app/linkedin-posts/page.tsx (1 HIGH severity)
- **Line 199**: `text-gray-700 dark:text-gray-300` → `text-[var(--text-primary)]`

#### 9. app/attendance/comp-off/page.tsx (1 HIGH severity)
- **Line 179**: `text-blue-700` → `text-[var(--text-primary)]` or semantic primary color

---

## Spacing Grid Violations (378 total)

### Gap Violations (50 instances)

**app/contact/page.tsx**:
- Line 201: `gap-5` → `gap-4`
- Line 236: `gap-5` → `gap-4`

**app/team-directory/page.tsx**:
- Line 73: `gap-3` → `gap-2`

**app/auth/login/page.tsx**:
- Line 151: `gap-3` → `gap-2`

**app/training/catalog/page.tsx**:
- Line 263: `gap-5` → `gap-4`

**app/dashboard/page.tsx**:
- Multiple: `gap-3` → `gap-2`

**components/platform/AppSwitcher.tsx**:
- Line 26: `gap-3` → `gap-2`
- Line 45: `gap-3` → `gap-2`

**components/ui/Toast.tsx**:
- Line 20: `gap-3` → `gap-2`

---

### Padding Violations (110+ instances of p-5)

**Pattern**: `p-5` used extensively in:
- CardContent components
- Modal bodies
- Panel headers
- List items

**Fix**: Replace all `p-5` with:
- `p-4` (16px) for standard padding
- `p-6` (24px) for emphasis/headers

**Files with multiple p-5**:
1. app/recruitment/jobs/page.tsx (8 instances): Lines 272, 291, 310, 329, 413, 553, 566, 579, 592
2. app/admin/settings/page.tsx (multiple instances)
3. app/training/my-learning/page.tsx
4. app/calendar/page.tsx
5. app/linkedin-posts/page.tsx

---

### Margin Violations (228 instances of mb-3)

**Pattern**: `mb-3` used for spacing between form labels and fields

**Files with highest mb-3 count**:
1. app/home/page.tsx: 12 instances (lines 176, 182, 216, 222, 227, 268, 312, 364, 435, 508, 538)
2. app/attendance/regularization/_components/CreateRequestModal.tsx: 5 instances (168, 202, 221, 279, 314)
3. app/loans/[id]/page.tsx: 5 instances (195, 273, 329)
4. app/calendar/[id]/page.tsx: 2 instances (326, 338)
5. app/learning/paths/page.tsx: 2 instances (160, 188)

**Fix**: Replace with `mb-2.5` (10px) or `mb-4` (16px)

---

### Pixel Padding Violations (648 instances of px-3)

**Most Frequent Files**:
1. app/timesheets/page.tsx: 20+ instances
2. app/attendance/shift-swap/page.tsx: 12+ instances
3. app/attendance/comp-off/page.tsx: 10+ instances
4. app/loans/page.tsx: 8+ instances

**Context**:
- Table cells: `px-4 py-3` (already correct)
- Form inputs: `px-3 py-2` → `px-2.5 py-2` or `px-4 py-2`
- Buttons: `px-3 py-2` → `px-2.5 py-1.5` or `px-4 py-2`

---

## Component Violations

### components/fluence/FileList.tsx
- Line 30: `p-3` in button → `p-2.5` or `p-4`

### components/platform/AppSwitcher.tsx
- Line 20: `gap-3 px-3 py-2` → `gap-2 px-2.5 py-1.5` or `gap-4 px-4 py-2`

### components/ui/Toast.tsx
- Line 20: `p-4 gap-3` → `p-4 gap-4` or `p-4 gap-2`

---

## Summary Statistics

| Category | Count | Top File | Instances |
|----------|-------|----------|-----------|
| text-slate-* | 484 | app/settings/security/page.tsx | 20+ |
| text-gray-* | 162 | app/home/page.tsx | 30+ |
| dark:text-slate-* | 328 | app/settings/page.tsx | 25+ |
| dark:text-gray-* | 84 | Various | Scattered |
| bg-gray-* | 199 | Various | Scattered |
| px-3 | 648 | app/timesheets/page.tsx | 20+ |
| mb-3 | 228 | app/home/page.tsx | 12+ |
| p-5 | 110 | app/recruitment/jobs/page.tsx | 8+ |
| gap-3/5 | 50 | app/contact/page.tsx | 2+ |

---

## Quick Fix Commands (Examples)

### Find all slate colors in a file:
```bash
grep -n "slate-" frontend/app/settings/security/page.tsx
```

### Find all p-5 instances:
```bash
grep -n "p-5" frontend/app/recruitment/jobs/page.tsx
```

### Find all mb-3 instances:
```bash
grep -rn "mb-3" frontend/app/ --include="*.tsx" | head -20
```

---

## Validation Checklist

For each file fixed:
- [ ] Replace all slate-* with CSS variables
- [ ] Replace all gray-* with CSS variables (except intentional accents)
- [ ] Verify dark mode toggle works
- [ ] Check spacing matches 8px grid
- [ ] Test on mobile viewport
- [ ] Verify accessibility contrast ratios
- [ ] Run TypeScript check: `npx tsc --noEmit`
