'use client';

import React from 'react';
import {cn} from '@/lib/utils';

type ProgressTone = 'accent' | 'ok' | 'warn' | 'err';

interface ProgressProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'children'> {
  /** 0-100; values outside the range are clamped. */
  value: number;
  tone?: ProgressTone;
  size?: 'sm' | 'md';
  /** Accessible name; required because a bare bar says nothing to a screen reader. */
  label: string;
}

const toneFill: Record<ProgressTone, string> = {
  accent: 'bg-[var(--accent-primary)]',
  ok: 'bg-[var(--ok-fg)]',
  warn: 'bg-[var(--warn-fg)]',
  err: 'bg-[var(--err-fg)]',
};

/** Neutral track + token fill. Use `ok`/`warn`/`err` only for real status, `accent` otherwise. */
export function Progress({value, tone = 'accent', size = 'sm', label, className, ...props}: ProgressProps) {
  const pct = Math.min(100, Math.max(0, Number.isFinite(value) ? value : 0));
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct)}
      className={cn(
        'w-full overflow-hidden rounded-full bg-[var(--bg-surface-2,var(--border-main))]',
        size === 'sm' ? 'h-1.5' : 'h-2.5',
        className
      )}
      {...props}
    >
      <div
        className={cn('h-full rounded-full transition-[width] duration-[var(--t-base,200ms)]', toneFill[tone])}
        style={{width: `${pct}%`}}
      />
    </div>
  );
}

Progress.displayName = 'Progress';
