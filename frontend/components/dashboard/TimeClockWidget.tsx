'use client';

import {useEffect, useState} from 'react';
import {CheckCircle2, Clock, LogIn, LogOut} from 'lucide-react';
import {Reveal} from '@/components/motion';

interface TimeClockWidgetProps {
  isCheckedIn: boolean;
  checkInTime: Date | null;
  onCheckIn: () => void;
  onCheckOut: () => void;
  isLoading?: boolean;
  isCompleted?: boolean;
  checkOutTime?: string | null;
  workDurationMinutes?: number | null;
}

function getInitialTime() {
  const now = new Date();
  return now.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
}

function getInitialDateDisplay() {
  const now = new Date();
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${dayNames[now.getDay()]}, ${now.getDate()} ${monthNames[now.getMonth()]} ${now.getFullYear()}`;
}

export function TimeClockWidget({
                                  isCheckedIn,
                                  checkInTime,
                                  onCheckIn,
                                  onCheckOut,
                                  isLoading = false,
                                  isCompleted = false,
                                  checkOutTime,
                                  workDurationMinutes,
                                }: TimeClockWidgetProps) {
  const [currentTime, setCurrentTime] = useState<string>(getInitialTime());
  const [elapsedTime, setElapsedTime] = useState<string>('');
  const [dateDisplay, setDateDisplay] = useState<string>(getInitialDateDisplay());

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        })
      );
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      setDateDisplay(`${dayNames[now.getDay()]}, ${now.getDate()} ${monthNames[now.getMonth()]} ${now.getFullYear()}`);
    };
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!isCheckedIn || !checkInTime) {
      setElapsedTime('');
      return;
    }
    const updateElapsed = () => {
      // Clamp to 0: the check-in timestamp may originate from the server (tenant-local,
      // offset-less) while Date.now() is the client clock. Any skew must never render a
      // negative "Working: -1h -1m" duration.
      const diff = Math.max(0, Math.floor((Date.now() - checkInTime.getTime()) / 1000));
      const hours = Math.floor(diff / 3600);
      const minutes = Math.floor((diff % 3600) / 60);
      setElapsedTime(`${hours}h ${minutes}m`);
    };
    updateElapsed();
    const interval = setInterval(updateElapsed, 60000);
    return () => clearInterval(interval);
  }, [isCheckedIn, checkInTime]);

  // Split time into parts for styled display
  const timeParts = currentTime.split(' ');
  const timeValue = timeParts[0] || '';
  const timePeriod = timeParts[1] || '';

  return (
    <Reveal>
      <div className="rounded-aura-lg border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sh-sm">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-6 h-6 rounded-aura-sm bg-[var(--info-bg)]">
              <Clock className="h-3.5 w-3.5 text-[var(--info-fg)]"/>
            </div>
            <span className="text-aura-micro text-[var(--text-3)]">
              {dateDisplay}
            </span>
          </div>
          <a
            href="/attendance"
            className="text-aura-micro text-[var(--text-3)] hover:text-[var(--accent)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
            aria-label="View all attendance"
          >
            View All
          </a>
        </div>

        {/* Time Display — large monospace with accent period */}
        <div className="mb-6">
          <div className="flex items-baseline gap-1.5">
            <span
              className="text-aura-stat text-[var(--text-1)] tracking-tight leading-none num">
              {timeValue}
            </span>
            <span className="text-sm font-semibold uppercase tracking-wider text-[var(--accent)]">
              {timePeriod}
            </span>
          </div>
          {elapsedTime && (
            <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-aura-sm border border-[var(--ok-bd)] bg-[var(--ok-bg)]">
              <div className="w-1.5 h-1.5 rounded-full bg-[var(--ok-fg)] animate-pulse"/>
              <span className="text-xs font-medium text-[var(--ok-fg)]">
                Working: <span className="num">{elapsedTime}</span>
              </span>
            </div>
          )}
        </div>

        {/* Check In/Out Button or Completed State */}
        {isCompleted ? (
          <div
            className="flex w-full flex-col items-center gap-2 rounded-aura-md py-4 px-4 border border-[var(--ok-bd)] bg-[var(--ok-bg)]">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-[var(--ok-fg)]"/>
              <span className="text-sm font-semibold text-[var(--ok-fg)]">
                Attendance Completed
              </span>
            </div>
            <span className="text-caption text-[var(--ok-fg)]">
              {workDurationMinutes != null
                ? `${Math.floor(workDurationMinutes / 60)}h ${(workDurationMinutes % 60).toString().padStart(2, '0')}m worked today`
                : checkOutTime
                  ? `Checked out at ${checkOutTime}`
                  : 'Have a great day!'}
            </span>
          </div>
        ) : (
          <button
            onClick={isCheckedIn ? onCheckOut : onCheckIn}
            disabled={isLoading}
            className={`relative flex w-full items-center justify-center gap-2.5 rounded-aura-control py-4 px-4 text-sm font-semibold transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] ${
              isCheckedIn
                ? 'bg-[var(--surface-aura-2)] text-[var(--text-1)] border border-[var(--border)] hover:bg-[var(--surface-hover)] hover:border-[var(--border-aura-strong)] hover:shadow-sh-md hover:-translate-y-0.5'
                : 'text-white border-0 bg-[var(--accent)] shadow-sh-md hover:shadow-sh-lg'
            } disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]`}
            aria-label={isCheckedIn ? 'Clock out' : 'Clock in'}
          >
            {isCheckedIn ? (
              <>
                <LogOut className="h-4 w-4"/>
                Clock Out
              </>
            ) : (
              <>
                <LogIn className="h-4 w-4"/>
                Clock In
              </>
            )}
          </button>
        )}
      </div>
    </Reveal>
  );
}
