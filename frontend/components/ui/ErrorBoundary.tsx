'use client';

import React, { Component, ReactNode } from 'react';
import { logger } from '@/lib/utils/logger';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorId?: string;
}

const isDevelopment = process.env.NODE_ENV === 'development';

/**
 * Generate a unique error ID for production error tracking
 */
function generateErrorId(): string {
  return `ERR-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorId: generateErrorId(),
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // In production, only log sanitized error info
    if (isDevelopment) {
      logger.error('ErrorBoundary caught an error:', error, errorInfo);
    } else {
      // Log sanitized error for production monitoring
      logger.error('Application error:', {
        errorId: this.state.errorId,
        message: error.message,
        name: error.name,
        componentStack: errorInfo.componentStack?.split('\n').slice(0, 3).join('\n'),
      });
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-surface-50 dark:bg-surface-950">
          <div className="max-w-md w-full bg-[var(--bg-input)] rounded-lg shadow-lg p-8">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-danger-100 dark:bg-danger-900/30 mx-auto mb-4">
              <svg
                className="w-6 h-6 text-danger-600 dark:text-danger-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-center text-[var(--text-primary)] mb-2">
              Something went wrong
            </h2>
            <p className="text-[var(--text-secondary)] text-center mb-6">
              We encountered an unexpected error. Please try refreshing the page.
            </p>

            {/* Development: Show full error details */}
            {isDevelopment && this.state.error && (
              <div className="bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800 rounded p-4 mb-6">
                <p className="text-sm text-danger-800 dark:text-danger-300 font-mono break-all mb-2">
                  <strong>Error:</strong> {this.state.error.message}
                </p>
                <p className="text-xs text-danger-600 dark:text-danger-400 font-mono break-all whitespace-pre-wrap max-h-40 overflow-auto">
                  {this.state.error.stack}
                </p>
              </div>
            )}

            {/* Production: Show only error ID for support reference */}
            {!isDevelopment && this.state.errorId && (
              <div className="bg-[var(--bg-surface)] dark:bg-surface-700 rounded p-4 mb-6 text-center">
                <p className="text-xs text-[var(--text-muted)] mb-1">
                  Error Reference
                </p>
                <p className="text-sm font-mono text-[var(--text-secondary)] select-all">
                  {this.state.errorId}
                </p>
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => this.setState({ hasError: false, error: undefined, errorId: undefined })}
                className="flex-1 px-4 py-2 bg-accent-700 text-white rounded-lg hover:bg-accent-800 font-medium transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
              >
                Try Again
              </button>
              <button
                onClick={() => window.location.reload()}
                className="flex-1 px-4 py-2 bg-[var(--bg-surface)] text-[var(--text-secondary)] rounded-lg hover:bg-[var(--bg-card-hover)] font-medium transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
              >
                Refresh Page
              </button>
              <button
                onClick={() => (window.location.href = '/')}
                className="flex-1 px-4 py-2 bg-[var(--bg-surface)] text-[var(--text-secondary)] rounded-lg hover:bg-[var(--bg-card-hover)] font-medium transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
              >
                Go Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
