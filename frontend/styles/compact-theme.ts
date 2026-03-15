/**
 * NU-AURA Design System — Compact Theme Configuration
 *
 * STRICT 8px GRID: All spacing values must be multiples of 4px/8px.
 * Allowed scale: 4, 8, 16, 24, 32, 48, 64px
 * Tailwind map: p-1(4), p-2(8), p-4(16), p-6(24), p-8(32), p-12(48), p-16(64)
 *
 * BANNED: gap-3, p-3, p-5, gap-5, space-y-5, space-y-3
 *
 * Reference: Linear, Vercel, Stripe dashboard density
 */

export const compactTheme = {
  // ── Spacing (strict 8px grid) ──────────────────────
  spacing: {
    page: 'p-4 md:p-6 lg:p-8',
    sectionGap: 'space-y-6',
    cardGap: 'gap-4',
    cardGapLarge: 'gap-6',
    cardPadding: 'p-4',
    cardPaddingLarge: 'p-6',
  },

  // ── Typography (enforced scale) ────────────────────
  typography: {
    pageTitle: 'text-2xl font-bold tracking-tight',
    sectionTitle: 'text-lg font-semibold',
    cardTitle: 'text-base font-semibold',
    label: 'text-xs font-medium',
    labelMicro: 'text-xs font-medium uppercase tracking-wider',
    body: 'text-sm',
    bodySmall: 'text-xs',
    statLarge: 'text-2xl font-bold tabular-nums',
    statMedium: 'text-xl font-bold tabular-nums',
  },

  // ── Icons (standardized per context) ───────────────
  icons: {
    pageHeader: 'h-8 w-8',
    cardHeader: 'h-8 w-8',
    statCard: 'h-10 w-10',
    cardInline: 'h-5 w-5',
    cardIcon: 'h-4 w-4',
    button: 'h-4 w-4',
    badgeMeta: 'h-3.5 w-3.5',
  },

  // ── Buttons (consistent sizing) ────────────────────
  buttons: {
    primary: 'h-10 px-4 text-sm font-semibold rounded-lg',
    secondary: 'h-10 px-4 text-sm font-medium rounded-lg',
    small: 'h-8 px-4 text-xs font-medium rounded-lg',
    large: 'h-12 px-6 text-base font-semibold rounded-xl',
  },

  // ── Cards (unified standard) ───────────────────────
  cards: {
    base: 'card-aura',
    interactive: 'card-interactive',
    elevated: 'card-elevated',
    gradient: 'bg-gradient-to-br card-aura',
  },

  // ── Gradients (semantic color names — NOT aliased) ─
  gradients: {
    primary: 'from-primary-500 to-primary-700',
    success: 'from-success-500 to-success-700',
    warning: 'from-warning-500 to-accent-600',
    danger: 'from-danger-500 to-danger-700',
    info: 'from-info-500 to-info-700',
    accent: 'from-accent-500 to-accent-700',
  },

  // ── Background Gradients (with dark variants) ──────
  bgGradients: {
    primary: 'from-primary-50 to-primary-100/60 dark:from-primary-950/30 dark:to-primary-900/20',
    success: 'from-success-50 to-success-100/60 dark:from-success-950/30 dark:to-success-900/20',
    warning: 'from-warning-50 to-accent-50 dark:from-warning-950/30 dark:to-accent-900/20',
    danger: 'from-danger-50 to-danger-100/60 dark:from-danger-950/30 dark:to-danger-900/20',
    info: 'from-info-50 to-info-100/60 dark:from-info-950/30 dark:to-info-900/20',
    accent: 'from-accent-50 to-accent-100/60 dark:from-accent-950/30 dark:to-accent-900/20',
    neutral: 'from-surface-50 to-surface-100 dark:from-surface-900 dark:to-surface-800',
  },

  // ── Table (consistent, sticky-ready) ───────────────
  table: {
    header: 'px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]',
    headerSticky: 'sticky top-0 z-10 bg-[var(--bg-card)]',
    cell: 'px-4 py-3 text-sm',
    row: 'hover:bg-[var(--bg-card-hover)] transition-colors duration-100',
    divider: 'border-b border-[var(--border-subtle)]',
  },

  // ── Forms (consistent heights) ─────────────────────
  forms: {
    input: 'h-10 px-4 text-sm rounded-lg',
    inputSmall: 'h-8 px-4 text-sm rounded-lg',
    label: 'text-xs font-medium mb-2',
    select: 'h-10 px-4 text-sm rounded-lg',
  },

  // ── Badges ─────────────────────────────────────────
  badges: {
    base: 'px-2 py-1 text-xs font-medium rounded-md',
    large: 'px-2.5 py-1 text-sm font-medium rounded-md',
  },

  // ── Shadows (use CSS variables for theme-awareness) ─
  shadows: {
    card: 'shadow-card',
    cardHover: 'shadow-card-hover',
    elevated: 'shadow-elevated',
    dropdown: 'shadow-dropdown',
  },
};

// Helper function to create compact stat card classes
export const createStatCardClasses = (gradient: keyof typeof compactTheme.gradients) => ({
  card: `${compactTheme.cards.base} bg-gradient-to-br ${compactTheme.bgGradients[gradient]}`,
  icon: `${compactTheme.icons.statCard} rounded-lg bg-gradient-to-br ${compactTheme.gradients[gradient]} flex items-center justify-center shadow-sm`,
  label: compactTheme.typography.labelMicro,
  value: compactTheme.typography.statLarge,
  description: compactTheme.typography.bodySmall,
});

// Helper function to create compact action card classes
export const createActionCardClasses = (gradient: keyof typeof compactTheme.bgGradients) => ({
  card: `${compactTheme.cards.interactive} bg-gradient-to-br ${compactTheme.bgGradients[gradient]}`,
  icon: `${compactTheme.icons.statCard} rounded-xl bg-gradient-to-br flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform duration-200`,
  title: `${compactTheme.typography.cardTitle} mb-1`,
  description: compactTheme.typography.bodySmall,
});
