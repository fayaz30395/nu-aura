'use client';

import React from 'react';
import {cn} from '@/lib/utils';

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
  variant?: 'default' | 'bordered' | 'elevated';
  hover?: boolean;
  isClickable?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  glow?: boolean;
  /** Semantic element to render (default div). Keeps landmark/list semantics when migrating raw markup. */
  as?: 'div' | 'section' | 'article' | 'aside' | 'li';
}
>(({
     as: Tag = 'div',
     className,
     variant = 'default',
     hover = false,
     isClickable = false,
     padding = 'none',
     glow = false,
     ...props
   }, ref) => {
  const Component = Tag as React.ElementType<React.HTMLAttributes<HTMLElement> & { ref?: React.Ref<HTMLDivElement> }>;
  const isHoverable = hover || isClickable;
  const variantStyles = {
    default: 'card-aura',
    bordered: 'card-aura border-[var(--border-main)]',
    elevated: 'card-elevated',
  };

  const paddingStyles = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };

  // Compositor-friendly hover/press handled by the Foundation `.hover-lift` /
  // `.press-scale` utilities (transform + box-shadow only, reduced-motion aware).
  // No more JS spring wrapper — keeps a single DOM node and honors the design tokens.
  return (
    <Component
      ref={ref}
      className={cn(
        'rounded-[var(--r-lg)] shadow-[var(--sh-xs)] bg-[var(--bg-card)] border-[var(--border-main)] transition-[border-color,background-color] duration-[var(--t-fast,150ms)] overflow-hidden',
        variantStyles[variant],
        paddingStyles[padding],
        isHoverable && 'cursor-pointer hover:border-[var(--border-strong)] hover:bg-[var(--bg-card-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--ring-primary)]',
        glow && 'hover:border-[var(--accent-primary)]',
        className
      )}
      {...props}
    />
  );
});

Card.displayName = 'Card';

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({className, ...props}, ref) => (
  <div
    ref={ref}
    className={cn('flex flex-col space-y-2 p-6 pb-2', className)}
    {...props}
  />
));

CardHeader.displayName = 'CardHeader';

const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({className, ...props}, ref) => (
  <h3
    ref={ref}
    className={cn(
      'text-card-title font-display leading-tight text-[var(--text-primary)]',
      className
    )}
    {...props}
  />
));

CardTitle.displayName = 'CardTitle';

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({className, ...props}, ref) => (
  <p
    ref={ref}
    className={cn('text-body-secondary', className)}
    {...props}
  />
));

CardDescription.displayName = 'CardDescription';

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({className, ...props}, ref) => (
  <div
    ref={ref}
    className={cn('p-6', className)}
    {...props}
  />
));

CardContent.displayName = 'CardContent';

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({className, ...props}, ref) => (
  <div
    ref={ref}
    className={cn(
      'flex items-center border-t border-[var(--border-subtle)] p-6 pt-4',
      className
    )}
    {...props}
  />
));

CardFooter.displayName = 'CardFooter';

export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
};
