'use client';

import React from 'react';
import {motion} from 'framer-motion';
import {cn} from '@/lib/utils';

export type SpinnerSize = 'sm' | 'md' | 'lg' | 'xl';
export type SpinnerTone = 'primary' | 'secondary' | 'white';
export type SpinnerVariant = 'orbit' | 'ring' | 'dots' | 'wave' | 'pulse';

export interface UnifiedSpinnerProps {
  variant?: SpinnerVariant;
  size?: SpinnerSize;
  tone?: SpinnerTone;
  className?: string;
}

const DIM: Record<SpinnerSize, number> = {
  sm: 32,
  md: 48,
  lg: 64,
  xl: 80,
};

const DOT: Record<SpinnerSize, number> = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
};

const BAR_WIDTH: Record<SpinnerSize, number> = {
  sm: 4,
  md: 5,
  lg: 6,
  xl: 8,
};

const BAR_MAX_HEIGHT: Record<SpinnerSize, number> = {
  sm: 24,
  md: 32,
  lg: 40,
  xl: 48,
};

const RING_STROKE: Record<SpinnerSize, { outer: number; inner: number; stroke: number }> = {
  sm: {outer: 16, inner: 12, stroke: 2},
  md: {outer: 24, inner: 18, stroke: 2.5},
  lg: {outer: 32, inner: 24, stroke: 3},
  xl: {outer: 48, inner: 36, stroke: 3.5},
};

const TONE_FILL: Record<SpinnerTone, string> = {
  primary: "bg-accent",
  secondary: 'bg-[var(--text-secondary)]',
  white: 'bg-[var(--bg-card)]',
};

const TONE_RING: Record<SpinnerTone, { outer: string; inner: string }> = {
  primary: {
    outer: "stroke-accent-200",
    inner: "stroke-accent-700",
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

function OrbitSpinnerImpl({size = 'md', className}: { size?: SpinnerSize; className?: string }) {
  const dimension = DIM[size];
  return (
    <div className={cn('relative', className)} style={{width: dimension, height: dimension}}>
      <motion.div
        className="absolute inset-0 m-auto w-3 h-3 rounded-full bg-gradient-to-br from-accent-500 to-accent-700"
        animate={{scale: [1, 1.3, 1], opacity: [0.8, 1, 0.8]}}
        transition={{duration: 2, repeat: Infinity, ease: 'easeInOut'}}
      />
      <motion.div
        className="absolute inset-0"
        animate={{rotate: 360}}
        transition={{duration: 3, repeat: Infinity, ease: 'linear'}}
      >
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-gradient-to-br from-accent-400 to-accent-700 shadow-[var(--shadow-dropdown)] shadow-accent-500/50"/>
      </motion.div>
      <motion.div
        className="absolute inset-[15%]"
        animate={{rotate: -360}}
        transition={{duration: 2, repeat: Infinity, ease: 'linear'}}
      >
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-gradient-to-br from-accent-500 to-accent-700 shadow-[var(--shadow-dropdown)] shadow-accent-500/50"/>
      </motion.div>
      <motion.div
        className="absolute inset-[25%]"
        animate={{rotate: 360}}
        transition={{duration: 1.5, repeat: Infinity, ease: 'linear'}}
      >
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-gradient-to-br from-accent-400 to-accent-700 shadow-[var(--shadow-dropdown)] shadow-accent-500/50"/>
      </motion.div>
      {[0, 120, 240].map((angle) => (
        <motion.div
          key={angle}
          className="absolute inset-0"
          animate={{rotate: 360}}
          transition={{duration: 4, repeat: Infinity, ease: 'linear', delay: angle / 360}}
        >
          <div
            className='absolute w-0.5 h-0.5 rounded-full bg-accent-subtle'
            style={{top: '10%', left: '50%', transform: 'translateX(-50%)'}}
          />
        </motion.div>
      ))}
    </div>
  );
}

function RingSpinnerImpl({size = 'md', tone = 'primary', className}: {
  size?: SpinnerSize;
  tone?: SpinnerTone;
  className?: string
}) {
  const {outer, inner, stroke} = RING_STROKE[size];
  const colors = TONE_RING[tone];
  return (
    <div className={cn('inline-flex items-center justify-center', className)}>
      <svg
        width={outer}
        height={outer}
        viewBox={`0 0 ${outer} ${outer}`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle
          cx={outer / 2}
          cy={outer / 2}
          r={inner / 2}
          className={colors.outer}
          strokeWidth={stroke}
          strokeLinecap="round"
        />
        <motion.circle
          cx={outer / 2}
          cy={outer / 2}
          r={inner / 2}
          className={colors.inner}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${Math.PI * inner * 0.75} ${Math.PI * inner}`}
          initial={{rotate: 0}}
          animate={{rotate: 360}}
          transition={{duration: 1.2, repeat: Infinity, ease: 'linear'}}
          style={{transformOrigin: 'center'}}
        />
      </svg>
    </div>
  );
}

function DotsSpinnerImpl({size = 'md', tone = 'primary', className}: {
  size?: SpinnerSize;
  tone?: SpinnerTone;
  className?: string
}) {
  const dotSize = DOT[size];
  return (
    <div className={cn('inline-flex items-center gap-2', className)}>
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className={cn('rounded-full', TONE_FILL[tone])}
          style={{width: dotSize, height: dotSize}}
          animate={{scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5]}}
          transition={{duration: 1.2, repeat: Infinity, delay: i * 0.2, ease: 'easeInOut'}}
        />
      ))}
    </div>
  );
}

function WaveSpinnerImpl({size = 'md', tone = 'primary', className}: {
  size?: SpinnerSize;
  tone?: SpinnerTone;
  className?: string
}) {
  const barWidth = BAR_WIDTH[size];
  const maxHeight = BAR_MAX_HEIGHT[size];
  return (
    <div className={cn('flex items-end gap-1.5', className)} style={{height: maxHeight}}>
      {[0, 1, 2, 3, 4].map((i) => (
        <motion.div
          key={i}
          className={cn('rounded-full', TONE_FILL[tone])}
          style={{width: barWidth}}
          animate={{height: [maxHeight * 0.3, maxHeight, maxHeight * 0.3]}}
          transition={{duration: 1, repeat: Infinity, delay: i * 0.15, ease: 'easeInOut'}}
        />
      ))}
    </div>
  );
}

function PulseSpinnerImpl({size = 'md', className}: { size?: SpinnerSize; className?: string }) {
  const dimension = DIM[size];
  return (
    <div className={cn('relative', className)} style={{width: dimension, height: dimension}}>
      {[0, 1].map((i) => (
        <motion.div
          key={i}
          className='absolute inset-0 rounded-full border-4 border-[var(--accent-primary)]'
          initial={{scale: 0.5, opacity: 1}}
          animate={{scale: [0.5, 1.5], opacity: [1, 0]}}
          transition={{duration: 2, repeat: Infinity, delay: i, ease: 'easeOut'}}
        />
      ))}
    </div>
  );
}

export function Spinner({variant = 'orbit', size = 'md', tone = 'primary', className}: UnifiedSpinnerProps) {
  switch (variant) {
    case 'orbit':
      return <OrbitSpinnerImpl size={size} className={className}/>;
    case 'ring':
      return <RingSpinnerImpl size={size} tone={tone} className={className}/>;
    case 'dots':
      return <DotsSpinnerImpl size={size} tone={tone} className={className}/>;
    case 'wave':
      return <WaveSpinnerImpl size={size} tone={tone} className={className}/>;
    case 'pulse':
      return <PulseSpinnerImpl size={size} className={className}/>;
    default:
      return <OrbitSpinnerImpl size={size} className={className}/>;
  }
}

export {OrbitSpinnerImpl, RingSpinnerImpl, DotsSpinnerImpl, WaveSpinnerImpl, PulseSpinnerImpl};
