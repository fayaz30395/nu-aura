'use client';

import { Skeleton } from '@mantine/core';

export default function PsaLoading() {
  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      {/* Header skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-4">
        <div className="space-y-2">
          <Skeleton height={24} width="50%" />
          <Skeleton height={16} width="40%" />
        </div>
        <Skeleton height={36} width={130} />
      </div>

      {/* Stat cards skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="bg-[var(--bg-card)] rounded-2xl border border-surface-200 dark:border-surface-800 p-4 sm:p-6"
          >
            <Skeleton height={16} width="60%" className="mb-3" />
            <Skeleton height={32} width="80%" className="mb-3" />
            <Skeleton height={14} width="50%" />
          </div>
        ))}
      </div>

      {/* Filters skeleton */}
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
        <Skeleton height={40} width={160} />
        <Skeleton height={40} width={160} />
        <Skeleton height={40} className="flex-1" />
      </div>

      {/* Table skeleton */}
      <div className="bg-[var(--bg-card)] rounded-2xl border border-surface-200 dark:border-surface-800 overflow-hidden">
        <div className="border-b border-surface-200 dark:border-surface-800">
          <Skeleton height={44} />
        </div>
        <div className="space-y-2 p-4 sm:p-4">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} height={52} />
          ))}
        </div>
      </div>
    </div>
  );
}
