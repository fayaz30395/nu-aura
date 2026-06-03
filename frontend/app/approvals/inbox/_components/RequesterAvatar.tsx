'use client';

import React from 'react';

/**
 * Page-local requester avatar for the Approvals inbox Aura screen.
 *
 * The shared `components/ui` layer does not ship an `Avatar` primitive (flagged
 * PHASE-0 in AURA_CONTRACT), so this reproduces the prototype's `colorFor` /
 * `initials` behaviour — a deterministic name-hashed gradient with white
 * initials — using token-driven hues. Mirrors the Employees screen's
 * `EmployeeAvatar` so the two surfaces stay visually consistent. Kept
 * page-local per the file-ownership rules.
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
function colorForName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash << 5) - hash + name.charCodeAt(i);
    hash |= 0;
  }
  const idx = Math.abs(hash) % AVATAR_HUES.length;
  return AVATAR_HUES[idx];
}

/** First + last initial, uppercase. Falls back to first two letters of a single token. */
function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

interface RequesterAvatarProps {
  /** Display name; drives both the gradient hue and the initials. */
  name?: string;
  /** Pixel size of the (circular) avatar. */
  size?: number;
}

/**
 * Circular name-hashed initials avatar matching the Aura prototype `Avatar`.
 * Tinted from a deterministic hue ramp; white initials for AA contrast.
 */
export function RequesterAvatar({name, size = 48}: RequesterAvatarProps) {
  const safeName = name?.trim() || 'Unknown';
  const bg = colorForName(safeName);
  const fontSize = Math.round(size * 0.32);

  return (
    <span
      aria-hidden
      className="num grid shrink-0 place-items-center rounded-full font-bold text-white"
      style={{
        width: size,
        height: size,
        fontSize,
        background: `linear-gradient(155deg, color-mix(in srgb, ${bg} 86%, white 14%), ${bg})`,
        boxShadow: 'var(--sh-xs)',
      }}
    >
      {initialsFor(safeName)}
    </span>
  );
}

RequesterAvatar.displayName = 'RequesterAvatar';
