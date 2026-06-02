'use client';

import React from 'react';
import {motion} from 'framer-motion';
import {Slot} from '@radix-ui/react-slot';
import {cva, type VariantProps} from 'class-variance-authority';
import {cn} from '@/lib/utils';
import {Loader2} from 'lucide-react';

const buttonVariants = cva(
  'press-scale inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 disabled:translate-y-0 motion-reduce:transition-none',
  {
    variants: {
      variant: {
        primary:
          'bg-[var(--accent-primary)] text-white shadow-[0_1px_2px_rgba(37,99,235,0.22)] hover:bg-[var(--accent-primary-hover)] hover:shadow-[0_2px_8px_rgba(37,99,235,0.18)] focus-visible:ring-[var(--ring-primary)] active:translate-y-px active:shadow-none',
        secondary:
          'border border-[var(--border-main)] bg-[var(--bg-card)] text-[var(--text-primary)] hover:border-[var(--border-strong)] hover:bg-[var(--bg-card-hover)] focus-visible:ring-[var(--ring-primary)] active:translate-y-px',
        outline:
          'border border-[var(--border-main)] bg-transparent text-[var(--text-primary)] hover:border-[var(--border-strong)] hover:bg-[var(--bg-card-hover)] focus-visible:ring-[var(--ring-primary)] active:translate-y-px',
        ghost:
          'text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)] hover:text-[var(--text-primary)] focus-visible:ring-[var(--ring-primary)] active:translate-y-px',
        danger:
          'bg-danger-600 text-white hover:bg-danger-700 focus-visible:ring-danger-500/50 active:translate-y-px',
        success:
          'bg-success-600 text-white hover:bg-success-700 focus-visible:ring-success-500/50 active:translate-y-px',
        warning:
          'bg-warning-600 text-white hover:bg-warning-700 focus-visible:ring-warning-500/50 active:translate-y-px',
        link:
          'text-[var(--accent-primary)] underline-offset-4 hover:underline focus-visible:ring-[var(--ring-primary)]',
        soft:
          'bg-[var(--accent-primary-subtle)] text-[var(--accent-primary)] hover:bg-[var(--accent-100)] focus-visible:ring-[var(--ring-primary)] active:translate-y-px',
        'soft-danger':
          'bg-danger-50 text-danger-700 hover:bg-danger-100 dark:bg-danger-950 dark:text-danger-300 dark:hover:bg-danger-900 focus-visible:ring-danger-500/50 active:translate-y-px',
        'soft-success':
          'bg-success-50 text-success-700 hover:bg-success-100 dark:bg-success-950 dark:text-success-300 dark:hover:bg-success-900 focus-visible:ring-success-500/50 active:translate-y-px',
        default:
          'bg-[var(--text-heading)] text-[var(--text-inverse)] hover:brightness-110 focus-visible:ring-[var(--ring-primary)] active:translate-y-px',
        cta:
          'bg-[var(--accent-primary)] text-white shadow-[0_1px_2px_rgba(37,99,235,0.22)] hover:bg-[var(--accent-primary-hover)] hover:shadow-[0_2px_8px_rgba(37,99,235,0.18)] focus-visible:ring-[var(--ring-primary)] active:translate-y-px active:shadow-none',
      },
      size: {
        xs: 'h-7 px-2 text-xs rounded-md',
        sm: 'h-8 px-3 text-sm rounded-lg',
        md: 'h-9 px-3.5 text-sm rounded-xl',
        lg: 'h-11 px-4 text-sm rounded-xl',
        xl: 'h-12 px-6 text-base rounded-xl',
        icon: 'h-9 w-9 rounded-xl',
        'icon-sm': 'h-8 w-8 rounded-lg',
        'icon-xs': 'h-7 w-7 rounded-md',
        'icon-lg': 'h-11 w-11 rounded-xl',
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
        className={cn(buttonVariants({variant, size, className}))}
        ref={ref}
        disabled={isLoading || disabled}
        {...props}
        aria-busy={isLoading ? 'true' : undefined}
        aria-label={isLoading ? (loadingText || props['aria-label'] || 'Loading') : props['aria-label']}
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true"/>
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

export {Button, buttonVariants};
