'use client';

import {Button} from '@mantine/core';
import {Star, Zap} from 'lucide-react';
import {QueryState, type QueryStateResult} from '@/components/ui/QueryState';
import {Bone, SkeletonRegion} from '@/components/ui/skeletons/SkeletonRegion';
import {getInitials} from '@/lib/utils';
import {formatRelative} from '@/lib/utils/format/date';
import type {Recognition} from '@/lib/types/grow/recognition';

interface RecognitionPulseProps {
  query: QueryStateResult<{content?: Recognition[]}>;
  onViewAll: () => void;
}

function RecognitionSkeleton() {
  return (
    <SkeletonRegion label="Loading recognitions">
      <div className="flex flex-col gap-4">
        {Array.from({length: 3}).map((_, i) => (
          <div key={i} className="flex items-center gap-4">
            <Bone height={32} width={32} circle/>
            <div className="flex flex-1 flex-col gap-2">
              <Bone height={12} width="60%" radius="sm"/>
              <Bone height={12} width="35%" radius="sm"/>
            </div>
          </div>
        ))}
      </div>
    </SkeletonRegion>
  );
}

export function RecognitionPulse({query, onViewAll}: RecognitionPulseProps) {
  return (
    <section className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-text-1">
        <Zap className="h-4 w-4 text-warning-600" aria-hidden="true"/> Recognition Pulse
      </h2>
      <QueryState query={query} skeleton={<RecognitionSkeleton/>} errorTitle="Couldn't load recognitions">
        {(data) => {
          const recognitions = data?.content ?? [];
          if (recognitions.length === 0) {
            return <p className="py-4 text-center text-sm text-text-2">No recognitions yet</p>;
          }
          return (
            <ul className="flex flex-col gap-4">
              {recognitions.map((r) => (
                <li key={r.id} className="flex gap-4">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-warning-50 text-xs font-semibold text-warning-700 dark:bg-warning-950/30 dark:text-warning-400">
                    {getInitials(r.giverName || 'A')}
                  </span>
                  <div className="flex min-w-0 flex-col gap-1">
                    <h3 className="text-xs font-semibold text-text-1">{r.title}</h3>
                    {r.message && <p className="line-clamp-2 text-xs text-text-2">&quot;{r.message}&quot;</p>}
                    <div className="flex items-center gap-2 text-2xs text-text-2">
                      <span>{formatRelative(r.recognizedAt)}</span>
                      <span className="flex items-center gap-1 font-semibold text-warning-700">
                        <Star className="h-3 w-3 fill-current" aria-hidden="true"/> +{r.pointsAwarded} Karma
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          );
        }}
      </QueryState>
      <Button variant="subtle" fullWidth onClick={onViewAll}>
        View All Kudos
      </Button>
    </section>
  );
}
