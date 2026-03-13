'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, RefreshCw, Home as HomeIcon } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { handleError, getUserMessage, categorizeError } from '@/lib/utils/error-handler';
import { isDevelopment } from '@/lib/config';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function HomeError({ error, reset }: ErrorProps) {
  useEffect(() => {
    handleError(error, { source: 'home-error-boundary', digest: error.digest });
  }, [error]);

  const category = categorizeError(error);
  const userMessage = getUserMessage(category, error.message);

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-50 dark:bg-surface-950 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
      >
        <Card className="w-full max-w-md bg-white dark:bg-surface-900">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <HomeIcon className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
            <CardTitle className="text-xl font-semibold text-surface-900 dark:text-surface-50">
              Home Error
            </CardTitle>
            <CardDescription className="text-surface-600 dark:text-surface-400">
              {userMessage}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isDevelopment && (
              <div className="rounded-md bg-surface-100 dark:bg-surface-800 p-3">
                <p className="text-sm font-mono text-surface-700 dark:text-surface-300 break-all">
                  {error.message}
                </p>
                {error.digest && (
                  <p className="text-xs text-surface-500 dark:text-surface-400 mt-1">
                    Error ID: {error.digest}
                  </p>
                )}
              </div>
            )}
            <div className="flex flex-col gap-2">
              <Button onClick={reset} className="w-full">
                <RefreshCw className="mr-2 h-4 w-4" />
                Try Again
              </Button>
              <Button
                variant="outline"
                onClick={() => (window.location.href = '/me/dashboard')}
                className="w-full"
              >
                <HomeIcon className="mr-2 h-4 w-4" />
                Back to Home
              </Button>
              <Button
                variant="outline"
                onClick={() => window.location.reload()}
                className="w-full"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Reload Page
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
