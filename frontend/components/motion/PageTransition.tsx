'use client';

/**
 * PageTransition — wraps route content in a subtle fade + rise (Studio Slate v2).
 *
 * Drop around the top-level content of a page/route. Uses the `pageTransition`
 * variant. Pair with framer-motion's `AnimatePresence` and a `key` (e.g. the
 * pathname) at the layout level to animate exits between routes. Honors
 * prefers-reduced-motion (renders instantly, no transform/opacity animation).
 */
import {forwardRef, type ReactNode} from 'react';
import {motion} from 'framer-motion';
import {cn} from '@/lib/utils';
import {pageTransition, useReducedMotionSafe} from '@/lib/animation';

interface PageTransitionProps {
  children: ReactNode;
  className?: string;
}

export const PageTransition = forwardRef<HTMLDivElement, PageTransitionProps>(
  function PageTransition({children, className}, ref) {
    const {pick} = useReducedMotionSafe();
    const variants = pick(pageTransition);

    return (
      <motion.div
        ref={ref}
        className={cn(className)}
        variants={variants}
        initial="hidden"
        animate="visible"
        exit="exit"
        role="main"
      >
        {children}
      </motion.div>
    );
  },
);
