'use client';

import { Skeleton } from '@mantine/core';

export default function AuthLoading() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-surface-50 dark:bg-surface-900 p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo/Brand skeleton */}
        <div className="flex justify-center mb-6">
          <Skeleton height={40} width={200} />
        </div>

        {/* Card container skeleton */}
        <div className="bg-white dark:bg-surface-800 rounded-2xl border border-surface-200 dark:border-surface-700 p-6 sm:p-8 space-y-4">
          {/* Title skeleton */}
          <Skeleton height={28} width="70%" />
          <Skeleton height={16} width="90%" />

          {/* Form fields */}
          <div className="space-y-4 pt-4">
            <Skeleton height={40} />
            <Skeleton height={40} />
            <Skeleton height={40} />
          </div>

          {/* Button skeleton */}
          <Skeleton height={44} className="pt-2" />

          {/* Divider and additional options */}
          <div className="flex items-center gap-2 py-4">
            <Skeleton height={1} className="flex-1" />
            <Skeleton height={14} width="30%" />
            <Skeleton height={1} className="flex-1" />
          </div>

          {/* Social login buttons */}
          <div className="space-y-2">
            <Skeleton height={40} />
            <Skeleton height={40} />
          </div>

          {/* Footer link skeleton */}
          <div className="flex justify-center gap-2 pt-4">
            <Skeleton height={14} width="40%" />
            <Skeleton height={14} width="20%" />
          </div>
        </div>
      </div>
    </div>
  );
}
