'use client';

import { Skeleton } from '@/components/ui/Skeleton';

export default function Loading() {
  return (
    <div className="min-h-screen bg-surface-50 dark:bg-surface-950">
      {/* Header skeleton */}
      <div className="h-16 bg-white dark:bg-surface-900 border-b border-gray-200 dark:border-surface-800">
        <div className="flex items-center h-full px-6 gap-4">
          <Skeleton className="h-8 w-8 rounded-lg" />
          <Skeleton className="h-4 w-32" />
          <div className="flex-1" />
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
      </div>

      {/* Main content skeleton */}
      <div className="p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Page title */}
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-64" />
            </div>
            <Skeleton className="h-10 w-32 rounded-lg" />
          </div>

          {/* Cards grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="bg-white dark:bg-surface-900 rounded-xl border border-gray-200 dark:border-surface-800 p-5"
              >
                <Skeleton className="h-4 w-24 mb-3" />
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-3 w-20" />
              </div>
            ))}
          </div>

          {/* Table skeleton */}
          <div className="bg-white dark:bg-surface-900 rounded-xl border border-gray-200 dark:border-surface-800">
            <div className="p-4 border-b border-gray-200 dark:border-surface-800">
              <Skeleton className="h-6 w-32" />
            </div>
            <div className="p-4 space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-3 w-1/4" />
                  </div>
                  <Skeleton className="h-6 w-20 rounded-full" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
