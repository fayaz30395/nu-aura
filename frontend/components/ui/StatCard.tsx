'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, ArrowRight } from 'lucide-react';

export interface StatCardProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: React.ReactNode;
  title: string;
  value: string | number;
  description?: string;
  trend?: {
    value: number;
    isPositive: boolean;
    label?: string;
  };
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'destructive' | 'purple' | 'teal' | 'orange' | 'blue';
  size?: 'default' | 'compact';
  animated?: boolean;
  href?: string;
  onAction?: () => void;
  actionLabel?: string;
}

const variantConfig = {
  default: {
    bg: 'bg-[var(--bg-card)]',
    border: 'border-surface-200 dark:border-surface-800',
    iconBg: 'bg-surface-100 dark:bg-surface-800',
    iconColor: 'text-surface-600 dark:text-surface-400',
    accent: 'bg-surface-500',
  },
  primary: {
    bg: 'bg-gradient-to-br from-accent-50 to-accent-100/50 dark:from-accent-950/50 dark:to-accent-900/30',
    border: 'border-accent-200/50 dark:border-accent-800/50',
    iconBg: 'bg-accent-500/10 dark:bg-accent-500/20',
    iconColor: 'text-accent-700 dark:text-accent-400',
    accent: 'bg-accent-500',
  },
  purple: {
    bg: 'stat-gradient-purple',
    border: 'border-accent-200/50 dark:border-accent-800/50',
    iconBg: 'bg-accent-500/10 dark:bg-accent-500/20',
    iconColor: 'text-accent-700 dark:text-accent-400',
    accent: 'bg-accent-500',
  },
  success: {
    bg: 'bg-gradient-to-br from-success-50 to-success-100/50 dark:from-success-950/50 dark:to-success-900/30',
    border: 'border-success-200/50 dark:border-success-800/50',
    iconBg: 'bg-success-500/10 dark:bg-success-500/20',
    iconColor: 'text-success-600 dark:text-success-400',
    accent: 'bg-success-500',
  },
  teal: {
    bg: 'stat-gradient-primary',
    border: 'border-accent-200/50 dark:border-accent-800/50',
    iconBg: 'bg-accent-500/10 dark:bg-accent-500/20',
    iconColor: 'text-accent-700 dark:text-accent-400',
    accent: 'bg-accent-500',
  },
  warning: {
    bg: 'bg-gradient-to-br from-warning-50 to-warning-100/50 dark:from-warning-950/50 dark:to-warning-900/30',
    border: 'border-warning-200/50 dark:border-warning-800/50',
    iconBg: 'bg-warning-500/10 dark:bg-warning-500/20',
    iconColor: 'text-warning-600 dark:text-warning-400',
    accent: 'bg-warning-500',
  },
  orange: {
    bg: 'stat-gradient-orange',
    border: 'border-warning-200/50 dark:border-warning-800/50',
    iconBg: 'bg-warning-500/10 dark:bg-warning-500/20',
    iconColor: 'text-warning-600 dark:text-warning-400',
    accent: 'bg-warning-500',
  },
  destructive: {
    bg: 'bg-gradient-to-br from-danger-50 to-danger-100/50 dark:from-danger-950/50 dark:to-danger-900/30',
    border: 'border-danger-200/50 dark:border-danger-800/50',
    iconBg: 'bg-danger-500/10 dark:bg-danger-500/20',
    iconColor: 'text-danger-600 dark:text-danger-400',
    accent: 'bg-danger-500',
  },
  blue: {
    bg: 'stat-gradient-blue',
    border: 'border-accent-200/50 dark:border-accent-800/50',
    iconBg: 'bg-accent-500/10 dark:bg-accent-500/20',
    iconColor: 'text-accent-600 dark:text-accent-400',
    accent: 'bg-accent-500',
  },
};

const StatCard = React.forwardRef<HTMLDivElement, StatCardProps>(
  (
    {
      className,
      icon,
      title,
      value,
      description,
      trend,
      variant = 'default',
      size = 'default',
      animated: _animated = true,
      href,
      onAction,
      actionLabel,
      ...props
    },
    ref
  ) => {
    const config = variantConfig[variant];
    const isClickable = !!href || !!onAction;
    const isCompact = size === 'compact';

    if (isCompact) {
      return (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          whileHover={isClickable ? { y: -2 } : undefined}
        >
          <div
            ref={ref}
            onClick={onAction}
            className={cn(
              'group relative overflow-hidden rounded-lg border px-4 py-4 transition-all duration-300',
              config.bg,
              config.border,
              isClickable && 'cursor-pointer hover:shadow-[var(--shadow-elevated)]',
              className
            )}
            {...props}
          >
            {/* Decorative accent line */}
            <div className={cn('absolute top-0 left-0 w-1 h-full rounded-l-lg', config.accent)} />

            <div className="flex items-center gap-2">
              {icon && (
                <div
                  className={cn(
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                    config.iconBg,
                    config.iconColor
                  )}
                >
                  {icon}
                </div>
              )}
              <span className="flex-1 min-w-0 text-xs font-medium text-[var(--text-secondary)] truncate">
                {title}
              </span>
              <span className="text-lg font-bold text-[var(--text-primary)] shrink-0">
                {value}
              </span>
              {trend && (
                <span
                  className={cn(
                    'text-xs font-semibold shrink-0',
                    trend.isPositive
                      ? 'text-success-600 dark:text-success-400'
                      : 'text-danger-600 dark:text-danger-400'
                  )}
                >
                  {trend.isPositive ? '+' : ''}{trend.value}%
                </span>
              )}
              {actionLabel && (
                <ArrowRight className={cn('h-4 w-4 shrink-0 transition-transform group-hover:translate-x-1', config.iconColor)} />
              )}
            </div>
          </div>
        </motion.div>
      );
    }

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        whileHover={isClickable ? { y: -4 } : undefined}
      >
        <div
          ref={ref}
          onClick={onAction}
          className={cn(
            'group relative overflow-hidden rounded-lg border p-4 transition-all duration-300',
            config.bg,
            config.border,
            isClickable && 'cursor-pointer hover:shadow-[var(--shadow-dropdown)]',
            className
          )}
          {...props}
        >
        {/* Decorative accent line */}
        <div className={cn('absolute top-0 left-0 w-1 h-full rounded-l-lg', config.accent)} />

        {/* Card shine effect on hover */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
        </div>

        {/* Header Row */}
        <div className="flex items-start justify-between mb-3">
          {icon && (
            <div
              className={cn(
                'flex h-10 w-10 items-center justify-center rounded-lg transition-transform duration-300 group-hover:scale-110',
                config.iconBg,
                config.iconColor
              )}
            >
              {icon}
            </div>
          )}
          {trend && (
            <div
              className={cn(
                'flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold',
                trend.isPositive
                  ? 'bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-400'
                  : 'bg-danger-100 text-danger-700 dark:bg-danger-900/30 dark:text-danger-400'
              )}
            >
              {trend.isPositive ? (
                <TrendingUp className="h-3.5 w-3.5" />
              ) : (
                <TrendingDown className="h-3.5 w-3.5" />
              )}
              <span>
                {trend.isPositive ? '+' : ''}{trend.value}%
              </span>
            </div>
          )}
        </div>

        {/* Title */}
        <p className="text-sm font-medium text-[var(--text-secondary)] mb-1">
          {title}
        </p>

        {/* Value */}
        <p className="text-2xl font-bold text-[var(--text-primary)] mb-1 tracking-tight">
          {value}
        </p>

        {/* Description or Trend Label */}
        {(description || trend?.label) && (
          <p className="text-caption">
            {description || trend?.label}
          </p>
        )}

        {/* Action Link */}
        {actionLabel && (
          <div className="mt-3 pt-3 border-t border-surface-200/50 dark:border-surface-700/50">
            <button
              onClick={onAction}
              aria-label={actionLabel}
              className={cn(
                'flex items-center gap-1.5 text-sm font-medium transition-colors',
                config.iconColor,
                'hover:opacity-80'
              )}
            >
              <span>{actionLabel}</span>
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </button>
          </div>
        )}
        </div>
      </motion.div>
    );
  }
);

StatCard.displayName = 'StatCard';

// PERF-001: Memoize to prevent re-renders when parent state changes
const MemoizedStatCard = React.memo(StatCard);
MemoizedStatCard.displayName = 'StatCard';

export { MemoizedStatCard as StatCard };
