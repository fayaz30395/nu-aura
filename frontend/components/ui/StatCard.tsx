'use client';

import React from 'react';
import {motion} from 'framer-motion';
import {ArrowRight, TrendingDown, TrendingUp} from 'lucide-react';
import {cn} from '@/lib/utils';

export type StatCardVariant =
  | 'default'
  | 'primary'
  | 'success'
  | 'warning'
  | 'destructive'
  | 'purple'
  | 'teal'
  | 'orange'
  | 'blue'
  | 'premium';

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
  /** Premium variant treats `trend.value` as a free-form change string by using `change` prop instead. */
  change?: string;
  isPositive?: boolean;
  variant?: StatCardVariant;
  size?: 'default' | 'compact';
  animated?: boolean;
  href?: string;
  onAction?: () => void;
  actionLabel?: string;
  /** Stagger delay in seconds for page-reveal animation (premium variant). */
  delay?: number;
}

type VariantStyle = {
  bg: string;
  border: string;
  iconBg: string;
  iconColor: string;
  accent: string;
};

const variantConfig: Record<Exclude<StatCardVariant, 'premium'>, VariantStyle> = {
  default: {
    bg: 'bg-[var(--bg-card)]',
    border: 'border-[var(--border-main)]',
    iconBg: 'bg-[var(--bg-secondary)]',
    iconColor: 'text-[var(--text-secondary)]',
    accent: 'bg-[var(--text-muted)]',
  },
  primary: {
    bg: "bg-gradient-to-br from-accent-50 to-accent-100/50",
    border: "border-accent-200/50",
    iconBg: "bg-accent-500/10",
    iconColor: "text-accent",
    accent: "bg-accent",
  },
  purple: {
    bg: 'stat-gradient-purple',
    border: "border-accent-200/50",
    iconBg: "bg-accent-500/10",
    iconColor: "text-accent",
    accent: "bg-accent",
  },
  success: {
    bg: "bg-gradient-to-br from-success-50 to-success-100/50",
    border: "border-success-200/50",
    iconBg: "bg-success-500/10",
    iconColor: "text-status-success-text",
    accent: "bg-status-success-bg",
  },
  teal: {
    bg: 'stat-gradient-primary',
    border: "border-accent-200/50",
    iconBg: "bg-accent-500/10",
    iconColor: "text-accent",
    accent: "bg-accent",
  },
  warning: {
    bg: "bg-gradient-to-br from-warning-50 to-warning-100/50",
    border: "border-warning-200/50",
    iconBg: "bg-warning-500/10",
    iconColor: "text-status-warning-text",
    accent: "bg-status-warning-bg",
  },
  orange: {
    bg: 'stat-gradient-orange',
    border: "border-warning-200/50",
    iconBg: "bg-warning-500/10",
    iconColor: "text-status-warning-text",
    accent: "bg-status-warning-bg",
  },
  destructive: {
    bg: "bg-gradient-to-br from-danger-50 to-danger-100/50",
    border: "border-danger-200/50",
    iconBg: "bg-danger-500/10",
    iconColor: "text-status-danger-text",
    accent: "bg-status-danger-bg",
  },
  blue: {
    bg: 'stat-gradient-blue',
    border: "border-accent-200/50",
    iconBg: "bg-accent-500/10",
    iconColor: "text-accent",
    accent: "bg-accent",
  },
};

function PremiumStatCard({
                           icon,
                           title,
                           value,
                           change,
                           isPositive = true,
                           delay = 0,
                           className,
                         }: StatCardProps) {
  const trendTone = isPositive ? 'status-success' : 'status-warning';
  const trendLabel = isPositive ? '↑' : '↓';

  return (
    <div
      className={cn('card-interactive p-6 page-reveal', className)}
      style={{animationDelay: `${Math.round(delay * 1000)}ms`}}
    >
      <div className="row-between">
        <span className="text-micro">{title}</span>
        {icon && (
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent-primary-subtle)] border border-[var(--border-subtle)] text-[var(--accent-primary)]">
            {icon}
          </div>
        )}
      </div>

      <div className="mt-4 flex items-end justify-between gap-4">
        <div className="text-stat-large">{value}</div>
        {change && (
          <span className={`badge-status ${trendTone}`}>
            {trendLabel} {change}
          </span>
        )}
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
}

const StatCard = React.forwardRef<HTMLDivElement, StatCardProps>(
  (
    {
      className,
      icon,
      title,
      value,
      description,
      trend,
      change,
      isPositive,
      variant = 'default',
      size = 'default',
      animated: _animated = true,
      href,
      onAction,
      actionLabel,
      delay,
      ...props
    },
    ref
  ) => {
    if (variant === 'premium') {
      return (
        <PremiumStatCard
          icon={icon}
          title={title}
          value={value}
          change={change}
          isPositive={isPositive}
          delay={delay}
          className={className}
          {...props}
        />
      );
    }

    const config = variantConfig[variant];
    const isClickable = !!href || !!onAction;
    const isCompact = size === 'compact';

    if (isCompact) {
      return (
        <motion.div
          initial={{opacity: 0, y: 10}}
          animate={{opacity: 1, y: 0}}
          transition={{duration: 0.3, ease: 'easeOut'}}
          whileHover={isClickable ? {y: -2} : undefined}
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
            <div className={cn('absolute top-0 left-0 w-1 h-full rounded-l-lg', config.accent)}/>

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
              <span
                className="flex-1 min-w-0 text-xs uppercase tracking-wide font-medium text-[var(--text-secondary)] truncate">
                {title}
              </span>
              <span className="text-lg font-semibold text-[var(--text-primary)] shrink-0">
                {value}
              </span>
              {trend && (
                <span
                  className={cn(
                    'text-xs font-semibold shrink-0',
                    trend.isPositive
                      ? 'text-status-success-text'
                      : 'text-status-danger-text'
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
        initial={{opacity: 0, y: 20}}
        animate={{opacity: 1, y: 0}}
        transition={{duration: 0.3, ease: 'easeOut'}}
        whileHover={isClickable ? {y: -4} : undefined}
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
          <div className={cn('absolute top-0 left-0 w-1 h-full rounded-l-lg', config.accent)}/>

          <div
            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
            <div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"/>
          </div>

          <div className="flex items-start justify-between mb-4">
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
                    ? 'bg-status-success-bg text-status-success-text'
                    : 'bg-status-danger-bg text-status-danger-text'
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

          <p className="text-xs uppercase tracking-wide font-medium text-[var(--text-secondary)]">
            {title}
          </p>

          <p className="text-2xl font-semibold text-[var(--text-primary)] mt-1 tracking-tight">
            {value}
          </p>

          {(description || trend?.label) && (
            <p className="text-xs text-[var(--text-muted)] mt-1">
              {description || trend?.label}
            </p>
          )}

          {actionLabel && (
            <div className="mt-4 pt-4 border-t border-[var(--border-subtle)]">
              <button
                onClick={onAction}
                aria-label={actionLabel}
                className={cn(
                  'flex items-center gap-1.5 text-sm font-medium transition-colors cursor-pointer',
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

const MemoizedStatCard = React.memo(StatCard);
MemoizedStatCard.displayName = 'StatCard';

export {MemoizedStatCard as StatCard};
