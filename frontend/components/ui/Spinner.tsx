'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'primary' | 'secondary' | 'white';
  className?: string;
}

const sizeConfig = {
  sm: { outer: 16, inner: 12, strokeWidth: 2 },
  md: { outer: 24, inner: 18, strokeWidth: 2.5 },
  lg: { outer: 32, inner: 24, strokeWidth: 3 },
  xl: { outer: 48, inner: 36, strokeWidth: 3.5 },
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

export function Spinner({ size = 'md', variant = 'primary', className }: SpinnerProps) {
  const config = sizeConfig[size];
  const colors = variantConfig[variant];

  return (
    <div className={cn('inline-flex items-center justify-center', className)}>
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
          className={colors.inner}
          strokeWidth={config.strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${Math.PI * config.inner * 0.75} ${Math.PI * config.inner}`}
          initial={{ rotate: 0 }}
          animate={{ rotate: 360 }}
          transition={{
            duration: 1.2,
            repeat: Infinity,
            ease: 'linear',
          }}
          style={{ transformOrigin: 'center' }}
        />
      </svg>
    </div>
  );
}

/**
 * Elegant pulsing dots loader
 */
export function DotsSpinner({ variant = 'primary', className }: Omit<SpinnerProps, 'size'>) {
  const dotColors = {
    primary: 'bg-accent-700 dark:bg-accent-400',
    secondary: 'bg-[var(--text-secondary)]',
    white: 'bg-[var(--bg-card)]',
  };

  const dotColor = dotColors[variant];

  return (
    <div className={cn('inline-flex items-center gap-1.5', className)}>
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className={cn('w-2 h-2 rounded-full', dotColor)}
          initial={{ scale: 0.8, opacity: 0.5 }}
          animate={{
            scale: [0.8, 1.2, 0.8],
            opacity: [0.5, 1, 0.5],
          }}
          transition={{
            duration: 1.2,
            repeat: Infinity,
            delay: i * 0.2,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
}

/**
 * Elegant wave loader
 */
export function WaveSpinner({ variant = 'primary', className }: Omit<SpinnerProps, 'size'>) {
  const barColors = {
    primary: 'bg-accent-700 dark:bg-accent-400',
    secondary: 'bg-[var(--text-secondary)]',
    white: 'bg-[var(--bg-card)]',
  };

  const barColor = barColors[variant];

  return (
    <div className={cn('inline-flex items-center gap-1', className)}>
      {[0, 1, 2, 3, 4].map((i) => (
        <motion.div
          key={i}
          className={cn('w-1 rounded-full', barColor)}
          initial={{ height: 8 }}
          animate={{
            height: [8, 20, 8],
          }}
          transition={{
            duration: 1,
            repeat: Infinity,
            delay: i * 0.1,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
}

/**
 * Elegant pulse ring loader
 */
export function PulseRing({ size = 'md', variant = 'primary', className }: SpinnerProps) {
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

  return (
    <div className={cn('relative', sizeMap[size], className)}>
      {[0, 1].map((i) => (
        <motion.div
          key={i}
          className={cn(
            'absolute inset-0 rounded-full border-4',
            ringColors[variant]
          )}
          initial={{ scale: 0.8, opacity: 1 }}
          animate={{
            scale: [0.8, 1.2],
            opacity: [1, 0],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            delay: i * 0.75,
            ease: 'easeOut',
          }}
        />
      ))}
    </div>
  );
}
