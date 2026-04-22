'use client';

import React from 'react';
import {cva, type VariantProps} from 'class-variance-authority';
import {cn} from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1 font-medium transition-all duration-150 whitespace-nowrap',
  {
    variants: {
      variant: {
        default:
          'bg-surface-100 text-surface-700 dark:bg-surface-700 dark:text-surface-200',
        primary:
          'bg-accent-50 text-accent-700 dark:bg-accent-950 dark:text-accent-300',
        secondary:
          'bg-surface-200 text-surface-700 dark:bg-surface-600 dark:text-surface-200',
        success:
          'bg-success-50 text-success-700 dark:bg-success-950 dark:text-success-300',
        warning:
          'bg-warning-50 text-warning-700 dark:bg-warning-950 dark:text-warning-300',
        danger:
          'bg-danger-50 text-danger-700 dark:bg-danger-950 dark:text-danger-300',
        destructive:
          'bg-danger-50 text-danger-700 dark:bg-danger-950 dark:text-danger-300',
        info:
          'bg-info-50 text-info-700 dark:bg-info-950 dark:text-info-300',
        neutral:
          'bg-[var(--bg-surface)] text-[var(--text-secondary)] border border-[var(--border-subtle)]',
        accent:
          'bg-[var(--accent-primary-subtle)] text-[var(--accent-primary)] border border-[var(--border-subtle)]',
        outline:
          'bg-transparent border border-surface-300 text-surface-700 dark:border-surface-600 dark:text-surface-200',
        'outline-primary':
          'bg-transparent border border-accent-300 text-accent-700 dark:border-accent-700 dark:text-accent-300',
        'outline-success':
          'bg-transparent border border-success-300 text-success-700 dark:border-success-700 dark:text-success-300',
        'outline-danger':
          'bg-transparent border border-danger-300 text-danger-700 dark:border-danger-700 dark:text-danger-300',
      },
      size: {
        sm: 'text-xs px-2 py-0.5 rounded-md',
        md: 'text-xs px-2 py-0.5 rounded-md',
        lg: 'text-sm px-2.5 py-1 rounded-lg',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  icon?: React.ReactNode;
  dot?: boolean;
  dotColor?: 'default' | 'success' | 'warning' | 'danger' | 'info';
}

const DOT_COLOR: Record<NonNullable<BadgeProps['dotColor']>, string> = {
  default: 'bg-surface-500',
  success: 'bg-success-500',
  warning: 'bg-warning-500',
  danger: 'bg-danger-500',
  info: 'bg-info-500',
};

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({className, variant, size, icon, dot, dotColor = 'default', children, ...props}, ref) => (
    <span
      ref={ref}
      className={cn(badgeVariants({variant, size}), className)}
      {...props}
    >
      {dot && (
        <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', DOT_COLOR[dotColor])}/>
      )}
      {icon && <span className="shrink-0">{icon}</span>}
      {children}
    </span>
  )
);

Badge.displayName = 'Badge';

export {Badge, badgeVariants};
