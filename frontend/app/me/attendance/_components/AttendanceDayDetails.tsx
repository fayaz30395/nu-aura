'use client';

import {format, startOfDay} from 'date-fns';
import {FileText, LogIn, LogOut} from 'lucide-react';
import {Button, Card} from '@/components/ui';
import {SkeletonRegion, Bone} from '@/components/ui/skeletons/SkeletonRegion';
import {cn} from '@/lib/utils';
import type {AttendanceRecord, TimeEntry} from '@/lib/types/hrms/attendance';
import {formatDuration, formatTime, getStatusClasses, StatusIcon} from './attendanceFormat';

/** A past day with a check-in but no check-out. Today is excluded because the shift may still be open. */
export function isMissingCheckOut(record: AttendanceRecord, selectedDate: Date | null): boolean {
  if (!record.checkInTime || record.checkOutTime || !selectedDate) return false;
  return startOfDay(selectedDate) < startOfDay(new Date());
}

interface AttendanceDayDetailsProps {
  selectedDate: Date | null;
  selectedAttendance: AttendanceRecord | null | undefined;
  timeEntries: TimeEntry[];
  isLoadingTimeEntries: boolean;
  onRequestRegularization: (record: AttendanceRecord) => void;
}

export function AttendanceDayDetails({
  selectedDate,
  selectedAttendance,
  timeEntries,
  isLoadingTimeEntries,
  onRequestRegularization,
}: AttendanceDayDetailsProps) {
  const regularTotal = timeEntries
    .filter(e => e.entryType === 'REGULAR')
    .reduce((sum, e) => sum + (e.durationMinutes || 0), 0);

  return (
    <Card padding="sm">
      <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-text-1">
        <FileText className="h-4 w-4 text-text-3" aria-hidden="true"/>
        Details
      </h2>

      {selectedDate ? (
        <div className="flex flex-col gap-4">
          <div>
            <p className="text-xs text-text-3">Date</p>
            <p className="text-base font-semibold text-text-1">{format(selectedDate, 'EEEE, MMMM d')}</p>
          </div>

          {selectedAttendance && (
            <>
              <div>
                <p className="text-xs text-text-3">Status</p>
                <span
                  className={cn(
                    'mt-1 inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium',
                    getStatusClasses(selectedAttendance.status)
                  )}
                >
                  <StatusIcon status={selectedAttendance.status}/>
                  {selectedAttendance.status?.replace(/_/g, ' ') ?? '-'}
                </span>
              </div>

              {selectedAttendance.workDurationMinutes !== undefined && (
                <div>
                  <p className="text-xs text-text-3">Total Work Duration</p>
                  <p className="text-sm font-medium tabular-nums text-text-1">
                    {formatDuration(selectedAttendance.workDurationMinutes)}
                  </p>
                </div>
              )}

              {selectedAttendance.isLate && (
                <div className="rounded-lg border border-status-warn-bd bg-status-warn-bg p-2">
                  <p className="text-sm font-medium text-status-warn-fg">
                    Late by {selectedAttendance.lateByMinutes} minutes
                  </p>
                </div>
              )}

              {selectedAttendance.regularizationRequested && (
                <div className="rounded-lg border border-status-info-bd bg-status-info-bg p-2">
                  <p className="text-sm font-medium text-status-info-fg">Regularization Requested</p>
                  <p className="mt-1 text-xs text-status-info-fg">
                    Status: {selectedAttendance.regularizationApproved ? 'Approved' : 'Pending'}
                  </p>
                </div>
              )}
            </>
          )}

          <div className="border-t border-border pt-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-medium text-text-2">Sessions</p>
              {timeEntries.length > 0 && (
                <span className="text-sm font-bold tabular-nums text-accent">Total: {formatDuration(regularTotal)}</span>
              )}
            </div>
            {isLoadingTimeEntries ? (
              <SkeletonRegion label="Loading sessions" className="flex flex-col gap-2">
                <Bone className="h-10 w-full"/>
                <Bone className="h-10 w-full"/>
              </SkeletonRegion>
            ) : timeEntries.length === 0 ? (
              <p className="py-2 text-sm text-text-3">No sessions recorded</p>
            ) : (
              <ul className="flex max-h-64 flex-col gap-2 overflow-y-auto">
                {timeEntries.map((entry) => (
                  <li
                    key={entry.id}
                    className={cn(
                      'flex items-center justify-between rounded-lg border p-2 text-sm',
                      entry.open ? 'border-status-ok-bd bg-status-ok-bg' : 'border-border bg-card'
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          'flex h-5 w-5 items-center justify-center rounded-full text-xs font-semibold',
                          entry.open ? 'bg-status-ok-fg text-card' : 'bg-card-hover text-text-2'
                        )}
                      >
                        {entry.sequenceNumber}
                      </span>
                      <div className="flex items-center gap-1 tabular-nums text-text-1">
                        <LogIn className="h-3 w-3 text-status-ok-fg" aria-hidden="true"/>
                        <span>{formatTime(entry.checkInTime)}</span>
                        {entry.checkOutTime ? (
                          <>
                            <span className="mx-1 text-text-3">-</span>
                            <LogOut className="h-3 w-3 text-accent" aria-hidden="true"/>
                            <span>{formatTime(entry.checkOutTime)}</span>
                          </>
                        ) : (
                          <span className="ml-1 text-xs italic text-status-ok-fg">Active</span>
                        )}
                      </div>
                    </div>
                    <span className="font-medium tabular-nums text-text-1">
                      {entry.checkOutTime ? formatDuration(entry.durationMinutes) : '--'}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {selectedAttendance && isMissingCheckOut(selectedAttendance, selectedDate) && (
            <Button
              variant="soft"
              size="xs"
              data-testid={`att-regularise-${selectedAttendance.attendanceDate}`}
              onClick={() => onRequestRegularization(selectedAttendance)}
            >
              Regularise
            </Button>
          )}

          {selectedAttendance?.checkInTime && !selectedAttendance.regularizationRequested && (
            <Button variant="warning" className="w-full" onClick={() => onRequestRegularization(selectedAttendance)}>
              Request Regularization
            </Button>
          )}
        </div>
      ) : (
        <div className="flex h-72 items-center justify-center text-sm text-text-3">
          <p>Select a date to view details</p>
        </div>
      )}
    </Card>
  );
}
