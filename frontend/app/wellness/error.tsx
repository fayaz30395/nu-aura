'use client';

import {useEffect} from 'react';
import {motion} from 'framer-motion';
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

export default function WellnessError({error, reset}: ErrorProps) {
  useEffect(() => {
    handleError(error, {source: 'wellness-error-boundary', digest: error.digest});
  }, [error]);

  const category = categorizeError(error);
  const userMessage = getUserMessage(category, error.message);

  return (
    <PageTransition>
      <div className="flex items-center justify-center min-h-screen p-4">
        <Reveal>
          <motion.div
            initial={{opacity: 0, y: 20}}
            animate={{opacity: 1, y: 0}}
            transition={{duration: 0.3}}
          >
            <Card className="max-w-md w-full border-[var(--border-soft)]">
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-[var(--err-bg)] flex items-center justify-center">
                  <Grid className="h-6 w-6 text-[var(--err-fg)]"/>
                </div>
                <CardTitle className="text-aura-title text-[var(--text-1)]">
                  Wellness Error
                </CardTitle>
                <CardDescription className="text-[var(--text-2)] mt-1">
                  {userMessage}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {isDevelopment && (
                  <div className="rounded-[var(--r-md)] bg-[var(--surface)] p-3 border border-[var(--border-soft)]">
                    <p className="text-xs font-mono text-[var(--text-2)] break-all">
                      {error.message}
                    </p>
                    {error.digest && (
                      <p className="text-xs text-[var(--text-3)] mt-2">
                        Error ID: {error.digest}
                      </p>
                    )}
                  </div>
                )}
                <div className="flex flex-col gap-2">
                  <Button onClick={reset} className="w-full focus-visible hover-lift">
                    <RefreshCw className="mr-2 h-4 w-4"/>
                    Try Again
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => (window.location.href = '/wellness')}
                    className="w-full focus-visible"
                  >
                    <Grid className="mr-2 h-4 w-4"/>
                    Back to Wellness
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => (window.location.href = '/me/dashboard')}
                    className="w-full focus-visible"
                  >
                    <Home className="mr-2 h-4 w-4"/>
                    Go to Home
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </Reveal>
      </div>
    </PageTransition>
  );
}
