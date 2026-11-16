'use client';

import React from 'react';
import {Bone, HeaderBones, SkeletonRegion} from './SkeletonRegion';

/** Props for {@link DetailPageSkeleton}. */
export interface DetailPageSkeletonProps {
  sections?: number;
  showSidePanel?: boolean;
  showHeader?: boolean;
  className?: string;
}

/** Route/content skeleton for detail pages: main column plus a 320px side panel at >=1024px. */
export function DetailPageSkeleton({
  sections = 2,
  showSidePanel = true,
  showHeader = true,
  className,
}: DetailPageSkeletonProps) {
  return (
    <SkeletonRegion className={className}>
      <div className="flex flex-col gap-6">
        {showHeader && <HeaderBones />}
        <div className="flex flex-col gap-6 lg:flex-row">
          <div className="flex min-w-0 flex-1 flex-col gap-6">
            {Array.from({length: sections}).map((_, s) => (
              <div key={s} className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4">
                <Bone height={16} width="25%" radius="sm" />
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {Array.from({length: 4}).map((_, f) => (
                    <div key={f} className="flex flex-col gap-2">
                      <Bone height={12} width="40%" radius="sm" />
                      <Bone height={14} width="70%" radius="sm" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          {showSidePanel && (
            <div className="flex w-full flex-col gap-4 rounded-lg border border-border bg-card p-4 lg:w-80 lg:shrink-0">
              <Bone height={16} width="50%" radius="sm" />
              {Array.from({length: 4}).map((_, i) => (
                <Bone key={i} height={14} radius="sm" />
              ))}
            </div>
          )}
        </div>
      </div>
    </SkeletonRegion>
  );
}
