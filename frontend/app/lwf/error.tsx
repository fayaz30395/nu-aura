'use client';

import {Button} from '@mantine/core';
import {IconAlertTriangle} from '@tabler/icons-react';
import {AppLayout} from '@/components/layout';

export default function LWFError({
                                   error,
                                   reset,
                                 }: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <AppLayout>
      <div className="page-shell-centered fade-slide-up">
        <div className="page-shell-card float-subtle w-full max-w-xl p-6 sm:p-8 mx-auto flex flex-col items-center text-center fade-slide-up">
          <div className="mb-3">
            <IconAlertTriangle size={48} color="var(--status-danger-text)"/>
          </div>
          <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
            Something went wrong
          </h2>
          <p className="text-body-muted mb-6">
            {error.message || 'Failed to load Labour Welfare Fund data.'}
          </p>
          <Button variant="outline" onClick={reset}>
            Try again
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}
