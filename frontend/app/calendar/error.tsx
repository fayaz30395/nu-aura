'use client';

import {useEffect} from 'react';
import {Grid, Home, RefreshCw} from 'lucide-react';
import {Button} from '@/components/ui/Button';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/Card';
import {PageTransition, Reveal} from '@/components/motion';
import {categorizeError, getUserMessage, handleError} from '@/lib/utils/error-handler';
import {isDevelopment} from '@/lib/config';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function CalendarError({error, reset}: ErrorProps) {
  useEffect(() => {
    handleError(error, {source: 'calendar-error-boundary', digest: error.digest});
  }, [error]);

  const category = categorizeError(error);
  const userMessage = getUserMessage(category, error.message);

  return (
    <PageTransition>
      <div className="flex items-center justify-center min-h-[calc(100dvh-200px)] p-4">
        <Reveal>
          <Card className="w-full max-w-md shadow-[var(--sh-md)]">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 h-12 w-12 rounded-[var(--r-lg)] bg-[var(--err-bg)] flex items-center justify-center">
                <Grid className="h-6 w-6 text-[var(--err-fg)]"/>
              </div>
              <CardTitle className="text-aura-title text-[var(--text-1)]">
                Something went wrong
              </CardTitle>
              <CardDescription className="text-[var(--text-2)] mt-2">
                {userMessage}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isDevelopment && (
                <div className="rounded-[var(--r-control)] bg-[var(--surface-aura-2)] p-4 border border-[var(--border-soft)]">
                  <p className="text-sm font-mono text-[var(--text-2)] break-all">
                    {error.message}
                  </p>
                  {error.digest && (
                    <p className="text-xs text-[var(--text-3)] mt-2">
                      Error ID: <span className="font-mono">{error.digest}</span>
                    </p>
                  )}
                </div>
              )}
              <div className="flex flex-col gap-2 pt-2">
                <Button
                  onClick={reset}
                  className="w-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2"
                >
                  <RefreshCw className="mr-2 h-4 w-4"/>
                  Try Again
                </Button>
                <Button
                  variant="outline"
                  onClick={() => (window.location.href = '/calendar')}
                  className="w-full focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2"
                  aria-label="Back to calendar"
                >
                  <Grid className="mr-2 h-4 w-4"/>
                  Back to Calendar
                </Button>
                <Button
                  variant="outline"
                  onClick={() => (window.location.href = '/dashboard')}
                  className="w-full focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2"
                  aria-label="Go to dashboard"
                >
                  <Home className="mr-2 h-4 w-4"/>
                  Go to Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        </Reveal>
      </div>
    </PageTransition>
  );
}
