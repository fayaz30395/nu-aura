'use client';

import {CheckCircle, LogIn, LogOut} from 'lucide-react';
import {Button, Card} from '@/components/ui';
import type {AttendanceRecord} from '@/lib/types/hrms/attendance';
import {formatDuration, formatTime} from './attendanceFormat';

interface AttendanceTodayCardProps {
  todayAttendance?: AttendanceRecord;
  canCheckIn: boolean;
  canCheckOut: boolean;
  attendanceComplete: boolean;
  pending: boolean;
  onCheckIn: () => void;
  onCheckOut: () => void;
}

export function AttendanceTodayCard({
  todayAttendance,
  canCheckIn,
  canCheckOut,
  attendanceComplete,
  pending,
  onCheckIn,
  onCheckOut,
}: AttendanceTodayCardProps) {
  return (
    <Card padding="sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-text-1">Today&apos;s Status</h2>
          <span className="sr-only">Today&apos;s Status, text=Today&apos;s Status</span>
          {todayAttendance ? (
            <dl className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:flex sm:flex-wrap">
              <div className="flex gap-1">
                <dt className="text-text-3">Check-in:</dt>
                <dd className="font-medium tabular-nums text-text-1">{formatTime(todayAttendance.checkInTime)}</dd>
              </div>
              <div className="flex gap-1">
                <dt className="text-text-3">Check-out:</dt>
                <dd className="font-medium tabular-nums text-text-1">{formatTime(todayAttendance.checkOutTime)}</dd>
              </div>
              {todayAttendance.workDurationMinutes !== undefined && (
                <div className="flex gap-1">
                  <dt className="text-text-3">Work Duration:</dt>
                  <dd className="font-medium tabular-nums text-text-1">
                    {formatDuration(todayAttendance.workDurationMinutes)}
                  </dd>
                </div>
              )}
            </dl>
          ) : (
            <p className="mt-2 text-sm text-text-3">No attendance record for today</p>
          )}
          {todayAttendance?.isLate && (
            <p className="mt-1 text-sm font-medium text-status-warn-fg">
              Late by {todayAttendance.lateByMinutes} minutes
            </p>
          )}
        </div>

        <div className="flex gap-4">
          {canCheckIn && (
            <Button
              variant="success"
              onClick={onCheckIn}
              disabled={pending}
              leftIcon={<LogIn className="h-4 w-4" aria-hidden="true"/>}
            >
              {pending ? 'Checking In...' : 'Check In'}
            </Button>
          )}
          {canCheckOut && (
            <Button
              onClick={onCheckOut}
              disabled={pending}
              leftIcon={<LogOut className="h-4 w-4" aria-hidden="true"/>}
            >
              {pending ? 'Checking Out...' : 'Check Out'}
            </Button>
          )}
          {attendanceComplete && (
            <div className="flex h-9 items-center gap-2 rounded-lg border border-status-ok-bd bg-status-ok-bg px-4">
              <CheckCircle className="h-4 w-4 text-status-ok-fg" aria-hidden="true"/>
              <span className="text-sm font-semibold text-status-ok-fg">Attendance Completed</span>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
