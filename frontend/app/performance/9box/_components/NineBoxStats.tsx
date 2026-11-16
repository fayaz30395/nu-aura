'use client';

import type {LucideIcon} from 'lucide-react';
import {Grid3x3, Target, TrendingUp, Users} from 'lucide-react';

interface StatCardProps {
  label: string;
  value: number;
  icon: LucideIcon;
  tone: string;
}

function StatCard({label, value, icon: Icon, tone}: StatCardProps) {
  return (
    <div className="flex items-center gap-4 rounded-lg border border-border bg-card p-4">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${tone}`}>
        <Icon className="h-5 w-5" aria-hidden/>
      </div>
      <div className="flex flex-col">
        <p className="text-xs text-text-2">{label}</p>
        <p className="text-xl font-semibold tabular-nums text-text-1">{value}</p>
      </div>
    </div>
  );
}

interface NineBoxStatsProps {
  total: number;
  stars: number;
  highPerformers: number;
  highPotential: number;
}

export function NineBoxStats({total, stars, highPerformers, highPotential}: NineBoxStatsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard label="Total Plotted" value={total} icon={Users} tone="bg-accent-100 text-accent-700"/>
      <StatCard label="Stars" value={stars} icon={TrendingUp} tone="bg-success-100 text-success-700"/>
      <StatCard label="High Performers" value={highPerformers} icon={Target} tone="bg-accent-100 text-accent-700"/>
      <StatCard label="High Potential" value={highPotential} icon={Grid3x3} tone="bg-success-100 text-success-700"/>
    </div>
  );
}
