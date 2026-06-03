'use client';

/**
 * Aura Sparkline — compact inline trendline (SVG).
 *
 * Token-driven: stroke/fill derive from CSS chart-* vars. Used in stat cards
 * (headcount, present today, on-leave, payroll). Mirrors the Aura prototype's
 * hand-rolled SVG so it scales fluidly to its container width.
 */

import React, {useId, useMemo} from 'react';

export interface SparklineProps {
  /** Series values, plotted left-to-right. Needs >= 2 points to draw a line. */
  data: number[];
  /** Stroke/fill color. Pass a CSS var, e.g. 'var(--chart-1)'. */
  color?: string;
  /** Rendered height in px. Width fills the container. */
  height?: number;
  /** Render the soft gradient area beneath the line. */
  fill?: boolean;
  /** Accessible label for the trend (defaults to a generic description). */
  ariaLabel?: string;
  className?: string;
}

const VIEW_W = 120;
const PAD = 3;

/**
 * Aura Sparkline. Pure SVG, no animation (too small to benefit). Stroke uses
 * vectorEffect="non-scaling-stroke" so the line stays crisp at any width.
 */
export function Sparkline({
  data,
  color = 'var(--chart-1)',
  height = 34,
  fill = true,
  ariaLabel,
  className,
}: SparklineProps) {
  const gid = useId().replace(/:/g, '');

  const {line, area} = useMemo(() => {
    if (data.length < 2) {
      return {line: '', area: ''};
    }
    const min = Math.min(...data);
    const max = Math.max(...data);
    const rng = max - min || 1;
    const pts = data.map((d, i) => {
      const x = PAD + (i / (data.length - 1)) * (VIEW_W - PAD * 2);
      const y = PAD + (1 - (d - min) / rng) * (height - PAD * 2);
      return [x, y] as const;
    });
    const linePath = pts
      .map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`)
      .join(' ');
    const areaPath = `${linePath} L ${pts[pts.length - 1][0].toFixed(1)} ${height} L ${pts[0][0].toFixed(1)} ${height} Z`;
    return {line: linePath, area: areaPath};
  }, [data, height]);

  if (!line) {
    return null;
  }

  return (
    <svg
      viewBox={`0 0 ${VIEW_W} ${height}`}
      preserveAspectRatio="none"
      role="img"
      aria-label={ariaLabel ?? 'Trend sparkline'}
      className={className}
      style={{width: '100%', height, display: 'block'}}
    >
      <defs>
        <linearGradient id={`spark-${gid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.22" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {fill && <path d={area} fill={`url(#spark-${gid})`} />}
      <path
        d={line}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
