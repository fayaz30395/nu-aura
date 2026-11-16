'use client';

import {Banknote, Fingerprint, Palmtree, Users} from 'lucide-react';
import {Card} from '@/components/ui/Card';
import {Stat} from '@/components/ui/Stat';
import {Sparkline} from '@/components/charts/aura';
import {formatCurrency} from '@/lib/utils';
import type {DashboardAnalytics} from '@/lib/types/core/analytics';

const flatSpark = (n: number): number[] => [n, n];

/** Pick the real series when it can be plotted (>= 2 points), otherwise a flat line at `fallback`. */
function series(values: number[], fallback: number): number[] {
  return values.length >= 2 ? values : flatSpark(fallback);
}

interface DashboardKpiRowProps {
  analytics: DashboardAnalytics;
  headcountValues: number[];
  presentPct: number;
}

/** Four headline KPI tiles (Stat renders values with the tabular `.text-stat-*` scale). */
export function DashboardKpiRow({analytics, headcountValues, presentPct}: DashboardKpiRowProps) {
  const {headcount, attendance, leave, payroll} = analytics;
  const headcountDir: 'up' | 'down' | 'flat' =
    headcount.growthPercentage > 0 ? 'up' : headcount.growthPercentage < 0 ? 'down' : 'flat';

  const kpis = [
    {
      key: 'headcount',
      label: 'Headcount',
      value: headcount.total.toLocaleString(),
      icon: <Users className="h-4 w-4"/>,
      iconTone: 'accent' as const,
      delta: `${Math.abs(headcount.growthPercentage)}%`,
      deltaDir: headcountDir,
      spark: series(headcountValues, headcount.total),
      sparkColor: 'var(--chart-1)',
      foot: headcount.newJoinees > 0 ? `+${headcount.newJoinees} this month` : 'Stable this month',
    },
    {
      key: 'present',
      label: 'Present today',
      value: attendance.present.toLocaleString(),
      icon: <Fingerprint className="h-4 w-4"/>,
      iconTone: 'success' as const,
      delta: attendance.late > 0 ? `${attendance.late} late` : 'On time',
      deltaDir: 'flat' as const,
      spark: series((attendance.trend ?? []).map((t) => t.value), attendance.present),
      sparkColor: 'var(--chart-success)',
      foot: `${presentPct}% of workforce`,
    },
    {
      key: 'onleave',
      label: 'On leave',
      value: attendance.onLeave.toLocaleString(),
      icon: <Palmtree className="h-4 w-4"/>,
      iconTone: 'warning' as const,
      delta: `${Math.abs(leave.utilizationPercentage)}%`,
      deltaDir: 'down' as const,
      spark: series((leave.trend ?? []).map((t) => t.value), attendance.onLeave),
      sparkColor: 'var(--chart-4)',
      foot: `${leave.pending} pending request${leave.pending === 1 ? '' : 's'}`,
    },
    {
      key: 'payroll',
      label: 'Payroll',
      value: payroll ? formatCurrency(payroll.currentMonth.total) : '—',
      icon: <Banknote className="h-4 w-4"/>,
      iconTone: 'info' as const,
      delta: payroll?.currentMonth.status === 'PROCESSED' ? 'Paid' : 'On track',
      deltaDir: 'up' as const,
      spark: series((payroll?.costTrend ?? []).map((t) => t.amount), payroll?.currentMonth.total ?? 0),
      sparkColor: 'var(--chart-1)',
      foot: payroll ? `${payroll.currentMonth.processed} of ${headcount.total} processed` : 'No payroll access',
    },
  ];

  return (
    <section aria-label="Today at a glance" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {kpis.map((kpi) => (
        <Card key={kpi.key} padding="sm" className="h-full">
          <Stat
            label={kpi.label}
            value={kpi.value}
            icon={kpi.icon}
            iconTone={kpi.iconTone}
            delta={kpi.delta}
            deltaDir={kpi.deltaDir}
            spark={<Sparkline data={kpi.spark} color={kpi.sparkColor} height={32} ariaLabel={`${kpi.label} trend over time`}/>}
            foot={kpi.foot}
          />
        </Card>
      ))}
    </section>
  );
}
