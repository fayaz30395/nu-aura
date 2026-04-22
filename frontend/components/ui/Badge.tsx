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
          "bg-surface text-secondary",
        primary:
          "bg-accent-subtle text-accent",
        secondary:
          "bg-elevated text-secondary",
        success:
          "bg-status-success-bg text-status-success-text",
        warning:
          "bg-status-warning-bg text-status-warning-text",
        danger:
          "bg-status-danger-bg text-status-danger-text",
        destructive:
          "bg-status-danger-bg text-status-danger-text",
        info:
          "bg-status-info-bg text-status-info-text",
        neutral:
          'bg-[var(--bg-surface)] text-[var(--text-secondary)] border border-[var(--border-subtle)]',
        accent:
          'bg-[var(--accent-primary-subtle)] text-[var(--accent-primary)] border border-[var(--border-subtle)]',
        outline:
          "bg-transparent border border-subtle text-secondary",
        'outline-primary':
          "bg-transparent border border-[var(--accent-primary)] text-accent",
        'outline-success':
          "bg-transparent border border-status-success-border text-status-success-text",
        'outline-danger':
          "bg-transparent border border-status-danger-border text-status-danger-text",
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
  default: "bg-card",
  success: "bg-status-success-bg",
  warning: "bg-status-warning-bg",
  danger: "bg-status-danger-bg",
  info: "bg-status-info-bg",
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
