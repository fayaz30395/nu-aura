'use client';

import { useEffect } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[Route Error]', error);
  }, [error]);

  return (
    <AppLayout>
      <div className="page-shell-centered fade-slide-up">
        <div className="page-shell-card float-subtle w-full max-w-xl p-8 flex flex-col items-center justify-center gap-4 text-center fade-slide-up">
          <div className="w-16 h-16 rounded-full bg-danger-50 dark:bg-danger-900/30 flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-danger-700 dark:text-danger-400"/>
          </div>
          <h1 className="text-xl font-semibold text-[var(--text-primary)]">Something went wrong</h1>
          <p className="text-sm text-[var(--text-secondary)] max-w-md">
            {error.message || 'An unexpected error occurred. Please try again.'}
          </p>
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 px-4 py-2 bg-accent-700 hover:bg-accent-800 text-white rounded-lg text-sm font-medium transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
          >
            <RefreshCw className="w-4 h-4"/>
            Try again
          </button>
        </div>
      </div>
    </AppLayout>
  );
}
