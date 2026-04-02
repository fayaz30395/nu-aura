'use client';

import Link from 'next/link';
import { IconHome, IconArrowLeft, IconSearch, IconMapPin } from '@tabler/icons-react';

/**
 * 404 Not Found page
 * Professional enterprise error page with NULogic brand identity.
 * Follows: Single Hue Design System, Balanced Spacing Spec, UI/UX Pro Max guidelines.
 */
export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-main)] px-4">
      {/* Subtle brand atmosphere */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{ background: 'var(--bg-pattern)', backgroundSize: 'var(--bg-pattern-size)' }}
        aria-hidden="true"
      />

      <div className="relative z-10 w-full max-w-md text-center">
        {/* 404 number — large, muted, brand tonal */}
        <p
          className="font-display text-[120px] sm:text-[160px] font-extrabold leading-none tracking-tight select-none"
          style={{
            background: 'linear-gradient(180deg, var(--accent-200), var(--accent-50))',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
          aria-hidden="true"
        >
          404
        </p>

        {/* Icon + heading */}
        <div className="flex items-center justify-center gap-2 -mt-6 mb-4">
          <div className="w-10 h-10 rounded-xl bg-warning-100 dark:bg-warning-950/30 flex items-center justify-center">
            <IconMapPin size={20} className="text-warning-600 dark:text-warning-400" />
          </div>
          <h1 className="font-display text-xl font-bold text-[var(--text-primary)]">
            Page not found
          </h1>
        </div>

        {/* Description */}
        <p className="text-body-secondary max-w-xs mx-auto leading-relaxed mb-8">
          The page you&apos;re looking for doesn&apos;t exist, has been moved, or you may not have permission to view it.
        </p>

        {/* Actions — primary + secondary, consistent button styling */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/me/dashboard"
            className="inline-flex items-center justify-center gap-2 h-11 px-6 rounded-xl font-medium text-sm text-white transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
            style={{ background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-primary-hover))' }}
          >
            <IconHome size={18} />
            Go to Dashboard
          </Link>

          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center justify-center gap-2 h-11 px-6 rounded-xl font-medium text-sm text-[var(--text-primary)] bg-[var(--bg-card)] border border-[var(--border-main)] hover:bg-[var(--bg-card-hover)] hover:border-[var(--border-strong)] transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
          >
            <IconArrowLeft size={18} />
            Go Back
          </button>
        </div>

        {/* Helpful hint */}
        <div className="mt-8 flex items-center justify-center gap-1.5 text-caption">
          <IconSearch size={14} />
          <span>Try using the search bar to find what you need</span>
        </div>
      </div>
    </div>
  );
}
