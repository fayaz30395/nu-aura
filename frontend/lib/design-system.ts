/**
 * NU-AURA Design System Constants
 *
 * Single source of truth for spacing, typography, and layout patterns.
 * Import these constants instead of hardcoding Tailwind classes.
 *
 * STRICT 8px GRID: 4, 8, 16, 24, 32, 48, 64px
 * BANNED: gap-3, p-3, p-5, gap-5, space-y-3, space-y-5, text-[10px], text-[11px]
 */

// ── Page Layout ────────────────────────────────────────
export const layout = {
  /** Page padding — responsive, on 8px grid */
  pagePadding: 'p-4 md:p-6 lg:p-8',
  /** Section vertical gap */
  sectionGap: 'space-y-6',
  /** Grid gap for card grids */
  cardGridGap: 'gap-4 md:gap-6',
  /** Standard grid layouts */
  grid2: 'grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6',
  grid3: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6',
  grid4: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6',
} as const;

// ── Typography Classes ─────────────────────────────────
export const typography = {
  /** 24px — Page title */
  pageTitle: 'text-2xl font-bold tracking-tight text-[var(--text-primary)]',
  /** 18px — Section heading */
  sectionTitle: 'text-lg font-semibold text-[var(--text-primary)]',
  /** 16px — Card title */
  cardTitle: 'text-base font-semibold text-[var(--text-primary)]',
  /** 14px — Body text */
  body: 'text-sm text-[var(--text-primary)]',
  /** 14px — Body text secondary */
  bodySecondary: 'text-sm text-[var(--text-secondary)]',
  /** 12px — Metadata, captions */
  caption: 'text-xs text-[var(--text-muted)]',
  /** 11px → 12px — Micro labels (section dividers, status tags) */
  microLabel: 'text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]',
  /** Stat number — large */
  statLarge: 'text-2xl font-bold tabular-nums text-[var(--text-primary)]',
  /** Stat number — medium */
  statMedium: 'text-xl font-bold tabular-nums text-[var(--text-primary)]',
} as const;

// ── Card Classes ───────────────────────────────────────
export const card = {
  /** Standard card — border + subtle shadow, theme-aware */
  base: 'card-aura',
  /** Interactive card — hover lift + cursor pointer */
  interactive: 'card-interactive',
  /** Elevated card — stronger shadow */
  elevated: 'card-elevated',
  /** Card padding — standard */
  padding: 'p-4',
  /** Card padding — spacious */
  paddingLarge: 'p-6',
} as const;

// ── Table Classes ──────────────────────────────────────
export const table = {
  /** Table wrapper */
  wrapper: 'table-aura',
  /** Header cell */
  th: 'px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]',
  /** Body cell */
  td: 'px-4 py-3 text-sm text-[var(--text-primary)]',
  /** Row hover */
  row: 'hover:bg-[var(--bg-card-hover)] transition-colors duration-100',
  /** Sticky header */
  stickyHeader: 'sticky top-0 z-10 bg-[var(--bg-card)]',
} as const;

// ── Chart Color Tokens ─────────────────────────────────
// Use these for Recharts/d3 — they auto-adapt to dark mode via CSS vars
export const chartColors = {
  primary: 'var(--chart-primary)',
  secondary: 'var(--chart-secondary)',
  success: 'var(--chart-success)',
  warning: 'var(--chart-warning)',
  danger: 'var(--chart-danger)',
  info: 'var(--chart-info)',
  accent: 'var(--chart-accent)',
  muted: 'var(--chart-muted)',
  grid: 'var(--chart-grid)',
  tooltip: {
    bg: 'var(--chart-tooltip-bg)',
    border: 'var(--chart-tooltip-border)',
    text: 'var(--chart-tooltip-text)',
  },
} as const;

// ── Animation Presets ──────────────────────────────────
// Use with Framer Motion — consistent across all pages
export const motion = {
  /** Page entrance animation */
  pageEnter: {
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.25, ease: 'easeOut' },
  },
  /** Staggered container */
  staggerContainer: {
    initial: 'hidden',
    animate: 'visible',
    variants: {
      hidden: {},
      visible: { transition: { staggerChildren: 0.06 } },
    },
  },
  /** Staggered child item */
  staggerItem: {
    variants: {
      hidden: { opacity: 0, y: 8 },
      visible: { opacity: 1, y: 0, transition: { duration: 0.25, ease: 'easeOut' } },
    },
  },
  /** Card hover */
  cardHover: {
    whileHover: { y: -2, transition: { duration: 0.2 } },
  },
  /** Button tap feedback */
  buttonTap: {
    whileTap: { scale: 0.98 },
  },
} as const;

// ── Status Badge Classes ───────────────────────────────
// Use these for status indicators — auto dark mode via CSS vars
export const status = {
  /** Green: Active, Approved, Complete, On-time */
  success: 'badge-status status-success',
  /** Red: Terminated, Rejected, Failed, Absent */
  danger: 'badge-status status-danger',
  /** Yellow: Pending, On Leave, Late */
  warning: 'badge-status status-warning',
  /** Blue: Info, In Progress, Draft */
  info: 'badge-status status-info',
  /** Gray: Inactive, Unknown, Default */
  neutral: 'badge-status status-neutral',
  /** Purple: Admin, Manager, Special */
  purple: 'badge-status status-purple',
  /** Pink: Birthday, Anniversary, Celebration */
  pink: 'badge-status status-pink',
  /** Orange: Urgent, Overdue, Warning */
  orange: 'badge-status status-orange',
} as const;

// ── Tinted Background Classes ──────────────────────────
// Use for colored card backgrounds — auto dark mode via CSS vars
export const tint = {
  success: 'tint-success',
  danger: 'tint-danger',
  warning: 'tint-warning',
  info: 'tint-info',
  neutral: 'tint-neutral',
  purple: 'tint-purple',
  pink: 'tint-pink',
  orange: 'tint-orange',
} as const;

// ── Form Input Classes ─────────────────────────────────
export const input = {
  /** Standard text input */
  base: 'input-aura',
  /** Label above input */
  label: 'block text-sm font-medium text-[var(--text-secondary)] mb-2',
  /** Error message below input */
  error: 'text-xs mt-1',
  errorColor: 'text-[var(--status-danger-text)]',
} as const;

// ── Icon Sizes ─────────────────────────────────────────
export const iconSize = {
  /** Page header decorative icon */
  pageHeader: 'h-8 w-8',
  /** Stat card icon container */
  statCard: 'h-10 w-10',
  /** Card inline icon */
  cardInline: 'h-5 w-5',
  /** Button icon */
  button: 'h-4 w-4',
  /** Badge/metadata icon */
  meta: 'h-3.5 w-3.5',
} as const;
