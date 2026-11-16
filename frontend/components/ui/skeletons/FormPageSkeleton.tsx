'use client';

import React from 'react';
import {Box} from '@mantine/core';
import {Bone, HeaderBones, SkeletonRegion} from './SkeletonRegion';

/** Props for {@link FormPageSkeleton}. */
export interface FormPageSkeletonProps {
  fields?: number;
  showHeader?: boolean;
  className?: string;
}

/** Route/content skeleton for form pages: labelled fields capped at the 720px form width. */
export function FormPageSkeleton({fields = 6, showHeader = true, className}: FormPageSkeletonProps) {
  return (
    <SkeletonRegion className={className}>
      <Box maw={720} className="flex flex-col gap-6">
        {showHeader && <HeaderBones withAction={false} />}
        <div className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4">
          {Array.from({length: fields}).map((_, i) => (
            <div key={i} className="flex flex-col gap-2">
              <Bone height={12} width={120} radius="sm" />
              <Bone height={36} radius="md" />
            </div>
          ))}
        </div>
        <div className="flex justify-end gap-2">
          <Bone height={36} width={96} radius="md" />
          <Bone height={36} width={96} radius="md" />
        </div>
      </Box>
    </SkeletonRegion>
  );
}
