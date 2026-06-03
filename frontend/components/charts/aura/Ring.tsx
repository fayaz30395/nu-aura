'use client';

/**
 * Aura Ring — single-value progress ring with optional center label (SVG).
 *
 * Token-driven: track uses --surface-sunken, progress uses caller color
 * (default --accent). Used for compact per-metric progress (attendance rates,
 * goal completion). Progress sweep animates on mount, reduced-motion safe.
 */

import React, {useId} from 'react';
import {useReducedMotionSafe} from '@/lib/animation';

export interface RingProps {
  /** Progress as a percentage 0–100 (clamped). */
  value: number;
  /** Outer diameter in px. */
  size?: number;
  /** Ring thickness in px. */
  thickness?: number;
  /** Progress color. Pass a CSS var, e.g. 'var(--accent)'. */
  color?: string;
  /** Optional center label (e.g. '88%'). Rendered in mono, tabular figures. */
  label?: React.ReactNode;
  /** Accessible label for the whole chart. */
  ariaLabel?: string;
  className?: string;
}

const clamp = (n: number): number => Math.max(0, Math.min(100, n));

/**
 * Aura Ring. A rounded-cap arc over a sunken track. On mount the arc sweeps
 * from zero to `value` (gated by prefers-reduced-motion).
 */
export function Ring({
  value,
  size = 54,
  thickness = 6,
  color = 'var(--accent)',
  label,
  ariaLabel,
  className,
}: RingProps) {
  const gid = useId().replace(/:/g, '');
  const {prefersReduced} = useReducedMotionSafe();

  const pct = clamp(value);
  const r = (size - thickness) / 2;
  const c = size / 2;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;

  return (
    <svg
      id={`aura-ring-${gid}`}
      viewBox={`0 0 ${size} ${size}`}
      width={size}
      height={size}
      role="img"
      aria-label={ariaLabel ?? `${Math.round(pct)} percent`}
      className={className}
    >
      {!prefersReduced && (
        <style>{`
          #aura-ring-${gid} .aura-ring-fill {
            animation: aura-ring-grow-${gid} var(--t-slow,280ms) var(--ease,cubic-bezier(.4,0,.2,1)) both;
          }
          @keyframes aura-ring-grow-${gid} {
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
      <circle
        cx={c}
        cy={c}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={thickness}
        strokeLinecap="round"
        strokeDasharray={`${dash} ${circ}`}
        transform={`rotate(-90 ${c} ${c})`}
        className={prefersReduced ? undefined : 'aura-ring-fill'}
      />
      {label != null && (
        <text
          x={c}
          y={c + 4}
          textAnchor="middle"
          fontSize="13"
          fontWeight="700"
          fontFamily="var(--font-mono)"
          fill="var(--text-1)"
          className="tabular-nums"
        >
          {label}
        </text>
      )}
    </svg>
  );
}
