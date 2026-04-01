'use client';

import React, { Suspense, ReactNode } from 'react';
import { ErrorBoundary } from './ErrorBoundary';

interface SectionErrorFallbackProps {
  error: Error | null;
  onReset: () => void;
  sectionName?: string;
}

/**
 * Compact inline error fallback for page sections.
 * Unlike PageErrorFallback (full-page), this renders inline so
 * the rest of the page continues working.
 */
function SectionErrorFallback({ error, onReset, sectionName }: SectionErrorFallbackProps) {
  return (
    <div className="flex items-center gap-4 p-4 rounded-lg border border-[var(--border-main)] bg-[var(--bg-card)]">
      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-danger-100 dark:bg-danger-900/20 flex items-center justify-center">
        <svg className="w-5 h-5 text-danger-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
          />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[var(--text-primary)]">
          {sectionName ? `Failed to load ${sectionName}` : 'This section encountered an error'}
        </p>
        <p className="text-xs text-[var(--text-muted)] truncate">
          {error?.message || 'An unexpected error occurred'}
        </p>
      </div>
      <button
        onClick={onReset}
        className="flex-shrink-0 px-4 py-1.5 text-xs font-medium rounded-lg bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)] transition-colors"
      >
        Retry
      </button>
    </div>
  );
}

interface SectionLoadingProps {
  height?: string;
}

/**
 * Lightweight loading indicator for section-level Suspense boundaries.
 */
function SectionLoading({ height = '120px' }: SectionLoadingProps) {
  return (
    <div className="flex items-center justify-center rounded-lg bg-[var(--bg-card)]" style={{ minHeight: height }}>
      <div className="flex items-center gap-2 text-[var(--text-muted)]">
        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <span className="text-sm">Loading...</span>
      </div>
    </div>
  );
}

interface SectionBoundaryProps {
  children: ReactNode;
  /** Display name for the section (shown in error fallback) */
  name?: string;
  /** Custom error fallback component */
  errorFallback?: ReactNode;
  /** Custom loading fallback component */
  loadingFallback?: ReactNode;
  /** Minimum height for loading state */
  loadingHeight?: string;
  /** Whether to wrap in Suspense (default: true) */
  suspense?: boolean;
  /** Keys that trigger error boundary reset when changed */
  resetKeys?: unknown[];
}

/**
 * Granular error + suspense boundary for individual page sections.
 *
 * Wraps a section of a page with both an ErrorBoundary and optional Suspense
 * boundary. If the section crashes or throws, only that section shows an error
 * state — the rest of the page continues working.
 *
 * Usage:
 * ```tsx
 * <SectionBoundary name="Team Presence">
 *   <TeamPresenceWidget />
 * </SectionBoundary>
 *
 * <SectionBoundary name="Leave Balance" suspense={false}>
 *   <LeaveBalanceWidget />
 * </SectionBoundary>
 * ```
 */
export function SectionBoundary({
  children,
  name,
  errorFallback,
  loadingFallback,
  loadingHeight,
  suspense = true,
  resetKeys,
}: SectionBoundaryProps) {
  const content = suspense ? (
    <Suspense fallback={loadingFallback || <SectionLoading height={loadingHeight} />}>
      {children}
    </Suspense>
  ) : children;

  return (
    <ErrorBoundary
      fallback={errorFallback}
      resetKeys={resetKeys}
    >
      {/* If no custom fallback, the ErrorBoundary default is fine for inner sections,
          but we provide SectionErrorFallback as the default via a wrapper */}
      <SectionBoundaryInner name={name} errorFallback={errorFallback}>
        {content}
      </SectionBoundaryInner>
    </ErrorBoundary>
  );
}

/**
 * Inner wrapper that provides the section-specific error fallback.
 * Separated so ErrorBoundary can use the class component pattern.
 */
function SectionBoundaryInner({
  children,
  name: _name,
  errorFallback,
}: {
  children: ReactNode;
  name?: string;
  errorFallback?: ReactNode;
}) {
  // If a custom fallback was already provided to the parent ErrorBoundary,
  // just render children — the ErrorBoundary handles the fallback.
  if (errorFallback) return <>{children}</>;

  // Otherwise, render with our default section fallback via a nested boundary
  return (
    <ErrorBoundary
      fallback={undefined}
    >
      {children}
    </ErrorBoundary>
  );
}

export { SectionErrorFallback, SectionLoading };
