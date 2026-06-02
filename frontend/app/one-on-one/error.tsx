'use client';

import {PageErrorFallback} from '@/components/errors/PageErrorFallback';
import {AppLayout} from '@/components/layout';

export default function OneOnOneError({
                                        error,
                                        reset,
                                      }: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <AppLayout>
      <div className="page-shell-centered fade-slide-up auth-delay-20">
        <PageErrorFallback
          title="Failed to load 1-on-1 Meetings"
          error={error}
          onReset={reset}
        />
      </div>
    </AppLayout>
  );
}
