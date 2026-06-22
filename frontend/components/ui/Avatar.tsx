'use client';

import React from 'react';

export type AvatarSize = 'sm' | 'md' | 'lg' | 'xl';

export interface AvatarProps {
  /** Full name — drives initials and the deterministic fallback tint. */
  name: string;
  /** Optional photo URL. Falls back to name-hashed initials when absent OR if the image fails to load. */
  src?: string | null;
  /** Named size tier → 32 / 48 / 72 / 112px (mirrors the --elv-avatar-* scale). */
  size?: AvatarSize;
  /** Surface-colored ring for photo-forward / elevation contexts. */
  ring?: boolean;
  className?: string;
}

const SIZE_PX: Record<AvatarSize, {box: number; text: string}> = {
  sm: {box: 32, text: 'text-[12px]'},
  md: {box: 48, text: 'text-[16px]'},
  lg: {box: 72, text: 'text-[26px]'},
  xl: {box: 112, text: 'text-[40px]'},
};

// Token-driven hue ramp — light + dark safe. Matches the existing EmployeeAvatar
// palette so the shared and page-local avatars tint identically during migration.
const TINTS = [
  'bg-[var(--chart-1)]',
  'bg-[var(--chart-2)]',
  'bg-[var(--chart-3)]',
  'bg-[var(--chart-4)]',
  'bg-[var(--chart-5)]',
  'bg-[var(--accent)]',
] as const;

function tintForName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash << 5) - hash + name.charCodeAt(i);
    hash |= 0;
  }
  return TINTS[Math.abs(hash) % TINTS.length];
}

/** First + last initial, uppercase; falls back to the first two letters of a single token. */
function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Shared, photo-forward avatar primitive. Circular; named size tiers; deterministic
 * name-hashed initials fallback. Supersedes the file-local avatar helpers
 * (EmployeeAvatar, AvatarInitials, and the per-page *Avatar fns) as they are migrated.
 */
export function Avatar({name, src, size = 'md', ring = false, className}: AvatarProps) {
  const [failed, setFailed] = React.useState(false);
  const {box, text} = SIZE_PX[size];
  const ringClass = ring ? 'ring-2 ring-[var(--bg-card)]' : '';
  const base = ['shrink-0 rounded-full', ringClass, className].filter(Boolean).join(' ');

  if (src && !failed) {
    return (
      // Avatar URLs are arbitrary external/CDN sources; next/image would require
      // per-domain allowlisting we do not own here. Plain <img> is intentional.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt=""
        width={box}
        height={box}
        style={{width: box, height: box}}
        onError={() => setFailed(true)}
        className={`object-cover ${base}`}
      />
    );
  }

  return (
    <span
      aria-hidden
      style={{width: box, height: box}}
      className={`grid place-items-center font-[family-name:var(--font-display)] font-bold tracking-[-0.01em] text-white ${text} ${tintForName(name)} ${base}`}
    >
      {initialsFor(name)}
    </span>
  );
}

Avatar.displayName = 'Avatar';
