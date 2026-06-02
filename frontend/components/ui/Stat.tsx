'use client';

import React from 'react';
import {cn} from '@/lib/utils';

/** Semantic tone for the value text. Surface stays neutral regardless. */
export type StatTone = 'default' | 'accent' | 'success' | 'warning' | 'danger' | 'muted';

/** Props for {@link Stat}. */
export interface StatProps {
  label: React.ReactNode;
  value: React.ReactNode;
  /** Optional caption rendered beneath the value (e.g., "+12% vs last month"). */
  caption?: React.ReactNode;
  /** Tints the value text only; surfaces stay neutral per Studio Slate. */
  tone?: StatTone;
  /** Compact variant for dense dashboards: smaller label + value. */
  size?: 'default' | 'compact';
  /** Optional leading icon shown next to the label. */
  icon?: React.ReactNode;
  className?: string;
}

/** Tailwind class applied to the value text per tone. */
const toneToValueColor: Record<StatTone, string> = {
  default: 'text-[var(--text-primary)]',
  accent: 'text-accent-700 dark:text-accent-400',
  success: 'text-success-700 dark:text-success-400',
  warning: 'text-warning-700 dark:text-warning-400',
  danger: 'text-danger-700 dark:text-danger-400',
  muted: 'text-[var(--text-secondary)]',
};

/**
 * Flat, single-hue statistic. Replaces the "big-number + tiny-label + gradient-bar"
 * SaaS hero-metric template banned by DESIGN.md.
 *
 * - Tabular numerals via `.text-stat-large` / `.text-stat-medium` (already in globals.css).
 * - Tone tints the value only; the surface stays neutral.
 * - No background gradient, no side stripe, no shadow, no decorative accent.
 */
export function Stat({
  label,
  value,
  caption,
  tone = 'default',
  size = 'default',
  icon,
  className,
}: StatProps) {
  const valueClass = size === 'compact' ? 'text-stat-medium' : 'text-stat-large';
  const labelClass = size === 'compact' ? 'text-2xs uppercase tracking-wider' : 'text-xs uppercase tracking-wider';

  // `.motion-rise` is a CSS-only fade+8px-rise entrance (Foundation utility);
  // it self-neutralizes under prefers-reduced-motion via the globals.css media
  // block. Root structure is unchanged so the className contract holds.
  return (
    <div className={cn('motion-rise flex flex-col gap-1', className)}>
      <div className={cn('flex items-center gap-1.5 text-[var(--text-muted)] font-medium', labelClass)}>
        {icon ? <span className="inline-flex h-3.5 w-3.5">{icon}</span> : null}
        <span>{label}</span>
      </div>
      {/* `valueClass` (font-size/line-height/tabular-nums) and the tone color class
          are split across parent + child so tailwind-merge can't collapse them
          into a single `text-*` group. */}
      <div className={valueClass}>
        <span className={toneToValueColor[tone]}>{value}</span>
      </div>
      {caption ? (
        <div className="text-xs text-[var(--text-secondary)]">{caption}</div>
      ) : null}
    </div>
  );
}

Stat.displayName = 'Stat';
