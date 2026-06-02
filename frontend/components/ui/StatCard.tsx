'use client';

import React from 'react';
import {animate, motion} from 'framer-motion';
import {cn} from '@/lib/utils';
import {ArrowRight, TrendingDown, TrendingUp} from 'lucide-react';
import {MOTION_DURATION, MOTION_EASE, fadeRise, useReducedMotionSafe} from '@/lib/animation';

/**
 * Count-up animation for numeric metric values. Respects reduced motion (jumps
 * straight to the final value) and only animates pure numbers — string values
 * (e.g. "$10k", "98%") render verbatim with no motion. Compositor-safe: only
 * the rendered text content changes, never layout.
 */
function useCountUp(value: string | number, enabled: boolean): string | number {
  const {prefersReduced} = useReducedMotionSafe();
  const target = typeof value === 'number' ? value : null;
  const [display, setDisplay] = React.useState<number>(target ?? 0);

  React.useEffect(() => {
    if (target === null) return;
    if (!enabled || prefersReduced) {
      setDisplay(target);
      return;
    }
    const controls = animate(0, target, {
      duration: MOTION_DURATION.slow * 2,
      ease: MOTION_EASE.outExpo,
      onUpdate: (latest) => setDisplay(Math.round(latest)),
    });
    return () => controls.stop();
  }, [target, enabled, prefersReduced]);

  if (target === null) return value;
  return display.toLocaleString();
}

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
    border: 'border-[var(--border-subtle)]',
    iconBg: 'bg-[var(--bg-card-hover)]',
    iconColor: 'text-[var(--text-secondary)]',
  },
  primary: {
    bg: 'bg-[var(--accent-primary-subtle)]',
    border: 'border-accent-200/70 dark:border-accent-800/60',
    iconBg: 'bg-accent-500/10 dark:bg-accent-500/20',
    iconColor: 'text-accent-700 dark:text-accent-400',
  },
  purple: {
    bg: 'bg-[var(--accent-primary-subtle)]',
    border: 'border-accent-200/50 dark:border-accent-800/50',
    iconBg: 'bg-accent-500/10 dark:bg-accent-500/20',
    iconColor: 'text-accent-700 dark:text-accent-400',
  },
  success: {
    bg: 'bg-[var(--status-success-bg)]',
    border: 'border-success-200/50 dark:border-success-800/50',
    iconBg: 'bg-success-500/10 dark:bg-success-500/20',
    iconColor: 'text-success-600 dark:text-success-400',
  },
  teal: {
    bg: 'bg-[var(--accent-primary-subtle)]',
    border: 'border-accent-200/50 dark:border-accent-800/50',
    iconBg: 'bg-accent-500/10 dark:bg-accent-500/20',
    iconColor: 'text-accent-700 dark:text-accent-400',
  },
  warning: {
    bg: 'bg-[var(--status-warning-bg)]',
    border: 'border-warning-200/50 dark:border-warning-800/50',
    iconBg: 'bg-warning-500/10 dark:bg-warning-500/20',
    iconColor: 'text-warning-600 dark:text-warning-400',
  },
  orange: {
    bg: 'bg-[var(--status-warning-bg)]',
    border: 'border-warning-200/50 dark:border-warning-800/50',
    iconBg: 'bg-warning-500/10 dark:bg-warning-500/20',
    iconColor: 'text-warning-600 dark:text-warning-400',
  },
  destructive: {
    bg: 'bg-[var(--status-danger-bg)]',
    border: 'border-danger-200/50 dark:border-danger-800/50',
    iconBg: 'bg-danger-500/10 dark:bg-danger-500/20',
    iconColor: 'text-danger-600 dark:text-danger-400',
  },
  blue: {
    bg: 'bg-[var(--accent-primary-subtle)]',
    border: 'border-accent-200/50 dark:border-accent-800/50',
    iconBg: 'bg-accent-500/10 dark:bg-accent-500/20',
    iconColor: 'text-accent-600 dark:text-accent-400',
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
      animated = true,
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
    const {pick} = useReducedMotionSafe();
    const entranceVariants = pick(fadeRise);
    const displayValue = useCountUp(value, animated);

    if (isCompact) {
      return (
        <motion.div
          variants={animated ? entranceVariants : undefined}
          initial={animated ? 'hidden' : undefined}
          animate={animated ? 'visible' : undefined}
        >
          <div
            ref={ref}
            onClick={onAction}
            className={cn(
              'group relative overflow-hidden rounded-lg border px-4 py-4 shadow-[var(--shadow-card)] transition-all duration-200',
              config.bg,
              config.border,
              isClickable && 'hover-lift press-scale focus-ring cursor-pointer hover:border-[var(--border-main)] hover:shadow-[var(--shadow-card-hover)]',
              className
            )}
            {...props}
          >
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
              <span className="text-lg font-bold text-[var(--text-primary)] shrink-0 tabular-nums">
                {displayValue}
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
                <ArrowRight
                  className={cn('h-4 w-4 shrink-0 transition-transform group-hover:translate-x-1', config.iconColor)}/>
              )}
            </div>
          </div>
        </motion.div>
      );
    }

    return (
      <motion.div
        variants={animated ? entranceVariants : undefined}
        initial={animated ? 'hidden' : undefined}
        animate={animated ? 'visible' : undefined}
      >
        <div
          ref={ref}
          onClick={onAction}
          className={cn(
            'group relative overflow-hidden rounded-lg border p-4 shadow-[var(--shadow-card)] transition-all duration-200',
            config.bg,
            config.border,
            isClickable && 'hover-lift press-scale focus-ring cursor-pointer hover:border-[var(--border-main)] hover:shadow-[var(--shadow-card-hover)]',
            className
          )}
          {...props}
        >
          {/* Header Row */}
          <div className="flex items-start justify-between mb-4">
            {icon && (
              <div
                className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-lg transition-colors duration-200',
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
                  <TrendingUp className="h-3.5 w-3.5"/>
                ) : (
                  <TrendingDown className="h-3.5 w-3.5"/>
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
          <p className="text-2xl font-bold text-[var(--text-primary)] mb-1 tracking-tight tabular-nums">
            {displayValue}
          </p>

          {/* Description or Trend Label */}
          {(description || trend?.label) && (
            <p className="text-caption">
              {description || trend?.label}
            </p>
          )}

          {/* Action Link */}
          {actionLabel && (
            <div className="mt-4 pt-4 border-t border-surface-200/50 dark:border-surface-700/50">
              <button
                onClick={onAction}
                aria-label={actionLabel}
                className={cn(
                  'focus-ring press-scale flex items-center gap-1.5 text-sm font-medium transition-colors',
                  config.iconColor,
                  'hover:opacity-80'
                )}
              >
                <span>{actionLabel}</span>
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1"/>
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

export {MemoizedStatCard as StatCard};
