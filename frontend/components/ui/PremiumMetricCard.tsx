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
 * PremiumMetricCard - Civic Canvas metric card.
 * Features:
 * - Warm surfaces and clear hierarchy
 * - Subtle depth with card-interactive
 * - Tone badge for quick trend scanning
 */
export const PremiumMetricCard: React.FC<PremiumMetricCardProps> = ({
  title,
  value,
  change,
  isPositive = true,
  icon,
  delay = 0,
}) => {
  const trendTone = isPositive ? 'status-success' : 'status-warning';
  const trendLabel = isPositive ? '↑' : '↓';

  return (
    <div
      className="card-interactive p-6 page-reveal"
      style={{ animationDelay: `${Math.round(delay * 1000)}ms` }}
    >
      <div className="row-between">
        <span className="text-micro">{title}</span>
        {icon && (
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent-primary-subtle)] border border-[var(--border-subtle)] text-[var(--accent-primary)]">
            {icon}
          </div>
        )}
      </div>

      <div className="mt-4 flex items-end justify-between gap-4">
        <div className="text-stat-large">{value}</div>
        <span className={`badge-status ${trendTone}`}>
          {trendLabel} {change}
        </span>
      </div>

      <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-[var(--bg-card-hover)]">
        <div
          className="h-full rounded-full"
          style={{
            width: isPositive ? '70%' : '45%',
            backgroundColor: isPositive ? 'var(--accent-primary)' : 'var(--status-warning-text)',
          }}
        />
      </div>
    </div>
  );
};
