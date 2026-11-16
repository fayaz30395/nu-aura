'use client';

import React from 'react';
import {Skeleton, type SkeletonProps} from '@mantine/core';
import {useReducedMotion} from '@mantine/hooks';
import {cn} from '@/lib/utils';

/** Props for {@link SkeletonRegion}. */
export interface SkeletonRegionProps {
  label?: string;
  className?: string;
  children: React.ReactNode;
}

/** Content-region wrapper announcing a loading state to assistive tech. */
export function SkeletonRegion({label = 'Loading content', className, children}: SkeletonRegionProps) {
  return (
    <div role="status" aria-busy="true" aria-label={label} className={cn('w-full', className)}>
      <span className="sr-only">{label}</span>
      <div aria-hidden="true">{children}</div>
    </div>
  );
}

/** Mantine Skeleton that stops animating when the user prefers reduced motion. */
export function Bone(props: SkeletonProps) {
  const reduceMotion = useReducedMotion();
  return <Skeleton animate={!reduceMotion} {...props} />;
}

/** Title + optional action placeholder matching PageHeader. */
export function HeaderBones({withAction = true}: {withAction?: boolean}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex flex-1 flex-col gap-2">
        <Bone height={24} width="30%" radius="sm" />
        <Bone height={14} width="45%" radius="sm" />
      </div>
      {withAction && <Bone height={36} width={120} radius="md" />}
    </div>
  );
}
