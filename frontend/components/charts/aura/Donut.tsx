'use client';

/**
 * Aura Donut — segmented ring with optional center label (SVG).
 *
 * Token-driven: track uses --surface-sunken, segments use caller-supplied CSS
 * vars (typically --chart-1..5). Matches the dashboard "Attendance" donut with
 * its "88% / present" center. Segment sweep animates on mount, reduced-motion
 * safe.
 */

import React, {useId} from 'react';
import {useReducedMotionSafe} from '@/lib/animation';

export interface DonutSegment {
  /** Slice magnitude (any unit — fractions are derived from the total). */
  value: number;
  /** Slice color. Pass a CSS var, e.g. 'var(--chart-1)'. */
  color: string;
  /** Optional label for accessibility / legend pairing. */
  label?: string;
}

export interface DonutCenter {
  /** Large primary value, e.g. '88%'. */
  value: React.ReactNode;
  /** Muted caption beneath the value, e.g. 'present'. */
  label?: string;
}

export interface DonutProps {
  /** Ordered segments, drawn clockwise from 12 o'clock. */
  data: DonutSegment[];
  /** Outer diameter in px. */
  size?: number;
  /** Ring thickness in px. */
  thickness?: number;
  /** Optional center value + caption. */
  center?: DonutCenter;
  /** Accessible label for the whole chart. */
  ariaLabel?: string;
  className?: string;
}

/**
 * Aura Donut. Segments are stroked circular arcs offset by accumulated fraction.
 * On mount each arc grows from zero (gated by prefers-reduced-motion).
 */
export function Donut({
  data,
  size = 150,
  thickness = 22,
  center,
  ariaLabel,
  className,
}: DonutProps) {
  const gid = useId().replace(/:/g, '');
  const {prefersReduced} = useReducedMotionSafe();

  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const r = (size - thickness) / 2;
  const c = size / 2;
  const circ = 2 * Math.PI * r;

  let acc = 0;
  const segments = data.map((d, i) => {
    const frac = d.value / total;
    const dash = frac * circ;
    const offset = -acc * circ;
    acc += frac;
    return {key: i, color: d.color, dash, offset, delay: i * 90};
  });

  return (
    <svg
      id={`aura-donut-${gid}`}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={
        ariaLabel ??
        (center && typeof center.value === 'string'
          ? `${center.value} ${center.label ?? ''}`.trim()
          : 'Donut chart')
      }
      className={className}
      style={{width: size, height: size}}
    >
      {!prefersReduced && (
        <style>{`
          #aura-donut-${gid} .aura-donut-seg {
            animation: aura-donut-grow-${gid} var(--t-slow,280ms) var(--ease,cubic-bezier(.4,0,.2,1)) both;
          }
          @keyframes aura-donut-grow-${gid} {
            from { stroke-dasharray: 0 ${circ.toFixed(2)}; }
          }
        `}</style>
      )}

      <circle
        cx={c}
        cy={c}
        r={r}
        fill="none"
        stroke="var(--surface-sunken)"
        strokeWidth={thickness}
      />

      {segments.map((s) => (
        <circle
          key={s.key}
          cx={c}
          cy={c}
          r={r}
          fill="none"
          stroke={s.color}
          strokeWidth={thickness}
          strokeDasharray={`${s.dash} ${circ - s.dash}`}
          strokeDashoffset={s.offset}
          transform={`rotate(-90 ${c} ${c})`}
          strokeLinecap="butt"
          className={prefersReduced ? undefined : 'aura-donut-seg'}
          style={prefersReduced ? undefined : {animationDelay: `${s.delay}ms`}}
        />
      ))}

      {center && (
        <text
          x={c}
          y={c - 2}
          textAnchor="middle"
          fontSize="26"
          fontWeight="700"
          fontFamily="var(--font-display)"
          fill="var(--text-1)"
          className="tabular-nums"
        >
          {center.value}
        </text>
      )}
      {center?.label && (
        <text
          x={c}
          y={c + 15}
          textAnchor="middle"
          fontSize="10.5"
          fontFamily="var(--font-sans)"
          fill="var(--text-3)"
        >
          {center.label}
        </text>
      )}
    </svg>
  );
}
