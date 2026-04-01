'use client';

import { useEffect } from 'react';
import { createLogger } from '@/lib/utils/logger';

const log = createLogger('GlobalError');

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * Global error handler for root-level failures
 *
 * This component is rendered when an error occurs in the root layout or a component
 * that breaks the entire application. It must NOT depend on providers that may have failed.
 *
 * IMPORTANT: This must use inline styles only, no Mantine or external CSS dependencies,
 * as the root layout (and its providers) may have crashed.
 */
export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    // Log critical error to console and any external error tracking
    log.error('[CRITICAL GlobalError]', {
      message: error.message,
      digest: error.digest,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    });

    // In production, this should also send to error tracking service (Sentry, etc.)
    // Example: captureException(error);
  }, [error]);

  const isDevelopment = process.env.NODE_ENV === 'development';

  const styles = {
    container: {
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'var(--bg-main)',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      padding: '1rem',
    },
    card: {
      maxWidth: '28rem',
      width: '100%',
      backgroundColor: 'white',
      borderRadius: '0.75rem',
      boxShadow: '0 10px 25px rgba(0, 0, 0, 0.08)',
      padding: '2.5rem 2rem',
      textAlign: 'center' as const,
    },
    iconWrapper: {
      width: '3.5rem',
      height: '3.5rem',
      backgroundColor: '#fee2e2',
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      margin: '0 auto 1.5rem',
    },
    title: {
      fontSize: '1.5rem',
      fontWeight: '700',
      color: '#050766',
      margin: '0 0 0.5rem',
    },
    description: {
      color: '#3E616A',
      margin: '0 0 1.5rem',
      lineHeight: '1.6',
    },
    errorBox: {
      backgroundColor: '#fef2f2',
      border: '1px solid #fecaca',
      padding: '1rem',
      borderRadius: '0.5rem',
      marginBottom: '1.5rem',
      textAlign: 'left' as const,
    },
    errorText: {
      fontSize: '0.875rem',
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
      color: '#991b1b',
      wordBreak: 'break-all' as const,
      margin: 0,
    },
    errorStack: {
      fontSize: '0.75rem',
      color: '#7f1d1d',
      marginTop: '0.5rem',
      maxHeight: '150px',
      overflow: 'auto' as const,
      whiteSpace: 'pre-wrap' as const,
    },
    buttonGroup: {
      display: 'flex',
      gap: '0.75rem',
      flexDirection: 'column' as const,
    },
    button: {
      width: '100%',
      padding: '0.75rem 1rem',
      backgroundColor: 'var(--accent-primary)',
      color: 'white',
      border: 'none',
      borderRadius: '0.5rem',
      fontSize: '0.875rem',
      fontWeight: '500',
      cursor: 'pointer',
      transition: 'background-color 0.2s',
    },
    secondaryButton: {
      width: '100%',
      padding: '0.75rem 1rem',
      backgroundColor: '#d4d4f7',
      color: '#050766',
      border: 'none',
      borderRadius: '0.5rem',
      fontSize: '0.875rem',
      fontWeight: '500',
      cursor: 'pointer',
      transition: 'background-color 0.2s',
    },
  };

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Application Error</title>
      </head>
      <body style={{ margin: 0, padding: 0 }}>
        <div style={styles.container}>
          <div style={styles.card}>
            <div style={styles.iconWrapper}>
              <svg
                style={{ width: '1.75rem', height: '1.75rem' }}
                fill="none"
                viewBox="0 0 24 24"
                stroke="#dc2626"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>

            <h1 style={styles.title}>Critical Application Error</h1>
            <p style={styles.description}>
              A critical error occurred in the application core. Please try refreshing the page or contact support if the problem persists.
            </p>

            {isDevelopment && (
              <div style={styles.errorBox}>
                <p style={styles.errorText}>
                  <strong>Error:</strong> {error.message}
                </p>
                {error.stack && (
                  <p style={styles.errorStack}>{error.stack}</p>
                )}
                {error.digest && (
                  <p style={{ ...styles.errorText, marginTop: '0.5rem' }}>
                    <strong>Digest:</strong> {error.digest}
                  </p>
                )}
              </div>
            )}

            {!isDevelopment && error.digest && (
              <div
                style={{
                  backgroundColor: '#F4F5F6',
                  padding: '0.75rem',
                  borderRadius: '0.375rem',
                  marginBottom: '1.5rem',
                  textAlign: 'center' as const,
                }}
              >
                <p
                  style={{
                    fontSize: '0.75rem',
                    color: '#3E616A',
                    margin: '0 0 0.25rem',
                  }}
                >
                  Error Reference
                </p>
                <p
                  style={{
                    fontSize: '0.875rem',
                    fontFamily: 'monospace',
                    color: '#050766',
                    margin: 0,
                  }}
                >
                  {error.digest}
                </p>
              </div>
            )}

            <div style={styles.buttonGroup}>
              <button
                onClick={reset}
                style={styles.button}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--accent-primary-hover)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--accent-primary)';
                }}
              >
                Try Again
              </button>
              <button
                onClick={() => {
                  window.location.href = '/me/dashboard';
                }}
                style={styles.secondaryButton}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = '#d4d4f7';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = '#d4d4f7';
                }}
              >
                Go Home
              </button>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
