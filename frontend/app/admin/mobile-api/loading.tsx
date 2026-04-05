'use client';

import {Skeleton} from '@mantine/core';

export default function Loading() {
  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header skeleton */}
      <div className="space-y-2">
        <Skeleton height={32} width="50%"/>
        <Skeleton height={16} width="70%"/>
      </div>

      {/* API settings skeleton */}
      <div className="space-y-4">
        {Array.from({length: 5}).map((_, index) => (
          <div key={index} className="bg-[var(--bg-card)] rounded-lg p-4 space-y-2">
            <Skeleton height={18} width="30%"/>
            <Skeleton height={14} width="80%"/>
            <Skeleton height={36} width="100%" className="rounded-lg mt-2"/>
          </div>
        ))}
      </div>
    </div>
  );
}
