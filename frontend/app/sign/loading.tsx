'use client';

import { Skeleton } from '@mantine/core';

export default function SignLoading() {
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
          {/* Document preview skeleton */}
          <div className="mb-6 space-y-4">
            <Skeleton height={20} width="40%" />
            <div className="border-2 border-dashed border-surface-200 dark:border-surface-700 rounded-lg p-8">
              <Skeleton height={400} />
            </div>
          </div>

          {/* Signature section */}
          <div className="space-y-4 pt-6 border-t border-surface-200 dark:border-surface-700">
            <Skeleton height={16} width="30%" />
            <div className="border border-surface-300 dark:border-surface-600 rounded-lg p-4 h-40 flex items-center justify-center">
              <Skeleton height={60} width={200} />
            </div>
          </div>

          {/* Acknowledgement checkbox */}
          <div className="flex gap-3 py-6">
            <Skeleton height={20} width={20} />
            <Skeleton height={16} width="80%" />
          </div>

          {/* Action buttons */}
          <div className="flex gap-3">
            <Skeleton height={44} className="flex-1" />
            <Skeleton height={44} className="flex-1" />
          </div>
        </div>
      </div>
    </div>
  );
}
