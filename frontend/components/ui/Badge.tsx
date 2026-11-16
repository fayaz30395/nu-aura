'use client';

import React from 'react';
import {cva, type VariantProps} from 'class-variance-authority';
import {motion} from 'framer-motion';
import {cn} from '@/lib/utils';
import {useReducedMotionSafe} from '@/lib/animation';

const badgeVariants = cva(
  'inline-flex items-center gap-1 font-medium whitespace-nowrap',
  {
    variants: {
      variant: {
        // Default - neutral
        default:
          'bg-[var(--neutral-bg)] text-[var(--neutral-fg)]',
        // Primary
        primary:
          'bg-[var(--accent-subtle)] text-[var(--accent-text)]',
        // Secondary
        secondary:
          'bg-[var(--neutral-bg)] text-[var(--neutral-fg)]',
        // Success
        success:
          'bg-[var(--ok-bg)] text-[var(--ok-fg)]',
        // Warning
        warning:
          'bg-[var(--warn-bg)] text-[var(--warn-fg)]',
        // Danger / Destructive
        danger:
          'bg-[var(--err-bg)] text-[var(--err-fg)]',
        destructive:
          'bg-[var(--err-bg)] text-[var(--err-fg)]',
        // Info
        info:
          'bg-[var(--info-bg)] text-[var(--info-fg)]',
        // Outline variants
        outline:
          'bg-transparent border border-[var(--border-main)] text-[var(--text-secondary)]',
        'outline-primary':
          'bg-transparent border border-[var(--accent)] text-[var(--accent-text)]',
        'outline-success':
          'bg-transparent border border-[var(--ok-fg)] text-[var(--ok-fg)]',
        'outline-danger':
          'bg-transparent border border-[var(--err-fg)] text-[var(--err-fg)]',
      },
      // Aura: pill-tag corners sit at 7px (--r-sm); lg nudges to 9px (--r-md).
      size: {
        sm: 'text-[11px] leading-4 px-2 py-0.5 rounded-[var(--radius-sm)]',
        md: 'text-xs leading-4 px-2 py-0.5 rounded-[var(--radius-sm)]',
        lg: 'text-sm px-2.5 py-1 rounded-[var(--radius-md)]',
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
      default: 'bg-[var(--neutral-fg)]',
      success: 'bg-[var(--ok-fg)]',
      warning: 'bg-[var(--warn-fg)]',
      danger: 'bg-[var(--err-fg)]',
      info: 'bg-[var(--info-fg)]',
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
