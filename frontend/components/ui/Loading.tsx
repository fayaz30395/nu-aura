'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { PremiumSpinner } from './PremiumSpinner';

export interface LoadingProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  text?: string;
  fullScreen?: boolean;
  variant?: 'orbit' | 'pulse' | 'dots' | 'bars' | 'ring' | 'gradient';
}

export function Loading({ size = 'md', text, fullScreen = false, variant = 'orbit' }: LoadingProps) {
  const spinner = (
    <div className="flex flex-col items-center justify-center gap-6">
      <PremiumSpinner size={size} variant={variant} />
      {text && (
        <p className="text-[var(--text-secondary)] text-sm font-medium animate-pulse">
          {text}
        </p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-[var(--bg-overlay)] backdrop-blur-md flex items-center justify-center z-50">
        <div className="relative">
          {/* Glow effect behind spinner */}
          <div className="absolute inset-0 blur-3xl bg-primary-500/20 rounded-full scale-150" />
          {spinner}
        </div>
      </div>
    );
  }

  return <div className="flex items-center justify-center py-12">{spinner}</div>;
}

/* ── Skeleton Components ──────────────────────────────── */

interface SkeletonProps {
  className?: string;
}

/** Base skeleton block — use for custom layouts */
export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn('skeleton-aura', className)}
      aria-hidden="true"
    />
  );
}

/** Skeleton for stat cards (matches StatCard layout) */
export function SkeletonStatCard() {
  return (
    <div className="card-aura p-4" aria-hidden="true">
      <div className="flex items-start justify-between mb-4">
        <div className="skeleton-aura h-10 w-10 rounded-lg" />
        <div className="skeleton-aura h-4 w-16 rounded" />
      </div>
      <div className="space-y-2">
        <div className="skeleton-aura h-8 w-24 rounded" />
        <div className="skeleton-aura h-4 w-32 rounded" />
      </div>
    </div>
  );
}

/** Skeleton for table rows */
export function SkeletonTable({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="card-aura overflow-hidden" aria-hidden="true">
      {/* Header */}
      <div className="flex gap-4 px-6 py-3 border-b border-[var(--border-main)]">
        {Array.from({ length: columns }).map((_, i) => (
          <div key={i} className="skeleton-aura h-4 rounded flex-1" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div
          key={rowIdx}
          className="flex gap-4 px-6 py-3 border-b border-[var(--border-subtle)]"
        >
          {Array.from({ length: columns }).map((_, colIdx) => (
            <div
              key={colIdx}
              className={cn(
                'skeleton-aura h-4 rounded flex-1',
                colIdx === 0 && 'max-w-[180px]'
              )}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

/** Skeleton for chart containers */
export function SkeletonChart({ height = 'h-64' }: { height?: string }) {
  return (
    <div className={cn('card-aura p-6', height)} aria-hidden="true">
      <div className="flex items-center justify-between mb-6">
        <div className="skeleton-aura h-6 w-32 rounded" />
        <div className="skeleton-aura h-8 w-24 rounded-lg" />
      </div>
      <div className="flex items-end gap-2 h-[calc(100%-4rem)]">
        {Array.from({ length: 7 }).map((_, i) => (
          <div
            key={i}
            className="skeleton-aura flex-1 rounded-t"
            style={{ height: `${30 + Math.random() * 60}%` }}
          />
        ))}
      </div>
    </div>
  );
}

/** Skeleton for card content (generic) */
export function SkeletonCard() {
  return (
    <div className="card-aura p-6" aria-hidden="true">
      <div className="flex items-center gap-4 mb-4">
        <div className="skeleton-aura h-10 w-10 rounded-lg flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="skeleton-aura h-4 w-3/4 rounded" />
          <div className="skeleton-aura h-4 w-1/2 rounded" />
        </div>
      </div>
      <div className="space-y-2">
        <div className="skeleton-aura h-4 w-full rounded" />
        <div className="skeleton-aura h-4 w-5/6 rounded" />
        <div className="skeleton-aura h-4 w-2/3 rounded" />
      </div>
    </div>
  );
}

/**
 * Animated branded loading screen for NU-AURA platform.
 * Shows an engaging pulsing logo + orbit animation + shimmer text.
 */
export function NuAuraLoader({ message = 'Loading your workspace...' }: { message?: string }) {
  return (
    <div className="flex items-center justify-center min-h-screen bg-[var(--bg-page)] transition-colors">
      <div className="flex flex-col items-center gap-6">
        {/* Animated Logo Container */}
        <div className="relative w-24 h-24">
          {/* Outer orbit ring */}
          <div className="absolute inset-0 rounded-full border-2 border-primary-400 dark:border-primary-500 animate-[spin_3s_linear_infinite]">
            <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-primary-500 dark:bg-primary-400 shadow-lg shadow-primary-500/60" />
          </div>
          {/* Middle orbit ring */}
          <div className="absolute inset-4 rounded-full border-2 border-info-400 dark:border-info-500 animate-[spin_2s_linear_infinite_reverse]">
            <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-info-500 dark:bg-info-400 shadow-lg shadow-info-500/60" />
          </div>
          {/* Inner pulsing core */}
          <div className="absolute inset-6 rounded-full bg-gradient-to-br from-primary-500 to-info-600 shadow-xl shadow-primary-500/40 dark:shadow-primary-400/30 animate-pulse flex items-center justify-center">
            <span className="text-white font-bold text-lg tracking-tight">N</span>
          </div>
        </div>

        {/* Brand text */}
        <div className="text-center space-y-2">
          <h2 className="text-xl font-bold bg-gradient-to-r from-primary-600 to-info-600 dark:from-primary-300 dark:to-info-300 bg-clip-text text-transparent">
            NU-AURA
          </h2>
          {/* Loading text — no shimmer overlay to avoid washing out */}
          <p className="text-sm text-[var(--text-secondary)] animate-pulse">
            {message}
          </p>
        </div>

        {/* Animated progress dots */}
        <div className="flex gap-2">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="w-2 h-2 rounded-full bg-primary-500 dark:bg-primary-400"
              style={{
                animation: `nuaura-dot 1.4s ease-in-out ${i * 0.16}s infinite both`,
              }}
            />
          ))}
        </div>
      </div>

      {/* Keyframes injected via style tag */}
      <style>{`
        @keyframes nuaura-dot {
          0%, 80%, 100% { transform: scale(0.7); opacity: 0.5; }
          40% { transform: scale(1.2); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
