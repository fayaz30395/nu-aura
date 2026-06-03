'use client';

import {useEffect} from 'react';
import {motion} from 'framer-motion';
import {BarChart3, Home, RefreshCw} from 'lucide-react';
import {Button} from '@/components/ui/Button';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/Card';
import {categorizeError, getUserMessage, handleError} from '@/lib/utils/error-handler';
import {isDevelopment} from '@/lib/config';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ReportsError({error, reset}: ErrorProps) {
  useEffect(() => {
    handleError(error, {source: 'reports-error-boundary', digest: error.digest});
  }, [error]);

  const category = categorizeError(error);
  const userMessage = getUserMessage(category, error.message);

  return (
    <div className="page-shell-centered fade-slide-up">
      <motion.div
        initial={{opacity: 0, y: 20}}
        animate={{opacity: 1, y: 0}}
        transition={{duration: 0.25, ease: 'easeOut'}}
      >
        <Card className="page-shell-card float-subtle fade-slide-up">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full border border-[var(--err-bd)] bg-[var(--err-bg)]">
              <BarChart3 className="h-6 w-6 text-[var(--err-fg)]" aria-hidden="true"/>
            </div>
            <CardTitle className="text-aura-title text-[var(--text-1)]">
              Reports unavailable
            </CardTitle>
            <CardDescription className="text-[var(--text-2)]">
              {userMessage}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isDevelopment && (
              <div className="rounded-[var(--r-md)] border border-[var(--border-soft)] bg-[var(--surface-sunken)] p-4">
                <p className="num break-all text-sm text-[var(--text-2)]">
                  {error.message}
                </p>
                {error.digest && (
                  <p className="num mt-1 text-xs text-[var(--text-3)]">
                    Error ID: {error.digest}
                  </p>
                )}
              </div>
            )}
            <div className="flex flex-col gap-2">
              <Button onClick={reset} className="w-full" leftIcon={<RefreshCw className="h-4 w-4" aria-hidden="true"/>}>
                Try again
              </Button>
              <Button
                variant="outline"
                onClick={() => (window.location.href = '/me/dashboard')}
                className="w-full"
                leftIcon={<Home className="h-4 w-4" aria-hidden="true"/>}
              >
                Go to dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
