'use client';

import {Skeleton} from '@mantine/core';

export default function MeLoading() {
  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      {/* Profile header skeleton */}
      <div className="bg-[var(--bg-card)] rounded-lg border border-surface-200 dark:border-surface-800 p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
          {/* Avatar skeleton */}
          <div className="flex justify-center sm:justify-start">
            <Skeleton height={100} width={100} circle/>
          </div>

          {/* Profile info skeleton */}
          <div className="flex-1 space-y-4">
            <Skeleton height={24} width="50%"/>
            <Skeleton height={16} width="40%"/>
            <Skeleton height={16} width="60%"/>
            <div className="flex gap-2 pt-2">
              <Skeleton height={36} width={100}/>
              <Skeleton height={36} width={100}/>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs skeleton */}
      <div className="flex gap-2 border-b border-surface-200 dark:border-surface-800">
        {Array.from({length: 4}).map((_, index) => (
          <Skeleton key={index} height={36} width={120}/>
        ))}
      </div>

      {/* Content sections skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-4">
          {/* Section 1 */}
          <div className="bg-[var(--bg-card)] rounded-lg border border-surface-200 dark:border-surface-800 p-4 sm:p-6">
            <Skeleton height={20} width="40%" className="mb-4"/>
            <div className="space-y-4">
              {Array.from({length: 3}).map((_, index) => (
                <div key={index}>
                  <Skeleton height={14} width="30%" className="mb-2"/>
                  <Skeleton height={40}/>
                </div>
              ))}
            </div>
          </div>

          {/* Section 2 */}
          <div className="bg-[var(--bg-card)] rounded-lg border border-surface-200 dark:border-surface-800 p-4 sm:p-6">
            <Skeleton height={20} width="40%" className="mb-4"/>
            <div className="space-y-4">
              {Array.from({length: 4}).map((_, index) => (
                <Skeleton key={index} height={40}/>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Card 1 */}
          <div className="bg-[var(--bg-card)] rounded-lg border border-surface-200 dark:border-surface-800 p-4">
            <Skeleton height={16} width="70%" className="mb-4"/>
            <Skeleton height={28} width="80%"/>
          </div>

          {/* Card 2 */}
          <div className="bg-[var(--bg-card)] rounded-lg border border-surface-200 dark:border-surface-800 p-4">
            <Skeleton height={16} width="70%" className="mb-4"/>
            <Skeleton height={28} width="80%"/>
          </div>

          {/* Card 3 */}
          <div className="bg-[var(--bg-card)] rounded-lg border border-surface-200 dark:border-surface-800 p-4">
            <Skeleton height={16} width="70%" className="mb-4"/>
            <Skeleton height={28} width="80%"/>
          </div>
        </div>
      </div>
    </div>
  );
}
