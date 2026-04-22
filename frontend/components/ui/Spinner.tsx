'use client';

import React from 'react';
import {cn} from '@/lib/utils';
import {
  Spinner as UnifiedSpinner,
  type SpinnerSize,
  type SpinnerTone,
} from './spinners';

export interface SpinnerProps {
  size?: SpinnerSize;
  variant?: SpinnerTone;
  className?: string;
}

// Legacy API: `variant` on Spinner acted as a tone (primary/secondary/white).
// The default visual is the SVG ring spinner.
export function Spinner({size = 'md', variant = 'primary', className}: SpinnerProps) {
  return <UnifiedSpinner variant="ring" size={size} tone={variant} className={className}/>;
}

export function DotsSpinner({variant = 'primary', className}: Omit<SpinnerProps, 'size'>) {
  return (
    <UnifiedSpinner
      variant="dots"
      size="sm"
      tone={variant}
      className={cn('!gap-1.5', className)}
    />
  );
}

export function WaveSpinner({variant = 'primary', className}: Omit<SpinnerProps, 'size'>) {
  return <UnifiedSpinner variant="wave" size="sm" tone={variant} className={className}/>;
}

export function PulseRing({size = 'md', variant = 'primary', className}: SpinnerProps) {
  const sizeMap: Record<SpinnerSize, string> = {
    sm: 'w-12 h-12',
    md: 'w-16 h-16',
    lg: 'w-20 h-20',
    xl: 'w-24 h-24',
  };
  const ringColors: Record<SpinnerTone, string> = {
    primary: "border-[var(--accent-700)]/20",
    secondary: 'border-[var(--border-main)]',
    white: 'border-white/20',
  };
  return (
    <div className={cn('relative', sizeMap[size], className)}>
      <div className={cn('absolute inset-0 rounded-full border-4 animate-ping', ringColors[variant])}/>
      <div className={cn('absolute inset-2 rounded-full border-4 animate-ping', ringColors[variant])}
           style={{animationDelay: '0.75s'}}/>
    </div>
  );
}
