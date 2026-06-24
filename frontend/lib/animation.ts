/**
 * NU-AURA Motion Foundation — Studio Slate v2
 * ============================================================================
 * Single source of truth for Framer Motion variants + helpers. Mirrors the
 * CSS motion tokens defined in `app/globals.css` (--motion-fast/base/slow,
 * --ease-standard/out-expo/spring) so JS-orchestrated motion and CSS motion
 * stay visually identical.
 *
 * Compositor-friendly ONLY: variants animate `opacity` / `y` (transform) /
 * `scale` (transform). Never width/height/top/left/margin/padding/font-size.
 *
 * Downstream agents import:
 *   - fadeRise, scaleIn, pageTransition           (variants)
 *   - staggerContainer(stagger?, delayChildren?)  (factory variant)
 *   - staggerItem                                  (child variant)
 *   - useReducedMotionSafe()                       (hook → variants | no-op)
 *
 * NOTE: this EXTENDS — does not replace — `lib/animations/variants.ts`. That
 * module holds the broader catalog (drawers, toasts, micro-interactions). This
 * module is the lean, token-aligned foundation every surface consumes.
 * ============================================================================
 */
import {useReducedMotion, type Transition, type Variants} from 'framer-motion';

/* ── Duration tokens (seconds — Framer uses seconds, CSS uses ms) ───────── */
export const MOTION_DURATION = {
  fast: 0.12,
  base: 0.2,
  slow: 0.32,
} as const;

/* ── Easing tokens (cubic-bezier arrays mirror the CSS vars) ────────────── */
export const MOTION_EASE = {
  standard: [0.4, 0, 0.2, 1],
  outExpo: [0.16, 1, 0.3, 1],
  // De-bounced to ease-out-expo (no overshoot). Bounce/elastic easing is banned
  // per DESIGN.md; the brand is calm and quietly confident. Name kept for its
  // Framer call sites (Sidebar, MobileBottomNav, scaleIn).
  spring: [0.16, 1, 0.3, 1],
} as const;

/** Rise distance (px) for fade+rise entrances — matches --motion-rise-distance. */
export const MOTION_RISE_DISTANCE = 8;

/** Default stagger gap (seconds) between orchestrated children. */
export const MOTION_STAGGER = 0.06;

const baseTransition: Transition = {
  duration: MOTION_DURATION.base,
  ease: MOTION_EASE.outExpo,
};

/* ── fadeRise — entrance: fade + 8px rise ───────────────────────────────── */
export const fadeRise: Variants = {
  hidden: {opacity: 0, y: MOTION_RISE_DISTANCE},
  visible: {
    opacity: 1,
    y: 0,
    transition: baseTransition,
  },
  exit: {
    opacity: 0,
    y: MOTION_RISE_DISTANCE / 2,
    transition: {duration: MOTION_DURATION.fast, ease: MOTION_EASE.standard},
  },
};

/* ── scaleIn — entrance: scale + fade (springy) ─────────────────────────── */
export const scaleIn: Variants = {
  hidden: {opacity: 0, scale: 0.96},
  visible: {
    opacity: 1,
    scale: 1,
    transition: {duration: MOTION_DURATION.base, ease: MOTION_EASE.spring},
  },
  exit: {
    opacity: 0,
    scale: 0.96,
    transition: {duration: MOTION_DURATION.fast, ease: MOTION_EASE.standard},
  },
};

/* ── pageTransition — subtle route fade + rise ──────────────────────────── */
export const pageTransition: Variants = {
  hidden: {opacity: 0, y: MOTION_RISE_DISTANCE},
  visible: {
    opacity: 1,
    y: 0,
    transition: {duration: MOTION_DURATION.slow, ease: MOTION_EASE.outExpo},
  },
  exit: {
    opacity: 0,
    y: -MOTION_RISE_DISTANCE / 2,
    transition: {duration: MOTION_DURATION.fast, ease: MOTION_EASE.standard},
  },
};

/* ── staggerContainer — factory: orchestrates child reveal ──────────────── */
export function staggerContainer(
  stagger: number = MOTION_STAGGER,
  delayChildren = 0,
): Variants {
  return {
    hidden: {opacity: 1},
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: stagger,
        delayChildren,
      },
    },
    exit: {
      opacity: 1,
      transition: {
        staggerChildren: stagger / 2,
        staggerDirection: -1,
      },
    },
  };
}

/* ── staggerItem — child of a staggerContainer ──────────────────────────── */
export const staggerItem: Variants = {
  hidden: {opacity: 0, y: MOTION_RISE_DISTANCE},
  visible: {
    opacity: 1,
    y: 0,
    transition: baseTransition,
  },
  exit: {
    opacity: 0,
    y: MOTION_RISE_DISTANCE / 2,
    transition: {duration: MOTION_DURATION.fast, ease: MOTION_EASE.standard},
  },
};

/** A variants object whose every state is identical → renders motionless. */
const noopVariants: Variants = {
  hidden: {opacity: 1},
  visible: {opacity: 1, transition: {duration: 0}},
  exit: {opacity: 1, transition: {duration: 0}},
};

/**
 * useReducedMotionSafe
 * ----------------------------------------------------------------------------
 * Returns `prefersReduced` plus a `pick()` helper. When the user prefers
 * reduced motion, `pick()` swaps any supplied variants for a no-op so content
 * appears instantly with no transform/opacity animation. Otherwise it returns
 * the variants unchanged.
 *
 * @example
 *   const {pick} = useReducedMotionSafe();
 *   <motion.div variants={pick(fadeRise)} initial="hidden" animate="visible" />
 */
export function useReducedMotionSafe(): {
  prefersReduced: boolean;
  pick: (variants: Variants) => Variants;
} {
  const prefersReduced = useReducedMotion() ?? false;
  return {
    prefersReduced,
    pick: (variants: Variants) => (prefersReduced ? noopVariants : variants),
  };
}

export {noopVariants};

/* ── Modal / overlay / toast — merged from lib/animations/variants.ts ───── */
export const modalVariants: Variants = {
  initial: {opacity: 0, scale: 0.95, y: 10},
  animate: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {duration: 0.25, ease: [0.16, 1, 0.3, 1]},
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: 10,
    transition: {duration: 0.15, ease: 'easeIn'},
  },
};

export const overlayVariants: Variants = {
  initial: {opacity: 0},
  animate: {opacity: 1, transition: {duration: 0.2}},
  exit: {opacity: 0, transition: {duration: 0.15}},
};

export const toastVariants: Variants = {
  initial: {opacity: 0, y: -20, scale: 0.95},
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {type: 'spring', stiffness: 400, damping: 25},
  },
  exit: {
    opacity: 0,
    y: -20,
    scale: 0.95,
    transition: {duration: 0.15, ease: 'easeIn'},
  },
};
