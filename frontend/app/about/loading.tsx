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

      {/* Content sections */}
      <div className="space-y-4">
        {Array.from({length: 3}).map((_, index) => (
          <div key={index} className="space-y-2">
            <Skeleton height={20} width="40%"/>
            <Skeleton height={16} width="100%"/>
            <Skeleton height={16} width="95%"/>
          </div>
        ))}
      </div>
    </div>
  );
}
