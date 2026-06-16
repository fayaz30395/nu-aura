'use client';

import React from 'react';
import {motion} from 'framer-motion';
import {Clock} from 'lucide-react';
import {MOTION_EASE} from '@/lib/animation';

interface AppLandingHeroProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  /** Optional short eyebrow label rendered above the headline. */
  eyebrow?: string;
  comingSoon?: boolean;
  /** @deprecated retained for prop-API compatibility; no longer used. */
  gradientFrom?: string;
  /** @deprecated retained for prop-API compatibility; no longer used. */
  gradientTo?: string;
  iconSize?: 'sm' | 'md' | 'lg';
}

// Shared ease curve — matches /resources page motion blueprint.
const EASE = MOTION_EASE.outExpo;

/**
 * Reusable landing hero component for app entry pages.
 * Product-register restraint: flat surfaces, eyebrow + headline + 55ch lede,
 * matched to the redesigned /resources header pattern.
 */
export const AppLandingHero: React.FC<AppLandingHeroProps> = ({
                                                                icon,
                                                                title,
                                                                description,
                                                                eyebrow,
                                                                comingSoon = false,
                                                                iconSize = 'md',
                                                              }) => {
  const iconContainer = {
    sm: 'h-10 w-10',
    md: 'h-11 w-11',
    lg: 'h-12 w-12',
  }[iconSize];

  const iconInner = {
    sm: 'h-5 w-5',
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
  }[iconSize];

  return (
    <motion.header
      initial={{opacity: 0, y: 4}}
      animate={{opacity: 1, y: 0}}
      transition={{duration: 0.4, ease: EASE}}
      className="flex flex-col items-start gap-6 py-10 sm:py-14"
    >
      <div
        className={`${iconContainer} flex shrink-0 items-center justify-center rounded-xl bg-accent-50 text-accent-700 dark:bg-accent-900/30 dark:text-accent-300`}
      >
        <div className={`${iconInner} flex items-center justify-center`} aria-hidden="true">
          {icon}
        </div>
      </div>

      <div className="space-y-4 max-w-2xl">
        {eyebrow && (
          <p className="text-2xs font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
            {eyebrow}
          </p>
        )}
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-[var(--text-heading)] leading-[1.05]">
          {title}
        </h1>
        <p className="text-body-secondary text-[var(--text-secondary)] max-w-[55ch]">
          {description}
        </p>
      </div>

      {comingSoon && (
        <div
          className="inline-flex items-center gap-2 rounded-full bg-accent-50 px-4 py-1.5 text-xs font-medium text-accent-700 dark:bg-accent-900/30 dark:text-accent-300"
        >
          <Clock className="h-3.5 w-3.5" aria-hidden="true"/>
          Coming Soon (Phase 2)
        </div>
      )}
    </motion.header>
  );
};
