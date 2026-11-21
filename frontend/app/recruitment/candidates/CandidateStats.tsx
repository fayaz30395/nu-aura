'use client';

import React, {memo} from 'react';
import {Card, CardContent} from '@/components/ui/Card';
import {Users} from 'lucide-react';

interface CandidateStatsProps {
  total: number;
  newCount: number;
  interview: number;
  selected: number;
}

/**
 * Stat cards for the candidates page header.
 * Memoized — only re-renders when stat values change.
 */
export const CandidateStats = memo(function CandidateStats({
                                                             total,
                                                             newCount,
                                                             interview,
                                                             selected,
                                                           }: CandidateStatsProps) {
  const cards = [
    {
      label: 'Total Candidates',
      value: total,
      bg: 'bg-accent-50 dark:bg-accent-950/30',
      text: 'text-accent-700 dark:text-accent-400'
    },
    {
      label: 'New',
      value: newCount,
      bg: 'bg-accent-50 dark:bg-accent-950/30',
      text: 'text-accent-600 dark:text-accent-400'
    },
    {
      label: 'In Interview',
      value: interview,
      bg: 'bg-warning-50 dark:bg-warning-950/30',
      text: 'text-warning-600 dark:text-warning-400'
    },
    {
      label: 'Selected',
      value: selected,
      bg: 'bg-success-50 dark:bg-success-950/30',
      text: 'text-success-600 dark:text-success-400'
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map(card => (
        <Card key={card.label} className="skeuo-card">
          <CardContent className="p-4">
            <div className="relative z-10 flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">{card.label}</p>
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${card.bg}`}>
                  <Users className={`h-4 w-4 ${card.text}`}/>
                </div>
              </div>
              <p className="text-2xl font-semibold tabular-nums text-[var(--text-primary)]">{card.value}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
});
