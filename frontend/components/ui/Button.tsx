'use client';

import React from 'react';
import {motion} from 'framer-motion';
import {Slot} from '@radix-ui/react-slot';
import {cva, type VariantProps} from 'class-variance-authority';
import {cn} from '@/lib/utils';
import {Loader2} from 'lucide-react';

const buttonVariants = cva(
  // Aura: display-font label, tracking-tight, token-driven motion (--t-base / --ease).
  // A11y: focus-visible ring with offset for keyboard nav; disabled state accessible.
  'press-scale inline-flex items-center justify-center gap-2 whitespace-nowrap font-display font-semibold tracking-[-0.005em] transition-all duration-[var(--t-base)] ease-[var(--ease)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--ring-primary)] disabled:pointer-events-none disabled:opacity-50 disabled:translate-y-0 motion-reduce:transition-none',
  {
    variants: {
      variant: {
        // Aura primary: accent fill + 1px top highlight + soft accent glow (token-driven).
        primary:
          'bg-[var(--accent-primary)] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_1px_2px_color-mix(in_srgb,var(--accent-primary)_50%,transparent),0_4px_12px_color-mix(in_srgb,var(--accent-primary)_30%,transparent)] hover:bg-[var(--accent-primary-hover)] hover:-translate-y-px hover:brightness-[1.03] focus-visible:ring-[var(--ring-primary)] active:translate-y-0 active:shadow-[inset_0_2px_4px_rgba(0,0,0,0.2)]',
        secondary:
          'border border-[var(--border-main)] bg-[var(--bg-card)] text-[var(--text-primary)] shadow-[var(--sh-xs)] hover:border-[var(--border-strong)] hover:bg-[var(--bg-card-hover)] focus-visible:ring-[var(--ring-primary)] active:translate-y-px',
        outline:
          'border border-[var(--border-main)] bg-transparent text-[var(--text-primary)] hover:border-[var(--border-strong)] hover:bg-[var(--bg-card-hover)] focus-visible:ring-[var(--ring-primary)] active:translate-y-px',
        ghost:
          'text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)] hover:text-[var(--text-primary)] focus-visible:ring-[var(--ring-primary)] active:translate-y-px',
        danger:
          'bg-[var(--err-bg)] text-[var(--err-fg)] hover:bg-[var(--err-bg)] hover:brightness-90 focus-visible:ring-[var(--err-bg)]/50 active:translate-y-px',
        success:
          'bg-[var(--ok-bg)] text-[var(--ok-fg)] hover:bg-[var(--ok-bg)] hover:brightness-90 focus-visible:ring-[var(--ok-bg)]/50 active:translate-y-px',
        warning:
          'bg-[var(--warn-bg)] text-[var(--warn-fg)] hover:bg-[var(--warn-bg)] hover:brightness-90 focus-visible:ring-[var(--warn-bg)]/50 active:translate-y-px',
        link:
          'text-[var(--accent-primary)] underline-offset-4 hover:underline focus-visible:ring-[var(--ring-primary)]',
        soft:
          'bg-[var(--accent-primary-subtle)] text-[var(--accent-primary)] hover:bg-[var(--accent-100)] focus-visible:ring-[var(--ring-primary)] active:translate-y-px',
        'soft-danger':
          'bg-[var(--err-bg)] text-[var(--err-fg)] hover:bg-[color-mix(in_srgb,var(--err-bg)_85%,var(--text-1))] focus-visible:ring-[var(--err-bg)]/50 active:translate-y-px',
        'soft-success':
          'bg-[var(--ok-bg)] text-[var(--ok-fg)] hover:bg-[color-mix(in_srgb,var(--ok-bg)_85%,var(--text-1))] focus-visible:ring-[var(--ok-bg)]/50 active:translate-y-px',
        default:
          'bg-[var(--text-heading)] text-[var(--text-inverse)] hover:brightness-110 focus-visible:ring-[var(--ring-primary)] active:translate-y-px',
        cta:
          'bg-[var(--accent-primary)] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_1px_2px_color-mix(in_srgb,var(--accent-primary)_50%,transparent),0_4px_12px_color-mix(in_srgb,var(--accent-primary)_30%,transparent)] hover:bg-[var(--accent-primary-hover)] hover:-translate-y-px hover:brightness-[1.03] focus-visible:ring-[var(--ring-primary)] active:translate-y-0 active:shadow-[inset_0_2px_4px_rgba(0,0,0,0.2)]',
      },
      // Aura radii: control surfaces sit at 8–11px. Heights are unchanged (DESIGN
      // contract: md=36 / lg=44 / xl=48) — only the corner softness is re-systemed.
      size: {
        xs: 'h-7 px-2 text-xs rounded-aura-xs',
        sm: 'h-8 px-3 text-sm rounded-aura-sm',
        md: 'h-9 px-3.5 text-sm rounded-aura-control',
        lg: 'h-11 px-4 text-sm rounded-aura-lg',
        xl: 'h-12 px-6 text-base rounded-aura-lg',
        icon: 'h-9 w-9 rounded-aura-control',
        'icon-sm': 'h-8 w-8 rounded-aura-sm',
        'icon-xs': 'h-7 w-7 rounded-aura-xs',
        'icon-lg': 'h-11 w-11 rounded-aura-lg',
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
            <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true"/>
            {loadingText ? <span>{loadingText}</span> : <span className="motion-reduce:inline hidden">Loading</span>}
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
