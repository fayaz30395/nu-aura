'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        // Primary - Main CTA
        primary:
          'bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-primary-hover)] text-white hover:brightness-105 focus-visible:ring-[var(--ring-primary)] shadow-sm',
        // Secondary - Neutral actions
        secondary:
          'bg-[var(--bg-card)] text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)] border border-[var(--border-main)] focus-visible:ring-[var(--ring-primary)]',
        // Outline - Secondary importance
        outline:
          'border border-[var(--border-main)] bg-transparent text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)] hover:border-[var(--border-strong)] focus-visible:ring-[var(--ring-primary)]',
        // Ghost - Minimal emphasis
        ghost:
          'text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)] hover:text-[var(--text-primary)] focus-visible:ring-[var(--ring-primary)]',
        // Danger / Destructive - Destructive actions
        danger:
          'bg-danger-500 text-white hover:bg-danger-600 focus-visible:ring-danger-500/50 shadow-sm',
        destructive:
          'bg-danger-500 text-white hover:bg-danger-600 focus-visible:ring-danger-500/50 shadow-sm',
        // Success - Positive actions
        success:
          'bg-success-500 text-white hover:bg-success-600 focus-visible:ring-success-500/50 shadow-sm',
        // Warning - Caution actions
        warning:
          'bg-warning-500 text-white hover:bg-warning-600 focus-visible:ring-warning-500/50 shadow-sm',
        // Link - Text button
        link:
          'text-[var(--accent-primary)] underline-offset-4 hover:underline focus-visible:ring-[var(--ring-primary)]',
        // Soft variants - Subtle colored backgrounds
        soft:
          'bg-[var(--accent-primary-subtle)] text-[var(--accent-primary)] hover:brightness-95 focus-visible:ring-[var(--ring-primary)]',
        'soft-danger':
          'bg-danger-50 text-danger-700 hover:bg-danger-100 dark:bg-danger-950 dark:text-danger-300 dark:hover:bg-danger-900 focus-visible:ring-danger-500/50',
        'soft-success':
          'bg-success-50 text-success-700 hover:bg-success-100 dark:bg-success-950 dark:text-success-300 dark:hover:bg-success-900 focus-visible:ring-success-500/50',
        // Default - dark button
        default:
          'bg-[var(--text-primary)] text-[var(--text-inverse)] hover:opacity-90 focus-visible:ring-[var(--ring-primary)] shadow-sm',
        // CTA - Special call-to-action (alias for primary)
        cta:
          'bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-primary-hover)] text-white hover:brightness-105 focus-visible:ring-[var(--ring-primary)] shadow-sm',
      },
      size: {
        xs: 'h-7 px-2 text-xs rounded-md',
        sm: 'h-9 px-3 text-sm rounded-lg',
        md: 'h-11 px-4 text-sm rounded-xl',
        lg: 'h-12 px-5 text-base rounded-xl',
        xl: 'h-12 px-6 text-base rounded-xl',
        icon: 'h-11 w-11 rounded-xl',
        'icon-sm': 'h-9 w-9 rounded-lg',
        'icon-xs': 'h-7 w-7 rounded-md',
        'icon-lg': 'h-12 w-12 rounded-xl',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  isLoading?: boolean;
  loadingText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      isLoading = false,
      loadingText,
      leftIcon,
      rightIcon,
      children,
      disabled,
      asChild = false,
      ...props
    },
    ref
  ) => {
    const baseElement = asChild ? Slot : 'button';
    const MotionComp = motion(baseElement as React.ElementType);
    return (
      <MotionComp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={isLoading || disabled}
        {...props}
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            {loadingText && <span>{loadingText}</span>}
          </>
        ) : (
          <>
            {leftIcon && <span className="inline-flex shrink-0">{leftIcon}</span>}
            {children}
            {rightIcon && <span className="inline-flex shrink-0">{rightIcon}</span>}
          </>
        )}
      </MotionComp>
    );
  }
);

Button.displayName = 'Button';

export { Button, buttonVariants };
