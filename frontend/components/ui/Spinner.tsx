'use client';

import React from 'react';
import {motion} from 'framer-motion';
import {cn} from '@/lib/utils';
import {useReducedMotionSafe} from '@/lib/animation';

export interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'primary' | 'secondary' | 'white';
  className?: string;
  /** Screen-reader-only loading label. Defaults to "Loading". Set to "" to suppress (e.g., when a sibling already announces). */
  label?: string;
}

const sizeConfig = {
  sm: {outer: 16, inner: 12, strokeWidth: 2},
  md: {outer: 24, inner: 18, strokeWidth: 2.5},
  lg: {outer: 32, inner: 24, strokeWidth: 3},
  xl: {outer: 48, inner: 36, strokeWidth: 3.5},
};

const variantConfig = {
  primary: {
    outer: 'stroke-accent-200 dark:stroke-accent-900',
    inner: 'stroke-accent-700 dark:stroke-accent-400',
  },
  secondary: {
    outer: 'stroke-[var(--border-main)]',
    inner: 'stroke-[var(--text-secondary)]',
  },
  white: {
    outer: 'stroke-white/20',
    inner: 'stroke-white',
  },
};

export function Spinner({size = 'md', variant = 'primary', className, label = 'Loading'}: SpinnerProps) {
  const config = sizeConfig[size];
  const colors = variantConfig[variant];
  const {prefersReduced} = useReducedMotionSafe();

  return (
    <div
      className={cn('inline-flex items-center justify-center', className)}
      role="status"
      aria-live="polite"
    >
      <svg
        width={config.outer}
        height={config.outer}
        viewBox={`0 0 ${config.outer} ${config.outer}`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="relative"
      >
        {/* Background circle */}
        <circle
          cx={config.outer / 2}
          cy={config.outer / 2}
          r={config.inner / 2}
          className={colors.outer}
          strokeWidth={config.strokeWidth}
          strokeLinecap="round"
        />

        {/* Animated spinner arc */}
        <motion.circle
          cx={config.outer / 2}
          cy={config.outer / 2}
          r={config.inner / 2}
          strokeWidth={config.strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${Math.PI * config.inner * 0.75} ${Math.PI * config.inner}`}
          initial={{rotate: 0}}
          animate={prefersReduced ? {rotate: 0} : {rotate: 360}}
          className={cn(colors.inner, 'origin-center')}
          transition={prefersReduced ? undefined : {
            duration: 1.2,
            repeat: Infinity,
            ease: 'linear',
          }}
        />
      </svg>
      {label ? <span className="sr-only">{label}</span> : null}
    </div>
  );
}

/**
 * Elegant pulsing dots loader
 */
export function DotsSpinner({variant = 'primary', className, label = 'Loading'}: Omit<SpinnerProps, 'size'>) {
  const dotColors = {
    primary: 'bg-accent-700 dark:bg-accent-400',
    secondary: 'bg-[var(--text-secondary)]',
    white: 'bg-[var(--bg-card)]',
  };

  const dotColor = dotColors[variant];
  const {prefersReduced} = useReducedMotionSafe();

  return (
    <div
      className={cn('inline-flex items-center gap-1.5', className)}
      role="status"
      aria-live="polite"
    >
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className={cn('w-2 h-2 rounded-full', dotColor)}
          initial={{scale: 0.8, opacity: 0.5}}
          animate={prefersReduced ? {scale: 1, opacity: 0.7} : {
            scale: [0.8, 1.2, 0.8],
            opacity: [0.5, 1, 0.5],
          }}
          transition={prefersReduced ? undefined : {
            duration: 1.2,
            repeat: Infinity,
            delay: i * 0.2,
            ease: 'easeInOut',
          }}
        />
      ))}
      {label ? <span className="sr-only">{label}</span> : null}
    </div>
  );
}

/**
 * Elegant wave loader
 */
export function WaveSpinner({variant = 'primary', className, label = 'Loading'}: Omit<SpinnerProps, 'size'>) {
  const barColors = {
    primary: 'bg-accent-700 dark:bg-accent-400',
    secondary: 'bg-[var(--text-secondary)]',
    white: 'bg-[var(--bg-card)]',
  };

  const barColor = barColors[variant];
  const {prefersReduced} = useReducedMotionSafe();

  return (
    <div
      className={cn('inline-flex items-end gap-1', className)}
      role="status"
      aria-live="polite"
    >
      {[0, 1, 2, 3, 4].map((i) => (
        <motion.div
          key={i}
          className={cn('w-1 h-5 origin-bottom rounded-full', barColor)}
          initial={{scaleY: 0.4}}
          animate={prefersReduced ? {scaleY: 0.7} : {
            scaleY: [0.4, 1, 0.4],
          }}
          transition={prefersReduced ? undefined : {
            duration: 1,
            repeat: Infinity,
            delay: i * 0.1,
            ease: 'easeInOut',
          }}
        />
      ))}
      {label ? <span className="sr-only">{label}</span> : null}
    </div>
  );
}

/**
 * Elegant pulse ring loader
 */
export function PulseRing({size = 'md', variant = 'primary', className, label = 'Loading'}: SpinnerProps) {
  const sizeMap = {
    sm: 'w-12 h-12',
    md: 'w-16 h-16',
    lg: 'w-20 h-20',
    xl: 'w-24 h-24',
  };

  const ringColors = {
    primary: 'border-accent-700/20 dark:border-accent-400/20',
    secondary: 'border-[var(--border-main)]',
    white: 'border-white/20',
  };

  const {prefersReduced} = useReducedMotionSafe();

  return (
    <div
      className={cn('relative', sizeMap[size], className)}
      role="status"
      aria-live="polite"
    >
      {[0, 1].map((i) => (
        <motion.div
          key={i}
          className={cn(
            'absolute inset-0 rounded-full border-4',
            ringColors[variant]
          )}
          initial={prefersReduced ? false : {scale: 0.8, opacity: 1}}
          animate={prefersReduced ? {scale: 1, opacity: 0.6} : {
            scale: [0.8, 1.2],
            opacity: [1, 0],
          }}
          transition={prefersReduced ? undefined : {
            duration: 1.5,
            repeat: Infinity,
            delay: i * 0.75,
            ease: 'easeOut',
          }}
        />
      ))}
      {label ? <span className="sr-only">{label}</span> : null}
    </div>
  );
}
