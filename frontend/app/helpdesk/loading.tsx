'use client';

import {Skeleton} from '@mantine/core';
import {PageTransition} from '@/components/motion';

export default function HelpdeskLoading() {
  return (
    <PageTransition>
      <div className="p-4 sm:p-6 space-y-6">
        {/* Header skeleton */}
        <div className="space-y-2">
          <Skeleton height={28} width="50%" />
          <Skeleton height={16} width="40%" />
        </div>

        {/* Stat cards skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({length: 4}).map((_, index) => (
            <Skeleton key={index} height={88} className="rounded-[--r-lg]" />
          ))}
        </div>

        {/* Section skeleton */}
        <div className="bg-[--surface] rounded-[--r-lg] p-4 border border-[--border-soft]">
          <Skeleton height={20} width="30%" className="mb-4" />
          <div className="space-y-2">
            {Array.from({length: 3}).map((_, index) => (
              <Skeleton key={index} height={40} />
            ))}
          </div>
        </div>

        {/* Quick actions skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({length: 5}).map((_, index) => (
            <Skeleton key={index} height={80} className="rounded-[--r-lg]" />
          ))}
        </div>
      </div>
    </PageTransition>
  );
}
