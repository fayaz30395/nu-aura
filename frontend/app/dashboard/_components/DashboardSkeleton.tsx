'use client';

import {AppLayout} from '@/components/layout';
import {Skeleton} from '@/components/ui/Skeleton';
import {SkeletonChart} from '@/components/ui/Loading';

/**
 * Operator dashboard loading skeleton — the early-return placeholder shown while the
 * page hydrates / analytics loads. Pure static JSX extracted verbatim from `page.tsx`
 * (no props, no behaviour change).
 */
export function DashboardSkeleton() {
  return (
    <AppLayout activeMenuItem="dashboard" showBreadcrumbs={false}>
      <div className="mx-auto w-full max-w-7xl px-6 py-8 space-y-10">
        {/* Header skeleton */}
        <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
          <div className="space-y-2 max-w-2xl">
            <Skeleton className="h-3 w-32 rounded-aura-xs"/>
            <Skeleton className="h-9 w-3/4 rounded-aura-sm"/>
            <Skeleton className="h-4 w-1/2 rounded-aura-xs"/>
          </div>
          <Skeleton className="h-10 w-32 rounded-aura-sm self-start sm:self-end"/>
        </div>

        {/* Stats skeleton — borderly, no cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 border-y border-[var(--border-subtle)] divide-y sm:divide-y-0 sm:divide-x divide-[var(--border-subtle)]">
          {Array.from({length: 4}).map((_, i) => (
            <div key={i} className="px-5 py-6 sm:px-7 sm:py-8 first:pl-0 last:pr-0">
              <Skeleton className="h-3 w-24 rounded-aura-xs"/>
              <Skeleton className="mt-3 h-9 w-20 rounded-aura-xs"/>
            </div>
          ))}
        </div>

        <SkeletonChart height="h-80"/>
      </div>
    </AppLayout>
  );
}

DashboardSkeleton.displayName = 'DashboardSkeleton';
