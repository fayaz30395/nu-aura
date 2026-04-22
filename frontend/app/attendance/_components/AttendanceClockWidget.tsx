'use client';

import {memo, useEffect, useMemo, useState} from 'react';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  Clock,
  Flame,
  LogIn,
  LogOut,
  MapPin,
  Sunrise,
  Target,
} from 'lucide-react';
import {Card, CardContent} from '@/components/ui/Card';
import {Button} from '@/components/ui/Button';
import {PermissionGate} from '@/components/auth/PermissionGate';
import {Permissions} from '@/lib/hooks/usePermissions';
import type {AttendanceRecord} from '@/lib/types/hrms/attendance';
import {
  calculateHours,
  computeWeekStats,
  formatDuration,
  formatTime,
  GRACE_PERIOD_MINS,
  STANDARD_WORK_HOURS,
} from '../utils';
import {ProgressRing} from './ProgressRing';

export interface AttendanceClockWidgetProps {
  todayRecord: AttendanceRecord | null;
  userName: string | undefined;
  streak: number;
  weekStats: ReturnType<typeof computeWeekStats>;
  error: string | null;
  onCheckIn: () => Promise<void>;
  onCheckOutRequest: () => void;
  checkInPending: boolean;
  checkOutPending: boolean;
}

export const AttendanceClockWidget = memo(function AttendanceClockWidget({
                                                                           todayRecord,
                                                                           userName,
                                                                           streak,
                                                                           weekStats,
                                                                           error,
                                                                           onCheckIn,
                                                                           onCheckOutRequest,
                                                                           checkInPending,
                                                                           checkOutPending,
                                                                         }: AttendanceClockWidgetProps) {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const greeting = useMemo(() => {
    const hour = currentTime.getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  }, [currentTime]);

  const isCheckedIn = !!todayRecord?.checkInTime;
  const isCheckedOut = !!todayRecord?.checkOutTime;
  const dayComplete = isCheckedIn && isCheckedOut;

  const currentWorkHours = useMemo(
    () => calculateHours(todayRecord?.checkInTime, todayRecord?.checkOutTime || undefined),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [todayRecord, currentTime],
  );

  const workProgress = Math.min((currentWorkHours / STANDARD_WORK_HOURS) * 100, 100);
  const isOvertime = currentWorkHours > STANDARD_WORK_HOURS;
  const overtimeHours = isOvertime ? currentWorkHours - STANDARD_WORK_HOURS : 0;

  const isLateToday = useMemo(() => {
    if (!todayRecord?.checkInTime) return false;
    const checkIn = new Date(todayRecord.checkInTime);
    const shiftStart = new Date(checkIn);
    shiftStart.setHours(9, GRACE_PERIOD_MINS, 0, 0);
    return checkIn > shiftStart;
  }, [todayRecord]);

  const lateByMinutes = useMemo(() => {
    if (!isLateToday || !todayRecord?.checkInTime) return 0;
    const checkIn = new Date(todayRecord.checkInTime);
    const shiftStart = new Date(checkIn);
    shiftStart.setHours(9, GRACE_PERIOD_MINS, 0, 0);
    return Math.round((checkIn.getTime() - shiftStart.getTime()) / 60000);
  }, [isLateToday, todayRecord]);

  return (
    <>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div
              className="h-8 w-8 rounded-lg bg-gradient-to-br from-accent-500 to-accent-700 flex items-center justify-center">
              <Clock className='h-4 w-4 text-inverse'/>
            </div>
            <h1 className="text-page-title text-[var(--text-primary)] skeuo-emboss">Attendance</h1>
          </div>
          <p className="text-sm ml-10">
            <span className="font-medium text-[var(--text-primary)]">{greeting}, {userName || 'there'}</span>
            <span className="text-[var(--text-muted)]"> · </span>
            <span className="text-[var(--text-secondary)]">{currentTime.toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })}</span>
          </p>
        </div>
        <div className="flex items-center gap-4">
          {streak > 0 && (
            <div
              className='flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-warning-50 to-warning-50 rounded-lg border border-status-warning-border'>
              <Flame className='h-5 w-5 text-status-warning-text'/>
              <div>
                <div className='text-lg font-bold text-status-warning-text leading-none'>{streak}</div>
                <div className='text-xs text-status-warning-text'>day streak</div>
              </div>
            </div>
          )}
          <div
            className="flex items-center gap-2 px-4 py-2 bg-[var(--bg-surface)] rounded-lg shadow-[var(--shadow-card)] border border-[var(--border-main)]">
            <div
              className="h-10 w-10 rounded-full bg-gradient-to-br from-accent-500 to-accent-700 flex items-center justify-center">
              <Clock className='h-5 w-5 text-inverse animate-pulse'/>
            </div>
            <div>
              <div className='text-xs font-semibold text-accent uppercase tracking-wider'>Live
                Time
              </div>
              <div className="text-xl font-mono font-bold text-[var(--text-primary)] tabular-nums">
                {currentTime.toLocaleTimeString('en-US', {hour: '2-digit', minute: '2-digit', second: '2-digit'})}
              </div>
            </div>
          </div>
        </div>
      </div>
      {error && (
        <div
          className='p-4 tint-danger border-l-4 border-status-danger-border rounded-lg flex items-start gap-2 text-status-danger-text'>
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0"/>
          <div><p className="font-semibold text-sm">Error</p><p className="text-xs">{error}</p></div>
        </div>
      )}
      {/* Main Section: Clock Card + Progress Ring */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card
            className='bg-gradient-to-br from-accent-600 via-accent-600 to-accent-700 text-inverse overflow-hidden relative border-0 shadow-[var(--shadow-dropdown)]'>
            <div className="absolute inset-0 opacity-10">
              <div className="absolute inset-0" style={{
                backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
                backgroundSize: '32px 32px',
              }}/>
            </div>
            <div
              className="absolute top-0 right-0 w-64 h-64 bg-[var(--bg-card)] opacity-10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"/>

            <CardContent className="flex flex-col justify-between p-6 relative z-10">
              <div className="flex items-start justify-between mb-6">
                <div className="space-y-1">
                  <div
                    className={`inline-flex items-center gap-1.5 px-4 py-1 backdrop-blur-sm rounded-full text-xs font-bold uppercase tracking-wider ${
                      dayComplete ? 'bg-success-500/25 text-success-200' : isCheckedIn ? 'bg-success-400/25 text-success-200' : 'bg-white/15 text-white/80'
                    }`}>
                    <div
                      className={`h-2 w-2 rounded-full ${isCheckedIn && !isCheckedOut ? 'bg-success-400 animate-pulse' : dayComplete ? 'bg-success-400' : 'bg-white/50'}`}/>
                    {dayComplete ? 'Day Complete' : isCheckedIn ? 'Currently Working' : 'Not Started'}
                  </div>
                  <div className='text-2xl lg:text-3xl font-extrabold text-inverse drop-shadow-[var(--shadow-card)]'>
                    {currentTime.toLocaleDateString('en-US', {weekday: 'long', month: 'short', day: 'numeric'})}
                  </div>
                  {isLateToday && (
                    <div
                      className='inline-flex items-center gap-1 px-2 py-0.5 bg-danger-500/30 rounded-full text-xs font-medium text-status-danger-text'>
                      <AlertTriangle className="h-3 w-3"/>
                      Late by {lateByMinutes}m
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <div
                    className="text-4xl lg:text-5xl font-extrabold font-mono tracking-tight tabular-nums drop-shadow-[var(--shadow-elevated)]">
                    {currentTime.toLocaleTimeString('en-US', {hour12: true, hour: '2-digit', minute: '2-digit'})}
                  </div>
                  <div className="flex items-center gap-2 text-accent-200/80 justify-end mt-1.5">
                    <MapPin className="h-3.5 w-3.5"/>
                    <span
                      className="text-xs font-medium">{todayRecord?.checkInLocation || 'Location unavailable'}</span>
                  </div>
                </div>
              </div>

              {/* Time + Action */}
              <div className="flex items-end justify-between">
                <div className="flex gap-6">
                  <div>
                    <div className="text-xs font-semibold text-accent-200/70 uppercase tracking-wider mb-1">Check In
                    </div>
                    <div className='text-xl font-bold tabular-nums text-inverse'>
                      {todayRecord?.checkInTime ? formatTime(todayRecord.checkInTime) : '--:--'}
                    </div>
                  </div>
                  {isCheckedOut && todayRecord?.checkOutTime && (
                    <div>
                      <div className="text-xs font-semibold text-accent-200/70 uppercase tracking-wider mb-1">Check
                        Out
                      </div>
                      <div
                        className='text-xl font-bold tabular-nums text-inverse'>{formatTime(todayRecord.checkOutTime)}</div>
                    </div>
                  )}
                  {isCheckedIn && (
                    <div>
                      <div className="text-xs font-semibold text-accent-200/70 uppercase tracking-wider mb-1">Duration
                      </div>
                      <div
                        className='text-xl font-bold tabular-nums text-inverse'>{formatDuration(currentWorkHours)}</div>
                    </div>
                  )}
                  {isOvertime && (
                    <div>
                      <div
                        className="text-xs font-semibold text-warning-300/80 uppercase tracking-wider mb-1">Overtime
                      </div>
                      <div
                        className='text-xl font-bold tabular-nums text-status-warning-text'>+{formatDuration(overtimeHours)}</div>
                    </div>
                  )}
                </div>

                <div>
                  {dayComplete ? (
                    <div
                      className="bg-white/15 backdrop-blur-sm rounded-lg px-6 py-4 text-center border border-white/20">
                      <CheckCircle className='h-8 w-8 text-status-success-text mx-auto mb-1'/>
                      <div className="text-sm font-bold">Day Complete!</div>
                      <div className='text-xs text-accent mt-0.5'>
                        {formatDuration(calculateHours(todayRecord?.checkInTime, todayRecord?.checkOutTime))} worked
                      </div>
                    </div>
                  ) : !isCheckedIn ? (
                    <PermissionGate permission={Permissions.ATTENDANCE_MARK}>
                      <Button
                        onClick={onCheckIn}
                        isLoading={checkInPending}
                        className='h-10 px-6 text-sm font-semibold bg-[var(--bg-card)] text-accent hover:bg-[var(--bg-surface)] border-0 shadow-[var(--shadow-dropdown)] hover:shadow-[var(--shadow-dropdown)] hover:scale-105 transition-all rounded-xl'
                      >
                        <LogIn className="h-5 w-5 mr-2"/>
                        Check In
                      </Button>
                    </PermissionGate>
                  ) : (
                    <PermissionGate permission={Permissions.ATTENDANCE_MARK}>
                      <Button
                        onClick={onCheckOutRequest}
                        isLoading={checkOutPending}
                        className='h-10 px-6 text-sm font-semibold bg-gradient-to-r from-danger-500 to-accent-600 text-inverse hover:from-danger-600 hover:to-accent-700 border-0 shadow-[var(--shadow-dropdown)] hover:shadow-[var(--shadow-dropdown)] hover:scale-105 transition-all rounded-xl'
                      >
                        <LogOut className="h-5 w-5 mr-2"/>
                        Check Out
                      </Button>
                    </PermissionGate>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Progress Ring + Today Stats */}
        <div className="space-y-4">
          <Card
            className="card-aura skeuo-card border border-[var(--border-main)] shadow-[var(--shadow-elevated)] overflow-hidden">
            <CardContent className="p-6 flex items-center gap-6 relative">
              <div
                className={`absolute inset-0 opacity-[0.04] ${isOvertime ? 'bg-gradient-to-br from-warning-500 to-warning-500' : workProgress >= 100 ? 'bg-gradient-to-br from-success-500 to-success-500' : 'bg-gradient-to-br from-accent-500 to-accent-500'}`}/>
              <ProgressRing
                progress={workProgress}
                size={110}
                strokeWidth={10}
                color={isOvertime ? 'var(--chart-warning)' : workProgress >= 100 ? 'var(--chart-success)' : 'var(--chart-info)'}
              >
                <div className="text-center">
                  <div className="text-stat-medium text-[var(--text-primary)] tabular-nums leading-none skeuo-emboss">
                    {currentWorkHours.toFixed(1)}
                  </div>
                  <div className="text-xs font-medium text-[var(--text-muted)] mt-0.5">/ {STANDARD_WORK_HOURS}h</div>
                </div>
              </ProgressRing>
              <div className="flex-1 space-y-2 relative z-10">
                <h3 className="text-card-title text-[var(--text-primary)]">Work Progress</h3>
                <div className={`text-sm font-medium ${
                  dayComplete ? 'text-success-600 dark:text-success-400' :
                    isOvertime ? 'text-warning-600 dark:text-warning-400' :
                      isCheckedIn ? 'text-[var(--text-secondary)]' :
                        'text-accent-700 dark:text-accent-400'
                }`}>
                  {dayComplete
                    ? 'Great work today!'
                    : isOvertime
                      ? `+${formatDuration(overtimeHours)} overtime`
                      : isCheckedIn
                        ? `${formatDuration(STANDARD_WORK_HOURS - currentWorkHours)} remaining`
                        : 'Clock in to start your day'}
                </div>
                {isCheckedIn && (
                  <div className="flex items-center gap-1.5">
                    <div
                      className={`h-2 w-2 rounded-full ${isOvertime ? 'bg-warning-500' : workProgress >= 100 ? 'bg-success-500' : 'bg-accent-500'} animate-pulse`}/>
                    <span
                      className={`text-xs font-bold ${isOvertime ? 'text-warning-600 dark:text-warning-400' : workProgress >= 100 ? 'text-success-600 dark:text-success-400' : 'text-accent-700 dark:text-accent-400'}`}>
                      {Math.round(workProgress)}% complete
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Weekly Averages */}
          <Card className="card-aura skeuo-card border border-[var(--border-main)] shadow-[var(--shadow-elevated)]">
            <CardContent className="p-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className="h-8 w-8 rounded-lg bg-gradient-to-br from-accent-500 to-accent-600 flex items-center justify-center shadow-[var(--shadow-card)]">
                      <Sunrise className='h-4 w-4 text-inverse'/>
                    </div>
                    <p className='text-micro text-accent'>Avg In</p>
                  </div>
                  <p
                    className="text-stat-medium text-[var(--text-primary)] tabular-nums skeuo-emboss">{weekStats.avgCheckIn}</p>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className="h-8 w-8 rounded-lg bg-gradient-to-br from-warning-500 to-warning-600 flex items-center justify-center shadow-[var(--shadow-card)]">
                      <Target className='h-4 w-4 text-inverse'/>
                    </div>
                    <p className='text-micro text-status-warning-text'>Avg Hrs</p>
                  </div>
                  <p
                    className="text-stat-medium text-[var(--text-primary)] tabular-nums skeuo-emboss">{weekStats.avgHours}h</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
});
