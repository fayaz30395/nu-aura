'use client';

import {useEffect} from 'react';
import {motion} from 'framer-motion';
import {MOTION_EASE} from '@/lib/animation';
import {AlertCircle, Home, RefreshCw} from 'lucide-react';
import {Button} from '@/components/ui/Button';
import {Card} from '@/components/ui/Card';
import {categorizeError, getUserMessage, handleError} from '@/lib/utils/error-handler';
import {isDevelopment} from '@/lib/config';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function LeaveError({error, reset}: ErrorProps) {
  useEffect(() => {
    handleError(error, {source: 'leave-error-boundary', digest: error.digest});
  }, [error]);

  const category = categorizeError(error);
  const userMessage = getUserMessage(category, error.message);

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-8">
      <motion.div
        initial={{opacity: 0, y: 8}}
        animate={{opacity: 1, y: 0}}
        transition={{duration: 0.4, ease: MOTION_EASE.outExpo}}
        className="w-full max-w-md"
      >
        <Card className="p-6">
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="p-2 rounded-lg bg-[color-mix(in_srgb,var(--err-fg)_12%,transparent)] text-[var(--err-fg)] flex items-center justify-center">
                <AlertCircle className="h-6 w-6" aria-hidden="true" />
              </div>
            </div>
            <div className="space-y-1">
              <h1 className="text-aura-title text-[var(--text-1)]">
                Oops!
              </h1>
              <p className="text-[var(--text-3)] text-sm">
                {userMessage}
              </p>
            </div>

            {isDevelopment && (
              <div className="rounded-md bg-[color-mix(in_srgb,var(--surface)_50%,transparent)] p-4 text-left">
                <p className="text-xs font-mono text-[var(--text-2)] break-all leading-relaxed">
                  {error.message}
                </p>
                {error.digest && (
                  <p className="text-xs text-[var(--text-3)] mt-2">
                    ID: <span className="num">{error.digest}</span>
                  </p>
                )}
              </div>
            )}

            <div className="flex flex-col gap-2 pt-4">
              <Button
                onClick={reset}
                variant="primary"
                leftIcon={<RefreshCw className="h-4 w-4" />}
                className="w-full"
              >
                Try Again
              </Button>
              <Button
                onClick={() => (window.location.href = '/leave')}
                variant="secondary"
                leftIcon={<AlertCircle className="h-4 w-4" />}
                className="w-full"
              >
                Back to Leaves
              </Button>
              <Button
                onClick={() => (window.location.href = '/me/dashboard')}
                variant="secondary"
                leftIcon={<Home className="h-4 w-4" />}
                className="w-full"
              >
                Go Home
              </Button>
            </div>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
