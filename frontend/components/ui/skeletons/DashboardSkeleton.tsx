'use client';

import React from 'react';
import {Bone, HeaderBones, SkeletonRegion} from './SkeletonRegion';

/** Props for {@link DashboardSkeleton}. */
export interface DashboardSkeletonProps {
  stats?: number;
  showHeader?: boolean;
  className?: string;
}

/** Route/content skeleton for dashboards: stat row plus two content panels. */
export function DashboardSkeleton({stats = 4, showHeader = true, className}: DashboardSkeletonProps) {
  return (
    <SkeletonRegion className={className}>
      <div className="flex flex-col gap-6">
        {showHeader && <HeaderBones withAction={false} />}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({length: stats}).map((_, i) => (
            <div key={i} className="flex flex-col gap-2 rounded-lg border border-border bg-card p-4">
              <Bone height={12} width="50%" radius="sm" />
              <Bone height={24} width="35%" radius="sm" />
              <Bone height={12} width="60%" radius="sm" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4">
            <Bone height={16} width="30%" radius="sm" />
            <Bone height={200} radius="md" />
          </div>
          <div className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4">
            <Bone height={16} width="30%" radius="sm" />
            {Array.from({length: 5}).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Bone height={32} width={32} circle />
                <div className="flex flex-1 flex-col gap-2">
                  <Bone height={12} width="60%" radius="sm" />
                  <Bone height={12} width="35%" radius="sm" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </SkeletonRegion>
  );
}
