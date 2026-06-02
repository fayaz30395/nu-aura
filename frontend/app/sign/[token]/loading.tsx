'use client';

import {Skeleton} from '@mantine/core';

export default function Loading() {
  return (
    <div className="page-shell-centered auth-loading-shell fade-slide-up">
      <div className="auth-loading-card w-full max-w-2xl fade-slide-up auth-delay-20 float-subtle">
      {/* Header skeleton */}
      <div className="space-y-2">
        <Skeleton height={24} width="40%"/>
        <Skeleton height={16} width="60%"/>
      </div>

      {/* Form card skeleton */}
      <div
        className="bg-[var(--bg-card)] rounded-lg border border-surface-200 dark:border-surface-800 p-4 sm:p-6 space-y-6">
        {/* Form fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Array.from({length: 6}).map((_, index) => (
            <div key={index} className="space-y-2">
              <Skeleton height={14} width="30%"/>
              <Skeleton height={40}/>
            </div>
          ))}
        </div>

        {/* Textarea field */}
        <div className="space-y-2">
          <Skeleton height={14} width="20%"/>
          <Skeleton height={100}/>
        </div>

        {/* Action buttons */}
        <div className="flex justify-end gap-4">
          <Skeleton height={40} width={100}/>
          <Skeleton height={40} width={120}/>
        </div>
      </div>
      </div>
    </div>
  );
}
