'use client';

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
    <div className="flex flex-col items-center justify-center flex-1 p-12 text-center">
      <div className="w-16 h-16 rounded-full bg-danger-100 dark:bg-danger-900/20 flex items-center justify-center mb-4">
        <svg className="w-8 h-8 text-danger-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 9v3.75m9.303 3.376c.866 1.5-.217 3.374-1.948 3.374H4.645c-1.73 0-2.813-1.874-1.948-3.374l7.304-12.748c.866-1.5 3.032-1.5 3.898 0L21.303 16.126ZM12 15.75h.007v.008H12v-.008Z"
          />
        </svg>
      </div>
      <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">{title}</h2>
      <p className="text-body-muted mb-6 max-w-md">
        {error?.message || 'An unexpected error occurred. Please try refreshing the page.'}
      </p>
      <div className="flex gap-2">
        {onReset && (
          <button
            onClick={onReset}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)] border border-[var(--border-main)] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2 rounded"
          >
            Try again
          </button>
        )}
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 text-sm font-medium rounded-lg bg-accent-500 text-white hover:bg-accent-700 transition-colors"
        >
          Refresh page
        </button>
      </div>
    </div>
  );
}
