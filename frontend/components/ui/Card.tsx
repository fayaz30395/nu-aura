'use client';

import React from 'react';
import {motion} from 'framer-motion';
import {cn} from '@/lib/utils';

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
  variant?: 'default' | 'bordered' | 'elevated';
  hover?: boolean;
  isClickable?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  glow?: boolean;
}
>(({
     className,
     variant = 'default',
     hover = false,
     isClickable = false,
     padding = 'none',
     glow = false,
     ...props
   }, ref) => {
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

  return (
    <motion.div
      whileHover={isHoverable ? {y: -1, transition: {duration: 0.16, ease: [0.4, 0, 0.2, 1]}} : undefined}
      transition={{duration: 0.18, ease: [0.4, 0, 0.2, 1]}}
    >
      <div
        ref={ref}
        className={cn(
          'rounded-lg bg-[var(--bg-card)] border-[var(--border-main)] transition-all duration-200',
          variantStyles[variant],
          paddingStyles[padding],
          isHoverable && 'cursor-pointer hover:border-[var(--border-strong)]',
          glow && 'hover:border-[var(--accent-primary)]',
          className
        )}
        {...props}
      />
    </motion.div>
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
