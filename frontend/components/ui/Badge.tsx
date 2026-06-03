'use client';

import React from 'react';
import {cva, type VariantProps} from 'class-variance-authority';
import {motion} from 'framer-motion';
import {cn} from '@/lib/utils';
import {useReducedMotionSafe} from '@/lib/animation';

const badgeVariants = cva(
  'inline-flex items-center gap-1 font-medium motion-rise transition-[transform,box-shadow,color,background-color,border-color] duration-200 ease-[cubic-bezier(.16,1,.3,1)]',
  {
    variants: {
      variant: {
        // Default - neutral
        default:
          'bg-surface-100 text-surface-700 dark:bg-surface-700 dark:text-surface-200',
        // Primary
        primary:
          'bg-accent-50 text-accent-700 dark:bg-accent-950 dark:text-accent-300',
        // Secondary
        secondary:
          'bg-surface-200 text-surface-700 dark:bg-surface-600 dark:text-surface-200',
        // Success
        success:
          'bg-success-50 text-success-700 dark:bg-success-950 dark:text-success-300',
        // Warning
        warning:
          'bg-warning-50 text-warning-700 dark:bg-warning-950 dark:text-warning-300',
        // Danger / Destructive
        danger:
          'bg-danger-50 text-danger-700 dark:bg-danger-950 dark:text-danger-300',
        destructive:
          'bg-danger-50 text-danger-700 dark:bg-danger-950 dark:text-danger-300',
        // Info
        info:
          'bg-info-50 text-info-700 dark:bg-info-950 dark:text-info-300',
        // Outline variants
        outline:
          'bg-transparent border border-surface-300 text-surface-700 dark:border-surface-600 dark:text-surface-200',
        'outline-primary':
          'bg-transparent border border-accent-300 text-accent-700 dark:border-accent-700 dark:text-accent-300',
        'outline-success':
          'bg-transparent border border-success-300 text-success-700 dark:border-success-700 dark:text-success-300',
        'outline-danger':
          'bg-transparent border border-danger-300 text-danger-700 dark:border-danger-700 dark:text-danger-300',
      },
      // Aura: pill-tag corners sit at 7px (--r-sm); lg nudges to 9px (--r-md).
      size: {
        sm: 'text-xs px-2 py-0.5 rounded-aura-sm',
        md: 'text-xs px-2.5 py-1 rounded-aura-sm',
        lg: 'text-sm px-2.5 py-1 rounded-aura-md',
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
  /**
   * When `dot` is shown, softly pulse it to signal a live/active state.
   * Opacity-only (compositor-friendly) and automatically disabled when the
   * user prefers reduced motion.
   */
  pulse?: boolean;
}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({className, variant, size, icon, dot, dotColor = 'default', pulse = false, children, ...props}, ref) => {
    const {prefersReduced} = useReducedMotionSafe();
    const dotColorClasses = {
      default: 'bg-surface-500',
      success: 'bg-success-500',
      warning: 'bg-warning-500',
      danger: 'bg-danger-500',
      info: 'bg-info-500',
    };

    const shouldPulse = dot && pulse && !prefersReduced;

    return (
      <span
        ref={ref}
        className={cn(badgeVariants({variant, size}), className)}
        role={props.role || undefined}
        {...props}
      >
        {dot && (
          shouldPulse ? (
            <motion.span
              className={cn('w-1.5 h-1.5 rounded-full shrink-0', dotColorClasses[dotColor])}
              animate={{opacity: [1, 0.4, 1]}}
              transition={{duration: 1.6, ease: 'easeInOut', repeat: Infinity}}
              aria-hidden="true"
            />
          ) : (
            <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', dotColorClasses[dotColor])} aria-hidden="true" />
          )
        )}
        {icon && <span className="shrink-0" aria-hidden="true">{icon}</span>}
        {children}
      </span>
    );
  }
);

Badge.displayName = 'Badge';

export {Badge, badgeVariants};
