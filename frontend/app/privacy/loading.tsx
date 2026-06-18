'use client';

import {Skeleton} from '@mantine/core';

export default function Loading() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-12 space-y-8">
      <div className="space-y-3">
        <Skeleton height={36} width="60%"/>
        <Skeleton height={16} width="40%"/>
      </div>
      {Array.from({length: 5}).map((_, i) => (
        <div key={i} className="space-y-3">
          <Skeleton height={22} width="50%"/>
          <Skeleton height={14} width="100%"/>
          <Skeleton height={14} width="95%"/>
          <Skeleton height={14} width="88%"/>
        </div>
      ))}
    </div>
  );
}
