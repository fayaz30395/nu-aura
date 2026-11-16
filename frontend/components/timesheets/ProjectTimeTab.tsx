'use client';

import React, {useMemo, useState} from 'react';
import {useQueries} from '@tanstack/react-query';
import {Card, CardContent, EmptyState} from '@/components/ui';
import {ResponsiveTable, type Column} from '@/components/ui/ResponsiveTable';
import {timesheetService} from '@/lib/services/hrms/timesheet.service';
import {timesheetKeys} from '@/lib/hooks/queries/useTimesheets';
import {addDaysToDateString} from '@/lib/utils/timesheet-copy';
import {summarizeProjectTime, type ProjectTimeRow} from '@/lib/utils/timesheet-analytics';
import type {Timesheet} from '@/lib/types/hrms/timesheet';

const DEFAULT_RANGE_DAYS = 90;

interface Props {
  timesheets: readonly Timesheet[];
  projectNames: Readonly<Record<string, string>>;
}

export function ProjectTimeTab({timesheets, projectNames}: Props) {
  const today = new Date().toISOString().slice(0, 10);
  const [from, setFrom] = useState(addDaysToDateString(today, -DEFAULT_RANGE_DAYS));
  const [to, setTo] = useState(today);

  const inRange = useMemo(
    () => timesheets.filter((ts) => ts.weekEndDate.slice(0, 10) >= from && ts.weekStartDate.slice(0, 10) <= to),
    [timesheets, from, to],
  );
  const results = useQueries({
    queries: inRange.map((ts) => ({
      queryKey: timesheetKeys.entries(ts.id),
      queryFn: () => timesheetService.getTimesheetEntries(ts.id),
    })),
  });
  const loading = results.some((r) => r.isPending);
  const failed = results.some((r) => r.isError);
  const entries = results.flatMap((r) => r.data ?? []);
  const rows = summarizeProjectTime(entries, from, to);
  const totals = rows.reduce(
    (acc, r) => ({billable: acc.billable + r.billable, nonBillable: acc.nonBillable + r.nonBillable, total: acc.total + r.total}),
    {billable: 0, nonBillable: 0, total: 0},
  );

  const columns: Column<ProjectTimeRow>[] = [
    {key: 'project', header: 'Project', accessor: (r) => projectNames[r.projectId] ?? 'Unknown project', mobilePriority: 'primary'},
    {key: 'billable', header: 'Billable', numeric: true, accessor: (r) => `${r.billable}h`},
    {key: 'nonBillable', header: 'Non-billable', numeric: true, accessor: (r) => `${r.nonBillable}h`},
    {key: 'total', header: 'Total', numeric: true, accessor: (r) => `${r.total}h`},
  ];

  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        <div className="flex flex-wrap items-end gap-3 text-sm text-[var(--text-secondary)]">
          <label className="flex flex-col gap-1">From
            <input type="date" value={from} max={to} onChange={(e) => e.target.value && setFrom(e.target.value)}
                   className="h-9 rounded-md border border-[var(--border-main)] bg-[var(--bg-card)] px-2 text-[var(--text-primary)]"/>
          </label>
          <label className="flex flex-col gap-1">To
            <input type="date" value={to} min={from} onChange={(e) => e.target.value && setTo(e.target.value)}
                   className="h-9 rounded-md border border-[var(--border-main)] bg-[var(--bg-card)] px-2 text-[var(--text-primary)]"/>
          </label>
          <p className="ml-auto text-[var(--text-primary)]">
            Total <strong>{totals.total}h</strong> · Billable <strong>{totals.billable}h</strong> · Non-billable{' '}
            <strong>{totals.nonBillable}h</strong>
          </p>
        </div>
        {failed && <p role="alert" className="text-sm text-[var(--text-secondary)]">Some weeks could not be loaded, totals may be incomplete.</p>}
        <ResponsiveTable
          columns={columns}
          data={rows}
          keyExtractor={(r) => r.projectId}
          isLoading={loading}
          emptyState={<EmptyState title="No time logged" description="No hours were logged on projects in this date range."/>}
          density="compact"
        />
      </CardContent>
    </Card>
  );
}
