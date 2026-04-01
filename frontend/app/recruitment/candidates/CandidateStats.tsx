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
    { label: 'Total Candidates', value: total, bg: 'bg-accent-50 dark:bg-accent-950/30', text: 'text-accent-700 dark:text-accent-400' },
    { label: 'New', value: newCount, bg: 'bg-accent-50 dark:bg-accent-950/30', text: 'text-accent-600 dark:text-accent-400' },
    { label: 'In Interview', value: interview, bg: 'bg-warning-50 dark:bg-warning-950/30', text: 'text-warning-600 dark:text-warning-400' },
    { label: 'Selected', value: selected, bg: 'bg-success-50 dark:bg-success-950/30', text: 'text-success-600 dark:text-success-400' },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {cards.map(card => (
        <Card key={card.label} className="skeuo-card">
          <CardContent className="p-6">
            <div className="flex items-center gap-4 relative z-10">
              <div className={`w-12 h-12 rounded-xl ${card.bg} flex items-center justify-center`}>
                <Users className={`h-6 w-6 ${card.text}`} />
              </div>
              <div>
                <p className="text-sm text-[var(--text-muted)] skeuo-deboss">{card.label}</p>
                <p className="text-2xl font-bold text-[var(--text-primary)] skeuo-emboss">{card.value}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
});
