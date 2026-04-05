---
name: nu-design-check
description: Use when asked to "check design", "audit UI", "design compliance", run a design system sweep, or after any frontend component/page changes. Scans for violations of the NU-AURA blue monochrome design system.
---

# NU-AURA Design System Compliance Audit

## When to Use

- After creating or modifying any frontend file (`frontend/app/`, `frontend/components/`,
  `frontend/lib/`)
- When the user says "check design", "audit UI", "design compliance", "design sweep", or "DS check"
- Before committing frontend changes to verify zero design violations
- When reviewing a PR that touches `.tsx` or `.ts` files in the frontend

## Input Required

- **Scope** (optional): specific file paths, a directory, or "all" for the entire frontend
- If no scope is provided, default to scanning all modified files via `git diff --name-only`

## Steps

### 1. Determine Scan Scope

If the user provides specific files, use those. Otherwise, detect changed files:

```bash
cd /Users/fayaz.m/IdeaProjects/nulogic/nu-aura
git diff --name-only HEAD -- 'frontend/**/*.tsx' 'frontend/**/*.ts'
git diff --cached --name-only -- 'frontend/**/*.tsx' 'frontend/**/*.ts'
```

If user says "all", scan the entire `frontend/app/` and `frontend/components/` directories.

### 2. Run Violation Scans

Use Grep to search for each banned pattern across the target files. Run ALL of these checks:

#### 2a. Banned Hardcoded Backgrounds

```
Pattern: \bbg-white\b
Fix: Replace with bg-[var(--bg-card)] or bg-[var(--bg-surface)]
```

#### 2b. Banned Shadow Utilities

```
Pattern: \bshadow-sm\b|\bshadow-md\b|\bshadow-lg\b|\bshadow-xl\b|\bshadow-2xl\b
Fix: Replace with shadow-[var(--shadow-card)], shadow-[var(--shadow-elevated)], or shadow-[var(--shadow-dropdown)]
Note: shadow-card, shadow-elevated, shadow-dropdown, shadow-skeuo-* are ALLOWED (they are CSS var bridges in tailwind.config.js)
```

#### 2c. Banned Border Radius

```
Pattern: \brounded-sm\b
Fix: Replace with rounded-md (minimum allowed radius)
```

#### 2d. Banned Color Tokens (Generic Tailwind Colors)

```
Pattern: \b(sky|rose|amber|emerald|lime|fuchsia|cyan|slate|gray|red|green|yellow|blue)-(\d{2,3})\b
Fix: Use design system tokens instead:
  - For blue shades: accent-50 through accent-950
  - For gray shades: surface-50 through surface-950 (maps to blue-tinted grays)
  - For red: danger-* or nu-red-*
  - For green: success-*
  - For yellow/amber: warning-*
  - For info blue: info-*
  
EXCEPTIONS — do NOT flag these (they are defined in tailwind.config.js as valid aliases):
  - accent-*, success-*, danger-*, warning-*, info-*, surface-*, nu-red-*, nu-purple-*, nu-teal-*
  - primary-*, secondary-* (legacy aliases)
  - text-theme-*, border-*, muted-*, card-*, header-*, dropdown-*

IMPORTANT: The tailwind.config.js maps blue/red/green/yellow/amber as legacy aliases to semantic colors.
If a file uses blue-500 or red-600, flag it anyway because the codebase convention requires
using the semantic names (info-500, danger-600) for clarity and intent.
```

#### 2e. Raw Hex Colors in className

```
Pattern: className=.*#[0-9a-fA-F]{3,8}
Fix: Use CSS variables via var(--*) tokens from globals.css
Exception: Inline styles for one-off chart colors using var(--chart-*) are acceptable
```

#### 2f. Banned Spacing (Non-8px Grid)

```
Pattern: \b[pm][xytblr]?-3\b|\b[pm][xytblr]?-5\b|\bgap-3\b|\bgap-5\b
Fix: Use 8px grid values only: 1 (4px), 2 (8px), 4 (16px), 6 (24px), 8 (32px)
  - p-3 (12px) -> p-2 (8px) or p-4 (16px)
  - p-5 (20px) -> p-4 (16px) or p-6 (24px)
  - gap-3 -> gap-2 or gap-4
  - gap-5 -> gap-4 or gap-6
```

#### 2g. Incorrect Focus Ring

```
Pattern: \bfocus:ring\b
Fix: Replace with focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)]
Note: focus-visible:ring is ALLOWED — only bare focus:ring is banned
```

#### 2h. Missing aria-label on Icon-Only Buttons

```
Pattern: <(button|Button|ActionIcon)[^>]*onClick[^>]*>[^<]*<[A-Z][a-zA-Z]*Icon[^/]*\/>[^<]*<\/(button|Button|ActionIcon)>
Check: If a button contains only an icon component (no visible text), it MUST have aria-label
Note: This pattern is approximate — manually verify flagged results
```

#### 2i. Missing cursor-pointer on Interactive Elements

```
Pattern: \bonClick\b(?!.*\bcursor-pointer\b)
Note: This is a heuristic — check that elements with onClick handlers have cursor-pointer in their className.
Mantine components (Button, ActionIcon, etc.) have cursor-pointer built in. Only flag raw div/span with onClick.
```

#### 2j. Banned Text Colors

```
Pattern: \btext-(gray|slate)-\d{2,3}\b
Fix: Use text-[var(--text-primary)], text-[var(--text-secondary)], text-[var(--text-muted)], or text-[var(--text-heading)]
Alternatively: text-theme (default), text-theme-heading, text-theme-secondary, text-theme-muted
```

#### 2k. Banned Border Colors

```
Pattern: \bborder-(gray|slate)-\d{2,3}\b
Fix: Use border (default), border-subtle, or border-strong (mapped to CSS vars in tailwind.config.js)
```

#### 2l. Raw Shadow Values (Not Using CSS Variables)

```
Pattern: shadow-\[(?!var\()
Fix: Use shadow-[var(--shadow-card)], shadow-[var(--shadow-elevated)], or shadow-[var(--shadow-dropdown)]
Only shadow-[var(--*)] arbitrary values are allowed
```

### 3. Compile Results

For each violation found, record:

- **File path** (absolute)
- **Line number**
- **Violation type** (from categories above)
- **Current code** (the offending snippet)
- **Suggested fix** (the compliant replacement)

### 4. Generate Report

Group violations by file and output in this format:

```
## Design System Compliance Report

### Verdict: PASS / FAIL (N violations)

---

### File: frontend/app/example/page.tsx

| Line | Violation | Current | Fix |
|------|-----------|---------|-----|
| 42 | Banned bg-white | `bg-white` | `bg-[var(--bg-card)]` |
| 67 | Banned shadow | `shadow-md` | `shadow-[var(--shadow-elevated)]` |

### File: frontend/components/ui/Card.tsx

| Line | Violation | Current | Fix |
|------|-----------|---------|-----|
| 15 | Non-8px spacing | `p-3` | `p-2` or `p-4` |

---

### Summary
- Total files scanned: X
- Files with violations: Y
- Total violations: Z
- By category:
  - Banned colors: N
  - Banned shadows: N
  - Non-8px spacing: N
  - Incorrect focus: N
  - Accessibility: N
```

## Output Checklist

- [ ] All target files scanned
- [ ] Violations grouped by file with line numbers
- [ ] Each violation has a concrete fix suggestion
- [ ] Pass/fail verdict rendered
- [ ] False positives noted (e.g., Mantine internals, third-party CSS)
- [ ] If FAIL, violations are ordered by severity (accessibility > colors > spacing > shadows)

## Reference Files

- CSS variables source of truth: `frontend/app/globals.css`
- Tailwind token bridge: `frontend/tailwind.config.js`
- Mantine theme alignment: `frontend/lib/theme/mantine-theme.ts`
- Design system spec: `themes/nu_aura_single_hue_design_system.pdf`
- Brand guide: `themes/nulogic.md`
