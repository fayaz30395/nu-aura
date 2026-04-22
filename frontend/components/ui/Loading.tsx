'use client';

import React from 'react';
import {cn} from '@/lib/utils';
import {PremiumSpinner} from './PremiumSpinner';

export interface LoadingProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  text?: string;
  fullScreen?: boolean;
  variant?: 'orbit' | 'pulse' | 'dots' | 'bars' | 'ring' | 'gradient';
}

export function Loading({size = 'md', text, fullScreen = false, variant = 'orbit'}: LoadingProps) {
  const spinner = (
    <div className="flex flex-col items-center justify-center gap-6">
      <PremiumSpinner size={size} variant={variant}/>
      {text && (
        <p className="text-[var(--text-secondary)] text-sm font-medium animate-pulse duration-1000">
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
          <div className="absolute inset-0 blur-3xl bg-accent-500/20 rounded-full scale-150"/>
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
export function Skeleton({className}: SkeletonProps) {
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
        <div className="skeleton-aura h-10 w-10 rounded-lg"/>
        <div className="skeleton-aura h-4 w-16 rounded"/>
      </div>
      <div className="space-y-2">
        <div className="skeleton-aura h-8 w-24 rounded"/>
        <div className="skeleton-aura h-4 w-32 rounded"/>
      </div>
    </div>
  );
}

interface SkeletonTableProps {
  rows?: number;
  columns?: number;
}

/** Skeleton for table rows */
export function SkeletonTable({rows = 5, columns = 4}: SkeletonTableProps) {
  return (
    <div className="card-aura overflow-hidden" aria-hidden="true">
      {/* Header */}
      <div className="flex gap-4 px-6 py-4 border-b border-[var(--border-main)]">
        {Array.from({length: columns}).map((_, i) => (
          <div key={i} className="skeleton-aura h-4 rounded flex-1"/>
        ))}
      </div>
      {/* Rows */}
      {Array.from({length: rows}).map((_, rowIdx) => (
        <div
          key={rowIdx}
          className="flex gap-4 px-6 py-4 divider-b"
        >
          {Array.from({length: columns}).map((_, colIdx) => (
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

interface SkeletonChartProps {
  height?: string;
}

/** Skeleton for chart containers */
export function SkeletonChart({height = 'h-64'}: SkeletonChartProps) {
  return (
    <div className={cn('card-aura p-6', height)} aria-hidden="true">
      <div className="row-between mb-6">
        <div className="skeleton-aura h-6 w-32 rounded"/>
        <div className="skeleton-aura h-8 w-24 rounded-lg"/>
      </div>
      <div className="flex items-end gap-2 h-[calc(100%-4rem)]">
        {(() => {
          const heights = [65, 45, 80, 55, 70, 40, 75, 50, 85, 60];
          return Array.from({length: 7}).map((_, i) => (
            <div
              key={i}
              className="skeleton-aura flex-1 rounded-t"
              style={{height: `${heights[i % heights.length]}%`}}
            />
          ));
        })()}
      </div>
    </div>
  );
}

/** Skeleton for card content (generic) */
export function SkeletonCard() {
  return (
    <div className="card-aura p-6" aria-hidden="true">
      <div className="flex items-center gap-4 mb-4">
        <div className="skeleton-aura h-10 w-10 rounded-lg flex-shrink-0"/>
        <div className="flex-1 space-y-2">
          <div className="skeleton-aura h-4 w-3/4 rounded"/>
          <div className="skeleton-aura h-4 w-1/2 rounded"/>
        </div>
      </div>
      <div className="space-y-2">
        <div className="skeleton-aura h-4 w-full rounded"/>
        <div className="skeleton-aura h-4 w-5/6 rounded"/>
        <div className="skeleton-aura h-4 w-2/3 rounded"/>
      </div>
    </div>
  );
}

/** NULogic atom icon SVG path (shared between loader variants) */
const NU_ICON_PATH =
  'M11.2876 3.98866C4.8414 4.78509 0.00104462 10.2817 0.00104462 16.7739C0.00104462 23.2661 4.8414 28.7628 11.2876 29.5592C11.8163 29.6245 12.3484 29.6571 12.8836 29.6571C13.4189 29.6571 13.9509 29.6245 14.4797 29.5592C20.9259 28.7628 25.7662 23.2661 25.7662 16.7739C25.7662 10.2817 20.9259 4.78509 14.4797 3.98866C13.9509 3.92338 13.4189 3.89074 12.8836 3.89074C12.3484 3.89074 11.8163 3.92338 11.2876 3.98866ZM23.8144 0C22.0552 0 20.6289 1.42639 20.6289 3.18571C20.6289 4.94503 22.0552 6.37141 23.8144 6.37141C25.5737 6.37141 27 4.94503 27 3.18571C27 1.42639 25.5737 0 23.8144 0ZM3.94709 30.0096C3.72841 29.8529 3.513 29.6865 3.30411 29.5167C3.19313 29.4286 3.02994 29.4449 2.93855 29.5559L0.0565253 33.1333C-0.0315999 33.2443-0.015282 33.4075 0.0956905 33.4989C3.05278 35.8816 6.59738 37.3798 10.3639 37.8433C11.1995 37.9478 12.0416 38 12.8804 38C13.7192 38 14.5645 37.9478 15.3968 37.8433C19.1634 37.3766 22.708 35.8784 25.6651 33.4989C25.776 33.4108 25.7924 33.2443 25.7042 33.1333L22.8222 29.5559C22.7341 29.4449 22.5676 29.4286 22.4567 29.5167C22.2478 29.6865 22.0323 29.8497 21.8137 30.0096C19.7313 31.5111 17.316 32.4577 14.7702 32.771C14.1435 32.8493 13.5103 32.8885 12.8804 32.8885C12.2504 32.8885 11.6172 32.8493 10.9906 32.771C8.44474 32.4577 6.0262 31.5111 3.94709 30.0096ZM14.2675 9.123C17.9623 9.78234 20.655 13.0203 20.655 16.7707C20.655 20.521 17.91 23.8145 14.1664 24.4346C13.742 24.5064 13.3145 24.5391 12.8836 24.5391C12.4528 24.5391 12.0252 24.5032 11.6009 24.4346L11.4932 24.4183C7.79849 23.7557 5.1123 20.521 5.1123 16.7707C5.1123 13.0203 7.85724 9.72685 11.6009 9.10668C12.0252 9.03487 12.4528 9.00223 12.8836 9.00223C13.3145 9.00223 13.742 9.03814 14.1664 9.10668L14.2675 9.123Z';

/** Particle configuration for the constellation loader */
const PARTICLES: Array<{ size: number; x: string; y: string; anim: string; color: string }> = [
  {
    size: 6,
    x: '14%',
    y: '12%',
    anim: 'nuaura-float-1 4s ease-in-out infinite',
    color: "bg-accent"
  },
  {size: 4, x: '78%', y: '8%', anim: 'nuaura-float-2 5s ease-in-out infinite', color: 'bg-[var(--nu-purple)]'},
  {
    size: 5,
    x: '8%',
    y: '72%',
    anim: 'nuaura-float-3 4.5s ease-in-out infinite',
    color: "bg-accent-subtle"
  },
  {
    size: 3,
    x: '82%',
    y: '76%',
    anim: 'nuaura-float-1 3.5s ease-in-out 0.5s infinite',
    color: "bg-accent-subtle"
  },
  {
    size: 4,
    x: '6%',
    y: '42%',
    anim: 'nuaura-float-2 5.5s ease-in-out 1s infinite',
    color: "bg-accent"
  },
  {size: 5, x: '88%', y: '38%', anim: 'nuaura-float-3 4s ease-in-out 0.8s infinite', color: 'bg-[var(--nu-purple)]'},
  {
    size: 3,
    x: '28%',
    y: '4%',
    anim: 'nuaura-float-1 6s ease-in-out 0.3s infinite',
    color: "bg-accent-subtle"
  },
  {
    size: 3,
    x: '68%',
    y: '86%',
    anim: 'nuaura-float-2 5s ease-in-out 1.2s infinite',
    color: "bg-accent"
  },
];

interface NuAuraLoaderProps {
  message?: string;
}

/**
 * Animated branded loading screen for NU-AURA platform.
 *
 * "Particle Constellation" style — floating glowing particles drift
 * around the NULogic atom icon like a neural network coming alive.
 * Pure CSS animations, no Framer Motion dependency.
 */
export function NuAuraLoader({message = 'Loading your workspace...'}: NuAuraLoaderProps) {
  return (
    <div className="flex items-center justify-center min-h-screen bg-[var(--bg-page)] transition-colors select-none">
      <div className="flex flex-col items-center gap-8">

        {/* ── Constellation Container ─────────────────────────── */}
        <div className="relative w-40 h-40">

          {/* Radial glow behind logo */}
          <div
            className='absolute inset-6 rounded-full bg-accent-500/12 blur-2xl nuaura-breathe'/>

          {/* Floating particles */}
          {PARTICLES.map((p, i) => (
            <div
              key={i}
              className={cn('absolute rounded-full', p.color)}
              style={{
                width: p.size * 2,
                height: p.size * 2,
                left: p.x,
                top: p.y,
                animation: p.anim,
                boxShadow: `0 0 ${p.size + 4}px currentColor`,
              }}
            />
          ))}

          {/* Centre — NULogic atom icon */}
          <div className="absolute inset-0 flex items-center justify-center nuaura-breathe">
            <svg
              width="48"
              height="54"
              viewBox="0 0 27 38"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="drop-shadow-[var(--shadow-elevated)]"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d={NU_ICON_PATH}
                fill="url(#nuaura-loader-grad)"
              />
              <defs>
                <linearGradient id="nuaura-loader-grad" x1="13.5" y1="0" x2="13.5" y2="38"
                                gradientUnits="userSpaceOnUse">
                  <stop stopColor="var(--accent-primary, #2952A3)"/>
                  <stop offset="1" stopColor="var(--nu-purple, #8939A1)"/>
                </linearGradient>
              </defs>
            </svg>
          </div>
        </div>

        {/* ── Brand Name with shimmer ─────────────────────────── */}
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold tracking-wide nuaura-shimmer-text">
            NU-AURA
          </h2>
          <p className="text-body-secondary nuaura-fade-text">
            {message}
          </p>
        </div>

        {/* ── Progress dots ───────────────────────────────────── */}
        <div className="flex gap-2">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className='w-2 h-2 rounded-full bg-accent'
              style={{animation: `nuaura-dot 1.4s ease-in-out ${i * 0.16}s infinite both`}}
            />
          ))}
        </div>
      </div>
      {/* ── Keyframes ─────────────────────────────────────────── */}
      <style>{`
        /* Slow breathing pulse for logo + glow */
        @keyframes nuaura-breathe {
          0%, 100% { transform: scale(1); opacity: 1; }
          50%      { transform: scale(1.06); opacity: 0.85; }
        }
        .nuaura-breathe {
          animation: nuaura-breathe 3s ease-in-out infinite;
        }

        /* Particle float paths — each follows a unique organic trajectory */
        @keyframes nuaura-float-1 {
          0%, 100% { transform: translate(0, 0); }
          25%      { transform: translate(10px, -14px); }
          50%      { transform: translate(-6px, -8px); }
          75%      { transform: translate(8px, 6px); }
        }
        @keyframes nuaura-float-2 {
          0%, 100% { transform: translate(0, 0); }
          33%      { transform: translate(-12px, 8px); }
          66%      { transform: translate(6px, -12px); }
        }
        @keyframes nuaura-float-3 {
          0%, 100% { transform: translate(0, 0); }
          50%      { transform: translate(12px, 10px); }
        }

        /* Progress dots */
        @keyframes nuaura-dot {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
          40%           { transform: scale(1.3); opacity: 1; }
        }

        /* Shimmer gradient sweep on brand name */
        @keyframes nuaura-shimmer {
          0%   { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        .nuaura-shimmer-text {
          background: linear-gradient(
            90deg,
            var(--accent-primary, #2952A3) 0%,
            var(--nu-purple, #8939A1) 25%,
            var(--accent-primary, #6884dc) 50%,
            var(--nu-purple, #8939A1) 75%,
            var(--accent-primary, #2952A3) 100%
          );
          background-size: 200% auto;
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: nuaura-shimmer 3s linear infinite;
        }

        /* Gentle fade-in-out for the message */
        @keyframes nuaura-fade {
          0%, 100% { opacity: 0.5; }
          50%      { opacity: 1; }
        }
        .nuaura-fade-text {
          animation: nuaura-fade 2.4s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
