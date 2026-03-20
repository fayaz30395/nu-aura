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
    bg: 'bg-gradient-to-br from-primary-50 to-primary-100/50 dark:from-primary-950/50 dark:to-primary-900/30',
    border: 'border-primary-200/50 dark:border-primary-800/50',
    iconBg: 'bg-primary-500/10 dark:bg-primary-500/20',
    iconColor: 'text-primary-600 dark:text-primary-400',
    accent: 'bg-primary-500',
  },
  purple: {
    bg: 'stat-gradient-purple',
    border: 'border-primary-200/50 dark:border-primary-800/50',
    iconBg: 'bg-primary-500/10 dark:bg-primary-500/20',
    iconColor: 'text-primary-600 dark:text-primary-400',
    accent: 'bg-primary-500',
  },
  success: {
    bg: 'bg-gradient-to-br from-green-50 to-emerald-100/50 dark:from-green-950/50 dark:to-emerald-900/30',
    border: 'border-green-200/50 dark:border-green-800/50',
    iconBg: 'bg-green-500/10 dark:bg-green-500/20',
    iconColor: 'text-green-600 dark:text-green-400',
    accent: 'bg-green-500',
  },
  teal: {
    bg: 'stat-gradient-primary',
    border: 'border-primary-200/50 dark:border-primary-800/50',
    iconBg: 'bg-primary-500/10 dark:bg-primary-500/20',
    iconColor: 'text-primary-600 dark:text-primary-400',
    accent: 'bg-primary-500',
  },
  warning: {
    bg: 'bg-gradient-to-br from-amber-50 to-orange-100/50 dark:from-amber-950/50 dark:to-orange-900/30',
    border: 'border-amber-200/50 dark:border-amber-800/50',
    iconBg: 'bg-amber-500/10 dark:bg-amber-500/20',
    iconColor: 'text-amber-600 dark:text-amber-400',
    accent: 'bg-amber-500',
  },
  orange: {
    bg: 'stat-gradient-orange',
    border: 'border-orange-200/50 dark:border-orange-800/50',
    iconBg: 'bg-orange-500/10 dark:bg-orange-500/20',
    iconColor: 'text-orange-600 dark:text-orange-400',
    accent: 'bg-orange-500',
  },
  destructive: {
    bg: 'bg-gradient-to-br from-red-50 to-rose-100/50 dark:from-red-950/50 dark:to-rose-900/30',
    border: 'border-red-200/50 dark:border-red-800/50',
    iconBg: 'bg-red-500/10 dark:bg-red-500/20',
    iconColor: 'text-red-600 dark:text-red-400',
    accent: 'bg-red-500',
  },
  blue: {
    bg: 'stat-gradient-blue',
    border: 'border-blue-200/50 dark:border-blue-800/50',
    iconBg: 'bg-blue-500/10 dark:bg-blue-500/20',
    iconColor: 'text-blue-600 dark:text-blue-400',
    accent: 'bg-blue-500',
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
              'group relative overflow-hidden rounded-xl border px-4 py-3 transition-all duration-300',
              config.bg,
              config.border,
              isClickable && 'cursor-pointer hover:shadow-md',
              className
            )}
            {...props}
          >
            {/* Decorative accent line */}
            <div className={cn('absolute top-0 left-0 w-1 h-full rounded-l-xl', config.accent)} />

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
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-red-600 dark:text-red-400'
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
            'group relative overflow-hidden rounded-2xl border p-6 transition-all duration-300',
            config.bg,
            config.border,
            isClickable && 'cursor-pointer hover:shadow-lg',
            className
          )}
          {...props}
        >
        {/* Decorative accent line */}
        <div className={cn('absolute top-0 left-0 w-1 h-full rounded-l-2xl', config.accent)} />

        {/* Card shine effect on hover */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
        </div>

        {/* Header Row */}
        <div className="flex items-start justify-between mb-4">
          {icon && (
            <div
              className={cn(
                'flex h-12 w-12 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110',
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
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                  : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
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
        <p className="text-3xl font-bold text-[var(--text-primary)] mb-1 tracking-tight">
          {value}
        </p>

        {/* Description or Trend Label */}
        {(description || trend?.label) && (
          <p className="text-xs text-[var(--text-muted)]">
            {description || trend?.label}
          </p>
        )}

        {/* Action Link */}
        {actionLabel && (
          <div className="mt-4 pt-4 border-t border-surface-200/50 dark:border-surface-700/50">
            <button className={cn(
              'flex items-center gap-1.5 text-sm font-medium transition-colors',
              config.iconColor,
              'hover:opacity-80'
            )}>
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
