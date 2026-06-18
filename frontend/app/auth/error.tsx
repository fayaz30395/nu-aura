'use client';

import {useEffect} from 'react';
import {RefreshCw, ShieldAlert} from 'lucide-react';

interface ErrorProps {
  error: Error & {digest?: string};
  reset: () => void;
}

export default function AuthError({error, reset}: ErrorProps) {
  useEffect(() => {
    console.error('[auth-error]', error.message, error.digest);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-[var(--bg-page)] px-4">
      <div className="h-12 w-12 rounded-full bg-danger-100 dark:bg-danger-900/30 flex items-center justify-center">
        <ShieldAlert className="h-6 w-6 text-danger-600 dark:text-danger-400" aria-hidden="true"/>
      </div>
      <div className="text-center space-y-1">
        <h1 className="text-xl font-semibold text-[var(--text-primary)]">Could not load this page</h1>
        <p className="text-sm text-[var(--text-secondary)]">
          {error.message || 'An unexpected error occurred. Please try again.'}
        </p>
        {error.digest && (
          <p className="text-xs text-[var(--text-secondary)] font-mono">Error ID: {error.digest}</p>
        )}
      </div>
      <button
        onClick={reset}
        className="inline-flex items-center gap-2 rounded-lg bg-[var(--accent)] px-5 py-2 text-sm font-medium text-white hover:bg-[var(--accent-hover)] transition-colors"
      >
        <RefreshCw className="h-4 w-4" aria-hidden="true"/>
        Try again
      </button>
    </div>
  );
}
