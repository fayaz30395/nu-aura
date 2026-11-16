'use client';

import {Calendar, MapPin} from 'lucide-react';
import {EmptyState} from '@/components/ui/EmptyState';
import {ResponsiveTable, type Column} from '@/components/ui/ResponsiveTable';
import {StatusBadge} from '@/components/ui/StatusBadge';
import {AttendanceRecord} from '@/lib/types/hrms/attendance';
import {ATTENDANCE_STATUS} from '@/lib/status/vocabulary';
import {AttendanceTimelineBar} from './AttendanceTimelineBar';
import {formatDateLabel, formatDuration, formatHoursFromMinutes, isNonWorkingDay, nonWorkLabel} from './format';

function hoursDotClass(hours: number) {
  if (hours >= 8) return 'bg-status-ok-fg';
  if (hours >= 4) return 'bg-status-warn-fg';
  return 'bg-status-err-fg';
}

const COLUMNS: Column<AttendanceRecord>[] = [
  {
    key: 'date',
    header: 'Date',
    mobilePriority: 'primary',
    accessor: (r) => (
      <span className="flex items-center gap-2">
        <span className="text-sm font-medium text-text-1">{formatDateLabel(r.attendanceDate)}</span>
        {r.status !== 'PRESENT' && ATTENDANCE_STATUS[r.status] && (
          <StatusBadge status={r.status} domain={ATTENDANCE_STATUS} compact/>
        )}
      </span>
    ),
  },
  {
    key: 'visual',
    header: 'Attendance visual',
    mobilePriority: 'hidden',
    accessor: (r) =>
      isNonWorkingDay(r) || r.status === 'ABSENT' ? (
        <span className="text-sm text-text-3">{nonWorkLabel(r)}</span>
      ) : (
        <span className="flex items-center gap-2">
          <AttendanceTimelineBar record={r}/>
          {r.checkInLocation && (
            <MapPin className="h-4 w-4 shrink-0 text-text-3" aria-label={`Location: ${r.checkInLocation}`}/>
          )}
        </span>
      ),
  },
  {
    key: 'effective',
    header: 'Effective hours',
    mobileLabel: 'Effective',
    numeric: true,
    accessor: (r) => {
      const minutes = r.workDurationMinutes || 0;
      if (isNonWorkingDay(r) || minutes <= 0) return <span className="text-text-3">--</span>;
      return (
        <span className="inline-flex items-center gap-2">
          <span aria-hidden="true" className={`h-2 w-2 shrink-0 rounded-full ${hoursDotClass(minutes / 60)}`}/>
          <span className="text-sm font-medium text-text-1">{formatDuration(minutes)}</span>
        </span>
      );
    },
  },
  {
    key: 'gross',
    header: 'Gross hours',
    mobileLabel: 'Gross',
    numeric: true,
    accessor: (r) => {
      const minutes = r.workDurationMinutes || 0;
      return (
        <span className="text-sm text-text-2">
          {!isNonWorkingDay(r) && minutes > 0 ? formatHoursFromMinutes(minutes + (r.breakDurationMinutes || 0)) : '--'}
        </span>
      );
    },
  },
];

export function AttendanceLogTable({records}: {records: AttendanceRecord[]}) {
  return (
    <ResponsiveTable
      columns={COLUMNS}
      data={records}
      keyExtractor={(r) => r.id}
      stickyHeader
      emptyState={
        <EmptyState
          icon={<Calendar className="h-full w-full"/>}
          title="No attendance records"
          description="Records for this period appear here once you check in."
          size="compact"
        />
      }
    />
  );
}
