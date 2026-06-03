'use client';

import React from 'react';
import {colorForName, initialsFor} from './avatar';

interface EmployeeAvatarProps {
  name: string;
  /** Pixel size of the (square, rounded) avatar. */
  size?: number;
  /** Optional photo URL — falls back to name-hashed initials. */
  src?: string;
}

/**
 * Name-hashed initials avatar matching the Aura prototype `Avatar`.
 * Square with `--r-md` radius; tinted from a deterministic hue ramp.
 */
export function EmployeeAvatar({name, size = 38, src}: EmployeeAvatarProps) {
  const bg = colorForName(name);
  const fontSize = Math.round(size * 0.38);

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
        className="shrink-0 rounded-[var(--r-md)] object-cover"
        style={{width: size, height: size}}
      />
    );
  }

  return (
    <span
      aria-hidden
      className="grid shrink-0 place-items-center rounded-[var(--r-md)] font-semibold text-white"
      style={{
        width: size,
        height: size,
        fontSize,
        background: `linear-gradient(155deg, color-mix(in srgb, ${bg} 88%, white 12%), ${bg})`,
      }}
    >
      {initialsFor(name)}
    </span>
  );
}

EmployeeAvatar.displayName = 'EmployeeAvatar';
