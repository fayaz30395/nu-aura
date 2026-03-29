'use client';

import { PageErrorFallback } from '@/components/errors/PageErrorFallback';

export default function OneOnOneError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <PageErrorFallback
      title="Failed to load 1-on-1 Meetings"
      error={error}
      onReset={reset}
    />
  );
}
