'use client';

import React from 'react';
import {Card, CardContent, EmptyState} from '@/components/ui';
import {ResponsiveTable, type Column} from '@/components/ui/ResponsiveTable';
import {StatusBadge} from '@/components/ui/StatusBadge';
import {TIMESHEET_STATUS} from '@/lib/status/vocabulary';
import {isPastDue} from '@/lib/utils/timesheet-analytics';
import type {Timesheet} from '@/lib/types/hrms/timesheet';
import {weekLabel} from './weekLabel';

interface Props {
  mode: 'past-due' | 'rejected';
  timesheets: readonly Timesheet[];
  isLoading: boolean;
  onOpen: (ts: Timesheet) => void;
}

export function TimesheetStatusListTab({mode, timesheets, isLoading, onOpen}: Props) {
  const today = new Date().toISOString().slice(0, 10);
  const rows = timesheets
    .filter((ts) => (mode === 'past-due' ? isPastDue(ts, today) : ts.status === 'REJECTED'))
    .sort((a, b) => b.weekStartDate.localeCompare(a.weekStartDate));

  const columns: Column<Timesheet>[] = [
    {key: 'week', header: 'Week', accessor: (ts) => weekLabel(ts.weekStartDate, ts.weekEndDate), mobilePriority: 'primary'},
    {key: 'hours', header: 'Hours', numeric: true, accessor: (ts) => `${ts.totalHours}h`},
    {key: 'status', header: 'Status', accessor: (ts) => <StatusBadge status={ts.status} domain={TIMESHEET_STATUS}/>},
    ...(mode === 'rejected'
      ? [{
        key: 'reason',
        header: 'Reviewer comment',
        accessor: (ts: Timesheet) => ts.rejectionReason || 'No comment provided',
      }]
      : []),
  ];

  const empty = mode === 'past-due'
    ? <EmptyState title="Nothing past due" description="All your finished weeks have been submitted."/>
    : <EmptyState title="No rejected timesheets" description="Timesheets sent back by a reviewer will appear here."/>;

  return (
    <Card>
      <CardContent className="p-4">
        <ResponsiveTable
          columns={columns}
          data={rows}
          keyExtractor={(ts) => ts.id}
          isLoading={isLoading}
          emptyState={empty}
          onRowClick={onOpen}
          density="compact"
        />
      </CardContent>
    </Card>
  );
}
