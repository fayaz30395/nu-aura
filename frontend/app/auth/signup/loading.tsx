'use client';

import {Skeleton} from '@mantine/core';

export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-50 dark:bg-surface-950 p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo skeleton */}
        <div className="flex justify-center">
          <Skeleton height={48} width={48} radius="xl"/>
        </div>
        <div className="text-center space-y-2">
          <Skeleton height={24} width="60%" className="mx-auto"/>
          <Skeleton height={16} width="80%" className="mx-auto"/>
        </div>

        {/* Form card skeleton */}
        <div className="bg-[var(--bg-card)] rounded-lg border border-surface-200 dark:border-surface-800 p-6 space-y-4">
          {Array.from({length: 3}).map((_, index) => (
            <div key={index} className="space-y-2">
              <Skeleton height={14} width="25%"/>
              <Skeleton height={40}/>
            </div>
          ))}
          <Skeleton height={44}/>
          <Skeleton height={16} width="50%" className="mx-auto"/>
        </div>
      </div>
    </div>
  );
}
