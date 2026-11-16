'use client';

import React, {useMemo} from 'react';
import {Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis} from 'recharts';
import {Card, CardContent, EmptyState} from '@/components/ui';
import {ResponsiveTable, type Column} from '@/components/ui/ResponsiveTable';
import {StatusBadge} from '@/components/ui/StatusBadge';
import {TIMESHEET_STATUS} from '@/lib/status/vocabulary';
import {summarizeWeeks, type WeekSummaryRow} from '@/lib/utils/timesheet-analytics';
import type {Timesheet} from '@/lib/types/hrms/timesheet';
import {weekLabel} from './weekLabel';

const MAX_WEEKS = 12;

export function TimeSummaryTab({timesheets, isLoading}: {timesheets: readonly Timesheet[]; isLoading: boolean}) {
  const rows = useMemo(() => summarizeWeeks(timesheets).slice(-MAX_WEEKS), [timesheets]);
  const chartData = rows.map((r) => ({...r, label: weekLabel(r.weekStartDate, r.weekEndDate)}));

  const columns: Column<WeekSummaryRow>[] = [
    {key: 'period', header: 'Period', accessor: (r) => weekLabel(r.weekStartDate, r.weekEndDate), mobilePriority: 'primary'},
    {key: 'billable', header: 'Billable', numeric: true, accessor: (r) => `${r.billable}h`},
    {key: 'nonBillable', header: 'Non-billable', numeric: true, accessor: (r) => `${r.nonBillable}h`},
    {key: 'total', header: 'Total', numeric: true, accessor: (r) => `${r.total}h`},
    {key: 'status', header: 'Status', accessor: (r) => <StatusBadge status={r.status} domain={TIMESHEET_STATUS}/>},
  ];

  return (
    <div className="space-y-4">
      {chartData.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div
              role="img"
              aria-label={`Weekly billable and non-billable hours for the last ${chartData.length} weeks. The table below lists the same data.`}
              className="h-64"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-main)"/>
                  <XAxis dataKey="label" tick={{fill: 'var(--text-muted)', fontSize: 11}}/>
                  <YAxis tick={{fill: 'var(--text-muted)', fontSize: 11}} unit="h"/>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--bg-card)',
                      border: '1px solid var(--border-main)',
                      borderRadius: 8,
                    }}
                  />
                  <Legend/>
                  <Bar dataKey="billable" name="Billable" stackId="h" fill="var(--chart-primary)"/>
                  <Bar dataKey="nonBillable" name="Non-billable" stackId="h" fill="var(--text-muted)"/>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
      <Card>
        <CardContent className="p-4">
          <ResponsiveTable
            columns={columns}
            data={[...rows].reverse()}
            keyExtractor={(r) => r.id}
            isLoading={isLoading}
            emptyState={<EmptyState title="No timesheets yet" description="Weekly totals appear once you log hours."/>}
            density="compact"
          />
        </CardContent>
      </Card>
    </div>
  );
}
