'use client';

import type {ReactNode} from 'react';
import {BarChart3, Target, Users} from 'lucide-react';
import {Callout} from '@/components/ui/Callout';
import {Card} from '@/components/ui/Card';
import {RATING_LABELS, RATINGS, type RatingCounts} from './calibrationModel';

const BAR_COLORS = ['bg-danger-400', 'bg-warning-400', 'bg-warning-400', 'bg-accent-400', 'bg-success-400'];

export function RatingBadge({rating}: { rating: number | null }) {
  if (!rating) return <span className="text-sm text-text-3">—</span>;
  const meta = RATING_LABELS[Math.round(rating)] || RATING_LABELS[3];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold ${meta.bg} ${meta.color}`}>
      <span className="font-bold">{rating.toFixed(1)}</span>
      <span className="hidden md:inline">{meta.label}</span>
    </span>
  );
}

function DistributionChart({counts, total}: { counts: RatingCounts; total: number }) {
  const pctOf = (r: number) => (total > 0 ? ((counts[r] || 0) / total) * 100 : 0);
  return (
    <div className="flex flex-col gap-2">
      <div className="flex h-10 gap-1 overflow-hidden rounded-lg bg-surface-aura-sunken">
        {total === 0 ? (
          <div className="text-caption flex flex-1 items-center justify-center">No ratings</div>
        ) : (
          RATINGS.map((r, i) => {
            const pct = pctOf(r);
            return (
              <div
                key={r}
                title={`Rating ${r}: ${counts[r] || 0} (${pct.toFixed(0)}%)`}
                className={`flex items-center justify-center text-xs font-bold text-white ${BAR_COLORS[i]} ${pct > 5 ? 'min-w-8' : ''}`}
                style={{width: `${Math.max(pct, 2)}%`}}
              >
                {pct > 8 && counts[r]}
              </div>
            );
          })
        )}
      </div>
      <div className="text-caption flex flex-wrap gap-2">
        {RATINGS.map((r, i) => (
          <span key={r} className="flex items-center gap-1">
            <span className={`inline-block h-2 w-2 rounded-md ${BAR_COLORS[i]}`} aria-hidden/>
            {r}: {counts[r] || 0} ({pctOf(r).toFixed(0)}%)
          </span>
        ))}
      </div>
    </div>
  );
}

function StatTile({icon, label, value}: { icon: ReactNode; label: string; value: ReactNode }) {
  return (
    <Card className="flex items-center gap-4 p-4">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-100 text-accent-700">{icon}</div>
      <div>
        <p className="text-caption">{label}</p>
        <p className="text-xl font-semibold text-text-1">{value}</p>
      </div>
    </Card>
  );
}

interface CalibrationSummaryProps {
  counts: RatingCounts;
  totalRated: number;
  totalEmployees: number;
  warning: string | null;
}

export function CalibrationSummary({counts, totalRated, totalEmployees, warning}: CalibrationSummaryProps) {
  const average = totalRated > 0
    ? (Object.entries(counts).reduce((sum, [rating, count]) => sum + parseInt(rating) * count, 0) / totalRated).toFixed(1)
    : '—';

  return (
    <>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card as="section" className="flex flex-col gap-4 p-6">
          <h2 className="text-sm font-semibold text-text-1">Current Distribution</h2>
          <DistributionChart counts={counts} total={totalRated}/>
          <p className="text-caption">{totalRated} of {totalEmployees} employees have ratings</p>
        </Card>
        <div className="flex flex-col gap-4">
          <StatTile icon={<Users className="h-5 w-5" aria-hidden/>} label="Total Employees" value={totalEmployees}/>
          <StatTile
            icon={<Target className="h-5 w-5" aria-hidden/>}
            label="Rated"
            value={`${totalRated} (${Math.round((totalRated / Math.max(1, totalEmployees)) * 100)}%)`}
          />
          <StatTile icon={<BarChart3 className="h-5 w-5" aria-hidden/>} label="Avg Rating" value={average}/>
        </div>
      </div>

      {warning && (
        <Callout tone="warning" title="Bell Curve Alert">{warning}</Callout>
      )}
    </>
  );
}
