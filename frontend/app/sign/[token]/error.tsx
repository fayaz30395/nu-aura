'use client';

import {useEffect} from 'react';
import {Grid, Home, RefreshCw} from 'lucide-react';
import {Button} from '@/components/ui/Button';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/Card';
import {categorizeError, getUserMessage, handleError} from '@/lib/utils/error-handler';
import {isDevelopment} from '@/lib/config';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function TokenError({error, reset}: ErrorProps) {
  useEffect(() => {
    handleError(error, {source: '[token]-error-boundary', digest: error.digest});
  }, [error]);

  const category = categorizeError(error);
  const userMessage = getUserMessage(category, error.message);

  return (
    <div className="auth-shell fade-slide-up">
      <div className="auth-shell-grid auth-shell-narrow fade-slide-up stagger-children">
        <Card className="auth-shell-card fade-slide-up auth-delay-40 float-subtle page-reveal border border-[var(--border-subtle)]">
        <CardHeader className="text-center">
          <div
            className="mx-auto mb-4 h-12 w-12 rounded-full bg-danger-100/80 dark:bg-danger-900/30 flex items-center justify-center">
            <Grid className="h-6 w-6 text-danger-600 dark:text-danger-400"/>
          </div>
          <CardTitle className="text-xl font-semibold text-[var(--text-primary)]">
            App Error
          </CardTitle>
          <CardDescription className="text-[var(--text-secondary)]">
            {userMessage}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isDevelopment && (
            <div className="rounded-md bg-[var(--status-neutral-bg)] border border-[var(--border-subtle)] p-4">
              <p className="text-sm font-mono text-[var(--text-secondary)] break-all">
                {error.message}
              </p>
              {error.digest && (
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  Error ID: {error.digest}
                </p>
              )}
            </div>
          )}
          <div className="flex flex-col gap-2">
            <Button onClick={reset} className="w-full">
              <RefreshCw className="mr-2 h-4 w-4"/>
              Try Again
            </Button>
            <Button
              variant="outline"
              onClick={() => (window.location.href = '/sign')}
              className="w-full"
            >
              <Grid className="mr-2 h-4 w-4"/>
              Back to App
            </Button>
            <Button
              variant="outline"
              onClick={() => (window.location.href = '/me/dashboard')}
              className="w-full"
            >
              <Home className="mr-2 h-4 w-4"/>
              Go to Home
            </Button>
          </div>
        </CardContent>
        </Card>
      </div>
    </div>
  );
}
