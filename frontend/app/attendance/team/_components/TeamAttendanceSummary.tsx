'use client';

import dynamic from 'next/dynamic';
import {Stat} from '@/components/ui/Stat';
import {ChartLoadingFallback} from '@/lib/utils/lazy-components';
import {StatusStats} from './teamAttendanceUtils';

const TeamStatusChart = dynamic(() => import('../TeamStatusChart'), {loading: () => <ChartLoadingFallback/>, ssr: false});

const CARD = 'rounded-lg border border-border bg-card p-4';

function pct(part: number, total: number) {
  return total > 0 ? `${Math.round((part / total) * 100)}%` : '0%';
}

export function TeamAttendanceStats({stats}: {stats: StatusStats}) {
  const items = [
    {label: 'Present', value: stats.present, tone: 'success' as const},
    {label: 'Absent', value: stats.absent, tone: 'danger' as const},
    {label: 'Late', value: stats.late, tone: 'warning' as const},
    {label: 'On Leave', value: stats.onLeave, tone: 'muted' as const},
  ];
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className={CARD}>
          <Stat
            label={item.label}
            value={<span className="tabular-nums">{item.value}</span>}
            tone={item.tone}
            caption={<span className="tabular-nums">{pct(item.value, stats.total)} of team</span>}
          />
        </div>
      ))}
    </div>
  );
}

const CHART_SERIES = [
  {name: 'Present', key: 'present', fill: 'var(--chart-success)', dot: 'bg-[var(--chart-success)]'},
  {name: 'Absent', key: 'absent', fill: 'var(--chart-danger)', dot: 'bg-[var(--chart-danger)]'},
  {name: 'Late', key: 'late', fill: 'var(--chart-accent)', dot: 'bg-[var(--chart-accent)]'},
  {name: 'Leave', key: 'onLeave', fill: 'var(--chart-info)', dot: 'bg-[var(--chart-info)]'},
] as const;

export function TeamStatusDistribution({stats}: {stats: StatusStats}) {
  const series = CHART_SERIES.map((s) => ({...s, value: stats[s.key]})).filter((s) => s.value > 0);
  if (series.length === 0) return null;
  return (
    <section aria-labelledby="team-status-dist" className={`${CARD} flex flex-col gap-4`}>
      <h2 id="team-status-dist" className="text-base font-semibold text-text-1">Status distribution</h2>
      <TeamStatusChart chartData={series.map(({name, value, fill}) => ({name, value, fill}))}/>
      <ul className="flex flex-wrap justify-center gap-4" aria-label="Legend">
        {series.map((s) => (
          <li key={s.name} className="flex items-center gap-2 text-xs text-text-2">
            <span aria-hidden="true" className={`h-3 w-3 rounded-full ${s.dot}`}/>
            {s.name} ({s.value})
          </li>
        ))}
      </ul>
    </section>
  );
}
