'use client';

import {Stat} from '@/components/ui/Stat';
import {RegularizationStats} from './types';

interface RegularizationStatsCardsProps {
  stats: RegularizationStats;
}

export function RegularizationStatsCards({stats}: RegularizationStatsCardsProps) {
  const items = [
    {label: 'Pending', value: String(stats.pending), tone: 'warning' as const},
    {label: 'Approved', value: String(stats.approved), tone: 'success' as const},
    {label: 'Rejected', value: String(stats.rejected), tone: 'danger' as const},
    {
      label: 'Avg resolution',
      value: stats.avgResolutionTime > 0 ? `${stats.avgResolutionTime}h` : '--',
      tone: undefined,
    },
  ];
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="rounded-lg border border-border bg-card p-4">
          <Stat label={item.label} value={<span className="tabular-nums">{item.value}</span>} tone={item.tone}/>
        </div>
      ))}
    </div>
  );
}
