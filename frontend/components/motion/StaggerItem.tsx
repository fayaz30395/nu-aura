'use client';

/**
 * StaggerItem — a single child of a `Stagger` container (Studio Slate v2).
 *
 * Consumes the parent's orchestration via the `staggerItem` variant (fade +
 * 8px rise). Must be a direct child of `Stagger`. Honors prefers-reduced-motion
 * through the no-op variants the parent supplies (the item variant is inert when
 * reduced motion is preferred because no `animate`/`initial` is set here — the
 * parent drives the propagation).
 */
import {forwardRef, type ReactNode} from 'react';
import {motion} from 'framer-motion';
import {cn} from '@/lib/utils';
import {staggerItem, useReducedMotionSafe} from '@/lib/animation';

interface StaggerItemProps {
  children: ReactNode;
  className?: string;
}

export const StaggerItem = forwardRef<HTMLDivElement, StaggerItemProps>(
  function StaggerItem({children, className}, ref) {
    const {pick} = useReducedMotionSafe();
    const variants = pick(staggerItem);

    return (
      <motion.div ref={ref} className={cn(className)} variants={variants}>
        {children}
      </motion.div>
    );
  },
);
