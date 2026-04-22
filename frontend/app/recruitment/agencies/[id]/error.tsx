'use client';

import {AppLayout} from '@/components/layout';
import {PageErrorFallback} from '@/components/errors/PageErrorFallback';

export default function AgencyDetailError({
                                            error,
                                            reset,
                                          }: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <AppLayout>
      <PageErrorFallback title="Agency Detail Error" error={error} onReset={reset}/>
    </AppLayout>
  );
}
