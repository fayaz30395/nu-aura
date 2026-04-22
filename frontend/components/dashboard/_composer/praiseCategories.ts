// ─── Praise badge categories ────────────────────────────────────────
export const PRAISE_CATEGORIES = [
  {
    id: 'team_player',
    label: 'Team Player',
    emoji: '🤝',
    color: 'bg-accent-50 text-accent-700 border-accent-200 dark:bg-accent-950 dark:text-accent-300 dark:border-accent-800',
  },
  {
    id: 'innovator',
    label: 'Innovator',
    emoji: '💡',
    color: 'bg-warning-50 text-warning-700 border-warning-200 dark:bg-warning-950 dark:text-warning-300 dark:border-warning-800',
  },
  {
    id: 'mentor',
    label: 'Mentor',
    emoji: '🎓',
    color: 'bg-accent-250 text-accent-900 border-accent-400 dark:bg-accent-900 dark:text-accent-500 dark:border-accent-900',
  },
  {
    id: 'go_getter',
    label: 'Go-Getter',
    emoji: '🚀',
    color: 'bg-success-50 text-success-700 border-success-200 dark:bg-success-950 dark:text-success-300 dark:border-success-800',
  },
  {
    id: 'problem_solver',
    label: 'Problem Solver',
    emoji: '🧩',
    color: 'bg-accent-50 text-accent-700 border-accent-200 dark:bg-accent-950 dark:text-accent-300 dark:border-accent-800',
  },
  {
    id: 'customer_champion',
    label: 'Customer Champion',
    emoji: '⭐',
    color: 'bg-warning-50 text-warning-700 border-warning-200 dark:bg-warning-950 dark:text-warning-300 dark:border-warning-800',
  },
  {
    id: 'culture_hero',
    label: 'Culture Hero',
    emoji: '🏆',
    color: 'bg-danger-50 text-danger-700 border-danger-200 dark:bg-danger-950 dark:text-danger-300 dark:border-danger-800',
  },
  {
    id: 'rising_star',
    label: 'Rising Star',
    emoji: '🌟',
    color: 'bg-accent-50 text-accent-700 border-accent-200 dark:bg-accent-950 dark:text-accent-300 dark:border-accent-800',
  },
] as const;

export type PraiseCategoryId = (typeof PRAISE_CATEGORIES)[number]['id'];
