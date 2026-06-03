'use client';

/**
 * Aura BarsH — labelled horizontal bar list (HTML/CSS, not SVG).
 *
 * Token-driven: track uses --surface-sunken, fills use chart-* vars, value
 * labels use --font-mono + tabular figures. Used for ranked breakdowns
 * (top departments, leave types). Bar widths ease in on mount, reduced-motion
 * safe.
 */

import React, {useId} from 'react';
import {useReducedMotionSafe} from '@/lib/animation';

export interface BarsHItem {
  /** Row caption. */
  label: string;
  /** Numeric magnitude — widths are relative to the largest value. */
  value: number;
  /** Optional per-row fill override (CSS var). Falls back to `color`/first-row accent. */
  color?: string;
}

export interface BarsHProps {
  /** Rows, rendered top-to-bottom in the given order. */
  data: BarsHItem[];
  /** Default fill for rows after the first. Pass a CSS var. */
  color?: string;
  /** Fill for the leading (first) row — defaults to the primary chart color. */
  leadColor?: string;
  /** Format a value for the right-aligned figure. Defaults to locale string. */
  formatValue?: (value: number) => string;
  className?: string;
}

const defaultFormat = (v: number): string => v.toLocaleString();

/**
 * Aura BarsH. Each row pairs a label/value header with a sunken track and an
 * animated fill. The first row is emphasized with `leadColor`.
 */
export function BarsH({
  data,
  color = 'var(--chart-2)',
  leadColor = 'var(--chart-1)',
  formatValue = defaultFormat,
  className,
}: BarsHProps) {
  const gid = useId().replace(/:/g, '');
  const {prefersReduced} = useReducedMotionSafe();
  const max = Math.max(...data.map((d) => d.value), 1);

  return (
    <div
      id={`aura-bars-${gid}`}
      className={className}
      style={{display: 'flex', flexDirection: 'column', gap: 13}}
    >
      {!prefersReduced && (
        <style>{`
          #aura-bars-${gid} .aura-bars-fill {
            transform-origin: left center;
            animation: aura-bars-grow-${gid} var(--t-slow,280ms) var(--ease,cubic-bezier(.4,0,.2,1)) both;
          }
          @keyframes aura-bars-grow-${gid} {
            from { transform: scaleX(0); }
            to { transform: scaleX(1); }
          }
        `}</style>
      )}

      {data.map((d, i) => {
        const widthPct = (d.value / max) * 100;
        const fill = d.color ?? (i === 0 ? leadColor : color);
        return (
          <div key={`${d.label}-${i}`}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: 5,
              }}
            >
              <span style={{fontSize: 12.5, fontWeight: 600, color: 'var(--text-2)'}}>
                {d.label}
              </span>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--text-1)',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {formatValue(d.value)}
              </span>
            </div>
            <div
              style={{
                height: 8,
                borderRadius: 'var(--r-full, 999px)',
                background: 'var(--surface-sunken)',
                overflow: 'hidden',
              }}
            >
              <div
                className={prefersReduced ? undefined : 'aura-bars-fill'}
                style={{
                  height: '100%',
                  width: `${widthPct}%`,
                  borderRadius: 'inherit',
                  background: fill,
                  animationDelay: prefersReduced ? undefined : `${i * 60}ms`,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
