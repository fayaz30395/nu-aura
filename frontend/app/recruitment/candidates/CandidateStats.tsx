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
      bg: "bg-accent-subtle",
      text: "text-accent"
    },
    {
      label: 'New',
      value: newCount,
      bg: "bg-accent-subtle",
      text: "text-accent"
    },
    {
      label: 'In Interview',
      value: interview,
      bg: "bg-status-warning-bg",
      text: "text-status-warning-text"
    },
    {
      label: 'Selected',
      value: selected,
      bg: "bg-status-success-bg",
      text: "text-status-success-text"
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {cards.map(card => (
        <Card key={card.label} className="skeuo-card">
          <CardContent className="p-6">
            <div className="flex items-center gap-4 relative z-10">
              <div className={`w-12 h-12 rounded-xl ${card.bg} flex items-center justify-center`}>
                <Users className={`h-6 w-6 ${card.text}`}/>
              </div>
              <div>
                <p className="text-body-muted skeuo-deboss">{card.label}</p>
                <p className="text-xl font-bold text-[var(--text-primary)] skeuo-emboss">{card.value}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
});
