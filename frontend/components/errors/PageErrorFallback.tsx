'use client';

import { AlertTriangle } from 'lucide-react';

interface PageErrorFallbackProps {
  error?: Error | null;
  title?: string;
  onReset?: () => void;
}

export function PageErrorFallback({
                                    error,
                                    title = 'Failed to load page',
                                    onReset,
                                  }: PageErrorFallbackProps) {
  return (
    <div className="w-full max-w-xl p-8 mx-auto flex flex-col items-center justify-center text-center">
      <div className="w-16 h-16 rounded-full bg-[var(--err-bg)] flex items-center justify-center mb-6">
        <AlertTriangle className="w-8 h-8 text-[var(--err-fg)]" />
      </div>
      <h2 className="text-aura-title text-[var(--text-1)] mb-2">{title}</h2>
      <p className="text-sm text-[var(--text-2)] mb-8 max-w-md leading-relaxed">
        {error?.message || 'An unexpected error occurred. Please try refreshing the page.'}
      </p>
      <div className="flex gap-2">
        {onReset && (
          <button
            onClick={onReset}
            className="px-4 py-2 text-sm font-medium rounded-[var(--r-control)] bg-[var(--surface)] text-[var(--text-2)] hover:bg-[var(--surface-2)] border border-[var(--border-soft)] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2"
          >
            Try again
          </button>
        )}
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 text-sm font-medium rounded-[var(--r-control)] bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2"
        >
          Refresh page
        </button>
      </div>
    </div>
  );
}
