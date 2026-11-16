'use client';

import type {ReactNode} from 'react';
import {Fingerprint, Globe, Smartphone} from 'lucide-react';
import {Progress} from '@mantine/core';
import {ResponsiveTable, type Column} from '@/components/ui/ResponsiveTable';
import {StatusBadge} from '@/components/ui/StatusBadge';
import {AttendanceRecord} from '@/lib/types/hrms/attendance';
import {ATTENDANCE_STATUS} from '@/lib/status/vocabulary';
import {formatWeekdayDate} from '@/lib/utils/format/date';
import {formatClock, formatSource, SortConfig, SortKey, workPercent} from './teamAttendanceUtils';

function SourceIcon({source}: {source?: string}) {
  if (!source) return null;
  const s = source.toUpperCase();
  if (s.includes('MOBILE')) return <Smartphone className="h-4 w-4" aria-hidden="true"/>;
  if (s.includes('WEB')) return <Globe className="h-4 w-4" aria-hidden="true"/>;
  if (s.includes('BIOMETRIC')) return <Fingerprint className="h-4 w-4" aria-hidden="true"/>;
  return null;
}

function StatusCell({record}: {record: AttendanceRecord}) {
  const status = record.status || 'PRESENT';
  return (
    <span className="inline-flex items-center gap-1">
      <StatusBadge status={status} domain={ATTENDANCE_STATUS} compact/>
      {record.lateByMinutes && record.lateByMinutes > 0 ? (
        <span className="text-xs tabular-nums text-status-warn-fg">+{record.lateByMinutes}m</span>
      ) : null}
    </span>
  );
}

const COLUMNS: Column<AttendanceRecord>[] = [
  {
    key: 'employeeId',
    header: 'Employee',
    sortable: true,
    mobilePriority: 'primary',
    accessor: (r) => <span className="text-sm font-medium text-text-1">{r.employeeId.substring(0, 12)}</span>,
  },
  {key: 'checkInTime', header: 'Check in', sortable: true, accessor: (r) => formatClock(r.checkInTime)},
  {key: 'checkOutTime', header: 'Check out', sortable: true, accessor: (r) => formatClock(r.checkOutTime)},
  {
    key: 'totalWorkHours',
    header: 'Work hours',
    sortable: true,
    numeric: true,
    accessor: (r) => (
      <span className="inline-flex items-center justify-end gap-2">
        <span className="text-text-2">{r.totalWorkHours?.toFixed(1) || '--'}h</span>
        <Progress value={workPercent(r)} size="sm" color="green" className="w-16" aria-label="Share of an 8 hour day"/>
      </span>
    ),
  },
  {key: 'status', header: 'Status', sortable: true, accessor: (r) => <StatusCell record={r}/>},
  {
    key: 'source',
    header: 'Source',
    mobilePriority: 'secondary',
    accessor: (r) => (
      <span className="inline-flex items-center gap-2 text-text-2">
        <SourceIcon source={r.checkInSource}/>
        {formatSource(r.checkInSource)}
      </span>
    ),
  },
  {
    key: 'remarks',
    header: 'Remarks',
    mobilePriority: 'hidden',
    accessor: (r) => (
      <span className="flex flex-col gap-1">
        {r.isRegularization && <span className="text-xs font-medium text-status-warn-fg">Regularized</span>}
        {r.remarks && <span className="max-w-xs truncate text-xs text-text-3" title={r.remarks}>{r.remarks}</span>}
      </span>
    ),
  },
];

interface TableProps {
  records: AttendanceRecord[];
  sort: SortConfig;
  onSort: (key: SortKey) => void;
  emptyState: ReactNode;
}

export function TeamAttendanceTable({records, sort, onSort, emptyState}: TableProps) {
  return (
    <ResponsiveTable
      columns={COLUMNS}
      data={records}
      keyExtractor={(r) => r.id}
      stickyHeader
      sortColumn={sort.key ?? undefined}
      sortDirection={sort.direction}
      onSort={(key) => onSort(key as SortKey)}
      emptyState={emptyState}
    />
  );
}

export function TeamAttendanceGrid({records}: {records: AttendanceRecord[]}) {
  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {records.map((record) => (
        <li key={record.id} className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4">
          <div className="flex items-start justify-between gap-2">
            <span
              aria-hidden="true"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-soft text-xs font-semibold text-accent"
            >
              {record.employeeId.substring(0, 2).toUpperCase()}
            </span>
            <StatusBadge status={record.status || 'PRESENT'} domain={ATTENDANCE_STATUS} compact/>
          </div>
          <div className="flex flex-col gap-1">
            <p className="truncate text-sm font-semibold text-text-1">{record.employeeId.substring(0, 16)}</p>
            <p className="text-xs text-text-3">{formatWeekdayDate(record.attendanceDate)}</p>
          </div>
          <dl className="grid grid-cols-2 gap-4 border-t border-border-subtle pt-4 text-xs">
            <div>
              <dt className="font-medium text-text-3">Check-in</dt>
              <dd className="mt-1 font-semibold tabular-nums text-text-1">{formatClock(record.checkInTime)}</dd>
            </div>
            <div>
              <dt className="font-medium text-text-3">Check-out</dt>
              <dd className="mt-1 font-semibold tabular-nums text-text-1">{formatClock(record.checkOutTime)}</dd>
            </div>
          </dl>
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-text-3">Work hours</span>
              <span className="font-semibold tabular-nums text-text-1">{record.totalWorkHours?.toFixed(1) || '--'}h</span>
            </div>
            <Progress value={workPercent(record)} size="sm" aria-label="Share of an 8 hour day"/>
          </div>
          {record.lateByMinutes && record.lateByMinutes > 0 ? (
            <p className="text-xs font-medium text-status-warn-fg">Late by {record.lateByMinutes} minutes</p>
          ) : null}
          {record.checkInSource && (
            <p className="flex items-center gap-2 text-xs text-text-3">
              <SourceIcon source={record.checkInSource}/>
              {formatSource(record.checkInSource)}
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}
