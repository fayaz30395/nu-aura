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
    default: 'skeuo-card border shadow-card',
    bordered: 'skeuo-card border-2 shadow-card',
    elevated: 'skeuo-card border shadow-elevated',
  };

  const paddingStyles = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };

  return (
    <motion.div
      whileHover={isHoverable ? {y: -3, transition: {type: 'spring', stiffness: 400, damping: 25}} : undefined}
      transition={{type: 'spring', stiffness: 300, damping: 30}}
    >
      <div
        ref={ref}
        style={{
          backgroundColor: 'var(--bg-card)',
          borderColor: 'var(--border-main)',
        }}
        className={cn(
          'rounded-lg transition-all duration-200',
          variantStyles[variant],
          paddingStyles[padding],
          isHoverable && 'cursor-pointer hover:shadow-card-hover hover:border-[var(--border-strong)]',
          glow && 'hover:shadow-[0_0_0_1px_rgba(0,87,255,0.15),0_8px_30px_rgba(0,87,255,0.08)]',
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
      'flex items-center p-6 pt-4',
      className
    )}
    style={{borderTop: '1px solid var(--border-subtle)'}}
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
