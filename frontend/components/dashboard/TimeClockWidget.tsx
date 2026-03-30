'use client';

import { useEffect, useState } from 'react';
import { Clock, LogOut, LogIn, CheckCircle2 } from 'lucide-react';

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
      const diff = Math.floor((Date.now() - checkInTime.getTime()) / 1000);
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
    <div className="skeuo-card rounded-lg border border-[var(--border-main)] p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-6 h-6 rounded-md" style={{ background: 'var(--accent-primary-subtle)' }}>
            <Clock className="h-3.5 w-3.5" style={{ color: 'var(--accent-primary)' }} />
          </div>
          <span className="text-xs font-medium text-[var(--text-muted)]">
            {dateDisplay}
          </span>
        </div>
        <a
          href="/attendance"
          className="text-xs font-medium text-[var(--text-muted)] hover:text-[var(--accent-primary)] transition-colors"
        >
          View All
        </a>
      </div>

      {/* Time Display — large monospace with accent period */}
      <div className="mb-5">
        <div className="flex items-baseline gap-1.5">
          <span className="text-4xl font-bold text-[var(--text-primary)] tracking-tight font-mono tabular-nums leading-none">
            {timeValue}
          </span>
          <span className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--accent-primary)' }}>
            {timePeriod}
          </span>
        </div>
        {elapsedTime && (
          <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg" style={{ background: 'var(--status-success-bg)', border: '1px solid var(--status-success-border)' }}>
            <div className="w-1.5 h-1.5 rounded-full bg-success-500 animate-pulse" />
            <span className="text-xs font-medium" style={{ color: 'var(--status-success-text)' }}>
              Working: {elapsedTime}
            </span>
          </div>
        )}
      </div>

      {/* Check In/Out Button or Completed State */}
      {isCompleted ? (
        <div className="flex w-full flex-col items-center gap-2 rounded-xl py-4 px-4 border border-[var(--status-success-border)]"
          style={{ background: 'var(--status-success-bg)' }}>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" style={{ color: 'var(--status-success-text)' }} />
            <span className="text-sm font-semibold" style={{ color: 'var(--status-success-text)' }}>
              Attendance Completed
            </span>
          </div>
          <span className="text-xs text-[var(--text-muted)]">
            {workDurationMinutes != null
              ? `${Math.floor(workDurationMinutes / 60)}h ${workDurationMinutes % 60}m worked today`
              : checkOutTime
                ? `Checked out at ${checkOutTime}`
                : 'Have a great day!'}
          </span>
        </div>
      ) : (
        <button
          onClick={isCheckedIn ? onCheckOut : onCheckIn}
          disabled={isLoading}
          className={`relative flex w-full items-center justify-center gap-2.5 rounded-xl py-4 px-4 text-sm font-semibold transition-all duration-200 ${
            isCheckedIn
              ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border-main)] hover:bg-[var(--bg-card-hover)] hover:border-[var(--border-strong)]'
              : 'text-white border-0'
          } disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]`}
          style={!isCheckedIn ? {
            background: 'linear-gradient(135deg, #3a5fd9 0%, #2a48b3 100%)',
            boxShadow: '0 4px 14px rgba(58, 95, 217, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.15)',
          } : undefined}
        >
          {isCheckedIn ? (
            <>
              <LogOut className="h-4 w-4" />
              Clock Out
            </>
          ) : (
            <>
              <LogIn className="h-4 w-4" />
              Clock In
            </>
          )}
        </button>
      )}
    </div>
  );
}
