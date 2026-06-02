'use client';

/**
 * Reveal — fade + 8px rise entrance primitive (Studio Slate v2).
 *
 * Wraps children in a single `motion.div` that animates from hidden → visible
 * using the `fadeRise` variant. Reveals on mount by default, or when scrolled
 * into view via `inView`. Honors prefers-reduced-motion (renders instantly with
 * no transform/opacity animation).
 */
import {forwardRef, type ReactNode} from 'react';
import {motion} from 'framer-motion';
import {cn} from '@/lib/utils';
import {fadeRise, useReducedMotionSafe} from '@/lib/animation';

interface RevealProps {
  children: ReactNode;
  className?: string;
  /** Reveal when scrolled into view instead of on mount. Default false. */
  inView?: boolean;
  /** Re-trigger every time it enters the viewport. Default false (once). */
  repeat?: boolean;
  /** Delay (seconds) before the reveal starts. */
  delay?: number;
}

export const Reveal = forwardRef<HTMLDivElement, RevealProps>(function Reveal(
  {children, className, inView = false, repeat = false, delay = 0},
  ref,
) {
  const {pick} = useReducedMotionSafe();
  const variants = pick(fadeRise);

  const animationProps = inView
    ? {
        initial: 'hidden' as const,
        whileInView: 'visible' as const,
        viewport: {once: !repeat, amount: 0.2},
      }
    : {
        initial: 'hidden' as const,
        animate: 'visible' as const,
      };

  return (
    <motion.div
      ref={ref}
      className={cn(className)}
      variants={variants}
      transition={delay ? {delay} : undefined}
      {...animationProps}
    >
      {children}
    </motion.div>
  );
});
