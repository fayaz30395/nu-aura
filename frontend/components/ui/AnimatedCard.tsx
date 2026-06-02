/**
 * AnimatedCard Component
 *
 * A card component with built-in animations and variants
 */

'use client';

import {HTMLMotionProps, motion} from 'framer-motion';
import {ReactNode} from 'react';
import {cn} from '@/lib/utils';
import {
  fadeRise,
  scaleIn,
  staggerContainer,
  staggerItem,
  useReducedMotionSafe,
} from '@/lib/animation';

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

// Map to the Foundation token-aligned variants (fade + 8px rise / springy scale).
// fadeRise/scaleIn mirror --motion-* durations and --ease-* easings exactly.
const animationVariants = {
  fadeInUp: fadeRise,
  scaleIn: scaleIn,
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
  const {pick} = useReducedMotionSafe();
  const isAnimated = animationType !== 'none';
  const variants = isAnimated ? pick(animationVariants[animationType]) : {};

  return (
    <motion.div
      className={cn(variantClasses[variant], className)}
      initial={isAnimated ? 'hidden' : undefined}
      animate={isAnimated ? 'visible' : undefined}
      variants={variants}
      transition={delay ? {delay} : undefined}
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
  const {pick} = useReducedMotionSafe();
  const variants = pick(staggerContainer(staggerDelay, 0.05));

  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="visible"
      variants={variants}
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
  const {pick} = useReducedMotionSafe();
  const variants = pick(staggerItem);

  return (
    <motion.div
      className={className}
      variants={variants}
      {...props}
    >
      {children}
    </motion.div>
  );
}
