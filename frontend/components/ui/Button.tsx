'use client';

import React from 'react';
import {Slot} from '@radix-ui/react-slot';
import {cva, type VariantProps} from 'class-variance-authority';
import {cn} from '@/lib/utils';
import {Loader2} from 'lucide-react';

const FOCUS = 'focus-visible:ring-[var(--ring-primary)]';
// Flat accent fill: no gradient, lift or glow (Wave 2 brand: Apple-neutral).
const PRIMARY =
  `bg-[var(--btn-primary-bg)] text-white hover:bg-[var(--btn-primary-bg-hover)] active:brightness-95 ${FOCUS}`;

const buttonVariants = cva(
  // 150ms token motion, 8px radius via size, focus-visible ring with offset, flat disabled state.
  'inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap font-sans font-medium transition-[background-color,border-color,color,box-shadow,filter] duration-[var(--t-fast,150ms)] ease-[var(--ease)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-card)] disabled:pointer-events-none disabled:opacity-50 motion-reduce:transition-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        primary: PRIMARY,
        secondary:
          `border border-[var(--border-main)] bg-[var(--bg-card)] text-[var(--text-primary)] hover:border-[var(--border-strong)] hover:bg-[var(--bg-card-hover)] active:bg-[var(--surface-2)] ${FOCUS}`,
        outline:
          `border border-[var(--border-main)] bg-transparent text-[var(--text-primary)] hover:border-[var(--border-strong)] hover:bg-[var(--bg-card-hover)] ${FOCUS}`,
        ghost:
          `text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)] hover:text-[var(--text-primary)] active:bg-[var(--surface-2)] ${FOCUS}`,
        danger:
          'bg-[var(--err-bg)] text-[var(--err-fg)] hover:brightness-95 focus-visible:ring-[var(--err-fg)]',
        success:
          'bg-[var(--ok-bg)] text-[var(--ok-fg)] hover:brightness-95 focus-visible:ring-[var(--ok-fg)]',
        warning:
          'bg-[var(--warn-bg)] text-[var(--warn-fg)] hover:brightness-95 focus-visible:ring-[var(--warn-fg)]',
        link:
          `text-[var(--accent-text,var(--accent-primary))] underline-offset-4 hover:underline ${FOCUS}`,
        soft:
          `bg-[var(--accent-subtle)] text-[var(--accent-text,var(--accent-primary))] hover:brightness-95 ${FOCUS}`,
        'soft-danger':
          'bg-[var(--err-bg)] text-[var(--err-fg)] hover:brightness-95 focus-visible:ring-[var(--err-fg)]',
        'soft-success':
          'bg-[var(--ok-bg)] text-[var(--ok-fg)] hover:brightness-95 focus-visible:ring-[var(--ok-fg)]',
        // Solid destructive (additive): confirm-delete style actions.
        destructive:
          'bg-[var(--err-fg)] text-white hover:brightness-90 focus-visible:ring-[var(--err-fg)]',
        default:
          `bg-[var(--text-heading)] text-[var(--text-inverse)] hover:brightness-110 ${FOCUS}`,
        cta: PRIMARY,
      },
      // Heights: sm 32 / md 36 (default) / lg 44 / xl 48 (existing contract); all 8px radius.
      size: {
        xs: 'h-7 px-2 text-xs rounded-[var(--radius-md)]',
        sm: 'h-8 px-3 text-sm rounded-[var(--radius-md)]',
        md: 'h-9 px-3.5 text-sm rounded-[var(--radius-md)]',
        lg: 'h-11 px-4 text-sm rounded-[var(--radius-md)]',
        xl: 'h-12 px-6 text-base rounded-[var(--radius-md)]',
        icon: 'h-9 w-9 rounded-[var(--radius-md)]',
        'icon-sm': 'h-8 w-8 rounded-[var(--radius-md)]',
        'icon-xs': 'h-7 w-7 rounded-[var(--radius-md)]',
        'icon-lg': 'h-11 w-11 rounded-[var(--radius-md)]',
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
    // Keep the button's width while loading so the layout does not jump.
    const innerRef = React.useRef<HTMLButtonElement | null>(null);
    const idleWidth = React.useRef<number | undefined>(undefined);
    React.useLayoutEffect(() => {
      if (!isLoading) idleWidth.current = innerRef.current?.offsetWidth;
    });
    const lockedWidth = isLoading ? idleWidth.current : undefined;
    const setRefs = (node: HTMLButtonElement | null) => {
      innerRef.current = node;
      if (typeof ref === 'function') ref(node);
      else if (ref) ref.current = node;
    };
    return (
      <Comp
        className={cn(buttonVariants({variant, size, className}))}
        ref={setRefs}
        disabled={isLoading || disabled}
        {...props}
        style={lockedWidth ? {minWidth: lockedWidth, ...props.style} : props.style}
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
      </Comp>
    );
  }
);

Button.displayName = 'Button';

export {Button, buttonVariants};
