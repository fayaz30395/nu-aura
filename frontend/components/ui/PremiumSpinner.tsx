'use client';

import {motion} from 'framer-motion';
import {cn} from '@/lib/utils';
import {MOTION_EASE, useReducedMotionSafe} from '@/lib/animation';

export interface PremiumSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'orbit' | 'pulse' | 'dots' | 'bars' | 'ring' | 'gradient';
  className?: string;
}

const spinnerSizeClass = {
  sm: 'h-8 w-8',
  md: 'h-12 w-12',
  lg: 'h-16 w-16',
  xl: 'h-20 w-20',
} satisfies Record<NonNullable<PremiumSpinnerProps['size']>, string>;

const dotSizeClass = {
  sm: 'h-2 w-2',
  md: 'h-3 w-3',
  lg: 'h-4 w-4',
  xl: 'h-5 w-5',
} satisfies Record<NonNullable<PremiumSpinnerProps['size']>, string>;

const barsSizeClass = {
  sm: 'h-6',
  md: 'h-8',
  lg: 'h-10',
  xl: 'h-12',
} satisfies Record<NonNullable<PremiumSpinnerProps['size']>, string>;

const barWidthClass = {
  sm: 'w-1',
  md: 'w-1.5',
  lg: 'w-1.5',
  xl: 'w-2',
} satisfies Record<NonNullable<PremiumSpinnerProps['size']>, string>;

const EASE = MOTION_EASE.standard;

const spinTransition = {
  duration: 1,
  repeat: Infinity,
  ease: 'linear' as const,
};

/**
 * Premium Orbit Spinner - Planets orbiting around a core
 * Best-in-class animated loader with multiple orbiting elements
 */
export function OrbitSpinner({size = 'md', className}: Omit<PremiumSpinnerProps, 'variant'>) {
  const {prefersReduced} = useReducedMotionSafe();
  return (
    <div className={cn('relative', spinnerSizeClass[size], className)} role="status" aria-label="Loading">
      <motion.div
        className="absolute inset-0 m-auto h-2.5 w-2.5 rounded-full bg-[var(--accent-primary)]"
        animate={prefersReduced ? undefined : {
          scale: [1, 1.3, 1],
          opacity: [0.55, 1, 0.55],
        }}
        transition={prefersReduced ? undefined : {
          duration: 1.2,
          repeat: Infinity,
          ease: EASE,
        }}
      />

      <motion.div
        className="absolute inset-0 rounded-full border border-[var(--border-main)]"
        animate={prefersReduced ? undefined : {rotate: 360}}
        transition={prefersReduced ? undefined : spinTransition}
      >
        <div
          className="absolute left-1/2 top-0 h-2 w-2 -translate-x-1/2 rounded-full bg-[var(--accent-primary)]"/>
      </motion.div>

      <motion.div
        className="absolute inset-[22%] rounded-full border border-[var(--border-subtle)]"
        animate={prefersReduced ? undefined : {rotate: -360}}
        transition={prefersReduced ? undefined : {...spinTransition, duration: 1.4}}
      >
        <div
          className="absolute left-1/2 top-0 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-[var(--accent-400)]"/>
      </motion.div>
    </div>
  );
}

/**
 * Gradient Ring Spinner - Modern gradient ring with trail effect
 */
export function GradientRingSpinner({size = 'md', className}: Omit<PremiumSpinnerProps, 'variant'>) {
  const {prefersReduced} = useReducedMotionSafe();
  return (
    <div className={cn('relative', spinnerSizeClass[size], className)} role="status" aria-label="Loading">
      <motion.svg
        className="h-full w-full text-[var(--accent-primary)]"
        viewBox="0 0 48 48"
        animate={prefersReduced ? undefined : {rotate: 360}}
        transition={prefersReduced ? undefined : {duration: 1.1, repeat: Infinity, ease: 'linear'}}
      >
        <circle
          cx="24"
          cy="24"
          r="20"
          fill="none"
          stroke="currentColor"
          strokeWidth="4"
          className="text-[var(--border-main)]"
        />
        <circle
          cx="24"
          cy="24"
          r="20"
          fill="none"
          stroke="currentColor"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray="82 126"
        />
      </motion.svg>
    </div>
  );
}

/**
 * Pulse Dots Spinner - Multiple pulsing dots with wave effect
 */
export function PulseDotsSpinner({size = 'md', className}: Omit<PremiumSpinnerProps, 'variant'>) {
  const {prefersReduced} = useReducedMotionSafe();
  return (
    <div className={cn('flex items-center gap-2', className)} role="status" aria-label="Loading">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className={cn('rounded-full bg-[var(--accent-primary)]', dotSizeClass[size])}
          animate={prefersReduced ? undefined : {
            scale: [1, 1.5, 1],
            opacity: [0.45, 1, 0.45],
          }}
          transition={prefersReduced ? undefined : {
            duration: 1.2,
            repeat: Infinity,
            delay: i * 0.2,
            ease: EASE,
          }}
        />
      ))}
    </div>
  );
}

/**
 * Wave Bars Spinner - Animated sound wave bars
 */
export function WaveBarsSpinner({size = 'md', className}: Omit<PremiumSpinnerProps, 'variant'>) {
  const {prefersReduced} = useReducedMotionSafe();
  return (
    <div className={cn('flex items-end gap-1.5', barsSizeClass[size], className)} role="status" aria-label="Loading">
      {[0, 1, 2, 3, 4].map((i) => (
        <motion.div
          key={i}
          className={cn('h-full origin-bottom rounded-full bg-[var(--accent-primary)]', barWidthClass[size])}
          animate={prefersReduced ? undefined : {
            scaleY: [0.35, 1, 0.35],
            opacity: [0.55, 1, 0.55],
          }}
          transition={prefersReduced ? undefined : {
            duration: 1,
            repeat: Infinity,
            delay: i * 0.15,
            ease: EASE,
          }}
        />
      ))}
    </div>
  );
}

/**
 * Expanding Ring Spinner - Dual expanding rings with fade
 */
export function ExpandingRingSpinner({size = 'md', className}: Omit<PremiumSpinnerProps, 'variant'>) {
  const {prefersReduced} = useReducedMotionSafe();
  return (
    <div className={cn('relative', spinnerSizeClass[size], className)} role="status" aria-label="Loading">
      {[0, 1].map((i) => (
        <motion.div
          key={i}
          className="absolute inset-0 rounded-full border-2 border-[var(--accent-primary)]"
          initial={prefersReduced ? false : {scale: 0.5, opacity: 1}}
          animate={prefersReduced ? {scale: 1, opacity: 0.6} : {
            scale: [0.5, 1.5],
            opacity: [1, 0],
          }}
          transition={prefersReduced ? undefined : {
            duration: 2,
            repeat: Infinity,
            delay: i * 1,
            ease: EASE,
          }}
        />
      ))}
    </div>
  );
}

/**
 * Main Premium Spinner component with multiple variants
 */
export function PremiumSpinner({size = 'md', variant = 'orbit', className}: PremiumSpinnerProps) {
  switch (variant) {
    case 'orbit':
      return <OrbitSpinner size={size} className={className}/>;
    case 'gradient':
      return <GradientRingSpinner size={size} className={className}/>;
    case 'pulse':
    case 'dots':
      return <PulseDotsSpinner size={size} className={className}/>;
    case 'bars':
      return <WaveBarsSpinner size={size} className={className}/>;
    case 'ring':
      return <ExpandingRingSpinner size={size} className={className}/>;
    default:
      return <OrbitSpinner size={size} className={className}/>;
  }
}
