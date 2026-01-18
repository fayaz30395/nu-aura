/**
 * Compact Theme Configuration
 * Modern, space-efficient design system inspired by Keka
 */

export const compactTheme = {
  // Spacing
  spacing: {
    page: 'p-4 md:p-5 lg:p-6',
    sectionGap: 'space-y-4',
    cardGap: 'gap-4',
    cardGapSmall: 'gap-3',
    cardPadding: 'p-4',
    cardPaddingSmall: 'p-3',
  },

  // Typography
  typography: {
    pageTitle: 'text-2xl font-bold',
    cardTitle: 'text-base font-bold',
    sectionTitle: 'text-lg font-bold',
    label: 'text-xs font-medium',
    labelSmall: 'text-[10px] font-semibold uppercase tracking-wider',
    body: 'text-sm',
    bodySmall: 'text-xs',
    statLarge: 'text-2xl font-bold tabular-nums',
    statMedium: 'text-xl font-bold tabular-nums',
  },

  // Icons
  icons: {
    pageHeader: 'h-8 w-8',
    cardHeader: 'h-8 w-8',
    cardIcon: 'h-4 w-4',
    cardIconMedium: 'h-5 w-5',
    stat: 'h-8 w-8',
    statSmall: 'h-7 w-7',
  },

  // Buttons
  buttons: {
    primary: 'h-10 px-4 text-sm font-semibold rounded-lg',
    secondary: 'h-9 px-3 text-sm font-medium rounded-lg',
    small: 'h-8 px-3 text-xs font-medium rounded-md',
    large: 'h-12 px-6 text-base font-semibold rounded-xl',
  },

  // Cards
  cards: {
    base: 'border-0 shadow-md hover:shadow-lg transition-shadow rounded-lg',
    interactive: 'border-0 shadow-md hover:shadow-lg transition-all cursor-pointer hover:-translate-y-0.5 rounded-lg',
    gradient: 'bg-gradient-to-br border-0 shadow-lg rounded-lg',
  },

  // Gradients
  gradients: {
    primary: 'from-indigo-500 to-purple-600',
    success: 'from-emerald-500 to-teal-600',
    warning: 'from-amber-500 to-orange-600',
    danger: 'from-rose-500 to-pink-600',
    info: 'from-blue-500 to-cyan-600',
    purple: 'from-purple-500 to-pink-600',
  },

  // Background Gradients
  bgGradients: {
    primary: 'from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20',
    success: 'from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20',
    warning: 'from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20',
    danger: 'from-rose-50 to-pink-50 dark:from-rose-900/20 dark:to-pink-900/20',
    info: 'from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20',
    purple: 'from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20',
    slate: 'from-slate-50 to-gray-50 dark:from-slate-800 dark:to-gray-800',
  },

  // Table
  table: {
    header: 'px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider',
    cell: 'px-4 py-3 text-sm',
    row: 'hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors',
  },

  // Forms
  forms: {
    input: 'h-10 px-3 text-sm rounded-lg',
    inputSmall: 'h-9 px-3 text-sm rounded-md',
    label: 'text-xs font-medium mb-1.5',
    select: 'h-10 px-3 text-sm rounded-lg',
  },

  // Badges
  badges: {
    base: 'px-2 py-0.5 text-xs font-medium rounded-full',
    large: 'px-3 py-1 text-sm font-medium rounded-full',
  },

  // Shadows
  shadows: {
    sm: 'shadow-sm',
    md: 'shadow-md',
    lg: 'shadow-lg',
    xl: 'shadow-xl',
  },
};

// Helper function to create compact stat card classes
export const createStatCardClasses = (gradient: keyof typeof compactTheme.gradients) => ({
  card: `${compactTheme.cards.base} bg-gradient-to-br ${compactTheme.bgGradients[gradient]}`,
  icon: `${compactTheme.icons.stat} rounded-lg bg-gradient-to-br ${compactTheme.gradients[gradient]} flex items-center justify-center shadow-sm`,
  label: compactTheme.typography.labelSmall,
  value: compactTheme.typography.statLarge,
  description: compactTheme.typography.bodySmall,
});

// Helper function to create compact action card classes
export const createActionCardClasses = (gradient: keyof typeof compactTheme.bgGradients) => ({
  card: `${compactTheme.cards.interactive} bg-gradient-to-br ${compactTheme.bgGradients[gradient]}`,
  icon: `h-10 w-10 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform`,
  title: `${compactTheme.typography.cardTitle} mb-0.5`,
  description: compactTheme.typography.bodySmall,
});
