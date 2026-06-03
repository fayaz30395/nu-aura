'use client';

import React from 'react';
import {initialsFor} from './avatar';

interface EmployeeAvatarProps {
  name: string;
  /** Pixel size of the (square, rounded) avatar. */
  size?: 22 | 38 | 68;
  /** Optional photo URL — falls back to name-hashed initials. */
  src?: string;
}

const SIZE_CLASS: Record<NonNullable<EmployeeAvatarProps['size']>, {box: string; text: string}> = {
  22: {box: 'h-[22px] w-[22px]', text: 'text-[8px]'},
  38: {box: 'h-[38px] w-[38px]', text: 'text-[14px]'},
  68: {box: 'h-[68px] w-[68px]', text: 'text-[26px]'},
};

const AVATAR_CLASSES = [
  'bg-[var(--chart-1)]',
  'bg-[var(--chart-2)]',
  'bg-[var(--chart-3)]',
  'bg-[var(--chart-4)]',
  'bg-[var(--chart-5)]',
  'bg-[var(--accent)]',
] as const;

function colorClassForName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash << 5) - hash + name.charCodeAt(i);
    hash |= 0;
  }
  return AVATAR_CLASSES[Math.abs(hash) % AVATAR_CLASSES.length];
}

/**
 * Name-hashed initials avatar matching the Aura prototype `Avatar`.
 * Circular (prototype `.avatar` = border-radius 50%); tinted from a deterministic
 * hue ramp via the prototype's 150deg darkening gradient. Display font for the
 * initials to mirror the prototype's `--font-display` letterform.
 */
export function EmployeeAvatar({name, size = 38, src}: EmployeeAvatarProps) {
  const sizeClass = SIZE_CLASS[size];
  const bgClass = colorClassForName(name);

  if (src) {
    return (
      // Avatar URLs are arbitrary external/CDN sources; next/image would require
      // per-domain allowlisting we do not own here. Plain <img> is intentional.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt=""
        width={size}
        height={size}
        className={`shrink-0 rounded-full object-cover ${sizeClass.box}`}
      />
    );
  }

  return (
    <span
      aria-hidden
      className={`grid shrink-0 place-items-center rounded-full font-[family-name:var(--font-display)] font-bold tracking-[-0.01em] text-white ${sizeClass.box} ${sizeClass.text} ${bgClass}`}
    >
      {initialsFor(name)}
    </span>
  );
}

EmployeeAvatar.displayName = 'EmployeeAvatar';
