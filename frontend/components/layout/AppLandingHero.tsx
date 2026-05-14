'use client';

import React from 'react';
import {Clock} from 'lucide-react';

interface AppLandingHeroProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  comingSoon?: boolean;
  /** @deprecated retained for prop-API compatibility; no longer used. */
  gradientFrom?: string;
  /** @deprecated retained for prop-API compatibility; no longer used. */
  gradientTo?: string;
  iconSize?: 'sm' | 'md' | 'lg';
}

/**
 * Reusable landing hero component for app entry pages.
 * Product-register restraint: flat surfaces, no animated gradients,
 * no decorative particles, ease-out only.
 */
export const AppLandingHero: React.FC<AppLandingHeroProps> = ({
                                                                icon,
                                                                title,
                                                                description,
                                                                comingSoon = false,
                                                                iconSize = 'md',
                                                              }) => {
  const iconDimensions = {
    sm: 'w-16 h-16',
    md: 'w-20 h-20',
    lg: 'w-24 h-24',
  };

  const iconInnerDimensions = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
  };

  return (
    <div
      className="relative min-h-[60vh] flex flex-col items-center justify-center text-center px-4 py-12 bg-[var(--bg-main)]">
      <div className="relative z-10">
        {/* Icon */}
        <div
          className={`${iconDimensions[iconSize]} rounded-lg bg-accent-100 dark:bg-accent-500/10 text-accent-600 dark:text-accent-400 flex items-center justify-center mb-6 mx-auto`}
        >
          <div className={`${iconInnerDimensions[iconSize]} flex items-center justify-center`}>
            {icon}
          </div>
        </div>

        {/* Title */}
        <h1 className="text-page-title text-[var(--text-primary)] mb-4">
          {title}
        </h1>

        {/* Description */}
        <p className="text-body-secondary text-[var(--text-secondary)] max-w-md mx-auto mb-6">
          {description}
        </p>

        {/* Coming Soon Badge */}
        {comingSoon && (
          <div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent-50 dark:bg-accent-900/20 text-accent-600 dark:text-accent-400 text-sm font-medium"
          >
            <Clock className="w-4 h-4"/>
            Coming Soon (Phase 2)
          </div>
        )}
      </div>
    </div>
  );
};
