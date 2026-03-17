'use client';

import React, { memo } from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { Users } from 'lucide-react';

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
    { label: 'Total Candidates', value: total, bg: 'bg-primary-50 dark:bg-primary-950/30', text: 'text-primary-600 dark:text-primary-400' },
    { label: 'New', value: newCount, bg: 'bg-blue-50 dark:bg-blue-950/30', text: 'text-blue-600 dark:text-blue-400' },
    { label: 'In Interview', value: interview, bg: 'bg-yellow-50 dark:bg-yellow-950/30', text: 'text-yellow-600 dark:text-yellow-400' },
    { label: 'Selected', value: selected, bg: 'bg-green-50 dark:bg-green-950/30', text: 'text-green-600 dark:text-green-400' },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {cards.map(card => (
        <Card key={card.label} className="bg-[var(--bg-card)]">
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl ${card.bg} flex items-center justify-center`}>
                <Users className={`h-6 w-6 ${card.text}`} />
              </div>
              <div>
                <p className="text-sm text-[var(--text-muted)]">{card.label}</p>
                <p className="text-2xl font-bold text-[var(--text-primary)]">{card.value}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
});
