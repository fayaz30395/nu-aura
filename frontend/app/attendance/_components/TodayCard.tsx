'use client';

import {useEffect, useState} from 'react';
import {format as formatDateFns} from 'date-fns';
import {Button, Progress} from '@mantine/core';
import {CheckCircle, LogIn, LogOut} from 'lucide-react';
import {PermissionGate} from '@/components/auth/PermissionGate';
import {Permissions} from '@/lib/hooks/usePermissions';
import {AttendanceRecord} from '@/lib/types/hrms/attendance';
import {calculateHours, formatDuration, formatTime, STANDARD_WORK_HOURS} from '../utils';

interface TodayCardProps {
  todayRecord: AttendanceRecord | null;
  onCheckIn: () => void;
  onCheckOutRequest: () => void;
  checkInPending: boolean;
  checkOutPending: boolean;
}

function Figure({label, value}: {label: string; value: string}) {
  return (
    <div>
      <p className="text-xs font-medium text-text-3">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums text-text-1">{value}</p>
    </div>
  );
}

/** Today's check-in state with the live clock and the single check-in/out action. */
export function TodayCard({todayRecord, onCheckIn, onCheckOutRequest, checkInPending, checkOutPending}: TodayCardProps) {
  const [currentTime, setCurrentTime] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const isCheckedIn = !!todayRecord?.checkInTime;
  const isCheckedOut = !!todayRecord?.checkOutTime;
  const dayComplete = isCheckedIn && isCheckedOut;
  const workedHours = calculateHours(todayRecord?.checkInTime, todayRecord?.checkOutTime || undefined);
  const workProgress = Math.min((workedHours / STANDARD_WORK_HOURS) * 100, 100);
  const status = dayComplete ? 'Day complete' : isCheckedIn ? 'Currently working' : 'Not started';

  return (
    <section
      aria-labelledby="attendance-today-title"
      className="flex h-full flex-col gap-6 rounded-lg border border-border bg-card p-4 sm:p-6"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <p className="inline-flex items-center gap-2 text-xs font-medium text-text-3">
            <span
              aria-hidden="true"
              className={`inline-block h-2 w-2 rounded-full ${isCheckedIn ? 'bg-status-ok-fg' : 'bg-text-3'}`}
            />
            {status}
          </p>
          <h2 id="attendance-today-title" className="text-xl font-semibold text-text-1">
            Today, {formatDateFns(currentTime, 'MMM d')}
          </h2>
          <p className="max-w-prose text-sm text-text-2">
            {dayComplete
              ? 'You wrapped the day. Logged hours are ready for payroll review.'
              : isCheckedIn
                ? 'You are checked in. Check out when your day is done.'
                : 'You have not checked in yet. Check in to start logging hours.'}
          </p>
        </div>
        <div className="text-right">
          <p data-testid="live-time" className="text-2xl font-semibold tabular-nums text-text-1">
            {currentTime.toLocaleTimeString('en-US', {hour: '2-digit', minute: '2-digit'})}
          </p>
          <p className="mt-1 text-xs text-text-3">Live time</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Figure label="Check-in" value={todayRecord?.checkInTime ? formatTime(todayRecord.checkInTime) : '--:--'}/>
        <Figure label="Check-out" value={todayRecord?.checkOutTime ? formatTime(todayRecord.checkOutTime) : '--:--'}/>
        <Figure label="Hours" value={`${workedHours.toFixed(1)}h`}/>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium text-text-3">Progress</span>
          <span className="tabular-nums text-text-2">
            {Math.round(workProgress)}% of {STANDARD_WORK_HOURS}h
          </span>
        </div>
        <Progress
          value={workProgress}
          size="sm"
          color={workProgress >= 100 ? 'green' : undefined}
          aria-label="Progress toward a standard work day"
        />
      </div>

      <div className="mt-auto flex items-center justify-between gap-4 border-t border-border-subtle pt-4">
        <p className="text-xs font-medium text-text-3">
          {dayComplete
            ? `Logged ${formatDuration(workedHours)}`
            : isCheckedIn
              ? `${formatDuration(Math.max(0, STANDARD_WORK_HOURS - workedHours))} remaining`
              : 'Ready when you are'}
        </p>
        {dayComplete ? (
          <p className="inline-flex items-center gap-2 text-sm font-medium text-status-ok-fg">
            <CheckCircle className="h-4 w-4" aria-hidden="true"/>
            All set for today
          </p>
        ) : (
          <PermissionGate permission={Permissions.ATTENDANCE_MARK}>
            {isCheckedIn ? (
              <Button
                variant="default"
                leftSection={<LogOut size={16} aria-hidden="true"/>}
                onClick={onCheckOutRequest}
                loading={checkOutPending}
              >
                Check out
              </Button>
            ) : (
              <Button
                leftSection={<LogIn size={16} aria-hidden="true"/>}
                onClick={onCheckIn}
                loading={checkInPending}
              >
                Check in
              </Button>
            )}
          </PermissionGate>
        )}
      </div>
    </section>
  );
}
