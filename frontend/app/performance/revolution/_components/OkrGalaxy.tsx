'use client';

import {motion} from 'framer-motion';
import {useElementSize} from '@mantine/hooks';
import {Target} from 'lucide-react';
import {QueryState, type QueryStateResult} from '@/components/ui/QueryState';
import {Bone, SkeletonRegion} from '@/components/ui/skeletons/SkeletonRegion';
import {useReducedMotionSafe} from '@/lib/animation';
import {cn} from '@/lib/utils';
import type {OKRGraphResponse, OKRNode} from '@/lib/types/grow/performance';

const MAX_NODES = 10;
const NODE_HALF = 48;

const LEGEND = [
  {label: 'Company', dot: 'bg-accent-700'},
  {label: 'Team', dot: 'bg-accent-300'},
  {label: 'Personal', dot: 'border border-border bg-surface-aura-sunken'},
];

function nodeClass(type: string) {
  if (type === 'COMPANY') return 'h-24 w-24 border-accent-700 bg-accent-50 dark:bg-accent-950/40';
  if (type === 'TEAM') return 'h-16 w-16 border-accent-300 bg-accent-50 dark:bg-accent-950/20';
  return 'h-16 w-16 border-border bg-card';
}

function GalaxyNodes({nodes}: {nodes: OKRNode[]}) {
  const {ref, width, height} = useElementSize();
  const {prefersReduced: reduced} = useReducedMotionSafe();
  const radiusX = Math.max(0, Math.min(200, width / 2 - NODE_HALF));
  const radiusY = Math.max(0, Math.min(150, height / 2 - NODE_HALF));

  return (
    <div ref={ref} className="relative h-full w-full">
      {nodes.slice(0, MAX_NODES).map((node, i) => {
        const angle = (i * (360 / MAX_NODES) * Math.PI) / 180;
        const target = {x: Math.cos(angle) * radiusX, y: Math.sin(angle) * radiusY};
        return (
          <motion.div
            key={node.id}
            initial={reduced ? false : {scale: 0.9, opacity: 0}}
            animate={{scale: 1, opacity: 1, ...target}}
            transition={{duration: reduced ? 0 : 0.2, ease: 'easeOut'}}
            className="absolute left-1/2 top-1/2"
          >
            <div
              tabIndex={0}
              aria-label={`${node.title}, ${node.ownerName}, ${Math.round(node.progress)}% complete`}
              className={cn(
                'group relative flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                nodeClass(node.type),
              )}
            >
              <div className="text-center">
                <div className="text-xs font-semibold tabular-nums text-text-1">{Math.round(node.progress)}%</div>
                <div className="mx-auto mt-1 h-1 w-8 overflow-hidden rounded-full bg-surface-aura-sunken">
                  <div className="h-full bg-accent-600" style={{width: `${Math.min(100, Math.max(0, node.progress))}%`}}/>
                </div>
              </div>
              <div
                role="tooltip"
                className="invisible absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 whitespace-nowrap rounded-md border border-border bg-card p-2 text-xs text-text-1 shadow-md group-hover:visible group-focus-within:visible"
              >
                <p className="font-semibold">{node.title}</p>
                <p className="text-text-2">{node.ownerName}</p>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

export function OkrGalaxy({query}: {query: QueryStateResult<OKRGraphResponse | null>}) {
  return (
    <section className="flex flex-col overflow-hidden rounded-lg border border-border bg-card lg:col-span-8">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-border p-4">
        <div className="flex flex-col gap-1">
          <h2 className="flex items-center gap-2 text-base font-semibold text-text-1">
            <Target className="h-4 w-4 text-accent-700" aria-hidden="true"/> OKR Alignment Galaxy
          </h2>
          <p className="text-sm text-text-2">Visual mapping of objectives from Company to Individual</p>
        </div>
        <ul className="flex items-center gap-4 text-xs text-text-2" aria-label="Objective levels">
          {LEGEND.map((item) => (
            <li key={item.label} className="flex items-center gap-2">
              <span className={cn('h-2 w-2 rounded-full', item.dot)} aria-hidden="true"/>
              {item.label}
            </li>
          ))}
        </ul>
      </header>
      <div className="h-96 bg-surface-aura-sunken p-4">
        <QueryState
          query={query}
          skeleton={
            <SkeletonRegion label="Loading OKR map" className="h-full">
              <Bone height={352} radius="md"/>
            </SkeletonRegion>
          }
          isEmpty={(data) => !data?.nodes?.length}
          empty={{
            icon: <Target className="h-full w-full"/>,
            title: 'No objectives to map yet',
            description: 'Objectives appear here once they are created and aligned.',
          }}
          errorTitle="Couldn't load the OKR map"
        >
          {(data) => <GalaxyNodes nodes={data?.nodes ?? []}/>}
        </QueryState>
      </div>
    </section>
  );
}
