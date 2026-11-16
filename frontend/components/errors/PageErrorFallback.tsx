'use client';

import {useEffect} from 'react';
import Link from 'next/link';
import {Button} from '@mantine/core';
import {AlertTriangle, Home, RefreshCw} from 'lucide-react';
import {handleError} from '@/lib/utils/error-handler';

/** Heading text asserted by e2e specs — do not change. */
export const PAGE_ERROR_TITLE = 'Something went wrong';
const PAGE_ERROR_DESCRIPTION =
  'This page ran into an unexpected problem. Try again, or head back to your dashboard.';
const HOME_HREF = '/me/dashboard';

/** Props Next.js passes to every `error.tsx` route boundary. */
export interface RouteErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

interface PageErrorFallbackProps {
  error?: (Error & { digest?: string }) | null;
  title?: string;
  /** User-safe copy. Raw error messages are never rendered. */
  description?: string;
  onReset?: () => void;
  /** Tag forwarded to the error tracker to identify the boundary. */
  source?: string;
}

/**
 * Shared body for route `error.tsx` boundaries and page-level fallbacks.
 * Renders inside the persistent shell; logs via the dev-gated error handler.
 */
export function PageErrorFallback({
  error,
  title = PAGE_ERROR_TITLE,
  description = PAGE_ERROR_DESCRIPTION,
  onReset,
  source = 'page-error-boundary',
}: PageErrorFallbackProps) {
  useEffect(() => {
    if (error) handleError(error, {source, digest: error.digest});
  }, [error, source]);

  return (
    <div
      role="alert"
      className="mx-auto flex w-full max-w-xl flex-col items-center px-4 py-16 text-center"
    >
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-[var(--err-bg)]">
        <AlertTriangle className="h-5 w-5 text-[var(--err-fg)]" aria-hidden="true" />
      </div>
      <h1 className="mb-2 text-xl font-semibold text-[var(--text-1)]">{title}</h1>
      <p className="mb-6 max-w-md text-sm text-[var(--text-2)]">{description}</p>
      {error?.digest && (
        <p className="-mt-4 mb-6 text-xs text-[var(--text-3)]">
          Reference: <span className="num">{error.digest}</span>
        </p>
      )}
      <div className="flex flex-wrap justify-center gap-2">
        {onReset && (
          <Button onClick={onReset} leftSection={<RefreshCw className="h-4 w-4" aria-hidden="true" />}>
            Retry
          </Button>
        )}
        <Button
          component={Link}
          href={HOME_HREF}
          variant="default"
          leftSection={<Home className="h-4 w-4" aria-hidden="true" />}
        >
          Go to dashboard
        </Button>
      </div>
    </div>
  );
}

/** Drop-in body for `app/**\/error.tsx` files. */
export function RouteErrorFallback({error, reset, source}: RouteErrorProps & { source?: string }) {
  return <PageErrorFallback error={error} onReset={reset} source={source} />;
}
