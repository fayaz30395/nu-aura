'use client';

import React from 'react';
import {Bone, HeaderBones, SkeletonRegion} from './SkeletonRegion';

/** Props for {@link ListPageSkeleton}. */
export interface ListPageSkeletonProps {
  rows?: number;
  columns?: number;
  showHeader?: boolean;
  showFilters?: boolean;
  className?: string;
}

/** Route/content skeleton for list pages: header, filter bar, table rows. */
export function ListPageSkeleton({
  rows = 8,
  columns = 5,
  showHeader = true,
  showFilters = true,
  className,
}: ListPageSkeletonProps) {
  return (
    <SkeletonRegion className={className}>
      <div className="flex flex-col gap-6">
        {showHeader && <HeaderBones />}
        {showFilters && (
          <div className="flex flex-wrap items-center gap-2">
            <Bone height={36} width={240} radius="md" />
            <Bone height={36} width={140} radius="md" />
            <Bone height={36} width={140} radius="md" />
          </div>
        )}
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <div className="flex gap-4 border-b border-border px-4 py-3">
            {Array.from({length: columns}).map((_, i) => (
              <Bone key={i} height={12} className="flex-1" radius="sm" />
            ))}
          </div>
          {Array.from({length: rows}).map((_, r) => (
            <div key={r} className="flex h-11 items-center gap-4 border-b border-border px-4 last:border-b-0">
              {Array.from({length: columns}).map((_, c) => (
                <Bone key={c} height={12} className="flex-1" radius="sm" />
              ))}
            </div>
          ))}
        </div>
      </div>
    </SkeletonRegion>
  );
}
