/**
 * Animation Utilities for NU-AURA
 *
 * Reusable animation configurations for Framer Motion
 * and general animation helpers
 */

import {Variants} from 'framer-motion';

// ──────────────────────────────────────────────────────────────────
// FRAMER MOTION VARIANTS
// ──────────────────────────────────────────────────────────────────

/**
 * Fade in animation variants
 */
export const fadeInVariants: Variants = {
  hidden: {opacity: 0},
  visible: {
    opacity: 1,
    transition: {duration: 0.3, ease: 'easeOut'},
  },
};

/**
 * Fade in from bottom
 */
export const fadeInUpVariants: Variants = {
  hidden: {opacity: 0, y: 20},
  visible: {
    opacity: 1,
    y: 0,
    transition: {duration: 0.4, ease: [0.16, 1, 0.3, 1]},
  },
};

/**
 * Fade in from top
 */
export const fadeInDownVariants: Variants = {
  hidden: {opacity: 0, y: -20},
  visible: {
    opacity: 1,
    y: 0,
    transition: {duration: 0.4, ease: [0.16, 1, 0.3, 1]},
  },
};

/**
 * Fade in from left
 */
export const fadeInLeftVariants: Variants = {
  hidden: {opacity: 0, x: -20},
  visible: {
    opacity: 1,
    x: 0,
    transition: {duration: 0.4, ease: [0.16, 1, 0.3, 1]},
  },
};

/**
 * Fade in from right
 */
export const fadeInRightVariants: Variants = {
  hidden: {opacity: 0, x: 20},
  visible: {
    opacity: 1,
    x: 0,
    transition: {duration: 0.4, ease: [0.16, 1, 0.3, 1]},
  },
};

/**
 * Scale in animation
 */
export const scaleInVariants: Variants = {
  hidden: {opacity: 0, scale: 0.9},
  visible: {
    opacity: 1,
    scale: 1,
    transition: {duration: 0.3, ease: [0.16, 1, 0.3, 1]},
  },
};

/**
 * Stagger container for lists
 */
export const staggerContainerVariants: Variants = {
  hidden: {opacity: 0},
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.05,
    },
  },
};

/**
 * Stagger item for children
 */
export const staggerItemVariants: Variants = {
  hidden: {opacity: 0, y: 10},
  visible: {
    opacity: 1,
    y: 0,
    transition: {duration: 0.3, ease: 'easeOut'},
  },
};

/**
 * Modal/Dialog animation
 */
export const modalVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.95,
    y: 20,
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: 0.2,
      ease: [0.16, 1, 0.3, 1],
    },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: 10,
    transition: {
      duration: 0.15,
      ease: 'easeIn',
    },
  },
};

/**
 * Backdrop animation
 */
export const backdropVariants: Variants = {
  hidden: {opacity: 0},
  visible: {
    opacity: 1,
    transition: {duration: 0.2},
  },
  exit: {
    opacity: 0,
    transition: {duration: 0.15},
  },
};

/**
 * Slide in from bottom (for mobile sheets)
 */
export const slideUpVariants: Variants = {
  hidden: {
    y: '100%',
    opacity: 0,
  },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      duration: 0.3,
      ease: [0.16, 1, 0.3, 1],
    },
  },
  exit: {
    y: '100%',
    opacity: 0,
    transition: {
      duration: 0.2,
      ease: 'easeIn',
    },
  },
};

/**
 * Card hover animation
 */
export const cardHoverVariants: Variants = {
  initial: {y: 0, boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)'},
  hover: {
    y: -4,
    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
    transition: {
      duration: 0.2,
      ease: 'easeOut',
    },
  },
};

/**
 * Button press animation
 */
export const buttonPressVariants: Variants = {
  tap: {
    scale: 0.95,
    transition: {
      duration: 0.1,
      ease: 'easeOut',
    },
  },
};

/**
 * Page transition
 */
export const pageTransitionVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 10,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.25,
      ease: 'easeOut',
    },
  },
  exit: {
    opacity: 0,
    y: -10,
    transition: {
      duration: 0.2,
      ease: 'easeIn',
    },
  },
};

// ──────────────────────────────────────────────────────────────────
// EASING FUNCTIONS
// ──────────────────────────────────────────────────────────────────

export const EASING = {
  // Smooth and natural
  smooth: [0.4, 0, 0.2, 1],
  // Snappy and responsive
  snappy: [0.16, 1, 0.3, 1],
  // Bouncy and playful
  bounce: [0.68, -0.55, 0.27, 1.55],
  // Standard ease
  ease: [0.25, 0.1, 0.25, 1],
  // Ease in
  easeIn: [0.4, 0, 1, 1],
  // Ease out
  easeOut: [0, 0, 0.2, 1],
  // Ease in-out
  easeInOut: [0.4, 0, 0.2, 1],
} as const;

// ──────────────────────────────────────────────────────────────────
// DURATION PRESETS
// ──────────────────────────────────────────────────────────────────

export const DURATION = {
  instant: 0.1,
  fast: 0.2,
  normal: 0.3,
  slow: 0.5,
  slower: 0.7,
} as const;

// ──────────────────────────────────────────────────────────────────
// SPRING CONFIGURATIONS
// ──────────────────────────────────────────────────────────────────

export const SPRING = {
  // Gentle spring
  gentle: {
    type: 'spring',
    stiffness: 300,
    damping: 30,
  },
  // Bouncy spring
  bouncy: {
    type: 'spring',
    stiffness: 400,
    damping: 10,
  },
  // Stiff spring
  stiff: {
    type: 'spring',
    stiffness: 500,
    damping: 40,
  },
  // Smooth spring
  smooth: {
    type: 'spring',
    stiffness: 200,
    damping: 25,
  },
} as const;

// ──────────────────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ──────────────────────────────────────────────────────────────────

/**
 * Get stagger delay for list items
 */
export function getStaggerDelay(index: number, baseDelay = 0.05): number {
  return index * baseDelay;
}

/**
 * Create custom fade variants with options
 */
export function createFadeVariants(
  direction?: 'up' | 'down' | 'left' | 'right',
  distance = 20,
  duration = 0.4
): Variants {
  const getTransform = () => {
    switch (direction) {
      case 'up':
        return {y: distance};
      case 'down':
        return {y: -distance};
      case 'left':
        return {x: distance};
      case 'right':
        return {x: -distance};
      default:
        return {};
    }
  };

  return {
    hidden: {
      opacity: 0,
      ...getTransform(),
    },
    visible: {
      opacity: 1,
      y: 0,
      x: 0,
      transition: {
        duration,
        ease: EASING.snappy,
      },
    },
  };
}

/**
 * Create scale variants with options
 */
export function createScaleVariants(
  initialScale = 0.9,
  duration = 0.3
): Variants {
  return {
    hidden: {
      opacity: 0,
      scale: initialScale,
    },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        duration,
        ease: EASING.snappy,
      },
    },
  };
}

/**
 * Combine multiple variants
 */
export function combineVariants(...variants: Variants[]): Variants {
  return variants.reduce((acc, variant) => {
    Object.keys(variant).forEach((key) => {
      acc[key] = {
        ...acc[key],
        ...variant[key],
      };
    });
    return acc;
  }, {} as Variants);
}
