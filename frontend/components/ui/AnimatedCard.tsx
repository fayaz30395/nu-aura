/**
 * AnimatedCard Component
 *
 * A card component with built-in animations and variants
 */

'use client';

import { motion, HTMLMotionProps } from 'framer-motion';
import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { fadeInUpVariants, scaleInVariants } from '@/lib/utils/animations';

interface AnimatedCardProps extends Omit<HTMLMotionProps<'div'>, 'children' | 'ref'> {
  children: ReactNode;
  variant?: 'default' | 'hover' | 'glass' | 'interactive';
  animationType?: 'fadeInUp' | 'scaleIn' | 'none';
  delay?: number;
  className?: string;
}

const variantClasses = {
  default: 'card',
  hover: 'card-hover',
  glass: 'card-glass',
  interactive: 'card-interactive',
};

const animationVariants = {
  fadeInUp: fadeInUpVariants,
  scaleIn: scaleInVariants,
  none: {},
};

export function AnimatedCard({
  children,
  variant = 'default',
  animationType = 'fadeInUp',
  delay = 0,
  className,
  ...props
}: AnimatedCardProps) {
  const variants = animationVariants[animationType];

  return (
    <motion.div
      className={cn(variantClasses[variant], className)}
      initial={animationType !== 'none' ? 'hidden' : undefined}
      animate={animationType !== 'none' ? 'visible' : undefined}
      variants={variants}
      transition={{ delay }}
      {...props}
    >
      {children}
    </motion.div>
  );
}

/**
 * Animated List Container
 * Use with stagger animation for children
 */
interface AnimatedListProps extends Omit<HTMLMotionProps<'div'>, 'ref'> {
  children: ReactNode;
  staggerDelay?: number;
  className?: string;
}

export function AnimatedList({
  children,
  staggerDelay = 0.1,
  className,
  ...props
}: AnimatedListProps) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="visible"
      variants={{
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: {
            staggerChildren: staggerDelay,
            delayChildren: 0.05,
          },
        },
      }}
      {...props}
    >
      {children}
    </motion.div>
  );
}

/**
 * Animated List Item
 * Use as child of AnimatedList
 */
interface AnimatedListItemProps extends Omit<HTMLMotionProps<'div'>, 'ref'> {
  children: ReactNode;
  className?: string;
}

export function AnimatedListItem({
  children,
  className,
  ...props
}: AnimatedListItemProps) {
  return (
    <motion.div
      className={className}
      variants={{
        hidden: { opacity: 0, y: 10 },
        visible: {
          opacity: 1,
          y: 0,
          transition: { duration: 0.3, ease: 'easeOut' },
        },
      }}
      {...props}
    >
      {children}
    </motion.div>
  );
}
