/**
 * Categorical color palette for user-pickable entity colors
 * (shifts, leave types, wiki spaces, project status fallbacks, etc.).
 *
 * Studio Slate v2: the product is single-hue (blue) by default, but some
 * entities legitimately need distinguishable categorical colors set by users.
 * Keep this palette short, accessible, and stable — call sites import from
 * here rather than redeclaring raw hex.
 *
 * Order is deliberate: the accent blue leads so it's the default for new entries.
 */
export const CATEGORICAL_PALETTE = [
  '#2563EB', // Accent (Studio Slate primary)
  '#16A34A', // Success / green
  '#D97706', // Warning / amber
  '#DC2626', // Danger / red
  '#9333EA', // Violet
  '#0891B2', // Cyan
  '#DB2777', // Pink
  '#EA580C', // Orange
  '#65A30D', // Lime
  '#475569', // Slate (neutral)
] as const;

export type CategoricalColor = (typeof CATEGORICAL_PALETTE)[number];

/** Default color when no explicit choice has been made. */
export const CATEGORICAL_DEFAULT = CATEGORICAL_PALETTE[0]; // '#2563EB'

/** Neutral placeholder when an entity has no color set (e.g., null colorCode). */
export const CATEGORICAL_UNSET = '#6B7280'; // tailwind gray-500 — readable on both light + dark surfaces

/** Indicator for "no activity" cells (off days, blocked slots). */
export const CATEGORICAL_OFF = '#9CA3AF'; // tailwind gray-400

/**
 * Map an integer index to a palette color, wrapping if out of range.
 * Useful for deterministically coloring items by their list position.
 *
 * @example
 *   pickCategoricalColor(0)  // → '#2563EB' (accent)
 *   pickCategoricalColor(11) // → '#16A34A' (wraps; same as index 1)
 */
export function pickCategoricalColor(index: number): string {
  if (Number.isNaN(index) || index < 0) return CATEGORICAL_DEFAULT;
  return CATEGORICAL_PALETTE[index % CATEGORICAL_PALETTE.length];
}

/**
 * Common semantic-status colors keyed by canonical status names.
 * Use for project / task / generic status fallbacks where the system
 * does not yet expose a `--status-*` token (typically inline canvas
 * rendering or chart fills).
 */
export const STATUS_FALLBACK_COLORS: Record<string, string> = {
  PLANNED: '#475569',
  IN_PROGRESS: '#2563EB',
  COMPLETED: '#16A34A',
  BLOCKED: '#DC2626',
  CANCELLED: '#94A3B8',
  ON_HOLD: '#D97706',
  MILESTONE: '#D97706',
  TASK_FALLBACK: '#475569',
};

/**
 * Resolve a status to its fallback color, defaulting to the categorical default.
 */
export function statusColor(status: string | undefined): string {
  if (!status) return CATEGORICAL_DEFAULT;
  return STATUS_FALLBACK_COLORS[status] ?? CATEGORICAL_DEFAULT;
}
