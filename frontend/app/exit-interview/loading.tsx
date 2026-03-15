'use client';

import { Skeleton } from '@mantine/core';

export default function ExitInterviewLoading() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-surface-50 dark:bg-surface-900 p-4">
      <div className="w-full max-w-2xl space-y-6">
        {/* Header skeleton */}
        <div className="text-center space-y-2 mb-8">
          <Skeleton height={28} width="60%" className="mx-auto" />
          <Skeleton height={16} width="70%" className="mx-auto" />
        </div>

        {/* Card container skeleton */}
        <div className="bg-[var(--bg-input)] rounded-2xl border border-surface-200 dark:border-surface-700 p-6 sm:p-8">
          {/* Progress indicator skeleton */}
          <div className="flex items-center justify-between mb-8">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="flex flex-col items-center flex-1">
                <Skeleton height={40} width={40} circle className="mb-2" />
                <Skeleton height={12} width="70%" />
              </div>
            ))}
          </div>

          {/* Form content skeleton */}
          <div className="space-y-6">
            {/* Section title */}
            <div className="space-y-4">
              <Skeleton height={20} width="50%" />
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div key={index}>
                    <Skeleton height={14} width="40%" className="mb-2" />
                    <Skeleton height={40} />
                  </div>
                ))}
              </div>
            </div>

            {/* Text area skeleton */}
            <div className="space-y-2">
              <Skeleton height={14} width="30%" />
              <Skeleton height={100} />
            </div>

            {/* Buttons skeleton */}
            <div className="flex gap-3 pt-4">
              <Skeleton height={44} width={120} />
              <Skeleton height={44} width={120} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
