'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    variant?: 'default' | 'bordered' | 'elevated';
    hover?: boolean;
    isClickable?: boolean;
    padding?: 'none' | 'sm' | 'md' | 'lg';
  }
>(({ className, variant = 'default', hover = false, isClickable = false, padding = 'none', ...props }, ref) => {
  const isHoverable = hover || isClickable;
  const variantStyles = {
    default: 'skeuo-card border shadow-card',
    bordered: 'skeuo-card border-2 shadow-card',
    elevated: 'skeuo-card border shadow-elevated',
  };

  const paddingStyles = {
    none: '',
    sm: 'p-4',
    md: 'p-5',
    lg: 'p-6',
  };

  return (
    <motion.div
      whileHover={isHoverable ? { y: -2 } : undefined}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
    >
      <div
        ref={ref}
        style={{
          backgroundColor: 'var(--bg-card)',
          borderColor: 'var(--border-main)',
        }}
        className={cn(
          'rounded-2xl transition-all duration-200',
          variantStyles[variant],
          paddingStyles[padding],
          isHoverable && 'cursor-pointer hover:shadow-card-hover',
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
>(({ className, ...props }, ref) => (
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
>(({ className, ...props }, ref) => (
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
>(({ className, ...props }, ref) => (
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
>(({ className, ...props }, ref) => (
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
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'flex items-center p-6 pt-4',
      className
    )}
    style={{ borderTop: '1px solid var(--border-subtle)' }}
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
