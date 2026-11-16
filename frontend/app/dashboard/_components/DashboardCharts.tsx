'use client';

import {Card} from '@/components/ui/Card';
import {Segmented} from '@/components/ui/Segmented';
import {AreaChart, Donut} from '@/components/charts/aura';
import type {DashboardAnalytics} from '@/lib/types/core/analytics';

export type HeadcountRange = '3m' | '6m' | '12m';

interface DashboardChartsProps {
  attendance: DashboardAnalytics['attendance'];
  headcountRange: HeadcountRange;
  onHeadcountRangeChange: (range: HeadcountRange) => void;
  rangeWindow: number;
  headcountValues: number[];
  headcountLabels: string[];
  presentPct: number;
}

/** Headcount growth area chart (with range selector) and today's attendance donut. */
export function DashboardCharts({
  attendance: att,
  headcountRange,
  onHeadcountRangeChange,
  rangeWindow,
  headcountValues,
  headcountLabels,
  presentPct,
}: DashboardChartsProps) {
  const donutData = [
    {label: 'Present', value: att.present, color: 'var(--chart-1)'},
    {label: 'On leave', value: att.onLeave, color: 'var(--chart-4)'},
    {label: 'Absent', value: att.absent, color: 'var(--chart-danger)'},
  ].filter((d) => d.value > 0);
  const donutTotal = donutData.reduce((s, d) => s + d.value, 0) || 1;
  const pct = (n: number) => Math.round((n / donutTotal) * 100);

  return (
    <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
      <Card padding="sm" className="min-w-0 xl:col-span-2">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-text-1">Headcount growth</h2>
            <p className="text-xs text-text-3">Net employees over the last {rangeWindow} months</p>
          </div>
          <Segmented
            aria-label="Headcount trend range"
            value={headcountRange}
            onChange={onHeadcountRangeChange}
            options={[
              {value: '3m', label: '3M'},
              {value: '6m', label: '6M'},
              {value: '12m', label: '12M'},
            ]}
          />
        </div>
        {headcountValues.length >= 2 ? (
          <AreaChart
            data={headcountValues}
            labels={headcountLabels}
            height={256}
            color="var(--chart-1)"
            ariaLabel={`Headcount growth trend: starting at ${headcountValues[0]}, ending at ${headcountValues[headcountValues.length - 1]}, over ${rangeWindow} months`}
          />
        ) : (
          <div className="flex h-64 items-center justify-center text-sm text-text-3">
            Not enough trend data to plot yet.
          </div>
        )}
      </Card>

      <Card padding="sm" className="min-w-0">
        <div className="mb-2 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-text-1">Attendance</h2>
            <p className="text-xs text-text-3">Today, live</p>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-status-ok-bg px-2 py-0.5 text-xs font-semibold text-status-ok-fg">
            <span className="h-2 w-2 rounded-full bg-status-ok-fg" aria-hidden="true"/>
            Live
          </span>
        </div>
        {donutData.length > 0 ? (
          <>
            <div className="grid place-items-center py-2">
              <Donut
                data={donutData}
                size={160}
                thickness={24}
                center={{value: `${presentPct}%`, label: 'present'}}
                ariaLabel={`Attendance distribution today: ${presentPct}% present (${att.present}), ${pct(att.onLeave)}% on leave (${att.onLeave}), ${pct(att.absent)}% absent (${att.absent})`}
              />
            </div>
            <ul className="mt-2 flex flex-col gap-2">
              {[
                {label: 'Present', value: att.present, colorClass: 'bg-[var(--chart-1)]'},
                {label: 'On leave', value: att.onLeave, colorClass: 'bg-[var(--chart-4)]'},
                {label: 'Absent', value: att.absent, colorClass: 'bg-[var(--chart-danger)]'},
              ].map((row) => (
                <li key={row.label} className="flex items-center gap-2 text-sm">
                  <span className={`h-2 w-2 shrink-0 rounded-full ${row.colorClass}`} aria-hidden="true"/>
                  <span className="font-medium text-text-2">{row.label}</span>
                  <span className="ml-auto font-semibold tabular-nums text-text-1">{row.value.toLocaleString()}</span>
                  <span className="w-10 text-right tabular-nums text-text-3">{pct(row.value)}%</span>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <div className="flex h-40 items-center justify-center text-sm text-text-3">
            No attendance recorded today.
          </div>
        )}
      </Card>
    </section>
  );
}
