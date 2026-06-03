'use client';

import {useEffect} from 'react';
import {motion} from 'framer-motion';
import {Grid, Home, RefreshCw} from 'lucide-react';
import {Button} from '@/components/ui/Button';
import {categorizeError, getUserMessage, handleError} from '@/lib/utils/error-handler';
import {isDevelopment} from '@/lib/config';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function HelpdeskError({error, reset}: ErrorProps) {
  useEffect(() => {
    handleError(error, {source: 'helpdesk-error-boundary', digest: error.digest});
  }, [error]);

  const category = categorizeError(error);
  const userMessage = getUserMessage(category, error.message);

  return (
    <div className="flex items-center justify-center min-h-screen bg-[--bg-app] p-4">
      <motion.div
        initial={{opacity: 0, y: 20}}
        animate={{opacity: 1, y: 0}}
        transition={{duration: 0.25, ease: 'easeOut'}}
        className="w-full max-w-md"
      >
        <div className="bg-[--surface] border border-[--border-soft] rounded-[--r-lg] p-6 shadow-[--sh-md]">
          <div className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-[--err-bg] flex items-center justify-center">
              <Grid className="h-6 w-6 text-[--err-fg]"/>
            </div>
            <h2 className="text-aura-title text-[--text-1] mb-2">
              Something went wrong
            </h2>
            <p className="text-[--text-2] mb-6">
              {userMessage}
            </p>

            {isDevelopment && (
              <div className="rounded-[--r-md] bg-[--surface-sunken] p-4 mb-6 text-left">
                <p className="text-xs font-mono text-[--text-3] break-all">
                  {error.message}
                </p>
                {error.digest && (
                  <p className="text-[10px] text-[--text-3] mt-2">
                    Error ID: <span className="num">{error.digest}</span>
                  </p>
                )}
              </div>
            )}

            <div className="flex flex-col gap-2">
              <Button
                onClick={reset}
                className="w-full"
                size="md"
              >
                <RefreshCw className="mr-2 h-4 w-4"/>
                Try Again
              </Button>
              <Button
                variant="secondary"
                onClick={() => (window.location.href = '/helpdesk')}
                className="w-full"
                size="md"
              >
                <Grid className="mr-2 h-4 w-4"/>
                Back to App
              </Button>
              <Button
                variant="secondary"
                onClick={() => (window.location.href = '/me/dashboard')}
                className="w-full"
                size="md"
              >
                <Home className="mr-2 h-4 w-4"/>
                Go to Home
              </Button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
