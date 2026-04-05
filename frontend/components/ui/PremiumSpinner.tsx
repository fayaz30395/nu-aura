'use client';

import React from 'react';
import {motion} from 'framer-motion';
import {cn} from '@/lib/utils';

export interface PremiumSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'orbit' | 'pulse' | 'dots' | 'bars' | 'ring' | 'gradient';
  className?: string;
}

const sizeMap = {
  sm: 32,
  md: 48,
  lg: 64,
  xl: 80,
};

/**
 * Premium Orbit Spinner - Planets orbiting around a core
 * Best-in-class animated loader with multiple orbiting elements
 */
export function OrbitSpinner({size = 'md', className}: Omit<PremiumSpinnerProps, 'variant'>) {
  const dimension = sizeMap[size];

  return (
    <div className={cn('relative', className)} style={{width: dimension, height: dimension}}>
      {/* Center core - pulsing */}
      <motion.div
        className="absolute inset-0 m-auto w-3 h-3 rounded-full bg-gradient-to-br from-accent-500 to-accent-700"
        animate={{
          scale: [1, 1.3, 1],
          opacity: [0.8, 1, 0.8],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* Orbit ring 1 - outer */}
      <motion.div
        className="absolute inset-0"
        animate={{rotate: 360}}
        transition={{duration: 3, repeat: Infinity, ease: 'linear'}}
      >
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-gradient-to-br from-accent-400 to-accent-700 shadow-[var(--shadow-dropdown)] shadow-accent-500/50"/>
      </motion.div>

      {/* Orbit ring 2 - middle */}
      <motion.div
        className="absolute inset-[15%]"
        animate={{rotate: -360}}
        transition={{duration: 2, repeat: Infinity, ease: 'linear'}}
      >
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-gradient-to-br from-accent-500 to-accent-700 shadow-[var(--shadow-dropdown)] shadow-accent-500/50"/>
      </motion.div>

      {/* Orbit ring 3 - inner */}
      <motion.div
        className="absolute inset-[25%]"
        animate={{rotate: 360}}
        transition={{duration: 1.5, repeat: Infinity, ease: 'linear'}}
      >
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-gradient-to-br from-accent-400 to-accent-700 shadow-[var(--shadow-dropdown)] shadow-accent-500/50"/>
      </motion.div>

      {/* Orbiting particles */}
      {[0, 120, 240].map((angle) => (
        <motion.div
          key={angle}
          className="absolute inset-0"
          animate={{rotate: 360}}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: 'linear',
            delay: angle / 360,
          }}
        >
          <div
            className="absolute w-0.5 h-0.5 rounded-full bg-accent-300"
            style={{
              top: '10%',
              left: '50%',
              transform: 'translateX(-50%)',
            }}
          />
        </motion.div>
      ))}
    </div>
  );
}

/**
 * Gradient Ring Spinner - Modern gradient ring with trail effect
 */
export function GradientRingSpinner({size = 'md', className}: Omit<PremiumSpinnerProps, 'variant'>) {
  const dimension = sizeMap[size];
  const strokeWidth = dimension / 10;

  return (
    <div className={cn('relative', className)} style={{width: dimension, height: dimension}}>
      <svg width={dimension} height={dimension} viewBox={`0 0 ${dimension} ${dimension}`}>
        {/* Background ring */}
        <circle
          cx={dimension / 2}
          cy={dimension / 2}
          r={dimension / 2 - strokeWidth / 2}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-[var(--border-main)]"
          opacity="0.2"
        />

        {/* Animated gradient ring */}
        <motion.circle
          cx={dimension / 2}
          cy={dimension / 2}
          r={dimension / 2 - strokeWidth / 2}
          fill="none"
          stroke="url(#gradient)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${Math.PI * (dimension - strokeWidth) * 0.75} ${Math.PI * (dimension - strokeWidth)}`}
          initial={{rotate: 0}}
          animate={{rotate: 360}}
          transition={{duration: 1.5, repeat: Infinity, ease: 'linear'}}
          style={{transformOrigin: 'center'}}
        />

        {/* Gradient definition */}
        <defs>
          <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--accent-900)"/>
            <stop offset="50%" stopColor="var(--accent-500)"/>
            <stop offset="100%" stopColor="var(--accent-300)"/>
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

/**
 * Pulse Dots Spinner - Multiple pulsing dots with wave effect
 */
export function PulseDotsSpinner({size = 'md', className}: Omit<PremiumSpinnerProps, 'variant'>) {
  const dotSize = size === 'sm' ? 8 : size === 'md' ? 12 : size === 'lg' ? 16 : 20;

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="rounded-full bg-gradient-to-br from-accent-500 to-accent-700"
          style={{width: dotSize, height: dotSize}}
          animate={{
            scale: [1, 1.5, 1],
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
 * Wave Bars Spinner - Animated sound wave bars
 */
export function WaveBarsSpinner({size = 'md', className}: Omit<PremiumSpinnerProps, 'variant'>) {
  const barWidth = size === 'sm' ? 4 : size === 'md' ? 5 : size === 'lg' ? 6 : 8;
  const maxHeight = size === 'sm' ? 24 : size === 'md' ? 32 : size === 'lg' ? 40 : 48;

  return (
    <div className={cn('flex items-end gap-1.5', className)} style={{height: maxHeight}}>
      {[0, 1, 2, 3, 4].map((i) => (
        <motion.div
          key={i}
          className="rounded-full bg-gradient-to-t from-accent-700 to-accent-400"
          style={{width: barWidth}}
          animate={{
            height: [maxHeight * 0.3, maxHeight, maxHeight * 0.3],
          }}
          transition={{
            duration: 1,
            repeat: Infinity,
            delay: i * 0.15,
            ease: 'easeInOut',
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
  const dimension = sizeMap[size];

  return (
    <div className={cn('relative', className)} style={{width: dimension, height: dimension}}>
      {[0, 1].map((i) => (
        <motion.div
          key={i}
          className="absolute inset-0 rounded-full border-4 border-accent-500"
          initial={{scale: 0.5, opacity: 1}}
          animate={{
            scale: [0.5, 1.5],
            opacity: [1, 0],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            delay: i * 1,
            ease: 'easeOut',
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
