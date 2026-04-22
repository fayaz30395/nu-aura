// ─── Praise badge categories ────────────────────────────────────────
export const PRAISE_CATEGORIES = [
  {
    id: 'team_player',
    label: 'Team Player',
    emoji: '🤝',
    color: "bg-accent-subtle text-accent border-[var(--accent-primary)]",
  },
  {
    id: 'innovator',
    label: 'Innovator',
    emoji: '💡',
    color: "bg-status-warning-bg text-status-warning-text border-status-warning-border",
  },
  {
    id: 'mentor',
    label: 'Mentor',
    emoji: '🎓',
    color: "bg-accent-subtle text-accent border-[var(--accent-primary)]",
  },
  {
    id: 'go_getter',
    label: 'Go-Getter',
    emoji: '🚀',
    color: "bg-status-success-bg text-status-success-text border-status-success-border",
  },
  {
    id: 'problem_solver',
    label: 'Problem Solver',
    emoji: '🧩',
    color: "bg-accent-subtle text-accent border-[var(--accent-primary)]",
  },
  {
    id: 'customer_champion',
    label: 'Customer Champion',
    emoji: '⭐',
    color: "bg-status-warning-bg text-status-warning-text border-status-warning-border",
  },
  {
    id: 'culture_hero',
    label: 'Culture Hero',
    emoji: '🏆',
    color: "bg-status-danger-bg text-status-danger-text border-status-danger-border",
  },
  {
    id: 'rising_star',
    label: 'Rising Star',
    emoji: '🌟',
    color: "bg-accent-subtle text-accent border-[var(--accent-primary)]",
  },
] as const;

export type PraiseCategoryId = (typeof PRAISE_CATEGORIES)[number]['id'];
