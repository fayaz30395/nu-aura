'use client';

import React from 'react';
import {Spinner as UnifiedSpinner, type SpinnerSize} from './spinners';

export interface PremiumSpinnerProps {
  size?: SpinnerSize;
  variant?: 'orbit' | 'pulse' | 'dots' | 'bars' | 'ring' | 'gradient';
  className?: string;
}

// Legacy variants map to the unified Spinner:
//   orbit  -> orbit
//   gradient -> ring (SVG gradient ring)
//   pulse  -> dots (matches the old "pulse dots" visual)
//   dots   -> dots
//   bars   -> wave
//   ring   -> pulse (expanding-ring)
export function PremiumSpinner({size = 'md', variant = 'orbit', className}: PremiumSpinnerProps) {
  switch (variant) {
    case 'orbit':
      return <UnifiedSpinner variant="orbit" size={size} className={className}/>;
    case 'gradient':
      return <UnifiedSpinner variant="ring" size={size} className={className}/>;
    case 'pulse':
    case 'dots':
      return <UnifiedSpinner variant="dots" size={size} className={className}/>;
    case 'bars':
      return <UnifiedSpinner variant="wave" size={size} className={className}/>;
    case 'ring':
      return <UnifiedSpinner variant="pulse" size={size} className={className}/>;
    default:
      return <UnifiedSpinner variant="orbit" size={size} className={className}/>;
  }
}

export function OrbitSpinner({size = 'md', className}: Omit<PremiumSpinnerProps, 'variant'>) {
  return <UnifiedSpinner variant="orbit" size={size} className={className}/>;
}

export function GradientRingSpinner({size = 'md', className}: Omit<PremiumSpinnerProps, 'variant'>) {
  return <UnifiedSpinner variant="ring" size={size} className={className}/>;
}

export function PulseDotsSpinner({size = 'md', className}: Omit<PremiumSpinnerProps, 'variant'>) {
  return <UnifiedSpinner variant="dots" size={size} className={className}/>;
}

export function WaveBarsSpinner({size = 'md', className}: Omit<PremiumSpinnerProps, 'variant'>) {
  return <UnifiedSpinner variant="wave" size={size} className={className}/>;
}

export function ExpandingRingSpinner({size = 'md', className}: Omit<PremiumSpinnerProps, 'variant'>) {
  return <UnifiedSpinner variant="pulse" size={size} className={className}/>;
}
