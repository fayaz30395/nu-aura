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

      {/* Feed skeleton */}
      <div className="space-y-4">
        {Array.from({length: 5}).map((_, index) => (
          <div key={index} className="bg-[var(--bg-card)] rounded-lg p-4 space-y-2">
            <div className="flex items-center gap-2">
              <Skeleton height={32} width={32} radius="xl"/>
              <div className="flex-1 space-y-1">
                <Skeleton height={14} width="30%"/>
                <Skeleton height={12} width="20%"/>
              </div>
            </div>
            <Skeleton height={14} width="100%"/>
            <Skeleton height={14} width="85%"/>
          </div>
        ))}
      </div>
    </div>
  );
}
