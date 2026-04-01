'use client';

import React, { Component, ReactNode } from 'react';
import { logger } from '@/lib/utils/logger';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  resetKeys?: unknown[]; // when these change, boundary resets
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    logger.error('[ErrorBoundary] Caught error:', error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    if (this.state.hasError && this.props.resetKeys) {
      const prevKeys = prevProps.resetKeys ?? [];
      const currKeys = this.props.resetKeys;
      if (prevKeys.some((key, i) => key !== currKeys[i])) {
        this.setState({ hasError: false, error: null });
      }
    }
  }

  reset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return <DefaultErrorFallback error={this.state.error} onReset={this.reset} />;
    }
    return this.props.children;
  }
}

interface DefaultErrorFallbackProps {
  error: Error | null;
  onReset: () => void;
}

function DefaultErrorFallback({ error, onReset }: DefaultErrorFallbackProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[200px] p-8 rounded-xl border border-danger-200 dark:border-danger-800 bg-danger-50 dark:bg-danger-950/20">
      <div className="text-danger-500 dark:text-danger-400 mb-3">
        <svg className="w-10 h-10 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
          />
        </svg>
      </div>
      <h3 className="text-sm font-semibold text-danger-700 dark:text-danger-300 mb-1">
        Something went wrong
      </h3>
      <p className="text-xs text-danger-600 dark:text-danger-400 mb-4 text-center max-w-sm">
        {error?.message || 'An unexpected error occurred. The team has been notified.'}
      </p>
      <button
        onClick={onReset}
        className="px-4 py-1.5 text-xs font-medium rounded-lg bg-danger-100 dark:bg-danger-900/40 text-danger-700 dark:text-danger-300 hover:bg-danger-200 dark:hover:bg-danger-900/60 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2 rounded"
      >
        Try again
      </button>
    </div>
  );
}

export function WithErrorBoundary({
  children,
  fallback,
  onError,
}: {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}) {
  return (
    <ErrorBoundary fallback={fallback} onError={onError}>
      {children}
    </ErrorBoundary>
  );
}

export default ErrorBoundary;
