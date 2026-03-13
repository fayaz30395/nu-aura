'use client';

import { useEffect, useState } from 'react';
import { Clock, LogOut, LogIn } from 'lucide-react';

interface TimeClockWidgetProps {
  isCheckedIn: boolean;
  checkInTime: Date | null;
  onCheckIn: () => void;
  onCheckOut: () => void;
  isLoading?: boolean;
}

export function TimeClockWidget({
  isCheckedIn,
  checkInTime,
  onCheckIn,
  onCheckOut,
  isLoading = false,
}: TimeClockWidgetProps) {
  const [currentTime, setCurrentTime] = useState<string>('');
  const [elapsedTime, setElapsedTime] = useState<string>('');
  const [dateDisplay, setDateDisplay] = useState<string>('');

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
    updateTime();
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

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-950">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-gray-500 dark:text-gray-400" />
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {dateDisplay}
          </span>
        </div>
        <a
          href="/attendance"
          className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 transition-colors"
        >
          View All
        </a>
      </div>

      {/* Time Display */}
      <div className="mb-4">
        <div className="text-3xl font-semibold text-gray-900 dark:text-white tracking-tight font-mono">
          {currentTime}
        </div>
        {elapsedTime && (
          <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Working: {elapsedTime}
          </div>
        )}
      </div>

      {/* Check In/Out Button */}
      <button
        onClick={isCheckedIn ? onCheckOut : onCheckIn}
        disabled={isLoading}
        className={`flex w-full items-center justify-center gap-2 rounded-lg py-2.5 px-4 text-sm font-medium transition-colors ${
          isCheckedIn
            ? 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
            : 'bg-slate-800 text-white hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600'
        } disabled:opacity-50 disabled:cursor-not-allowed`}
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
    </div>
  );
}
