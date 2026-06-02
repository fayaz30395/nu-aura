import React from 'react';

interface PremiumMetricCardProps {
  title: string;
  value: string;
  change: string;
  isPositive?: boolean;
  icon?: React.ReactNode;
  delay?: number;
}

/**
 * PremiumMetricCard - flat metric tile.
 *
 * Replaces the banned "hero-metric template" (big-number + tiny-label + gradient bar).
 * Renders: number (text-stat-large, tabular-nums), label (text-micro), and an optional
 * plain-text delta with sign indicator. No gradient bar, no glow, no decorative width.
 */
export const PremiumMetricCard: React.FC<PremiumMetricCardProps> = ({
                                                                      title,
                                                                      value,
                                                                      change,
                                                                      isPositive = true,
                                                                      icon,
                                                                      delay = 0,
                                                                    }) => {
  const deltaTone = isPositive
    ? 'text-success-700 dark:text-success-400'
    : 'text-danger-700 dark:text-danger-400';
  const sign = isPositive ? '+' : '−';

  return (
    <div
      className="card-interactive hover-lift motion-rise p-6"
      style={{animationDelay: `${Math.round(delay * 1000)}ms`}}
    >
      <div className="row-between">
        <span className="text-micro">{title}</span>
        {icon && (
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent-primary-subtle)] border border-[var(--border-subtle)] text-[var(--accent-primary)]"
            aria-hidden="true"
          >
            {icon}
          </div>
        )}
      </div>

      <div className="mt-4 text-stat-large">{value}</div>

      {change ? (
        <div className={`mt-2 text-xs font-medium tabular-nums ${deltaTone}`}>
          <span aria-hidden="true">{sign} </span>
          <span className="sr-only">{isPositive ? 'up ' : 'down '}</span>
          {change}
        </div>
      ) : null}
    </div>
  );
};
