'use client';

/**
 * Stagger — orchestrates a staggered reveal of its children (Studio Slate v2).
 *
 * Use together with `StaggerItem` for each child. The container itself does not
 * move; it sequences child entrances via `staggerContainer`. Honors
 * prefers-reduced-motion (children appear instantly, no stagger).
 *
 *   <Stagger>
 *     {rows.map((r) => <StaggerItem key={r.id}>...</StaggerItem>)}
 *   </Stagger>
 */
import {forwardRef, type ReactNode} from 'react';
import {motion} from 'framer-motion';
import {cn} from '@/lib/utils';
import {
  MOTION_STAGGER,
  staggerContainer,
  useReducedMotionSafe,
} from '@/lib/animation';

interface StaggerProps {
  children: ReactNode;
  className?: string;
  /** Gap (seconds) between each child's entrance. Default MOTION_STAGGER. */
  stagger?: number;
  /** Delay (seconds) before the first child reveals. */
  delayChildren?: number;
  /** Reveal when scrolled into view instead of on mount. Default false. */
  inView?: boolean;
  /** Re-trigger every time it enters the viewport. Default false (once). */
  repeat?: boolean;
}

export const Stagger = forwardRef<HTMLDivElement, StaggerProps>(function Stagger(
  {
    children,
    className,
    stagger = MOTION_STAGGER,
    delayChildren = 0,
    inView = false,
    repeat = false,
  },
  ref,
) {
  const {pick} = useReducedMotionSafe();
  const variants = pick(staggerContainer(stagger, delayChildren));

  const animationProps = inView
    ? {
        initial: 'hidden' as const,
        whileInView: 'visible' as const,
        viewport: {once: !repeat, amount: 0.15},
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
      {...animationProps}
    >
      {children}
    </motion.div>
  );
});
