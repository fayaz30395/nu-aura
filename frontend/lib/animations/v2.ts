/**
 * NU-AURA v2 Motion Vocabulary (Framer Motion)
 *
 * Centralized variants + transition presets so every v2 surface animates
 * with the same rhythm. All variants honor `prefers-reduced-motion` via
 * `getReducedVariants()` — call it at render time and pass the result to
 * `<motion.* variants={...}>`.
 */
import type {Transition, Variants} from 'framer-motion';

export const V2_DURATION = {
  fast: 0.1,
  base: 0.16,
  slow: 0.22,
} as const;

export const V2_EASE: Transition['ease'] = [0.2, 0, 0, 1];

export const fadeRise: Variants = {
  hidden: {opacity: 0, y: 4},
  show: {
    opacity: 1,
    y: 0,
    transition: {duration: V2_DURATION.slow, ease: V2_EASE},
  },
  exit: {
    opacity: 0,
    y: 4,
    transition: {duration: V2_DURATION.fast, ease: V2_EASE},
  },
};

export const pop: Variants = {
  hidden: {opacity: 0, scale: 0.96},
  show: {
    opacity: 1,
    scale: 1,
    transition: {duration: V2_DURATION.base, ease: V2_EASE},
  },
  exit: {
    opacity: 0,
    scale: 0.96,
    transition: {duration: V2_DURATION.fast, ease: V2_EASE},
  },
};

export const lift: Variants = {
  rest: {y: 0},
  hover: {
    y: -1,
    transition: {duration: V2_DURATION.base, ease: V2_EASE},
  },
};

export const pressDown: Variants = {
  rest: {scale: 1},
  tap: {scale: 0.98, transition: {duration: V2_DURATION.fast, ease: V2_EASE}},
};

export const slideRight: Variants = {
  hidden: {opacity: 0, x: -8},
  show: {opacity: 1, x: 0, transition: {duration: V2_DURATION.slow, ease: V2_EASE}},
  exit: {opacity: 0, x: -8, transition: {duration: V2_DURATION.fast, ease: V2_EASE}},
};

export const slideLeft: Variants = {
  hidden: {opacity: 0, x: 8},
  show: {opacity: 1, x: 0, transition: {duration: V2_DURATION.slow, ease: V2_EASE}},
  exit: {opacity: 0, x: 8, transition: {duration: V2_DURATION.fast, ease: V2_EASE}},
};

export function staggerChildren(stagger = 0.04, delayChildren = 0.02): Variants {
  return {
    hidden: {opacity: 1},
    show: {
      opacity: 1,
      transition: {
        staggerChildren: stagger,
        delayChildren,
      },
    },
  };
}

/**
 * Wraps variants to collapse motion when `prefers-reduced-motion: reduce`.
 * Call this from React code where you have access to `useReducedMotion()`.
 */
export function reduceVariants(variants: Variants, shouldReduce: boolean): Variants {
  if (!shouldReduce) return variants;
  const out: Variants = {};
  for (const key of Object.keys(variants)) {
    out[key] = {transition: {duration: 0}};
  }
  return out;
}
