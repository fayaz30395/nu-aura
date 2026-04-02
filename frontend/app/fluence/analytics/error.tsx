'use client';

import { useRouter } from 'next/navigation';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { typography, iconSize } from '@/lib/design-system';

export default function AnalyticsError({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  const router = useRouter();

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 px-4">
      <div className="p-4 bg-danger-100 dark:bg-danger-900/30 rounded-lg">
        <AlertCircle className={`${iconSize.pageHeader} text-danger-600 dark:text-danger-300`} />
      </div>

      <div className="text-center max-w-md">
        <h1 className={`${typography.sectionTitle} mb-2`}>Failed to load analytics</h1>
        <p className={typography.bodySecondary}>
          {error.message || 'An unexpected error occurred while loading the analytics dashboard.'}
        </p>
      </div>

      <div className="flex gap-4">
        <Button onClick={reset} className="gap-2">
          Try again
        </Button>
        <Button
          onClick={() => router.push('/fluence/dashboard')}
          variant="outline"
          className="gap-2"
        >
          Go to Dashboard
        </Button>
      </div>
    </div>
  );
}
