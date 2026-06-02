'use client';

import {AppLayout} from '@/components/layout';
import {PageErrorFallback} from '@/components/errors/PageErrorFallback';

export default function AgenciesError({
                                        error,
                                        reset,
                                      }: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <AppLayout>
      <div className="page-shell-centered fade-slide-up auth-delay-20">
        <PageErrorFallback title="Agencies Error" error={error} onReset={reset}/>
      </div>
    </AppLayout>
  );
}
