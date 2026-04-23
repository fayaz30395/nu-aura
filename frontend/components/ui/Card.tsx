'use client';

import React from 'react';
import {motion} from 'framer-motion';
import {cva, type VariantProps} from 'class-variance-authority';
import {cn} from '@/lib/utils';
import {useThemeVersion} from '@/lib/theme/ThemeVersionProvider';
import {V2_DURATION, V2_EASE} from '@/lib/animations/v2';

const cardVariants = cva(
  cn(
    'rounded-lg border transition-all duration-200',
    'bg-[var(--bg-card)] border-[var(--border-main)]'
  ),
  {
    variants: {
      variant: {
        default: 'skeuo-card shadow-[var(--shadow-card)]',
        bordered: 'skeuo-card border-2 shadow-[var(--shadow-card)]',
        elevated: 'skeuo-card shadow-[var(--shadow-elevated)]',
        muted: 'bg-[var(--bg-surface)] border-[var(--border-subtle)]',
        outline: 'bg-transparent border-[var(--border-main)] shadow-none',
      },
      padding: {
        none: '',
        sm: 'p-2',
        md: 'p-4',
        lg: 'p-6',
      },
    },
    defaultVariants: {
      variant: 'default',
      padding: 'none',
    },
  }
);

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {
  hover?: boolean;
  isClickable?: boolean;
  glow?: boolean;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({className, variant, padding, hover = false, isClickable = false, glow = false, ...props}, ref) => {
    const isHoverable = hover || isClickable;
    const version = useThemeVersion();
    const isV2 = version === 'v2';

    const hoverMotion = isHoverable
      ? isV2
        ? {y: -1, transition: {duration: V2_DURATION.base, ease: V2_EASE}}
        : {y: -3, transition: {type: 'spring' as const, stiffness: 400, damping: 25}}
      : undefined;

    const baseTransition = isV2
      ? {duration: V2_DURATION.base, ease: V2_EASE}
      : {type: 'spring' as const, stiffness: 300, damping: 30};

    return (
      <motion.div whileHover={hoverMotion} transition={baseTransition}>
        <div
          ref={ref}
          className={cn(
            cardVariants({variant, padding}),
            isHoverable && 'cursor-pointer hover:shadow-[var(--shadow-elevated)] hover:border-[var(--border-strong)]',
            glow && 'hover:shadow-[0_0_0_1px_rgba(0,87,255,0.15),0_8px_30px_rgba(0,87,255,0.08)]',
            className
          )}
          {...props}
        />
      </motion.div>
    );
  }
);

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
      'flex items-center p-6 pt-4 border-t border-[var(--border-subtle)]',
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
  cardVariants,
};
