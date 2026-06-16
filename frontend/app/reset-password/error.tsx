'use client';

import {useEffect} from 'react';
import {motion} from 'framer-motion';
import {Home, KeyRound, RefreshCw} from 'lucide-react';
import {Button} from '@/components/ui/Button';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/Card';
import {categorizeError, getUserMessage, handleError} from '@/lib/utils/error-handler';
import {isDevelopment} from '@/lib/config';

interface ErrorProps {error: Error & {digest?: string}; reset: () => void}

export default function ResetPasswordError({error, reset}: ErrorProps) {
  useEffect(() => {
    handleError(error, {source: 'reset-password-error-boundary', digest: error.digest});
  }, [error]);

  const category = categorizeError(error);
  const userMessage = getUserMessage(category, error.message);

  return (
    <div className="page-shell-centered fade-slide-up min-h-screen flex items-center justify-center">
      <motion.div initial={{opacity: 0, y: 20}} animate={{opacity: 1, y: 0}} transition={{duration: 0.25, ease: 'easeOut'}}>
        <Card className="page-shell-card float-subtle w-full max-w-sm">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-danger-100 dark:bg-danger-900/30 flex items-center justify-center">
              <KeyRound className="h-6 w-6 text-danger-600 dark:text-danger-400"/>
            </div>
            <CardTitle className="text-xl font-semibold">Password Reset Failed</CardTitle>
            <CardDescription>{userMessage}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isDevelopment && (
              <div className="rounded-md bg-surface-100 dark:bg-surface-800 p-4">
                <p className="text-sm font-mono text-surface-700 dark:text-surface-300 break-all">{error.message}</p>
              </div>
            )}
            <div className="flex flex-col gap-2">
              <Button onClick={reset} className="w-full"><RefreshCw className="mr-2 h-4 w-4"/>Try Again</Button>
              <Button variant="outline" onClick={() => (window.location.href = '/sign/in')} className="w-full">
                <Home className="mr-2 h-4 w-4"/>Back to Sign In
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
