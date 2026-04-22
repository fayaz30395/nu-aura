import {Transition, Variants} from 'framer-motion';

// ==================== Transition Presets ====================

export const transitions = {
  /** Standard ease-out for most animations */
  default: {duration: 0.25, ease: 'easeOut'} as Transition,
  /** Snappy for micro-interactions */
  quick: {duration: 0.15, ease: 'easeOut'} as Transition,
  /** Slower for dramatic page entries */
  slow: {duration: 0.5, ease: 'easeOut'} as Transition,
  /** Natural spring for physical-feeling interactions */
  spring: {type: 'spring', stiffness: 300, damping: 24} as Transition,
  /** Gentle spring for larger elements */
  gentleSpring: {type: 'spring', stiffness: 200, damping: 20} as Transition,
  /** Bouncy spring for playful elements */
  bouncy: {type: 'spring', stiffness: 400, damping: 15} as Transition,
} as const;

// ==================== Page Variants ====================

export const pageVariants: Record<string, Variants> = {
  fadeIn: {
    initial: {opacity: 0},
    animate: {opacity: 1, transition: transitions.default},
    exit: {opacity: 0, transition: transitions.quick},
  },
  slideInUp: {
    initial: {opacity: 0, y: 20},
    animate: {opacity: 1, y: 0, transition: transitions.default},
    exit: {opacity: 0, y: -10, transition: transitions.quick},
  },
  slideInDown: {
    initial: {opacity: 0, y: -20},
    animate: {opacity: 1, y: 0, transition: transitions.default},
    exit: {opacity: 0, y: 10, transition: transitions.quick},
  },
  slideInLeft: {
    initial: {opacity: 0, x: -20},
    animate: {opacity: 1, x: 0, transition: transitions.default},
    exit: {opacity: 0, x: 20, transition: transitions.quick},
  },
  slideInRight: {
    initial: {opacity: 0, x: 20},
    animate: {opacity: 1, x: 0, transition: transitions.default},
    exit: {opacity: 0, x: -20, transition: transitions.quick},
  },
};

// ==================== Container / List Variants ====================

export const containerVariants: Record<string, Variants> = {
  /** Stagger children with fade-in */
  stagger: {
    hidden: {opacity: 0},
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
        delayChildren: 0.1,
      },
    },
  },
  /** Faster stagger for shorter lists */
  staggerFast: {
    hidden: {opacity: 0},
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
        delayChildren: 0.05,
      },
    },
  },
  /** Slower stagger for hero sections */
  staggerSlow: {
    hidden: {opacity: 0},
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.12,
        delayChildren: 0.2,
      },
    },
  },
};

// ==================== Item Variants (children of containers) ====================

export const itemVariants: Record<string, Variants> = {
  /** Standard fade + slide up */
  fadeUp: {
    hidden: {opacity: 0, y: 20},
    visible: {opacity: 1, y: 0, transition: {duration: 0.4, ease: 'easeOut'}},
  },
  /** Fade + slide from left */
  fadeLeft: {
    hidden: {opacity: 0, x: -20},
    visible: {opacity: 1, x: 0, transition: {duration: 0.4, ease: 'easeOut'}},
  },
  /** Fade + slide from right */
  fadeRight: {
    hidden: {opacity: 0, x: 20},
    visible: {opacity: 1, x: 0, transition: {duration: 0.4, ease: 'easeOut'}},
  },
  /** Scale in (for cards, badges) */
  scaleIn: {
    hidden: {opacity: 0, scale: 0.9},
    visible: {opacity: 1, scale: 1, transition: {duration: 0.3, ease: 'easeOut'}},
  },
  /** Pop in with spring */
  popIn: {
    hidden: {opacity: 0, scale: 0.85},
    visible: {
      opacity: 1,
      scale: 1,
      transition: {type: 'spring', stiffness: 300, damping: 20},
    },
  },
};

// ==================== Modal & Overlay Variants ====================

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

export const drawerVariants: Record<string, Variants> = {
  right: {
    initial: {x: '100%', opacity: 0},
    animate: {x: 0, opacity: 1, transition: transitions.gentleSpring},
    exit: {x: '100%', opacity: 0, transition: transitions.quick},
  },
  left: {
    initial: {x: '-100%', opacity: 0},
    animate: {x: 0, opacity: 1, transition: transitions.gentleSpring},
    exit: {x: '-100%', opacity: 0, transition: transitions.quick},
  },
};

// ==================== Sidebar Variants ====================

export const sidebarVariants: Variants = {
  expanded: {
    width: 260,
    transition: {type: 'spring', stiffness: 300, damping: 30},
  },
  collapsed: {
    width: 72,
    transition: {type: 'spring', stiffness: 300, damping: 30},
  },
};

export const sidebarItemVariants: Variants = {
  expanded: {opacity: 1, x: 0, transition: {duration: 0.2}},
  collapsed: {opacity: 0, x: -10, transition: {duration: 0.1}},
};

// ==================== Micro-Interactions ====================

export const microInteractions = {
  /** Button hover — subtle scale up */
  buttonHover: {scale: 1.02, transition: transitions.quick},
  /** Button tap — slight compress */
  buttonTap: {scale: 0.98, transition: transitions.quick},
  /** Card hover — lift with shadow hint */
  cardHover: {
    y: -2,
    boxShadow: '0 8px 25px -5px rgba(0, 0, 0, 0.1), 0 4px 10px -6px rgba(0, 0, 0, 0.1)',
    transition: transitions.default,
  },
  /** Card tap */
  cardTap: {scale: 0.99, transition: transitions.quick},
  /** Icon hover — rotate slightly */
  iconHover: {rotate: 5, scale: 1.1, transition: transitions.quick},
  /** Badge pulse for "new" or "pending" items */
  badgePulse: {
    scale: [1, 1.08, 1],
    transition: {duration: 2, repeat: Infinity, ease: 'easeInOut'},
  },
  /** Status indicator breathing */
  statusBreathing: {
    opacity: [1, 0.6, 1],
    transition: {duration: 2.5, repeat: Infinity, ease: 'easeInOut'},
  },
  /** Notification ping */
  notificationPing: {
    scale: [1, 1.15, 1],
    opacity: [1, 0.8, 1],
    transition: {duration: 1.5, repeat: Infinity, ease: 'easeInOut'},
  },
} as const;

// ==================== Table & List Row Variants ====================

export const tableRowVariants: Variants = {
  hidden: {opacity: 0, y: 8},
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {delay: i * 0.03, duration: 0.3, ease: 'easeOut'},
  }),
  exit: {opacity: 0, x: -20, transition: {duration: 0.2}},
};

// ==================== Notification / Toast Variants ====================

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

// ==================== Counter Animation Hook Helper ====================

/**
 * Use with framer-motion's `useMotionValue` and `useTransform` for animated counters.
 * Example:
 * ```tsx
 * const count = useMotionValue(0);
 * const rounded = useTransform(count, (latest) => Math.round(latest));
 * useEffect(() => { animate(count, targetValue, counterTransition); }, [targetValue]);
 * ```
 */
export const counterTransition = {
  duration: 1.2,
  ease: [0.16, 1, 0.3, 1],
} as const;

// ==================== Glassmorphism Presets ====================

export const glassPresets = {
  /** Solid card background */
  card: 'bg-[var(--bg-card)] border border-[var(--border-main)]',
  /** Solid modal backdrop */
  modalBackdrop: 'bg-[var(--bg-overlay)]',
  /** Solid elevated panel */
  panel: 'bg-[var(--bg-card)] border border-[var(--border-main)]',
  /** Solid sidebar background */
  sidebar: 'bg-[var(--bg-sidebar)]',
  /** Solid floating toolbar */
  toolbar: "bg-[var(--bg-elevated)] border border-[var(--border-main)] shadow-[var(--shadow-elevated)]",
} as const;

// ==================== Shadow Presets ====================

export const shadowPresets = {
  /** Default resting state */
  sm: "shadow-[var(--shadow-card)]",
  /** Hover state */
  md: "shadow-[var(--shadow-card-hover)]",
  /** Elevated / floating */
  lg: "shadow-[var(--shadow-elevated)]",
  /** Modal / dialog */
  xl: 'shadow-xl',
  /** Colored shadows */
  primary: "shadow-[var(--shadow-elevated)] shadow-accent-500/20",
  success: "shadow-[var(--shadow-elevated)] shadow-success-500/20",
  danger: "shadow-[var(--shadow-elevated)] shadow-danger-500/20",
  warning: "shadow-[var(--shadow-elevated)] shadow-warning-500/20",
} as const;

// ==================== Gradient Presets ====================

export const gradientPresets = {
  /** Primary blue gradient */
  primary: 'bg-gradient-to-br from-accent-500 to-accent-700',
  /** Success green gradient */
  success: 'bg-gradient-to-br from-success-500 to-success-700',
  /** Danger red gradient */
  danger: 'bg-gradient-to-br from-danger-500 to-danger-700',
  /** Warning amber gradient */
  warning: 'bg-gradient-to-br from-warning-400 to-warning-600',
  /** Info cyan gradient */
  info: 'bg-gradient-to-br from-info-400 to-info-600',
  /** Premium purple gradient */
  premium: 'bg-gradient-to-br from-accent-700 to-accent-700',
  /** Hero section gradient */
  hero: 'bg-gradient-to-r from-accent-900 via-accent-800 to-accent-900',
  /** Subtle surface gradient */
  surface: "bg-gradient-to-br from-surface-50 to-surface-100",
} as const;
