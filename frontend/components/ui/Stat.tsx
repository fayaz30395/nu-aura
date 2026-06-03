'use client';

import React from 'react';
import {Minus, TrendingDown, TrendingUp} from 'lucide-react';
import {cn} from '@/lib/utils';

/** Semantic tone for the value text. Surface stays neutral regardless. */
export type StatTone = 'default' | 'accent' | 'success' | 'warning' | 'danger' | 'muted';

/** Direction of the optional delta pill. */
export type StatDeltaDir = 'up' | 'down' | 'flat';

/** Tint applied to the optional leading icon tile. */
export type StatIconTone = 'accent' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';

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
  /** Optional leading icon shown next to the label (flat) or in a tinted tile (when `iconTone` set). */
  icon?: React.ReactNode;
  /**
   * Aura: render the icon inside a tinted square tile in the stat header row.
   * When set, the icon moves out of the label line and into a 38px tinted tile.
   */
  iconTone?: StatIconTone;
  /**
   * Aura delta pill, rendered top-right of the header. up=green / down=red / flat=neutral.
   * Numeric figures use the mono/tabular treatment.
   */
  delta?: React.ReactNode;
  /** Direction of the delta pill. Default 'up'. */
  deltaDir?: StatDeltaDir;
  /** Sparkline slot (e.g., a Recharts mini-chart). Rendered beneath the value. */
  spark?: React.ReactNode;
  /** Footnote rendered at the very bottom (e.g., "Updated 2m ago"). */
  foot?: React.ReactNode;
  className?: string;
}

/** Tailwind class applied to the value text per tone. */
const toneToValueColor: Record<StatTone, string> = {
  default: 'text-[var(--text-primary)]',
  accent: 'text-[var(--accent-primary)]',
  success: 'text-[var(--ok-fg)]',
  warning: 'text-[var(--warn-fg)]',
  danger: 'text-[var(--err-fg)]',
  muted: 'text-[var(--text-secondary)]',
};

/** Tinted icon-tile classes per Aura icon tone (background + foreground, token-driven). */
const iconToneClass: Record<StatIconTone, string> = {
  accent: 'bg-[var(--accent-soft)] text-[var(--accent-text)]',
  info: 'bg-[var(--info-bg)] text-[var(--info-fg)]',
  success: 'bg-[var(--ok-bg)] text-[var(--ok-fg)]',
  warning: 'bg-[var(--warn-bg)] text-[var(--warn-fg)]',
  danger: 'bg-[var(--err-bg)] text-[var(--err-fg)]',
  neutral: 'bg-[var(--neutral-bg)] text-[var(--neutral-fg)]',
};

/** Delta-pill classes per direction (Aura: mono figures, status-tinted). */
const deltaDirClass: Record<StatDeltaDir, string> = {
  up: 'text-[var(--ok-fg)] bg-[var(--ok-bg)]',
  down: 'text-[var(--err-fg)] bg-[var(--err-bg)]',
  flat: 'text-[var(--text-3)] bg-[var(--neutral-bg)]',
};

const DeltaIcon: Record<StatDeltaDir, typeof TrendingUp> = {
  up: TrendingUp,
  down: TrendingDown,
  flat: Minus,
};

/**
 * Flat, single-hue statistic, Aura-aligned.
 *
 * Default shape stays a minimal label + tabular value + caption (no chrome), so
 * existing call sites are unchanged. Opt-in Aura affordances:
 * - `iconTone` → tinted 38px icon tile in a header row
 * - `delta` + `deltaDir` → status-tinted mono delta pill (up=green / down=red / flat)
 * - `spark` → sparkline slot beneath the value
 * - `foot` → footnote row
 *
 * Numerics use the mono / tabular-nums treatment via `.text-stat-*`.
 */
export function Stat({
  label,
  value,
  caption,
  tone = 'default',
  size = 'default',
  icon,
  iconTone,
  delta,
  deltaDir = 'up',
  spark,
  foot,
  className,
}: StatProps) {
  const valueClass = size === 'compact' ? 'text-stat-medium' : 'text-stat-large';
  const labelClass = size === 'compact' ? 'text-2xs uppercase tracking-wider' : 'text-xs uppercase tracking-wider';

  // The icon renders in a tinted header tile only when `iconTone` is set; otherwise
  // it stays inline on the label line (preserves the original flat layout + tests).
  const hasHeader = (iconTone && icon) || delta != null;
  const Delta = DeltaIcon[deltaDir];

  // `.motion-rise` is a CSS-only fade+8px-rise entrance (Foundation utility);
  // it self-neutralizes under prefers-reduced-motion via the globals.css media
  // block. Root structure is unchanged so the className contract holds.
  return (
    <div className={cn('motion-rise flex flex-col gap-1', className)}>
      {hasHeader ? (
        <div className="flex items-center justify-between">
          {iconTone && icon ? (
            <span
              className={cn(
                'inline-grid h-[38px] w-[38px] place-items-center rounded-aura-lg',
                iconToneClass[iconTone]
              )}
              aria-hidden="true"
            >
              {icon}
            </span>
          ) : (
            <span />
          )}
          {delta != null ? (
            <span
              className={cn(
                'tnum inline-flex items-center gap-1 rounded-aura-sm px-1.5 py-0.5 text-xs font-bold',
                deltaDirClass[deltaDir]
              )}
              aria-label={`Delta: ${delta}`}
            >
              <Delta className="h-3 w-3" aria-hidden />
              {delta}
            </span>
          ) : null}
        </div>
      ) : null}

      <div className={cn('flex items-center gap-1.5 text-[var(--text-muted)] font-medium', labelClass)}>
        {icon && !iconTone ? <span className="inline-flex h-3.5 w-3.5">{icon}</span> : null}
        <span>{label}</span>
      </div>
      {/* `valueClass` (font-size/line-height/tabular-nums) and the tone color class
          are split across parent + child so tailwind-merge can't collapse them
          into a single `text-*` group. */}
      <div className={valueClass}>
        <span className={toneToValueColor[tone]}>{value}</span>
      </div>
      {spark ? <div className="mt-0.5">{spark}</div> : null}
      {caption ? (
        <div className="text-xs text-[var(--text-secondary)]">{caption}</div>
      ) : null}
      {foot ? (
        <div className="text-xs text-[var(--text-muted)]">{foot}</div>
      ) : null}
    </div>
  );
}

Stat.displayName = 'Stat';
