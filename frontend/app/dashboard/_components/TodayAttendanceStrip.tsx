'use client';

import {Clock, LogIn, LogOut} from 'lucide-react';
import {Button} from '@/components/ui/Button';
import type {useDashboardClock} from '../_hooks/useDashboardClock';

type ClockState = ReturnType<typeof useDashboardClock>;

const formatTime = (value: string) =>
  new Date(value).toLocaleTimeString('en-US', {hour: '2-digit', minute: '2-digit'});

function TimeChip({kind, label, value}: {kind: 'in' | 'out'; label: string; value: string}) {
  const Icon = kind === 'in' ? LogIn : LogOut;
  return (
    <span className="inline-flex items-center gap-1 text-sm">
      <Icon className={`h-4 w-4 ${kind === 'in' ? 'text-status-ok-fg' : 'text-accent'}`} aria-hidden="true"/>
      <span className="text-text-2">{label}</span>
      <span className="font-medium tabular-nums text-text-1">{formatTime(value)}</span>
    </span>
  );
}

/** Personal check-in / check-out strip for the signed-in user. */
export function TodayAttendanceStrip({clock}: {clock: ClockState}) {
  const {timeEntries, todayAttendance, hasOpenSession, canCheckIn, canCheckOut, attendanceComplete, clockError} = clock;
  const checkedOut = timeEntries.filter(e => e.checkOutTime);

  return (
    <section
      aria-label="Today's attendance"
      className="grid gap-4 rounded-lg border border-border bg-card p-4 lg:grid-cols-[1fr_auto] lg:items-center"
    >
      <div className="flex min-w-0 items-start gap-4">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-status-info-bg text-status-info-fg">
          <Clock className="h-4 w-4" aria-hidden="true"/>
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold text-text-1">Today&apos;s attendance</h2>
          {timeEntries.length > 0 ? (
            <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1">
              <TimeChip kind="in" label="First in" value={timeEntries[0].checkInTime}/>
              {checkedOut.length > 0 && (
                <TimeChip kind="out" label="Last out" value={checkedOut[checkedOut.length - 1].checkOutTime!}/>
              )}
              {timeEntries.length > 1 && (
                <span className="text-2xs font-medium uppercase tracking-wider text-text-3">
                  {timeEntries.length} sessions
                </span>
              )}
              {hasOpenSession && (
                <span className="inline-flex h-5 items-center rounded-full bg-status-ok-bg px-2 text-2xs font-semibold uppercase tracking-wider text-status-ok-fg">
                  Working
                </span>
              )}
            </div>
          ) : todayAttendance ? (
            <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1">
              {todayAttendance.checkInTime && <TimeChip kind="in" label="In" value={todayAttendance.checkInTime}/>}
              {todayAttendance.checkOutTime && <TimeChip kind="out" label="Out" value={todayAttendance.checkOutTime}/>}
            </div>
          ) : (
            <p className="mt-1 text-sm text-text-2">You haven&apos;t checked in yet.</p>
          )}
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-end gap-4">
        {clockError && <span role="alert" className="text-sm text-status-err-fg">{clockError}</span>}
        {canCheckIn && (
          <Button variant="primary" onClick={clock.handleCheckIn} isLoading={clock.checkInPending}
                  leftIcon={<LogIn className="h-4 w-4"/>}>
            Check in
          </Button>
        )}
        {canCheckOut && (
          <Button variant="danger" onClick={clock.handleCheckOut} isLoading={clock.checkOutPending}
                  leftIcon={<LogOut className="h-4 w-4"/>}>
            Check out
          </Button>
        )}
        {attendanceComplete && (
          <Button variant="outline" disabled>
            Checked out
          </Button>
        )}
      </div>
    </section>
  );
}
