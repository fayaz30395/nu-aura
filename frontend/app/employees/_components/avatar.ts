/**
 * Page-local avatar helpers for the Employees Aura screen.
 *
 * The shared `components/ui` layer does not (yet) ship an `Avatar` primitive,
 * so these deterministic helpers reproduce the prototype's `colorFor` / `initials`
 * behaviour (name-hashed gradient + uppercase initials) using token-driven hues.
 * Kept page-local per the AURA_CONTRACT file-ownership rules.
 */

/** Token-driven hue ramp used to tint name-hashed avatars (light + dark safe). */
const AVATAR_HUES = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
  'var(--accent)',
] as const;

/** Deterministic avatar background from a name hash. */
export function colorForName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash << 5) - hash + name.charCodeAt(i);
    hash |= 0;
  }
  const idx = Math.abs(hash) % AVATAR_HUES.length;
  return AVATAR_HUES[idx];
}

/** First + last initial, uppercase. Falls back to first two letters of a single token. */
export function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
