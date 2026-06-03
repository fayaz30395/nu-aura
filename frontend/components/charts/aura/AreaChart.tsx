'use client';

/**
 * Aura AreaChart — axis + gradient fill + hover crosshair & tooltip (SVG).
 *
 * Token-driven: line/fill from chart-* vars, grid from --chart-grid, axis text
 * from --chart-axis, tooltip body from --text-1. Matches the dashboard
 * "Headcount growth" panel. The reveal animation (line draw + area fade) is
 * gated by prefers-reduced-motion.
 */

import React, {useId, useMemo, useState} from 'react';
import {useReducedMotionSafe} from '@/lib/animation';

export interface AreaChartProps {
  /** Y values, plotted left-to-right. Needs >= 2 points. */
  data: number[];
  /** X-axis category labels, parallel to `data`. */
  labels: string[];
  /** Rendered height in px. Width fills the container. */
  height?: number;
  /** Line/area color. Pass a CSS var, e.g. 'var(--chart-1)'. */
  color?: string;
  /** Number of horizontal grid lines / y-ticks. */
  ticks?: number;
  /** Suffix appended after the label in the hover tooltip (e.g. a year). */
  tooltipSuffix?: string;
  /** Format a value for axis + tooltip display. Defaults to locale integer. */
  formatValue?: (value: number) => string;
  /** Accessible label for the whole chart. */
  ariaLabel?: string;
  className?: string;
}

const VIEW_W = 720;
const PAD_L = 44;
const PAD_R = 16;
const PAD_T = 16;
const PAD_B = 30;

const defaultFormat = (v: number): string => Math.round(v).toLocaleString();

/**
 * Aura AreaChart. Hover tracks the nearest data index, drawing a dashed
 * crosshair, a focus dot, and a pill tooltip clamped inside the plot area.
 */
export function AreaChart({
  data,
  labels,
  height = 260,
  color = 'var(--chart-1)',
  ticks = 4,
  tooltipSuffix,
  formatValue = defaultFormat,
  ariaLabel,
  className,
}: AreaChartProps) {
  const [hover, setHover] = useState<number | null>(null);
  const gid = useId().replace(/:/g, '');
  const {prefersReduced} = useReducedMotionSafe();

  const iw = VIEW_W - PAD_L - PAD_R;
  const ih = height - PAD_T - PAD_B;

  const geom = useMemo(() => {
    if (data.length < 2) {
      return null;
    }
    const min = Math.min(...data) * 0.985;
    const max = Math.max(...data) * 1.01;
    const rng = max - min || 1;
    const X = (i: number) => PAD_L + (i / (data.length - 1)) * iw;
    const Y = (v: number) => PAD_T + (1 - (v - min) / rng) * ih;
    const pts = data.map((d, i) => [X(i), Y(d)] as const);
    const line = pts
      .map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`)
      .join(' ');
    const area = `${line} L ${X(data.length - 1).toFixed(1)} ${PAD_T + ih} L ${PAD_L} ${PAD_T + ih} Z`;
    const gridVals = Array.from(
      {length: ticks + 1},
      (_, i) => min + (rng * i) / ticks,
    );
    return {X, Y, line, area, gridVals};
  }, [data, ih, iw, ticks]);

  if (!geom) {
    return null;
  }

  const {X, Y, line, area, gridVals} = geom;

  const handleMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * VIEW_W;
    const i = Math.round(((x - PAD_L) / iw) * (data.length - 1));
    if (i >= 0 && i < data.length) {
      setHover(i);
    }
  };

  return (
    <svg
      id={`aura-area-${gid}`}
      viewBox={`0 0 ${VIEW_W} ${height}`}
      role="img"
      aria-label={ariaLabel ?? 'Area trend chart'}
      className={className}
      style={{width: '100%', height, display: 'block'}}
      onMouseLeave={() => setHover(null)}
      onMouseMove={handleMove}
    >
      <defs>
        <linearGradient id={`area-${gid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.26" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>

      {!prefersReduced && (
        <style>{`
          #aura-area-${gid} .aura-area-line {
            stroke-dasharray: 1;
            stroke-dashoffset: 1;
            animation: aura-area-draw-${gid} var(--t-slow,280ms) var(--ease,cubic-bezier(.4,0,.2,1)) forwards;
          }
          #aura-area-${gid} .aura-area-fill {
            opacity: 0;
            animation: aura-area-rise-${gid} var(--t-slow,280ms) var(--ease,cubic-bezier(.4,0,.2,1)) forwards;
          }
          @keyframes aura-area-draw-${gid} { to { stroke-dashoffset: 0; } }
          @keyframes aura-area-rise-${gid} { to { opacity: 1; } }
        `}</style>
      )}

      {gridVals.map((v, i) => (
        <g key={i}>
          <line
            x1={PAD_L}
            y1={Y(v)}
            x2={VIEW_W - PAD_R}
            y2={Y(v)}
            stroke="var(--chart-grid)"
            strokeWidth="1"
          />
          <text
            x={PAD_L - 10}
            y={Y(v) + 3.5}
            textAnchor="end"
            fontSize="10.5"
            fontFamily="var(--font-mono)"
            fill="var(--chart-axis)"
            style={{fontVariantNumeric: 'tabular-nums'}}
          >
            {formatValue(v)}
          </text>
        </g>
      ))}

      <path
        d={area}
        fill={`url(#area-${gid})`}
        className={prefersReduced ? undefined : 'aura-area-fill'}
      />
      <path
        d={line}
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={prefersReduced ? undefined : 1}
        className={prefersReduced ? undefined : 'aura-area-line'}
      />

      {labels.map(
        (l, i) =>
          (i % 2 === 0 || i === labels.length - 1) && (
            <text
              key={i}
              x={X(i)}
              y={height - 9}
              textAnchor="middle"
              fontSize="10.5"
              fontFamily="var(--font-sans)"
              fill="var(--chart-axis)"
            >
              {l}
            </text>
          ),
      )}

      {hover != null && (
        <g>
          <line
            x1={X(hover)}
            y1={PAD_T}
            x2={X(hover)}
            y2={PAD_T + ih}
            stroke={color}
            strokeWidth="1"
            strokeDasharray="3 3"
            opacity="0.5"
          />
          <circle
            cx={X(hover)}
            cy={Y(data[hover])}
            r="5"
            fill={color}
            stroke="var(--surface)"
            strokeWidth="2.5"
          />
          <g
            transform={`translate(${Math.min(
              Math.max(X(hover), PAD_L + 44),
              VIEW_W - PAD_R - 44,
            )}, ${Y(data[hover]) - 34})`}
          >
            <rect x="-42" y="-16" width="84" height="30" rx="7" fill="var(--text-1)" />
            <text
              x="0"
              y="-3"
              textAnchor="middle"
              fontSize="11"
              fontWeight="700"
              fontFamily="var(--font-mono)"
              fill="var(--surface)"
              style={{fontVariantNumeric: 'tabular-nums'}}
            >
              {formatValue(data[hover])}
            </text>
            <text x="0" y="9" textAnchor="middle" fontSize="8.5" fill="var(--chart-axis)">
              {tooltipSuffix ? `${labels[hover]} ${tooltipSuffix}` : labels[hover]}
            </text>
          </g>
        </g>
      )}
    </svg>
  );
}
