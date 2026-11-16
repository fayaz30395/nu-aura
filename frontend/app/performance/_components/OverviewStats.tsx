'use client';

import {Clock, Flag, SlidersHorizontal, TrendingUp} from 'lucide-react';
import {Bone, SkeletonRegion} from '@/components/ui/skeletons/SkeletonRegion';
import {Card} from '@/components/ui/Card';
import {cn} from '@/lib/utils';

export interface DashboardStats {
  activeGoals: number;
  completedGoals: number;
  averageProgress: number;
  activeReviewCycles: number;
  okrObjectives: number;
  okrProgress: number;
  pending360Reviews: number;
}

export function OverviewStats({stats}: {stats: DashboardStats}) {
  const items = [
    {label: 'Active goals', value: stats.activeGoals, icon: Flag, warning: false},
    {label: 'Goal progress', value: `${stats.averageProgress}%`, icon: TrendingUp, warning: false},
    {label: 'OKR progress', value: `${stats.okrProgress}%`, icon: SlidersHorizontal, warning: false},
    {label: 'Pending reviews', value: stats.pending360Reviews, icon: Clock, warning: stats.pending360Reviews > 0},
  ];

  return (
    <section aria-label="Performance at a glance" className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {items.map((item) => (
        <Card key={item.label} className="flex flex-col gap-2 rounded-lg p-4">
          <div className="flex items-center gap-2 text-text-2">
            <item.icon className="h-4 w-4" aria-hidden="true"/>
            <span className="text-xs">{item.label}</span>
          </div>
          <p className={cn('text-2xl font-semibold tabular-nums', item.warning ? 'text-warning-700' : 'text-text-1')}>
            {item.value}
          </p>
        </Card>
      ))}
    </section>
  );
}

export function OverviewStatsSkeleton() {
  return (
    <SkeletonRegion label="Loading performance metrics">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({length: 4}).map((_, i) => (
          <div key={i} className="flex flex-col gap-2 rounded-lg border border-border bg-card p-4">
            <Bone height={12} width="50%" radius="sm"/>
            <Bone height={28} width="35%" radius="sm"/>
          </div>
        ))}
      </div>
    </SkeletonRegion>
  );
}
