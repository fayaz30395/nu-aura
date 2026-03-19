'use client';

import React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]',
  {
    variants: {
      variant: {
        // Primary - Main CTA
        primary:
          'bg-primary-500 text-white hover:bg-primary-600 focus-visible:ring-primary-500/50 shadow-sm',
        // Secondary - Neutral actions
        secondary:
          'bg-surface-100 text-surface-700 hover:bg-surface-200 dark:bg-surface-700 dark:text-surface-200 dark:hover:bg-surface-600 focus-visible:ring-surface-500/50',
        // Outline - Secondary importance
        outline:
          'border border-surface-300 bg-transparent text-surface-700 hover:bg-surface-50 hover:border-surface-400 dark:border-surface-600 dark:text-surface-200 dark:hover:bg-surface-800 dark:hover:border-surface-500 focus-visible:ring-surface-500/50',
        // Ghost - Minimal emphasis
        ghost:
          'text-surface-600 hover:bg-surface-100 hover:text-surface-900 dark:text-surface-300 dark:hover:bg-surface-800 dark:hover:text-surface-50 focus-visible:ring-surface-500/50',
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
          'text-primary-600 underline-offset-4 hover:underline dark:text-primary-400 focus-visible:ring-primary-500/50',
        // Soft variants - Subtle colored backgrounds
        soft:
          'bg-primary-50 text-primary-700 hover:bg-primary-100 dark:bg-primary-950 dark:text-primary-300 dark:hover:bg-primary-900 focus-visible:ring-primary-500/50',
        'soft-danger':
          'bg-danger-50 text-danger-700 hover:bg-danger-100 dark:bg-danger-950 dark:text-danger-300 dark:hover:bg-danger-900 focus-visible:ring-danger-500/50',
        'soft-success':
          'bg-success-50 text-success-700 hover:bg-success-100 dark:bg-success-950 dark:text-success-300 dark:hover:bg-success-900 focus-visible:ring-success-500/50',
        // Default - dark button
        default:
          'bg-surface-900 text-white hover:bg-surface-800 dark:bg-surface-100 dark:text-surface-900 dark:hover:bg-surface-200 shadow-sm',
        // CTA - Special call-to-action (alias for primary)
        cta:
          'bg-primary-500 text-white hover:bg-primary-600 focus-visible:ring-primary-500/50 shadow-sm',
      },
      size: {
        xs: 'h-7 px-2 text-xs rounded',
        sm: 'h-8 px-3 text-sm rounded-md',
        md: 'h-10 px-4 text-sm rounded-lg',
        lg: 'h-11 px-5 text-base rounded-lg',
        xl: 'h-12 px-6 text-base rounded-lg',
        icon: 'h-10 w-10 rounded-lg',
        'icon-sm': 'h-8 w-8 rounded-md',
        'icon-xs': 'h-7 w-7 rounded',
        'icon-lg': 'h-12 w-12 rounded-lg',
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
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
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
      </Comp>
    );
  }
);

Button.displayName = 'Button';

export { Button, buttonVariants };
